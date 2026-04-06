// src/lib/pollers/arow.ts
import { AROW_OCTOBER_URL } from "../constants";
import type { ArowTelemetry, RcsThrusterState, SawGimbalAngles } from "../types";

const RAD2DEG = 180 / Math.PI;

// RCS thruster names mapped to their parameter and bit position.
// Each param encodes multiple thrusters as a float whose integer bits
// represent firing states. We extract the integer and check individual bits.
const THRUSTER_PARAMS: Array<{ param: string; thrusters: string[] }> = [
  { param: "2088", thrusters: ["SR1R", "SR2R"] },
  { param: "2089", thrusters: ["SA3A", "SA4A"] },
  { param: "2094", thrusters: ["SR1L", "SR2L"] },
  { param: "2095", thrusters: ["SB5A", "SB6A"] },
  { param: "2096", thrusters: ["SR4R", "SR3R"] },
  { param: "2097", thrusters: ["SC2A", "SC1A"] },
  { param: "2098", thrusters: ["SC2F", "SC1F"] },
];

/** Convert AROW DOY timestamp "YYYY:DDD:HH:MM:SS.mmm" to ISO-8601 UTC. */
export function parseDoyTimestamp(doy: string): string {
  const [yearStr, dayStr, rest] = [
    doy.slice(0, 4),
    doy.slice(5, 8),
    doy.slice(9),
  ];
  const year = parseInt(yearStr, 10);
  const dayOfYear = parseInt(dayStr, 10);

  const date = new Date(Date.UTC(year, 0, 1));
  date.setUTCDate(date.getUTCDate() + dayOfYear - 1);

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}T${rest}Z`;
}

function getParam(data: Record<string, any>, num: string): string | undefined {
  return data[`Parameter_${num}`]?.Value;
}

function getParamFloat(data: Record<string, any>, num: string): number | undefined {
  const val = getParam(data, num);
  if (val === undefined) return undefined;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : undefined;
}

function getParamTime(data: Record<string, any>, num: string): string | undefined {
  return data[`Parameter_${num}`]?.Time;
}

function getParamStatus(data: Record<string, any>, num: string): string | undefined {
  return data[`Parameter_${num}`]?.Status;
}

/** Parse raw AROW JSON response into ArowTelemetry, or null if no data at all. */
export function parseArowResponse(data: Record<string, any>): ArowTelemetry | null {
  // Must have at least the File header and one parameter to be valid
  if (!data?.File) return null;

  const mode = getParam(data, "2016") ?? "??";

  // Attitude — all four quaternion components required, or null
  const qw = getParamFloat(data, "2074");
  const qx = getParamFloat(data, "2075");
  const qy = getParamFloat(data, "2076");
  const qz = getParamFloat(data, "2077");
  const quaternion = (qw != null && qx != null && qy != null && qz != null)
    ? { w: qw, x: qx, y: qy, z: qz } : null;

  // Euler angles — all three required, or null
  const pitchRad = getParamFloat(data, "2078");
  const yawRad = getParamFloat(data, "2079");
  const rollRad = getParamFloat(data, "2080");
  const eulerDeg = (pitchRad != null && yawRad != null && rollRad != null)
    ? { roll: rollRad * RAD2DEG, pitch: pitchRad * RAD2DEG, yaw: yawRad * RAD2DEG } : null;

  // Angular rates — each independently nullable.
  // Params 2091/2092/2093 are delivered in DEGREES per second, not radians.
  // (Verified against live values: applying * RAD2DEG produced implausible
  // ~14 °/s tumble rates; raw values ~0.25 °/s match normal dead-band drift.)
  const rollRateDegS = getParamFloat(data, "2091");
  const pitchRateDegS = getParamFloat(data, "2092");
  const yawRateDegS = getParamFloat(data, "2093");

  // Antenna gimbal — all four required, or null
  const az1 = getParamFloat(data, "5002");
  const el1 = getParamFloat(data, "5003");
  const az2 = getParamFloat(data, "5004");
  const el2 = getParamFloat(data, "5005");
  const antennaGimbal = (az1 != null && el1 != null && az2 != null && el2 != null)
    ? { az1, el1, az2, el2 } : null;

  // SAW angles — all four required, or null
  const saw1 = getParamFloat(data, "5006");
  const saw2 = getParamFloat(data, "5007");
  const saw3 = getParamFloat(data, "5008");
  const saw4 = getParamFloat(data, "5009");
  const sawAngles = (saw1 != null && saw2 != null && saw3 != null && saw4 != null)
    ? { saw1, saw2, saw3, saw4 } : null;

  // SAW inner/outer gimbal angles (radians → degrees)
  const sawIG1 = getParamFloat(data, "2048");
  const sawIG2 = getParamFloat(data, "2049");
  const sawIG3 = getParamFloat(data, "2050");
  const sawIG4 = getParamFloat(data, "2051");
  const sawOG1 = getParamFloat(data, "2052");
  const sawOG2 = getParamFloat(data, "2053");
  const sawOG3 = getParamFloat(data, "2054");
  const sawOG4 = getParamFloat(data, "2055");
  const sawGimbals: SawGimbalAngles | null =
    (sawIG1 != null && sawIG2 != null && sawIG3 != null && sawIG4 != null &&
     sawOG1 != null && sawOG2 != null && sawOG3 != null && sawOG4 != null)
    ? {
        saw1: { ig: sawIG1 * RAD2DEG, og: sawOG1 * RAD2DEG },
        saw2: { ig: sawIG2 * RAD2DEG, og: sawOG2 * RAD2DEG },
        saw3: { ig: sawIG3 * RAD2DEG, og: sawOG3 * RAD2DEG },
        saw4: { ig: sawIG4 * RAD2DEG, og: sawOG4 * RAD2DEG },
      }
    : null;

  // RCS thruster firing states (bit-packed integers)
  let rcsThrusters: RcsThrusterState | null = null;
  {
    const thrusters: Record<string, boolean> = {};
    let anyFound = false;
    for (const group of THRUSTER_PARAMS) {
      const val = getParamFloat(data, group.param);
      if (val == null) continue;
      anyFound = true;
      const bits = Math.round(Math.abs(val));
      for (let i = 0; i < group.thrusters.length; i++) {
        thrusters[group.thrusters[i]] = (bits & (1 << i)) !== 0;
      }
    }
    if (anyFound) {
      rcsThrusters = {
        thrusters,
        status1: getParam(data, "2090") ?? null,
        status2: getParam(data, "2099") ?? null,
      };
    }
  }

  // ICPS
  const icpsQw = getParamFloat(data, "2084") ?? 0;
  const icpsQx = getParamFloat(data, "2085") ?? 0;
  const icpsQy = getParamFloat(data, "2086") ?? 0;
  const icpsQz = getParamFloat(data, "2087") ?? 0;
  const icpsActive = getParamStatus(data, "2084") === "Good";

  // Timestamp: try attitude params first, fall back to any available param
  const timeStr = getParamTime(data, "2074") || getParamTime(data, "2016") || getParamTime(data, "5010");
  const timestamp = timeStr ? parseDoyTimestamp(timeStr) : new Date().toISOString();

  return {
    timestamp,
    quaternion,
    eulerDeg,
    rollRate: rollRateDegS ?? null,
    pitchRate: pitchRateDegS ?? null,
    yawRate: yawRateDegS ?? null,
    antennaGimbal,
    sawAngles,
    rcsThrusters,
    sawGimbals,
    icps: { quaternion: { w: icpsQw, x: icpsQx, y: icpsQy, z: icpsQz }, active: icpsActive },
    spacecraftMode: mode,
  };
}

/** Fetch and parse the current AROW telemetry from GCS. */
export async function pollArow(): Promise<ArowTelemetry | null> {
  try {
    const res = await fetch(AROW_OCTOBER_URL);
    const data = await res.json();
    return parseArowResponse(data);
  } catch (error) {
    console.error("AROW poll failed:", error);
    return null;
  }
}
