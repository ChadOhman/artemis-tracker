// src/lib/lunar-ground-track.ts
// Maps a Moon-relative position vector to a named lunar feature.
// The Moon is tidally locked, so we don't need to account for rotation —
// the near side always faces Earth. We project the spacecraft's position
// relative to the Moon onto selenographic lat/lon and find the nearest
// named feature.

const MOON_RADIUS_KM = 1737.4;

/** Major lunar features with selenographic lat/lon */
const LUNAR_FEATURES: { name: string; lat: number; lon: number }[] = [
  // Near side — maria
  { name: "Mare Tranquillitatis", lat: 8.5, lon: 31.4 },
  { name: "Mare Serenitatis", lat: 28, lon: 17.5 },
  { name: "Mare Imbrium", lat: 33, lon: -16 },
  { name: "Mare Crisium", lat: 17, lon: 59 },
  { name: "Mare Nectaris", lat: -15.2, lon: 35 },
  { name: "Mare Fecunditatis", lat: -7.8, lon: 51.3 },
  { name: "Mare Humorum", lat: -24.4, lon: -38.6 },
  { name: "Mare Nubium", lat: -21, lon: -17 },
  { name: "Mare Frigoris", lat: 56, lon: 1.4 },
  { name: "Oceanus Procellarum", lat: -18, lon: -57 },
  { name: "Mare Vaporum", lat: 13.3, lon: 3.6 },
  // Near side — craters
  { name: "Copernicus", lat: 9.6, lon: -20 },
  { name: "Tycho", lat: -43.3, lon: -11.2 },
  { name: "Kepler", lat: 8.1, lon: -38 },
  { name: "Aristarchus", lat: 23.7, lon: -47.4 },
  { name: "Plato", lat: 51.6, lon: -9.4 },
  { name: "Theophilus", lat: -11.4, lon: 26.3 },
  // Far side
  { name: "Mare Moscoviense", lat: 27, lon: 148 },
  { name: "Tsiolkovskiy", lat: -20, lon: 129 },
  { name: "Hertzsprung", lat: 2, lon: -129 },
  { name: "Apollo (crater)", lat: -36, lon: -151 },
  { name: "Korolev", lat: -4.5, lon: -157 },
  { name: "South Pole-Aitken Basin", lat: -53, lon: 169 },
  // Poles
  { name: "Lunar North Pole", lat: 89, lon: 0 },
  { name: "Lunar South Pole", lat: -89, lon: 0 },
  // Landing sites (historic)
  { name: "Apollo 11 site", lat: 0.67, lon: 23.47 },
  { name: "Apollo 17 site", lat: 20.19, lon: 30.77 },
];

/**
 * Compute selenographic latitude/longitude from a Moon-relative position
 * vector. The input vector is in J2000 equatorial (EME2000/ICRF)
 * coordinates centered on the Moon. Since the Moon is tidally locked with
 * its near side toward Earth (approximately along the -Earth→Moon
 * direction), we project the position onto a frame where the sub-Earth
 * point is at lon=0.
 *
 * @param relPosition Orion position minus Moon position (J2000 equatorial km)
 * @param moonPosition Moon position from Earth center (J2000 equatorial km)
 */
export function moonRelativeToSelenographic(
  relPosition: { x: number; y: number; z: number },
  moonPosition: { x: number; y: number; z: number },
): { lat: number; lon: number } {
  // Build a frame aligned with the Moon:
  //   u = unit vector from Moon toward Earth (= -moonPosition normalized)
  //   w = J2000 equatorial north (0, 0, 1) — approximation; the true lunar
  //       pole is offset from this by ~1.5° but it's adequate for naming
  //       lunar features
  //   v = w × u (east in selenographic frame)
  const mx = moonPosition.x, my = moonPosition.y, mz = moonPosition.z;
  const mMag = Math.sqrt(mx * mx + my * my + mz * mz);
  if (mMag === 0) return { lat: 0, lon: 0 };

  // u = toward Earth (sub-Earth point = selenographic lon 0)
  const ux = -mx / mMag, uy = -my / mMag, uz = -mz / mMag;
  // w = ecliptic north
  const wx = 0, wy = 0, wz = 1;
  // v = w × u
  let vx = wy * uz - wz * uy;
  let vy = wz * ux - wx * uz;
  let vz = wx * uy - wy * ux;
  const vMag = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (vMag > 0) { vx /= vMag; vy /= vMag; vz /= vMag; }
  // Recompute w = u × v for a proper orthonormal frame
  const nwx = uy * vz - uz * vy;
  const nwy = uz * vx - ux * vz;
  const nwz = ux * vy - uy * vx;

  // Project relPosition onto the frame
  const px = relPosition.x * ux + relPosition.y * uy + relPosition.z * uz; // toward Earth
  const py = relPosition.x * vx + relPosition.y * vy + relPosition.z * vz; // east
  const pz = relPosition.x * nwx + relPosition.y * nwy + relPosition.z * nwz; // north

  const r = Math.sqrt(px * px + py * py + pz * pz);
  if (r === 0) return { lat: 0, lon: 0 };

  const lat = Math.asin(pz / r) * (180 / Math.PI);
  const lon = Math.atan2(py, px) * (180 / Math.PI); // lon=0 = sub-Earth
  return { lat, lon };
}

function haversineDistDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * (180 / Math.PI);
}

/**
 * Get a display label for Orion's position relative to the Moon.
 */
export function getLunarGroundTrackLabel(
  relPosition: { x: number; y: number; z: number },
  moonPosition: { x: number; y: number; z: number },
): string {
  const { lat, lon } = moonRelativeToSelenographic(relPosition, moonPosition);

  // Find nearest named feature
  let nearest = LUNAR_FEATURES[0];
  let nearestDist = Infinity;
  for (const f of LUNAR_FEATURES) {
    const d = haversineDistDeg(lat, lon, f.lat, f.lon);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = f;
    }
  }

  // Determine near/far side
  const isFarSide = Math.abs(lon) > 90;

  if (nearestDist < 15) {
    return `Over ${nearest.name}`;
  }
  return isFarSide ? "Over the Lunar Far Side" : "Over the Lunar Near Side";
}
