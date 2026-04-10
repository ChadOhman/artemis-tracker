// src/lib/telemetry/lerp.ts
import type { Telemetry } from "../types";

/** Linearly interpolate/extrapolate scalar telemetry fields from two snapshots.
 *  When metMs is beyond b.metMs, continues projecting forward at the same rate. */
export function lerpTelemetry(a: Telemetry, b: Telemetry, metMs: number): Telemetry {
  const dt = b.metMs - a.metMs;
  if (dt <= 0) return b;
  // Clamp lower bound but allow extrapolation beyond b (client clock ahead of last poll)
  const f = Math.max(0, (metMs - a.metMs) / dt);
  const lerp = (v0: number, v1: number) => v0 + (v1 - v0) * f;
  return {
    metMs,
    speedKmS: lerp(a.speedKmS, b.speedKmS),
    speedKmH: lerp(a.speedKmH, b.speedKmH),
    moonRelSpeedKmH: lerp(a.moonRelSpeedKmH, b.moonRelSpeedKmH),
    altitudeKm: lerp(a.altitudeKm, b.altitudeKm),
    earthDistKm: lerp(a.earthDistKm, b.earthDistKm),
    moonDistKm: lerp(a.moonDistKm, b.moonDistKm),
    periapsisKm: lerp(a.periapsisKm, b.periapsisKm),
    apoapsisKm: lerp(a.apoapsisKm, b.apoapsisKm),
    gForce: lerp(a.gForce, b.gForce),
  };
}
