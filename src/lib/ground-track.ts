// src/lib/ground-track.ts
// Computes the sub-satellite point (latitude/longitude) from a geocentric
// position vector and maps it to a human-readable region name.

import { LAUNCH_TIME_MS } from "./constants";

/** Earth's rotation rate in radians per millisecond */
const EARTH_ROT_RAD_PER_MS = (2 * Math.PI) / (23 * 3600 * 1000 + 56 * 60 * 1000 + 4.1 * 1000);

/** Greenwich Mean Sidereal Time at J2000.0 epoch in radians */
const GMST_J2000 = 4.89496121274;

/** J2000.0 epoch in ms */
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/**
 * Compute sub-satellite latitude and longitude from a J2000 geocentric position vector.
 * Returns { lat, lon } in degrees.
 */
export function positionToLatLon(
  position: { x: number; y: number; z: number },
  metMs: number
): { lat: number; lon: number } {
  const r = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
  if (r === 0) return { lat: 0, lon: 0 };

  // Declination (latitude) — angle from equatorial plane
  const lat = Math.asin(position.z / r) * (180 / Math.PI);

  // Right ascension in J2000 frame
  const raJ2000 = Math.atan2(position.y, position.x);

  // Convert J2000 RA to Earth-fixed longitude by subtracting Earth's rotation
  const utcMs = LAUNCH_TIME_MS + metMs;
  const dtFromJ2000 = utcMs - J2000_MS;
  const gmst = GMST_J2000 + EARTH_ROT_RAD_PER_MS * dtFromJ2000;

  let lon = (raJ2000 - gmst) * (180 / Math.PI);
  // Normalize to -180..180
  lon = ((lon % 360) + 540) % 360 - 180;

  return { lat, lon };
}

/**
 * Map a lat/lon to a human-readable region name.
 */
export function latLonToRegion(lat: number, lon: number): string {
  // Ocean checks first (covers ~70% of Earth)
  if (lat > 60) return "Arctic";
  if (lat < -60) return "Antarctic";

  // Pacific Ocean
  if ((lon > 140 || lon < -100) && lat > -50 && lat < 50) {
    if (lat > 20) return "North Pacific Ocean";
    if (lat < -20) return "South Pacific Ocean";
    return "Pacific Ocean";
  }

  // Atlantic Ocean
  if (lon > -80 && lon < -5 && lat > -50 && lat < 50) {
    if (lat > 30) return "North Atlantic Ocean";
    if (lat < -10) return "South Atlantic Ocean";
    return "Atlantic Ocean";
  }

  // Indian Ocean
  if (lon > 40 && lon < 120 && lat < 10 && lat > -50) {
    return "Indian Ocean";
  }

  // North America
  if (lon > -140 && lon < -50 && lat > 15 && lat < 75) {
    if (lat > 55) return "Northern Canada";
    if (lon > -90 && lat > 35) return "Eastern North America";
    if (lon < -100 && lat > 30) return "Western North America";
    if (lat < 25) return "Central America";
    return "North America";
  }

  // South America
  if (lon > -85 && lon < -30 && lat > -55 && lat <= 15) {
    if (lat > -10) return "Northern South America";
    if (lat < -35) return "Southern South America";
    return "South America";
  }

  // Europe
  if (lon > -15 && lon < 45 && lat > 35 && lat < 72) {
    if (lon > 25) return "Eastern Europe";
    if (lat > 55) return "Northern Europe";
    return "Western Europe";
  }

  // Africa
  if (lon > -20 && lon < 55 && lat > -35 && lat <= 35) {
    if (lat > 15) return "North Africa";
    if (lat < -10) return "Southern Africa";
    return "Central Africa";
  }

  // Middle East
  if (lon > 25 && lon < 65 && lat > 12 && lat < 42) {
    return "Middle East";
  }

  // Russia / Central Asia
  if (lon > 45 && lon < 180 && lat > 45) {
    if (lon > 100) return "Siberia";
    return "Central Asia";
  }

  // East Asia
  if (lon > 95 && lon < 145 && lat > 15 && lat <= 55) {
    if (lon > 125) return "East Asia";
    if (lat < 30) return "Southeast Asia";
    return "East Asia";
  }

  // South Asia
  if (lon > 65 && lon < 95 && lat > 5 && lat < 40) {
    return "South Asia";
  }

  // Southeast Asia / Indonesia
  if (lon > 95 && lon < 140 && lat > -10 && lat <= 15) {
    return "Southeast Asia";
  }

  // Australia
  if (lon > 110 && lon < 155 && lat > -45 && lat < -10) {
    return "Australia";
  }

  // New Zealand / Oceania
  if (lon > 155 && lon < 180 && lat > -50 && lat < -20) {
    return "Oceania";
  }

  return "Earth";
}

/**
 * Get a display string for Orion's position over Earth.
 */
export function getGroundTrackLabel(
  position: { x: number; y: number; z: number },
  metMs: number
): string {
  const { lat, lon } = positionToLatLon(position, metMs);
  const region = latLonToRegion(lat, lon);
  return `Over ${region}`;
}
