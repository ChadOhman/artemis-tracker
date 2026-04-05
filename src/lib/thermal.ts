// src/lib/thermal.ts
// Simple thermal model for Orion in deep space.

import type { Vec3 } from "./topocentric";

const STEFAN_BOLTZMANN = 5.67e-8;
const SOLAR_CONSTANT = 1361; // W/m² at 1 AU
const HOT_SIDE_ABSORPTIVITY = 0.9;  // dark thermal blanket
const COLD_SIDE_EMISSIVITY = 0.85;
const KELVIN_TO_C = (k: number) => k - 273.15;

export interface ThermalState {
  hotSideC: number;         // °C of sun-facing side
  coldSideC: number;        // °C of shadow-facing side
  sunAngleDeg: number;      // angle between +X body axis and Sun direction (0 = facing Sun)
  inShadow: boolean;        // true if Orion in Earth's shadow
  dataSource: "modeled" | "estimated"; // modeled uses attitude, estimated uses defaults
}

/**
 * Compute sun direction vector in ecliptic frame for a given UTC time.
 * Returns unit vector from Earth toward Sun.
 */
function getSunDirection(utcMs: number): Vec3 {
  const daysSinceJ2000 = (utcMs - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;
  const L = (280.4665 + 0.9856474 * daysSinceJ2000) * Math.PI / 180;
  // Sun direction in ecliptic (z = 0 because ecliptic plane)
  return {
    x: Math.cos(L),
    y: Math.sin(L),
    z: 0,
  };
}

/**
 * Rotate a vector by a quaternion (applies body-to-inertial rotation).
 */
function rotateByQuat(v: Vec3, q: { w: number; x: number; y: number; z: number }): Vec3 {
  const { w, x, y, z } = q;
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;
  return {
    x: v.x * (1 - 2*yy - 2*zz) + v.y * (2*xy - 2*wz) + v.z * (2*xz + 2*wy),
    y: v.x * (2*xy + 2*wz) + v.y * (1 - 2*xx - 2*zz) + v.z * (2*yz - 2*wx),
    z: v.x * (2*xz - 2*wy) + v.y * (2*yz + 2*wx) + v.z * (1 - 2*xx - 2*yy),
  };
}

/**
 * Check if Orion is in Earth's cylindrical shadow.
 */
function isInShadow(orionEcliptic: Vec3, utcMs: number): boolean {
  const sunDir = getSunDirection(utcMs);
  // Dot product: if Orion is on the anti-sun side AND within Earth's shadow cylinder
  const dot = orionEcliptic.x * sunDir.x + orionEcliptic.y * sunDir.y + orionEcliptic.z * sunDir.z;
  if (dot >= 0) return false; // sun side
  const perpX = orionEcliptic.x - dot * sunDir.x;
  const perpY = orionEcliptic.y - dot * sunDir.y;
  const perpZ = orionEcliptic.z - dot * sunDir.z;
  const perpDist = Math.sqrt(perpX*perpX + perpY*perpY + perpZ*perpZ);
  return perpDist < 6378; // Earth radius km
}

/**
 * Compute thermal state from spacecraft position and attitude.
 * @param position - Orion ecliptic geocentric position (km)
 * @param quaternion - attitude quaternion (body-to-inertial), or null
 * @param utcMs - current UTC timestamp
 */
export function computeThermal(
  position: Vec3,
  quaternion: { w: number; x: number; y: number; z: number } | null,
  utcMs: number
): ThermalState {
  const inShadow = isInShadow(position, utcMs);
  const sunDir = getSunDirection(utcMs);

  let sunAngleDeg = 90; // default: side-on exposure
  let dataSource: "modeled" | "estimated" = "estimated";

  if (quaternion) {
    // +X body axis in inertial frame after rotation
    const bodyX = rotateByQuat({ x: 1, y: 0, z: 0 }, quaternion);
    // Angle between body +X and Sun direction
    const dot = bodyX.x * sunDir.x + bodyX.y * sunDir.y + bodyX.z * sunDir.z;
    sunAngleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
    dataSource = "modeled";
  }

  // Thermal balance: T = (absorbed solar / emissivity σ)^0.25
  // Hot side (facing Sun): receives ~1361 W/m² * cos(angle)
  // Cold side (radiating to space): receives nothing
  const cosAngle = Math.cos(sunAngleDeg * Math.PI / 180);
  const effectiveFlux = inShadow ? 0 : SOLAR_CONSTANT * Math.max(0, cosAngle);

  const hotK = Math.pow(
    (HOT_SIDE_ABSORPTIVITY * effectiveFlux) / (COLD_SIDE_EMISSIVITY * STEFAN_BOLTZMANN),
    0.25
  );
  const hotSideC = inShadow ? -120 : KELVIN_TO_C(Math.max(hotK, 170));

  // Cold side: radiates to space with background cosmic temperature ~3K
  // Approximate as -150°C when lit, -180°C in shadow
  const coldSideC = inShadow ? -170 : -150;

  return {
    hotSideC: Math.round(hotSideC),
    coldSideC: Math.round(coldSideC),
    sunAngleDeg: Math.round(sunAngleDeg),
    inShadow,
    dataSource,
  };
}
