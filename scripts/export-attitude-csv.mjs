// scripts/export-attitude-csv.mjs
// Export archived Orion attitude + solar array wing (SAW) telemetry to CSV.
//
// Reads raw AROW parameters from arow_telemetry.raw_params_json. The feed
// carries two attitude quaternion sets: params 2012-2015 are unit-normalized,
// while 2074-2077 (what the parsed quat_* columns hold) are not. Both are
// exported, each followed by its norm, so the recipient can judge for
// themselves.
//
// Usage:
//   node scripts/export-attitude-csv.mjs [dbPath] [outPath]
// Defaults: data/artemis.db -> data/orion-attitude-saw.csv

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = process.argv[2] ?? path.join(process.cwd(), "data", "artemis.db");
const outPath = process.argv[3] ?? path.join(process.cwd(), "data", "orion-attitude-saw.csv");

const RAD2DEG = 180 / Math.PI;

// Quaternion sets as [prefix, [w, x, y, z] AROW params]
const QUATS = [
  ["q2012", ["2012", "2013", "2014", "2015"]],
  ["q2074", ["2074", "2075", "2076", "2077"]],
];

// [csv column, AROW param, scale]
const COLUMNS = [
  ["saw1_deg", "5006", 1],
  ["saw2_deg", "5007", 1],
  ["saw3_deg", "5008", 1],
  ["saw4_deg", "5009", 1],
  ["saw1_inner_gimbal_deg", "2048", RAD2DEG],
  ["saw2_inner_gimbal_deg", "2049", RAD2DEG],
  ["saw3_inner_gimbal_deg", "2050", RAD2DEG],
  ["saw4_inner_gimbal_deg", "2051", RAD2DEG],
  ["saw1_outer_gimbal_deg", "2052", RAD2DEG],
  ["saw2_outer_gimbal_deg", "2053", RAD2DEG],
  ["saw3_outer_gimbal_deg", "2054", RAD2DEG],
  ["saw4_outer_gimbal_deg", "2055", RAD2DEG],
];

function num(raw, key) {
  const v = raw[key];
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const db = new Database(dbPath, { readonly: true, fileMustExist: true });

// Rows are keyed by the AROW data timestamp; the poller re-archives the same
// sample many times while the feed is stale, so keep one row per timestamp.
const rows = db.prepare(`
  SELECT timestamp, raw_params_json
  FROM arow_telemetry
  WHERE raw_params_json IS NOT NULL
  GROUP BY timestamp
  ORDER BY timestamp
`).all();

const fmt = (v) => (v == null ? "" : String(v));

const header = ["timestamp_utc"];
for (const [prefix] of QUATS) header.push(...["w", "x", "y", "z", "norm"].map((c) => `${prefix}_${c}`));
header.push(...COLUMNS.map(([name]) => name));

const lines = [header.join(",")];
let skipped = 0;

for (const { timestamp, raw_params_json } of rows) {
  let raw;
  try { raw = JSON.parse(raw_params_json); } catch { skipped++; continue; }

  const quats = QUATS.map(([, keys]) => keys.map((k) => num(raw, k)));
  const values = COLUMNS.map(([, key, scale]) => {
    const n = num(raw, key);
    return n == null ? null : n * scale;
  });

  // Drop rows with no attitude and no SAW data at all (feed dropouts).
  if ([...quats.flat(), ...values].every((v) => v == null)) { skipped++; continue; }

  const cells = [timestamp];
  for (const q of quats) {
    const norm = q.every((v) => v != null) ? Math.hypot(...q).toFixed(6) : null;
    cells.push(...q.map(fmt), fmt(norm));
  }
  cells.push(...values.map(fmt));
  lines.push(cells.join(","));
}

fs.writeFileSync(outPath, lines.join("\n") + "\n");
console.log(`[export] ${lines.length - 1} rows written to ${outPath} (${skipped} empty/invalid skipped)`);
if (rows.length) console.log(`[export] range: ${rows[0].timestamp} -> ${rows[rows.length - 1].timestamp}`);
