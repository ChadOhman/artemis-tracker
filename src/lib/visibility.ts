// src/lib/visibility.ts
// Predicts when Orion will be visible from an observer's location.
// Requires dark sky (sun below -6° civil twilight) and Orion above horizon.

import {
  computeTopocentric,
  type ObserverLocation,
  type Vec3,
} from "./topocentric";

export interface VisibilityWindow {
  startUtc: string;       // ISO-8601
  endUtc: string;
  durationMin: number;
  maxElevation: number;   // degrees
  maxElevationAz: number; // azimuth at max elevation
  startAz: number;        // azimuth at rise
  endAz: number;          // azimuth at set
  ra: number;             // RA at max elevation (hours)
  dec: number;            // Dec at max elevation (degrees)
}

const STEP_MS = 60_000; // 1 minute steps
const CIVIL_TWILIGHT_DEG = -6; // sun must be below this for dark sky

/**
 * Approximate sun elevation from observer's location at a given UTC time.
 * Uses a simplified solar position model (accurate to ~1°).
 */
function sunElevation(observer: ObserverLocation, utcMs: number): number {
  const daysSinceJ2000 = (utcMs - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;

  // Solar mean longitude and anomaly
  const L = (280.4665 + 0.9856474 * daysSinceJ2000) % 360;
  const g = ((357.5291 + 0.9856003 * daysSinceJ2000) % 360) * Math.PI / 180;

  // Ecliptic longitude
  const lambda = (L + 1.9148 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI / 180;

  // Obliquity
  const epsilon = 23.4393 * Math.PI / 180;

  // Sun declination
  const sinDec = Math.sin(epsilon) * Math.sin(lambda);
  const dec = Math.asin(sinDec);

  // Hour angle
  const jd = utcMs / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;
  const gmstDeg = (280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t) % 360;
  const lmst = (gmstDeg + observer.lon) * Math.PI / 180;
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  const ha = lmst - ra;

  // Elevation
  const latRad = observer.lat * Math.PI / 180;
  const sinEl = Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(ha);
  return Math.asin(sinEl) * 180 / Math.PI;
}

/**
 * Extrapolate spacecraft position forward from current state vector.
 * Uses simple linear extrapolation (velocity × time).
 * Accurate enough for 48-hour visibility prediction since the trajectory
 * is a gradual coast with no major burns expected.
 */
function extrapolatePosition(
  pos: Vec3,
  vel: Vec3,
  dtMs: number
): Vec3 {
  const dtS = dtMs / 1000;
  return {
    x: pos.x + vel.x * dtS,
    y: pos.y + vel.y * dtS,
    z: pos.z + vel.z * dtS,
  };
}

/**
 * Predict visibility windows for the next `hours` hours.
 *
 * @param position - current spacecraft position (J2000 equatorial / EME2000, km)
 * @param velocity - current spacecraft velocity (J2000 equatorial / EME2000, km/s)
 * @param observer - observer location
 * @param hours - forecast window in hours (default 48)
 * @returns array of visibility windows
 */
export function predictVisibility(
  position: Vec3,
  velocity: Vec3,
  observer: ObserverLocation,
  hours = 48
): VisibilityWindow[] {
  const windows: VisibilityWindow[] = [];
  const now = Date.now();
  const endMs = now + hours * 3600_000;

  let inWindow = false;
  let windowStart = 0;
  let windowStartAz = 0;
  let maxEl = -90;
  let maxElAz = 0;
  let maxElRa = 0;
  let maxElDec = 0;
  let lastAz = 0;

  for (let t = now; t <= endMs; t += STEP_MS) {
    const dt = t - now;
    const futurePos = extrapolatePosition(position, velocity, dt);
    const topo = computeTopocentric(futurePos, observer, t);
    const sunEl = sunElevation(observer, t);
    const isDark = sunEl < CIVIL_TWILIGHT_DEG;
    const isVisible = topo.elevation > 0 && isDark;

    if (isVisible && !inWindow) {
      // Window starts
      inWindow = true;
      windowStart = t;
      windowStartAz = topo.azimuth;
      maxEl = topo.elevation;
      maxElAz = topo.azimuth;
      maxElRa = topo.ra;
      maxElDec = topo.dec;
    }

    if (isVisible && inWindow) {
      if (topo.elevation > maxEl) {
        maxEl = topo.elevation;
        maxElAz = topo.azimuth;
        maxElRa = topo.ra;
        maxElDec = topo.dec;
      }
      lastAz = topo.azimuth;
    }

    if (!isVisible && inWindow) {
      // Window ends
      inWindow = false;
      const durationMin = Math.round((t - windowStart) / 60_000);
      if (durationMin >= 2) {
        // Only include windows longer than 2 minutes
        windows.push({
          startUtc: new Date(windowStart).toISOString(),
          endUtc: new Date(t).toISOString(),
          durationMin,
          maxElevation: Math.round(maxEl * 10) / 10,
          maxElevationAz: Math.round(maxElAz * 10) / 10,
          startAz: Math.round(windowStartAz * 10) / 10,
          endAz: Math.round(lastAz * 10) / 10,
          ra: maxElRa,
          dec: maxElDec,
        });
      }
      maxEl = -90;
    }
  }

  // Close any open window at end of forecast
  if (inWindow) {
    const durationMin = Math.round((endMs - windowStart) / 60_000);
    if (durationMin >= 2) {
      windows.push({
        startUtc: new Date(windowStart).toISOString(),
        endUtc: new Date(endMs).toISOString(),
        durationMin,
        maxElevation: Math.round(maxEl * 10) / 10,
        maxElevationAz: Math.round(maxElAz * 10) / 10,
        startAz: Math.round(windowStartAz * 10) / 10,
        endAz: Math.round(lastAz * 10) / 10,
        ra: maxElRa,
        dec: maxElDec,
      });
    }
  }

  return windows;
}

/**
 * Format azimuth as cardinal direction.
 */
export function azToCardinal(az: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(az / 22.5) % 16];
}

/**
 * Format a UTC ISO string as local time for display.
 */
export function formatLocalTime(isoUtc: string): string {
  const d = new Date(isoUtc);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatLocalDate(isoUtc: string): string {
  const d = new Date(isoUtc);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
