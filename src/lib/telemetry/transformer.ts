// src/lib/telemetry/transformer.ts
import { EARTH_RADIUS_KM } from "../constants";
import type { StateVector, Telemetry } from "../types";

function magnitude(v: { x: number; y: number; z: number }): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function transformStateVector(
  sv: StateVector,
  moonPosition: { x: number; y: number; z: number },
  previousSv?: StateVector
): Telemetry {
  const speedKmS = magnitude(sv.velocity);
  const earthDistKm = magnitude(sv.position);
  const altitudeKm = earthDistKm - EARTH_RADIUS_KM;

  const moonDelta = {
    x: sv.position.x - moonPosition.x,
    y: sv.position.y - moonPosition.y,
    z: sv.position.z - moonPosition.z,
  };
  const moonDistKm = magnitude(moonDelta);

  let gForce = 0;
  if (previousSv) {
    const dt = (sv.metMs - previousSv.metMs) / 1000;
    if (dt > 0) {
      const dv = {
        x: sv.velocity.x - previousSv.velocity.x,
        y: sv.velocity.y - previousSv.velocity.y,
        z: sv.velocity.z - previousSv.velocity.z,
      };
      const accelKmS2 = magnitude(dv) / dt;
      const accelMS2 = accelKmS2 * 1000;
      gForce = accelMS2 / 9.80665;
    }
  }

  return {
    metMs: sv.metMs,
    speedKmS,
    speedKmH: speedKmS * 3600,
    altitudeKm,
    earthDistKm,
    moonDistKm,
    periapsisKm: 0,
    apoapsisKm: 0,
    gForce,
  };
}
