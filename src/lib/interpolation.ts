// src/lib/interpolation.ts
import type { StateVector } from "./types";

export function hermiteInterpolate(p0: number, p1: number, m0: number, m1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2*t3 - 3*t2 + 1)*p0 + (t3 - 2*t2 + t)*m0 + (-2*t3 + 3*t2)*p1 + (t3 - t2)*m1;
}

export function interpolateStateVector(
  sv1: StateVector, sv2: StateVector, metMs: number
): { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } } {
  const dt = sv2.metMs - sv1.metMs;
  if (dt <= 0) return { position: { ...sv1.position }, velocity: { ...sv1.velocity } };

  let t = (metMs - sv1.metMs) / dt;
  t = Math.max(0, Math.min(1, t));
  const dtSeconds = dt / 1000;

  const position = {
    x: hermiteInterpolate(sv1.position.x, sv2.position.x, sv1.velocity.x * dtSeconds, sv2.velocity.x * dtSeconds, t),
    y: hermiteInterpolate(sv1.position.y, sv2.position.y, sv1.velocity.y * dtSeconds, sv2.velocity.y * dtSeconds, t),
    z: hermiteInterpolate(sv1.position.z, sv2.position.z, sv1.velocity.z * dtSeconds, sv2.velocity.z * dtSeconds, t),
  };

  const velocity = {
    x: sv1.velocity.x + (sv2.velocity.x - sv1.velocity.x) * t,
    y: sv1.velocity.y + (sv2.velocity.y - sv1.velocity.y) * t,
    z: sv1.velocity.z + (sv2.velocity.z - sv1.velocity.z) * t,
  };

  return { position, velocity };
}
