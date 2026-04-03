// src/lib/pollers/arow.ts
import { AROW_OCTOBER_URL } from "../constants";
import type { ArowTelemetry } from "../types";

const RAD2DEG = 180 / Math.PI;

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

/** Parse raw AROW JSON response into ArowTelemetry, or null on failure. */
export function parseArowResponse(data: Record<string, any>): ArowTelemetry | null {
  const qw = getParamFloat(data, "2074");
  const qx = getParamFloat(data, "2075");
  const qy = getParamFloat(data, "2076");
  const qz = getParamFloat(data, "2077");

  const pitchRad = getParamFloat(data, "2078");
  const yawRad = getParamFloat(data, "2079");
  const rollRad = getParamFloat(data, "2080");

  const rollRateRad = getParamFloat(data, "2091");
  const pitchRateRad = getParamFloat(data, "2092");
  const yawRateRad = getParamFloat(data, "2093");

  const az1 = getParamFloat(data, "5002");
  const el1 = getParamFloat(data, "5003");
  const az2 = getParamFloat(data, "5004");
  const el2 = getParamFloat(data, "5005");

  const saw1 = getParamFloat(data, "5006");
  const saw2 = getParamFloat(data, "5007");
  const saw3 = getParamFloat(data, "5008");
  const saw4 = getParamFloat(data, "5009");

  const icpsQw = getParamFloat(data, "2084") ?? 0;
  const icpsQx = getParamFloat(data, "2085") ?? 0;
  const icpsQy = getParamFloat(data, "2086") ?? 0;
  const icpsQz = getParamFloat(data, "2087") ?? 0;
  const icpsActive = getParamStatus(data, "2084") === "Good";

  const mode = getParam(data, "2016");

  if (
    qw === undefined || qx === undefined || qy === undefined || qz === undefined ||
    pitchRad === undefined || yawRad === undefined || rollRad === undefined ||
    rollRateRad === undefined || pitchRateRad === undefined || yawRateRad === undefined ||
    az1 === undefined || el1 === undefined || az2 === undefined || el2 === undefined ||
    saw1 === undefined || saw2 === undefined || saw3 === undefined || saw4 === undefined ||
    mode === undefined
  ) {
    return null;
  }

  const timeStr = getParamTime(data, "2074");
  const timestamp = timeStr ? parseDoyTimestamp(timeStr) : new Date().toISOString();

  return {
    timestamp,
    quaternion: { w: qw, x: qx, y: qy, z: qz },
    eulerDeg: { roll: rollRad * RAD2DEG, pitch: pitchRad * RAD2DEG, yaw: yawRad * RAD2DEG },
    rollRate: rollRateRad * RAD2DEG,
    pitchRate: pitchRateRad * RAD2DEG,
    yawRate: yawRateRad * RAD2DEG,
    antennaGimbal: { az1, el1, az2, el2 },
    sawAngles: { saw1, saw2, saw3, saw4 },
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
