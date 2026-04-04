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

/** Major cities and landmarks with lat/lon */
const LANDMARKS: { name: string; lat: number; lon: number }[] = [
  // North America
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Los Angeles", lat: 34.05, lon: -118.24 },
  { name: "Chicago", lat: 41.88, lon: -87.63 },
  { name: "Houston", lat: 29.76, lon: -95.37 },
  { name: "Toronto", lat: 43.65, lon: -79.38 },
  { name: "Mexico City", lat: 19.43, lon: -99.13 },
  { name: "Vancouver", lat: 49.28, lon: -123.12 },
  { name: "Miami", lat: 25.76, lon: -80.19 },
  { name: "Denver", lat: 39.74, lon: -104.99 },
  { name: "Montreal", lat: 45.50, lon: -73.57 },
  { name: "San Francisco", lat: 37.77, lon: -122.42 },
  { name: "Washington D.C.", lat: 38.91, lon: -77.04 },
  { name: "Atlanta", lat: 33.75, lon: -84.39 },
  { name: "Seattle", lat: 47.61, lon: -122.33 },
  { name: "Havana", lat: 23.11, lon: -82.37 },
  // South America
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Buenos Aires", lat: -34.60, lon: -58.38 },
  { name: "Rio de Janeiro", lat: -22.91, lon: -43.17 },
  { name: "Lima", lat: -12.05, lon: -77.04 },
  { name: "Bogotá", lat: 4.71, lon: -74.07 },
  { name: "Santiago", lat: -33.45, lon: -70.67 },
  { name: "Caracas", lat: 10.49, lon: -66.88 },
  // Europe
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Paris", lat: 48.86, lon: 2.35 },
  { name: "Berlin", lat: 52.52, lon: 13.41 },
  { name: "Madrid", lat: 40.42, lon: -3.70 },
  { name: "Rome", lat: 41.90, lon: 12.50 },
  { name: "Moscow", lat: 55.76, lon: 37.62 },
  { name: "Istanbul", lat: 41.01, lon: 28.98 },
  { name: "Stockholm", lat: 59.33, lon: 18.07 },
  { name: "Amsterdam", lat: 52.37, lon: 4.90 },
  { name: "Dublin", lat: 53.35, lon: -6.26 },
  { name: "Lisbon", lat: 38.72, lon: -9.14 },
  { name: "Warsaw", lat: 52.23, lon: 21.01 },
  { name: "Athens", lat: 37.98, lon: 23.73 },
  { name: "Kyiv", lat: 50.45, lon: 30.52 },
  // Africa
  { name: "Cairo", lat: 30.04, lon: 31.24 },
  { name: "Lagos", lat: 6.52, lon: 3.38 },
  { name: "Nairobi", lat: -1.29, lon: 36.82 },
  { name: "Cape Town", lat: -33.93, lon: 18.42 },
  { name: "Johannesburg", lat: -26.20, lon: 28.05 },
  { name: "Casablanca", lat: 33.57, lon: -7.59 },
  { name: "Addis Ababa", lat: 9.02, lon: 38.75 },
  { name: "Dakar", lat: 14.69, lon: -17.44 },
  // Middle East
  { name: "Dubai", lat: 25.20, lon: 55.27 },
  { name: "Riyadh", lat: 24.71, lon: 46.68 },
  { name: "Tehran", lat: 35.69, lon: 51.39 },
  { name: "Tel Aviv", lat: 32.09, lon: 34.78 },
  // Asia
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Beijing", lat: 39.90, lon: 116.40 },
  { name: "Shanghai", lat: 31.23, lon: 121.47 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
  { name: "Delhi", lat: 28.61, lon: 77.21 },
  { name: "Seoul", lat: 37.57, lon: 126.98 },
  { name: "Bangkok", lat: 13.76, lon: 100.50 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Jakarta", lat: -6.21, lon: 106.85 },
  { name: "Manila", lat: 14.60, lon: 120.98 },
  { name: "Hong Kong", lat: 22.32, lon: 114.17 },
  { name: "Taipei", lat: 25.03, lon: 121.57 },
  { name: "Osaka", lat: 34.69, lon: 135.50 },
  { name: "Kolkata", lat: 22.57, lon: 88.36 },
  // Oceania
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "Melbourne", lat: -37.81, lon: 144.96 },
  { name: "Auckland", lat: -36.85, lon: 174.76 },
  { name: "Perth", lat: -31.95, lon: 115.86 },
  { name: "Honolulu", lat: 21.31, lon: -157.86 },
  // Space-relevant
  { name: "Kennedy Space Center", lat: 28.57, lon: -80.65 },
  { name: "Baikonur Cosmodrome", lat: 45.96, lon: 63.31 },
  { name: "Kourou", lat: 5.24, lon: -52.77 },
];

/** Approximate great-circle distance in degrees (fast, no trig for ranking). */
function approxDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat1 - lat2;
  const dLon = (lon1 - lon2) * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return dLat * dLat + dLon * dLon;
}

/**
 * Map a lat/lon to a human-readable label.
 * Returns nearest city if within ~800km, otherwise falls back to region/ocean.
 */
export function latLonToRegion(lat: number, lon: number): string {
  // Ocean checks first (covers ~70% of Earth)
  if (lat > 70) return "the Arctic";
  if (lat < -65) return "Antarctica";

  // Check nearest city
  let bestDist = Infinity;
  let bestName = "";
  for (const lm of LANDMARKS) {
    const d = approxDist(lat, lon, lm.lat, lm.lon);
    if (d < bestDist) {
      bestDist = d;
      bestName = lm.name;
    }
  }
  // ~8 degrees ≈ ~800km at equator — close enough to name the city
  if (bestDist < 64) return bestName;

  // Fall back to ocean/region names
  // Pacific Ocean
  if ((lon > 140 || lon < -100) && lat > -50 && lat < 50) {
    if (lat > 20) return "the North Pacific";
    if (lat < -20) return "the South Pacific";
    return "the Pacific Ocean";
  }

  // Atlantic Ocean
  if (lon > -80 && lon < -5 && lat > -50 && lat < 50) {
    if (lat > 30) return "the North Atlantic";
    if (lat < -10) return "the South Atlantic";
    return "the Atlantic Ocean";
  }

  // Indian Ocean
  if (lon > 40 && lon < 120 && lat < 10 && lat > -50) {
    return "the Indian Ocean";
  }

  // Continents (broad fallback)
  if (lon > -140 && lon < -50 && lat > 15) return "North America";
  if (lon > -85 && lon < -30 && lat <= 15) return "South America";
  if (lon > -15 && lon < 45 && lat > 35) return "Europe";
  if (lon > -20 && lon < 55 && lat <= 35) return "Africa";
  if (lon > 60 && lon < 150 && lat > 10) return "Asia";
  if (lon > 110 && lon < 155 && lat < -10) return "Australia";

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
