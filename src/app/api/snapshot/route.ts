// src/app/api/snapshot/route.ts
// Returns the full telemetry snapshot as it looked at a given MET time.
// Used by SIM mode to replay the mission from archived data.

import { LAUNCH_TIME_MS } from "@/lib/constants";
import {
  getStateSnapshotAt,
  getDsnSnapshotAt,
  getSolarSnapshotAt,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const metMs = parseInt(url.searchParams.get("metMs") ?? "0", 10);
  if (!Number.isFinite(metMs) || metMs < 0) {
    return Response.json({ error: "Invalid metMs" }, { status: 400 });
  }

  const utcMs = LAUNCH_TIME_MS + metMs;

  try {
    const sv = getStateSnapshotAt(metMs);
    const dsnRow = getDsnSnapshotAt(utcMs);
    const solar = getSolarSnapshotAt(utcMs);

    const stateVector = sv
      ? {
          timestamp: sv.timestamp,
          metMs: sv.met_ms,
          position: { x: sv.pos_x, y: sv.pos_y, z: sv.pos_z },
          velocity: { x: sv.vel_x, y: sv.vel_y, z: sv.vel_z },
        }
      : null;

    const telemetry = sv
      ? {
          metMs: sv.met_ms,
          speedKmS: sv.speed_km_s,
          speedKmH: sv.speed_km_h,
          moonRelSpeedKmH: 0, // not available in historical snapshots
          altitudeKm: sv.altitude_km,
          earthDistKm: sv.earth_dist_km,
          moonDistKm: sv.moon_dist_km,
          periapsisKm: sv.periapsis_km,
          apoapsisKm: sv.apoapsis_km,
          gForce: sv.g_force,
        }
      : null;

    const moonPosition =
      sv && sv.moon_x != null && sv.moon_y != null && sv.moon_z != null
        ? { x: sv.moon_x, y: sv.moon_y, z: sv.moon_z }
        : null;

    let dsn = null;
    if (dsnRow) {
      try {
        const dishes = JSON.parse(dsnRow.dishes_json);
        dsn = {
          timestamp: dsnRow.timestamp,
          signalActive: dsnRow.signal_active === 1,
          dishes,
        };
      } catch {
        // malformed row
      }
    }

    const solarData = solar
      ? {
          timestamp: solar.timestamp,
          kpIndex: solar.kp_index,
          kpLabel: solar.kp_label,
          xrayFlux: solar.xray_flux,
          xrayClass: solar.xray_class,
          protonFlux1MeV: solar.proton_1mev,
          protonFlux10MeV: solar.proton_10mev,
          protonFlux100MeV: solar.proton_100mev,
          radiationRisk: solar.radiation_risk,
        }
      : null;

    return Response.json({
      metMs,
      stateVector,
      telemetry,
      moonPosition,
      dsn,
      solar: solarData,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 }
    );
  }
}
