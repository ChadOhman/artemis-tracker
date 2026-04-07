// src/lib/topocentric.ts
// Coordinate transforms for observer-relative spacecraft tracking.
// Converts J2000 geocentric state vectors to topocentric az/el/RA/Dec.

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const EARTH_A = 6378.137; // WGS-84 semi-major axis (km)
const EARTH_B = 6356.752; // WGS-84 semi-minor axis (km)
const EARTH_E2 = 1 - (EARTH_B * EARTH_B) / (EARTH_A * EARTH_A);
const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0); // J2000.0 = 2000-01-01T12:00:00 UTC
const OBLIQUITY = 23.4393 * DEG; // Mean obliquity of ecliptic at J2000

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ObserverLocation {
  lat: number; // degrees
  lon: number; // degrees
  alt: number; // km above sea level
}

export interface TopocentricResult {
  azimuth: number;    // degrees, 0=N, 90=E, 180=S, 270=W
  elevation: number;  // degrees above horizon
  range: number;      // km from observer to spacecraft
  ra: number;         // topocentric right ascension (hours, 0-24)
  dec: number;        // topocentric declination (degrees, -90 to +90)
  visible: boolean;   // true if elevation > 0
}

export interface SubPoint {
  lat: number;  // degrees
  lon: number;  // degrees
}

export interface SunlightInfo {
  state: "sunlit" | "shadow" | "unknown";
}

/**
 * Greenwich Mean Sidereal Time in radians for a given UTC timestamp.
 * Uses the IAU 1982 formula (accurate to ~0.1 arcsec for current epoch).
 */
export function gmst(utcMs: number): number {
  const jd = utcMs / 86400000 + 2440587.5; // Julian Date
  const t = (jd - 2451545.0) / 36525; // Julian centuries from J2000
  // GMST in seconds of time
  const gmstSec =
    67310.54841 +
    (876600 * 3600 + 8640184.812866) * t +
    0.093104 * t * t -
    6.2e-6 * t * t * t;
  // Convert to radians, mod 2π
  const gmstRad = ((gmstSec % 86400) / 86400) * 2 * Math.PI;
  return ((gmstRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

/**
 * Identity — JPL Horizons now returns J2000 equatorial (EME2000/ICRF)
 * directly via REF_PLANE='FRAME', so no rotation is needed. Kept as a
 * passthrough so all call sites remain unchanged.
 */
export function eclipticToEquatorial(pos: Vec3): Vec3 {
  return pos;
}

/**
 * Convert J2000 equatorial (ECI) to ECEF using GMST rotation.
 */
export function eciToEcef(posEci: Vec3, gmstRad: number): Vec3 {
  const cosG = Math.cos(gmstRad);
  const sinG = Math.sin(gmstRad);
  return {
    x: cosG * posEci.x + sinG * posEci.y,
    y: -sinG * posEci.x + cosG * posEci.y,
    z: posEci.z,
  };
}

/**
 * Convert observer geodetic position to ECEF (km).
 */
export function geodeticToEcef(obs: ObserverLocation): Vec3 {
  const latRad = obs.lat * DEG;
  const lonRad = obs.lon * DEG;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);
  const n = EARTH_A / Math.sqrt(1 - EARTH_E2 * sinLat * sinLat);
  const r = n + obs.alt;
  return {
    x: r * cosLat * cosLon,
    y: r * cosLat * sinLon,
    z: (n * (1 - EARTH_E2) + obs.alt) * sinLat,
  };
}

/**
 * Convert ECEF position to geodetic lat/lon (sub-satellite point).
 * Uses iterative Bowring method.
 */
export function ecefToGeodetic(pos: Vec3): SubPoint {
  const p = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
  const lon = Math.atan2(pos.y, pos.x) * RAD;

  // Iterative latitude
  let lat = Math.atan2(pos.z, p * (1 - EARTH_E2));
  for (let i = 0; i < 5; i++) {
    const sinLat = Math.sin(lat);
    const n = EARTH_A / Math.sqrt(1 - EARTH_E2 * sinLat * sinLat);
    lat = Math.atan2(pos.z + EARTH_E2 * n * sinLat, p);
  }

  return { lat: lat * RAD, lon };
}

/**
 * Compute topocentric azimuth, elevation, range, and RA/Dec
 * for a spacecraft as seen from an observer on Earth.
 *
 * @param scEcliptic - spacecraft position in J2000 ecliptic geocentric (km)
 * @param observer - observer geodetic position
 * @param utcMs - current UTC timestamp in milliseconds
 */
export function computeTopocentric(
  scEcliptic: Vec3,
  observer: ObserverLocation,
  utcMs: number
): TopocentricResult {
  // 1. Ecliptic → Equatorial (J2000 ECI)
  const scEci = eclipticToEquatorial(scEcliptic);

  // 2. ECI → ECEF
  const theta = gmst(utcMs);
  const scEcef = eciToEcef(scEci, theta);

  // 3. Observer ECEF
  const obsEcef = geodeticToEcef(observer);

  // 4. Range vector in ECEF
  const dx = scEcef.x - obsEcef.x;
  const dy = scEcef.y - obsEcef.y;
  const dz = scEcef.z - obsEcef.z;
  const range = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // 5. ECEF range → ENU (East-North-Up)
  const latRad = observer.lat * DEG;
  const lonRad = observer.lon * DEG;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);

  const east = -sinLon * dx + cosLon * dy;
  const north = -sinLat * cosLon * dx - sinLat * sinLon * dy + cosLat * dz;
  const up = cosLat * cosLon * dx + cosLat * sinLon * dy + sinLat * dz;

  // 6. ENU → Azimuth / Elevation
  const azimuth = ((Math.atan2(east, north) * RAD) + 360) % 360;
  const elevation = Math.atan2(up, Math.sqrt(east * east + north * north)) * RAD;

  // 7. Topocentric RA/Dec
  // Topocentric equatorial: subtract observer ECI position from spacecraft ECI
  const obsEci = {
    x: Math.cos(theta) * obsEcef.x - Math.sin(theta) * obsEcef.y,
    y: Math.sin(theta) * obsEcef.x + Math.cos(theta) * obsEcef.y,
    z: obsEcef.z,
  };
  const topoX = scEci.x - obsEci.x;
  const topoY = scEci.y - obsEci.y;
  const topoZ = scEci.z - obsEci.z;
  const topoR = Math.sqrt(topoX * topoX + topoY * topoY + topoZ * topoZ);

  const dec = Math.asin(topoZ / topoR) * RAD;
  let ra = Math.atan2(topoY, topoX) * RAD;
  if (ra < 0) ra += 360;
  const raHours = ra / 15; // convert degrees to hours

  return {
    azimuth,
    elevation,
    range,
    ra: raHours,
    dec,
    visible: elevation > 0,
  };
}

/**
 * Compute the sub-spacecraft point (lat/lon on Earth directly below Orion).
 */
export function computeSubPoint(scEcliptic: Vec3, utcMs: number): SubPoint {
  const scEci = eclipticToEquatorial(scEcliptic);
  const theta = gmst(utcMs);
  const scEcef = eciToEcef(scEci, theta);
  return ecefToGeodetic(scEcef);
}

/**
 * Compute spacecraft ground-track heading (direction of travel).
 * Uses velocity vector projected onto the ground plane.
 */
export function computeHeading(scEcliptic: Vec3, velEcliptic: Vec3, utcMs: number): number {
  const velEci = eclipticToEquatorial(velEcliptic);
  const theta = gmst(utcMs);

  // Velocity in ECEF (simplified — ignores Earth rotation contribution)
  const velEcef = eciToEcef(velEci, theta);

  // Sub-point for local ENU frame
  const scEci = eclipticToEquatorial(scEcliptic);
  const scEcef = eciToEcef(scEci, theta);
  const sub = ecefToGeodetic(scEcef);

  const latRad = sub.lat * DEG;
  const lonRad = sub.lon * DEG;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);

  const east = -sinLon * velEcef.x + cosLon * velEcef.y;
  const north = -sinLat * cosLon * velEcef.x - sinLat * sinLon * velEcef.y + cosLat * velEcef.z;

  return ((Math.atan2(east, north) * RAD) + 360) % 360;
}

/**
 * Determine if the spacecraft is in sunlight or Earth's shadow.
 * Simple cylindrical shadow model.
 */
export function computeSunlight(scEcliptic: Vec3, utcMs: number): SunlightInfo {
  // Sun direction in J2000 ecliptic: approximate from Earth's orbital position
  // Earth orbits at ~1 deg/day, so sun direction = opposite of Earth's position
  const daysSinceJ2000 = (utcMs - J2000_EPOCH) / 86400000;
  const meanAnomaly = (357.5291 + 0.98560028 * daysSinceJ2000) * DEG;
  const eclipticLon = (280.4665 + 0.98564736 * daysSinceJ2000) * DEG;

  // Sun direction unit vector (ecliptic)
  const sunDir = {
    x: Math.cos(eclipticLon),
    y: Math.sin(eclipticLon),
    z: 0,
  };

  // Project spacecraft onto sun direction
  const dot = scEcliptic.x * sunDir.x + scEcliptic.y * sunDir.y + scEcliptic.z * sunDir.z;

  // If spacecraft is on the anti-sun side of Earth and within Earth's shadow cylinder
  if (dot < 0) {
    // Perpendicular distance from Earth-Sun line
    const perpX = scEcliptic.x - dot * sunDir.x;
    const perpY = scEcliptic.y - dot * sunDir.y;
    const perpZ = scEcliptic.z - dot * sunDir.z;
    const perpDist = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);

    if (perpDist < EARTH_A) {
      return { state: "shadow" };
    }
  }

  return { state: "sunlit" };
}

/**
 * Format RA as HH:MM:SS.
 */
export function formatRA(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h) * 60 - m) * 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${s.toFixed(1)}s`;
}

/**
 * Format Dec as ±DD°MM'SS".
 */
export function formatDec(deg: number): string {
  const sign = deg >= 0 ? "+" : "-";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d) * 60 - m) * 60;
  return `${sign}${d}° ${String(m).padStart(2, "0")}' ${s.toFixed(0)}"`;
}

/**
 * Format compass heading as degrees + cardinal direction.
 */
export function formatHeading(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(deg / 45) % 8;
  return `${deg.toFixed(1)}° ${dirs[idx]}`;
}
