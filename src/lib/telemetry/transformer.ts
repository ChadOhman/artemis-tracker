// src/lib/telemetry/transformer.ts
import { EARTH_RADIUS_KM } from "../constants";
import type { StateVector, Telemetry } from "../types";

function magnitude(v: { x: number; y: number; z: number }): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function dot(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Earth gravitational parameter in km^3/s^2 */
const MU_EARTH = 398600.4418;

/**
 * Compute periapsis and apoapsis from position and velocity vectors
 * using the vis-viva equation and orbital mechanics.
 */
function computeOrbitalElements(
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number }
): { periapsisKm: number; apoapsisKm: number } {
  const r = magnitude(position);
  const v = magnitude(velocity);

  // Specific orbital energy: ε = v²/2 - μ/r
  const energy = (v * v) / 2 - MU_EARTH / r;

  // Semi-major axis: a = -μ/(2ε)
  // For hyperbolic trajectories (energy > 0), a is negative
  if (energy >= 0) {
    // Hyperbolic/parabolic — no apoapsis
    // Compute periapsis from angular momentum
    const hVec = {
      x: position.y * velocity.z - position.z * velocity.y,
      y: position.z * velocity.x - position.x * velocity.z,
      z: position.x * velocity.y - position.y * velocity.x,
    };
    const h = magnitude(hVec);
    const semiLatusRectum = (h * h) / MU_EARTH;
    // For escape trajectories, just show periapsis
    const rdotv = dot(position, velocity);
    const eVec = {
      x: (v * v / MU_EARTH - 1 / r) * position.x - (rdotv / MU_EARTH) * velocity.x,
      y: (v * v / MU_EARTH - 1 / r) * position.y - (rdotv / MU_EARTH) * velocity.y,
      z: (v * v / MU_EARTH - 1 / r) * position.z - (rdotv / MU_EARTH) * velocity.z,
    };
    const eccentricity = magnitude(eVec);
    const periapsis = semiLatusRectum / (1 + eccentricity);
    return { periapsisKm: periapsis - EARTH_RADIUS_KM, apoapsisKm: -1 };
  }

  const sma = -MU_EARTH / (2 * energy);

  // Angular momentum vector: h = r × v
  const hVec = {
    x: position.y * velocity.z - position.z * velocity.y,
    y: position.z * velocity.x - position.x * velocity.z,
    z: position.x * velocity.y - position.y * velocity.x,
  };
  const h = magnitude(hVec);

  // Eccentricity: e = sqrt(1 - h²/(a·μ))
  const eSquared = 1 - (h * h) / (sma * MU_EARTH);
  const eccentricity = Math.sqrt(Math.max(0, eSquared));

  const periapsis = sma * (1 - eccentricity);
  const apoapsis = sma * (1 + eccentricity);

  return {
    periapsisKm: periapsis - EARTH_RADIUS_KM,
    apoapsisKm: apoapsis - EARTH_RADIUS_KM,
  };
}

export function transformStateVector(
  sv: StateVector,
  moonPosition: { x: number; y: number; z: number },
  previousSv?: StateVector,
  moonVelocity?: { x: number; y: number; z: number } | null,
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

  // Speed relative to the Moon (Orion velocity minus Moon velocity)
  let moonRelSpeedKmH = 0;
  if (moonVelocity) {
    const relVel = {
      x: sv.velocity.x - moonVelocity.x,
      y: sv.velocity.y - moonVelocity.y,
      z: sv.velocity.z - moonVelocity.z,
    };
    moonRelSpeedKmH = magnitude(relVel) * 3600;
  }

  const { periapsisKm, apoapsisKm } = computeOrbitalElements(sv.position, sv.velocity);

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
    moonRelSpeedKmH,
    altitudeKm,
    earthDistKm,
    moonDistKm,
    periapsisKm,
    apoapsisKm,
    gForce,
  };
}
