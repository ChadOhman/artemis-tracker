// src/lib/db.ts
// SQLite database for archiving all telemetry data.
// Stores JPL state vectors, AROW telemetry, DSN status, and solar activity
// with timestamps for historical queries.

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "artemis.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure data directory exists
  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS state_vectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      met_ms REAL NOT NULL,
      pos_x REAL NOT NULL,
      pos_y REAL NOT NULL,
      pos_z REAL NOT NULL,
      vel_x REAL NOT NULL,
      vel_y REAL NOT NULL,
      vel_z REAL NOT NULL,
      moon_x REAL,
      moon_y REAL,
      moon_z REAL,
      speed_km_s REAL,
      speed_km_h REAL,
      altitude_km REAL,
      earth_dist_km REAL,
      moon_dist_km REAL,
      periapsis_km REAL,
      apoapsis_km REAL,
      g_force REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS arow_telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      quat_w REAL,
      quat_x REAL,
      quat_y REAL,
      quat_z REAL,
      euler_roll REAL,
      euler_pitch REAL,
      euler_yaw REAL,
      roll_rate REAL,
      pitch_rate REAL,
      yaw_rate REAL,
      ant_az1 REAL,
      ant_el1 REAL,
      ant_az2 REAL,
      ant_el2 REAL,
      saw1 REAL,
      saw2 REAL,
      saw3 REAL,
      saw4 REAL,
      icps_qw REAL,
      icps_qx REAL,
      icps_qy REAL,
      icps_qz REAL,
      icps_active INTEGER,
      spacecraft_mode TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dsn_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      signal_active INTEGER NOT NULL,
      dishes_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS solar_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      kp_index REAL,
      kp_label TEXT,
      xray_flux REAL,
      xray_class TEXT,
      proton_1mev REAL,
      proton_10mev REAL,
      proton_100mev REAL,
      radiation_risk TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sv_timestamp ON state_vectors(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sv_met ON state_vectors(met_ms);
    CREATE INDEX IF NOT EXISTS idx_arow_timestamp ON arow_telemetry(timestamp);
    CREATE INDEX IF NOT EXISTS idx_dsn_timestamp ON dsn_contacts(timestamp);
    CREATE INDEX IF NOT EXISTS idx_solar_timestamp ON solar_activity(timestamp);
  `);

  return _db;
}

// ---------------------------------------------------------------------------
// Insert functions
// ---------------------------------------------------------------------------

export function archiveStateVector(
  sv: { timestamp: string; metMs: number; position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } },
  moon: { x: number; y: number; z: number } | null,
  telemetry: { speedKmS: number; speedKmH: number; altitudeKm: number; earthDistKm: number; moonDistKm: number; periapsisKm: number; apoapsisKm: number; gForce: number } | null
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO state_vectors (timestamp, met_ms, pos_x, pos_y, pos_z, vel_x, vel_y, vel_z,
      moon_x, moon_y, moon_z, speed_km_s, speed_km_h, altitude_km, earth_dist_km,
      moon_dist_km, periapsis_km, apoapsis_km, g_force)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    sv.timestamp, sv.metMs,
    sv.position.x, sv.position.y, sv.position.z,
    sv.velocity.x, sv.velocity.y, sv.velocity.z,
    moon?.x ?? null, moon?.y ?? null, moon?.z ?? null,
    telemetry?.speedKmS ?? null, telemetry?.speedKmH ?? null,
    telemetry?.altitudeKm ?? null, telemetry?.earthDistKm ?? null,
    telemetry?.moonDistKm ?? null, telemetry?.periapsisKm ?? null,
    telemetry?.apoapsisKm ?? null, telemetry?.gForce ?? null
  );
}

export function archiveArow(arow: {
  timestamp: string;
  quaternion: { w: number; x: number; y: number; z: number } | null;
  eulerDeg: { roll: number; pitch: number; yaw: number } | null;
  rollRate: number | null;
  pitchRate: number | null;
  yawRate: number | null;
  antennaGimbal: { az1: number; el1: number; az2: number; el2: number } | null;
  sawAngles: { saw1: number; saw2: number; saw3: number; saw4: number } | null;
  icps: { quaternion: { w: number; x: number; y: number; z: number }; active: boolean };
  spacecraftMode: string;
}): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO arow_telemetry (timestamp, quat_w, quat_x, quat_y, quat_z,
      euler_roll, euler_pitch, euler_yaw, roll_rate, pitch_rate, yaw_rate,
      ant_az1, ant_el1, ant_az2, ant_el2, saw1, saw2, saw3, saw4,
      icps_qw, icps_qx, icps_qy, icps_qz, icps_active, spacecraft_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    arow.timestamp,
    arow.quaternion?.w ?? null, arow.quaternion?.x ?? null,
    arow.quaternion?.y ?? null, arow.quaternion?.z ?? null,
    arow.eulerDeg?.roll ?? null, arow.eulerDeg?.pitch ?? null, arow.eulerDeg?.yaw ?? null,
    arow.rollRate, arow.pitchRate, arow.yawRate,
    arow.antennaGimbal?.az1 ?? null, arow.antennaGimbal?.el1 ?? null,
    arow.antennaGimbal?.az2 ?? null, arow.antennaGimbal?.el2 ?? null,
    arow.sawAngles?.saw1 ?? null, arow.sawAngles?.saw2 ?? null,
    arow.sawAngles?.saw3 ?? null, arow.sawAngles?.saw4 ?? null,
    arow.icps.quaternion.w, arow.icps.quaternion.x,
    arow.icps.quaternion.y, arow.icps.quaternion.z,
    arow.icps.active ? 1 : 0, arow.spacecraftMode
  );
}

export function archiveDsn(dsn: {
  timestamp: string;
  signalActive: boolean;
  dishes: unknown[];
}): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO dsn_contacts (timestamp, signal_active, dishes_json)
    VALUES (?, ?, ?)
  `);
  stmt.run(dsn.timestamp, dsn.signalActive ? 1 : 0, JSON.stringify(dsn.dishes));
}

export function archiveSolar(solar: {
  timestamp: string;
  kpIndex: number;
  kpLabel: string;
  xrayFlux: number;
  xrayClass: string;
  protonFlux1MeV: number;
  protonFlux10MeV: number;
  protonFlux100MeV: number;
  radiationRisk: string;
}): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO solar_activity (timestamp, kp_index, kp_label, xray_flux, xray_class,
      proton_1mev, proton_10mev, proton_100mev, radiation_risk)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    solar.timestamp, solar.kpIndex, solar.kpLabel,
    solar.xrayFlux, solar.xrayClass,
    solar.protonFlux1MeV, solar.protonFlux10MeV, solar.protonFlux100MeV,
    solar.radiationRisk
  );
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

export function getStateVectorHistory(fromMs: number, toMs: number): {
  timestamp: string;
  met_ms: number;
  pos_x: number; pos_y: number; pos_z: number;
  vel_x: number; vel_y: number; vel_z: number;
  earth_dist_km: number; moon_dist_km: number;
  speed_km_s: number; altitude_km: number;
}[] {
  const db = getDb();
  return db.prepare(`
    SELECT timestamp, met_ms, pos_x, pos_y, pos_z, vel_x, vel_y, vel_z,
           earth_dist_km, moon_dist_km, speed_km_s, altitude_km
    FROM state_vectors WHERE met_ms >= ? AND met_ms <= ?
    ORDER BY met_ms
  `).all(fromMs, toMs) as any[];
}

export function getSolarHistory(hours: number): {
  timestamp: string;
  kp_index: number;
  xray_flux: number;
  proton_10mev: number;
  radiation_risk: string;
}[] {
  const db = getDb();
  return db.prepare(`
    SELECT timestamp, kp_index, xray_flux, proton_10mev, radiation_risk
    FROM solar_activity
    WHERE created_at >= datetime('now', ? || ' hours')
    ORDER BY created_at
  `).all(-hours) as any[];
}

/**
 * Get DSN bandwidth history over the last N minutes.
 * Returns rows with aggregated downlink/uplink rates.
 */
export function getDsnBandwidthHistory(minutes: number): {
  timestamp: string;
  signal_active: number;
  dishes_json: string;
}[] {
  const db = getDb();
  return db.prepare(`
    SELECT timestamp, signal_active, dishes_json
    FROM dsn_contacts
    WHERE created_at >= datetime('now', ? || ' minutes')
    ORDER BY created_at
  `).all(-minutes) as any[];
}

/** Delete data older than the given number of days. */
export function pruneOldData(retentionDays = 14): void {
  const db = getDb();
  const threshold = `-${retentionDays} days`;
  db.prepare("DELETE FROM arow_telemetry WHERE created_at < datetime('now', ?)").run(threshold);
  db.prepare("DELETE FROM dsn_contacts WHERE created_at < datetime('now', ?)").run(threshold);
  db.prepare("DELETE FROM solar_activity WHERE created_at < datetime('now', ?)").run(threshold);
  // Keep state_vectors longer — they're less frequent and more valuable
  db.prepare("DELETE FROM state_vectors WHERE created_at < datetime('now', ?)").run(`-${retentionDays * 2} days`);
  db.exec("PRAGMA optimize");
}

export function getCumulativeProtonDose(): {
  total_hours: number;
  avg_proton_10mev: number;
  max_proton_10mev: number;
  readings: number;
}  {
  const db = getDb();
  const result = db.prepare(`
    SELECT
      COUNT(*) as readings,
      AVG(proton_10mev) as avg_proton_10mev,
      MAX(proton_10mev) as max_proton_10mev,
      (JULIANDAY(MAX(created_at)) - JULIANDAY(MIN(created_at))) * 24 as total_hours
    FROM solar_activity
    WHERE proton_10mev IS NOT NULL
  `).get() as any;
  return result || { total_hours: 0, avg_proton_10mev: 0, max_proton_10mev: 0, readings: 0 };
}
