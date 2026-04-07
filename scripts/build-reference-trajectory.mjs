// Build a 2D reference trajectory for OrbitMapPanel from real Artemis II
// state vectors. Sources, in time order:
//
//   1. JPL Horizons API (target '-1024', REF_PLANE='FRAME'). Cached at
//      data/ephemeris/artemis2-horizons-gap.txt. Covers MET ~3.4 h → ~3.25 d.
//   2. NASA/JSC/FOD/FDO Artemis II OEM (CCSDS OEM v2.0, EME2000) at
//      data/ephemeris/artemis2-oem.asc. Covers MET ~3.25 d → entry interface.
//
// Both sources are in EME2000 (ICRF / J2000 equator), so they share one
// projection path. There is no synthetic data — the curve simply starts at
// MET ~3.4 h, the earliest moment Horizons reports for spacecraft -1024.
//
// Projection: top-down (looking down the J2000 +Z axis) X-Y plane, then
// rotated about +Z so the Earth → Moon axis at closest approach lies
// along +X. We rotate using the Moon's actual position (not the
// spacecraft's apogee) so the Moon graphic at (1, 0) lines up with where
// the Moon really was when Orion was closest. The spacecraft apogee then
// projects to slightly past (1, 0), which is geometrically correct for a
// far-side free-return flyby. The Z component is dropped — the curve only
// sweeps ~±15,000 km off the Earth-Moon line in this view.
//
// Coordinates are normalized by |Moon_xy| at closest approach (~360,000
// km, exported as MOON_DIST_KM), so the Moon sits at exactly (1, 0).
//
// The script also exports PROJECTION_COS / PROJECTION_SIN so the panel
// can apply the *same* rotation to live JPL Horizons telemetry and the
// orion dot will land exactly on the curve.

import fs from "node:fs";
import path from "node:path";

const OEM_PATH = "data/ephemeris/artemis2-oem.asc";
const HORIZONS_PATH = "data/ephemeris/artemis2-horizons-gap.txt";
const MOON_PATH = "data/ephemeris/artemis2-moon-at-apogee.txt";
const OUT_PATH = "src/data/reference-trajectory.ts";
const LAUNCH_ISO = "2026-04-01T22:35:00Z";

// Curvature-based downsampling tolerance, in normalized units (1 = scale).
// The panel renders the Earth-Moon span across ~76% of the canvas width
// (~600 px on a 800-px panel), so 1 normalized unit ≈ 600 px and a
// tolerance of 0.0008 corresponds to roughly half a pixel at typical sizes.
// Smaller → more points, smoother curves; larger → fewer points.
const RDP_EPSILON = 0.0008;

// ---- OEM parser ----------------------------------------------------------
function parseOem(text) {
  const points = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("CCSDS") || line.startsWith("COMMENT")) continue;
    if (line.startsWith("META") || line.startsWith("CREATION")) continue;
    if (line.startsWith("ORIGINATOR")) continue;
    if (line.includes("=")) continue;
    const parts = line.split(/\s+/);
    if (parts.length !== 7) continue;
    const ms = Date.parse(parts[0].endsWith("Z") ? parts[0] : parts[0] + "Z");
    if (Number.isNaN(ms)) continue;
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const z = parseFloat(parts[3]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    points.push({ ms, x, y, z });
  }
  return points;
}

// ---- JPL Horizons text parser --------------------------------------------
const MONTH = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseHorizons(text) {
  const points = [];
  const soe = text.indexOf("$$SOE");
  const eoe = text.indexOf("$$EOE");
  if (soe === -1 || eoe === -1) return points;
  const lines = text.slice(soe + 5, eoe).trim().split("\n").map((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const dateMatch = lines[i].match(
      /A\.D\.\s+(\d{4})-([A-Za-z]+)-(\d{2})\s+(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/
    );
    if (!dateMatch) continue;
    const month = MONTH[dateMatch[2]] || "01";
    const iso = `${dateMatch[1]}-${month}-${dateMatch[3]}T${dateMatch[4]}Z`;
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) continue;
    if (i + 2 >= lines.length) break;
    const posMatch = lines[i + 1].match(
      /X\s*=\s*([-\d.E+]+)\s+Y\s*=\s*([-\d.E+]+)\s+Z\s*=\s*([-\d.E+]+)/
    );
    if (!posMatch) continue;
    points.push({
      ms,
      x: parseFloat(posMatch[1]),
      y: parseFloat(posMatch[2]),
      z: parseFloat(posMatch[3]),
    });
    i += 2;
  }
  return points;
}

// ---- Curvature-based downsampling (Douglas-Peucker) ----------------------
// Iterative implementation so we never blow the stack on long inputs.
function perpendicularDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const cross = (p.x - a.x) * dy - (p.y - a.y) * dx;
  return Math.abs(cross) / Math.sqrt(len2);
}

function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return points.slice();
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [i0, i1] = stack.pop();
    let maxDist = 0;
    let maxIdx = -1;
    const a = points[i0];
    const b = points[i1];
    for (let i = i0 + 1; i < i1; i++) {
      const d = perpendicularDistance(points[i], a, b);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > epsilon && maxIdx >= 0) {
      keep[maxIdx] = true;
      stack.push([i0, maxIdx]);
      stack.push([maxIdx, i1]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// ---- Moon position parser (single-point Horizons file) -------------------
function parseMoonPosition(text) {
  const m = parseHorizons(text);
  if (m.length === 0) throw new Error("No moon state vectors parsed");
  return m[0];
}

// ---- Main ---------------------------------------------------------------
const launchMs = Date.parse(LAUNCH_ISO);

const oemStates = parseOem(fs.readFileSync(OEM_PATH, "utf8"));
const horizonsStates = parseHorizons(fs.readFileSync(HORIZONS_PATH, "utf8"));
const moonAtApogee = parseMoonPosition(fs.readFileSync(MOON_PATH, "utf8"));
console.log(`Parsed ${oemStates.length} OEM states + ${horizonsStates.length} Horizons states`);
console.log(
  `Moon at apogee time (${new Date(moonAtApogee.ms).toISOString()}): ` +
  `(${moonAtApogee.x.toFixed(0)}, ${moonAtApogee.y.toFixed(0)}, ${moonAtApogee.z.toFixed(0)}) km`
);
if (oemStates.length === 0) throw new Error("No state vectors parsed from OEM");

// Combine: Horizons covers the early trans-lunar coast, OEM is authoritative
// for the later flyby + return. Drop any Horizons point that overlaps the
// OEM range to avoid duplicates and source conflicts.
const oemStartMs = oemStates[0].ms;
const horizonsBefore = horizonsStates.filter((s) => s.ms < oemStartMs);
const allStates = [...horizonsBefore, ...oemStates].sort((a, b) => a.ms - b.ms);
console.log(
  `Combined: ${allStates.length} state vectors ` +
  `(MET ${((allStates[0].ms - launchMs) / 3600000).toFixed(2)}h → ` +
  `${((allStates[allStates.length - 1].ms - launchMs) / 86400000).toFixed(2)}d)`
);

// Find spacecraft apogee for log/sanity purposes only — the rotation and
// normalization come from the Moon's position at this same instant, not
// from the spacecraft's apogee position.
let apogeeIdx = 0;
let apogeeR = 0;
for (let i = 0; i < allStates.length; i++) {
  const s = allStates[i];
  const r = Math.hypot(s.x, s.y, s.z);
  if (r > apogeeR) { apogeeR = r; apogeeIdx = i; }
}
const apogee = allStates[apogeeIdx];
console.log(
  `Spacecraft apogee: idx=${apogeeIdx} t=${new Date(apogee.ms).toISOString()} ` +
  `r=${apogeeR.toFixed(0)}km z=${apogee.z.toFixed(0)}km`
);

// Rotation about +Z that maps the MOON's XY direction (at apogee time)
// onto +X — this puts the Moon at exactly (1, 0) after normalization, and
// the spacecraft trajectory peaks just outside the Moon graphic on the
// far side because the closest approach is on the lunar far side.
//
// Normalization scale = |Moon_xy| at apogee, NOT the standard 384,400 km.
// This makes the panel's Moon-at-(1,0) graphic geometrically correct in
// the projected XY plane.
const MOON_XY_KM = Math.hypot(moonAtApogee.x, moonAtApogee.y);
const COS = moonAtApogee.x / MOON_XY_KM;
const SIN = moonAtApogee.y / MOON_XY_KM;
console.log(
  `Rotation: θ=${(Math.atan2(SIN, COS) * 180 / Math.PI).toFixed(3)}° ` +
  `(Moon XY angle at apogee)`
);
console.log(`Normalization scale |Moon_xy| = ${MOON_XY_KM.toFixed(0)} km (1 unit)`);

function project(s) {
  return {
    x: ( s.x * COS + s.y * SIN) / MOON_XY_KM,
    y: (-s.x * SIN + s.y * COS) / MOON_XY_KM,
    metMs: s.ms - launchMs,
  };
}

const projected = allStates.map(project);
console.log(
  `Pre-simplification: ${projected.length} points; ` +
  `spacecraft at apogee in projected frame: ` +
  `(${projected[apogeeIdx].x.toFixed(4)}, ${projected[apogeeIdx].y.toFixed(4)})`
);

// Curvature-based simplification (Douglas-Peucker). Keeps lots of points
// where the trajectory is bending sharply (around closest approach,
// re-entry) and very few where it's nearly straight (mid-cruise).
const sampled = douglasPeucker(projected, RDP_EPSILON);
console.log(
  `After RDP simplification (ε=${RDP_EPSILON}): ${sampled.length} points ` +
  `(${(100 * sampled.length / projected.length).toFixed(1)}% of input)`
);

// Re-find spacecraft apogee in the simplified array.
let sampledApogeeIdx = 0;
let sampledApogeeR = 0;
for (let i = 0; i < sampled.length; i++) {
  const r = Math.hypot(sampled[i].x, sampled[i].y);
  if (r > sampledApogeeR) { sampledApogeeR = r; sampledApogeeIdx = i; }
}
const ap = sampled[sampledApogeeIdx];
console.log(
  `Sampled apogee: idx=${sampledApogeeIdx} pos=(${ap.x.toFixed(4)}, ${ap.y.toFixed(4)}) ` +
  `met=${(ap.metMs / 86400000).toFixed(3)}d`
);
const last = sampled[sampled.length - 1];
console.log(
  `First point: pos=(${sampled[0].x.toFixed(4)}, ${sampled[0].y.toFixed(4)}) ` +
  `met=${(sampled[0].metMs / 3600000).toFixed(2)}h`
);
console.log(
  `Last point: pos=(${last.x.toFixed(4)}, ${last.y.toFixed(4)}) ` +
  `met=${(last.metMs / 86400000).toFixed(3)}d`
);

// ---- Emit TS module ------------------------------------------------------
const lines = [
  "// AUTO-GENERATED by scripts/build-reference-trajectory.mjs",
  "// Sources:",
  "//   - JPL Horizons API (target '-1024', REF_PLANE='FRAME', 5-min step),",
  "//     covering MET ~3.4 h → ~3.25 d (the trans-lunar coast).",
  "//   - NASA/JSC/FOD/FDO Artemis II OEM (Pre-OTC3 to EI), CCSDS OEM v2.0,",
  "//     covering MET ~3.25 d → entry interface.",
  "//   - JPL Horizons (target '301'), single Moon state vector at the",
  "//     apogee instant — defines the rotation and the normalization scale.",
  "// All sources are EME2000 (J2000 equator) Earth-centered Cartesian.",
  "//",
  "// Projection: EME2000 X-Y plane (looking down the celestial north / +Z),",
  "// rotated about +Z so the Earth → Moon axis at apogee time lies along",
  "// +X. The Z component is dropped — in this top-down view the curve",
  "// sweeps only ±15,000 km or so off the Earth-Moon line. Coordinates are",
  "// normalized by |Moon_xy| at apogee (the Moon's XY-projected distance",
  "// from Earth at closest approach), so the Moon sits at exactly (1, 0)",
  "// and Earth at (0, 0). The spacecraft trajectory peaks just outside the",
  "// Moon graphic on the far side because closest approach is on the lunar",
  "// far side (free-return geometry).",
  "//",
  "// Curvature-based downsampling (Douglas-Peucker, ε ≈ ½ pixel) keeps",
  "// many points around sharp bends (closest approach, re-entry) and very",
  "// few in the mid-cruise where the trajectory is nearly straight.",
  "//",
  "// DO NOT EDIT BY HAND — re-run the build script to refresh.",
  "",
  "export interface ReferencePoint {",
  "  /** Rotated EME2000 X / MOON_DIST_KM (Earth-Moon axis at closest approach is +X). */",
  "  x: number;",
  "  /** Rotated EME2000 Y / MOON_DIST_KM (perpendicular component in XY). */",
  "  y: number;",
  "  /** Mission Elapsed Time in milliseconds since launch. */",
  "  metMs: number;",
  "}",
  "",
  "export const REFERENCE_TRAJECTORY: ReadonlyArray<ReferencePoint> = [",
];
for (const p of sampled) {
  lines.push(`  { x: ${p.x.toFixed(6)}, y: ${p.y.toFixed(6)}, metMs: ${p.metMs} },`);
}
lines.push("];");
lines.push("");
lines.push("/** Index of apogee (max XY distance from Earth) in REFERENCE_TRAJECTORY.");
lines.push(" *  Used as the outbound/return split: x is monotonically increasing on");
lines.push(" *  [0, APOGEE_INDEX] and decreasing on [APOGEE_INDEX, end]. */");
lines.push(`export const APOGEE_INDEX = ${sampledApogeeIdx};`);
lines.push("");
lines.push("/** cos / sin of the rotation that aligns the Earth → Moon axis (at");
lines.push(" *  closest approach time) with +X. To project a *live* J2000 spacecraft");
lines.push(" *  (or Moon) position into the same frame as REFERENCE_TRAJECTORY:");
lines.push(" *    xn = ( pos.x * PROJECTION_COS + pos.y * PROJECTION_SIN) / MOON_DIST_KM;");
lines.push(" *    yn = (-pos.x * PROJECTION_SIN + pos.y * PROJECTION_COS) / MOON_DIST_KM;");
lines.push(" *  Drops Z — the rendering is a top-down (X-Y) view. */");
lines.push(`export const PROJECTION_COS = ${COS.toFixed(12)};`);
lines.push(`export const PROJECTION_SIN = ${SIN.toFixed(12)};`);
lines.push("");
lines.push("/** Normalization scale: |Moon_xy| at apogee, in km.");
lines.push(" *  This is the Moon's XY-projected distance from Earth at closest");
lines.push(" *  approach time, NOT the standard 384,400 km. Multiplying a");
lines.push(" *  REFERENCE_TRAJECTORY x or y value by this constant gives km in the");
lines.push(" *  rotated EME2000 XY frame. The Moon graphic in the panel is drawn at");
lines.push(" *  (1, 0), which corresponds to this distance. */");
lines.push(`export const MOON_DIST_KM = ${Math.round(MOON_XY_KM)};`);
lines.push("");

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, lines.join("\n"));
console.log(`Wrote ${OUT_PATH}`);
