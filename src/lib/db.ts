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

  runMigrations(_db);

  return _db;
}

// ---------------------------------------------------------------------------
// Migrations — tracked via SQLite's PRAGMA user_version so each runs once.
// ---------------------------------------------------------------------------
function runMigrations(db: Database.Database): void {
  const currentVersion = (db.pragma("user_version", { simple: true }) as number) || 0;

  // Migration 1: AROW angular rates were archived in rad/s × 57.3 (doubly
  // scaled) because the parser treated param 2091/2092/2093 as radians and
  // multiplied by RAD2DEG. The raw feed is already in °/s, so every archived
  // row has rate values 57.3× too large. Divide them back.
  if (currentVersion < 1) {
    const RAD2DEG = 180 / Math.PI;
    db.prepare(`
      UPDATE arow_telemetry
      SET roll_rate  = roll_rate  / ?,
          pitch_rate = pitch_rate / ?,
          yaw_rate   = yaw_rate   / ?
      WHERE roll_rate IS NOT NULL
         OR pitch_rate IS NOT NULL
         OR yaw_rate IS NOT NULL
    `).run(RAD2DEG, RAD2DEG, RAD2DEG);
    db.pragma("user_version = 1");
    console.log("[db] migration 1 applied: normalized AROW angular rates to °/s");
  }

  // Migration 2: Add moon_rel_speed_km_h column to state_vectors.
  if (currentVersion < 2) {
    try {
      db.exec("ALTER TABLE state_vectors ADD COLUMN moon_rel_speed_km_h REAL");
    } catch {
      // Column may already exist if the table was created after this code shipped
    }
    db.pragma("user_version = 2");
    console.log("[db] migration 2 applied: added moon_rel_speed_km_h column");
  }

  // Migration 3: Add RCS thruster and SAW gimbal columns to arow_telemetry.
  if (currentVersion < 3) {
    const cols = [
      "rcs_thrusters_json TEXT",
      "rcs_status1 TEXT",
      "rcs_status2 TEXT",
      "saw1_ig REAL", "saw1_og REAL",
      "saw2_ig REAL", "saw2_og REAL",
      "saw3_ig REAL", "saw3_og REAL",
      "saw4_ig REAL", "saw4_og REAL",
    ];
    for (const col of cols) {
      try { db.exec(`ALTER TABLE arow_telemetry ADD COLUMN ${col}`); } catch { /* may exist */ }
    }
    db.pragma("user_version = 3");
    console.log("[db] migration 3 applied: added RCS thruster + SAW gimbal columns");
  }

  // Migration 4: Add raw_params_json column for complete AROW data capture.
  // Stores a compact {paramNum: value} JSON (~2 KB) so we archive every
  // parameter, even ones we don't parse yet.
  if (currentVersion < 4) {
    try { db.exec("ALTER TABLE arow_telemetry ADD COLUMN raw_params_json TEXT"); } catch { /* may exist */ }
    db.pragma("user_version = 4");
    console.log("[db] migration 4 applied: added raw_params_json column");
  }

  // Migration 5: Page view counter — simple server-side analytics, no cookies/PII.
  if (currentVersion < 5) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS page_views (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        count INTEGER NOT NULL DEFAULT 0
      );
      INSERT OR IGNORE INTO page_views (id, count) VALUES (1, 625000);
    `);
    db.pragma("user_version = 5");
    console.log("[db] migration 5 applied: added page_views counter");
  }

  // Migration 6: subscribers table for email signups
  if (currentVersion < 6) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.pragma("user_version = 6");
  }
}

// ---------------------------------------------------------------------------
// Insert functions
// ---------------------------------------------------------------------------

export function archiveStateVector(
  sv: { timestamp: string; metMs: number; position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } },
  moon: { x: number; y: number; z: number } | null,
  telemetry: { speedKmS: number; speedKmH: number; moonRelSpeedKmH: number; altitudeKm: number; earthDistKm: number; moonDistKm: number; periapsisKm: number; apoapsisKm: number; gForce: number } | null
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO state_vectors (timestamp, met_ms, pos_x, pos_y, pos_z, vel_x, vel_y, vel_z,
      moon_x, moon_y, moon_z, speed_km_s, speed_km_h, moon_rel_speed_km_h, altitude_km, earth_dist_km,
      moon_dist_km, periapsis_km, apoapsis_km, g_force)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    sv.timestamp, sv.metMs,
    sv.position.x, sv.position.y, sv.position.z,
    sv.velocity.x, sv.velocity.y, sv.velocity.z,
    moon?.x ?? null, moon?.y ?? null, moon?.z ?? null,
    telemetry?.speedKmS ?? null, telemetry?.speedKmH ?? null,
    telemetry?.moonRelSpeedKmH ?? null,
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
  rcsThrusters: { thrusters: Record<string, boolean>; status1: string | null; status2: string | null } | null;
  sawGimbals: { saw1: { ig: number; og: number }; saw2: { ig: number; og: number }; saw3: { ig: number; og: number }; saw4: { ig: number; og: number } } | null;
  icps: { quaternion: { w: number; x: number; y: number; z: number }; active: boolean };
  spacecraftMode: string;
}, rawParamsJson?: string | null): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO arow_telemetry (timestamp, quat_w, quat_x, quat_y, quat_z,
      euler_roll, euler_pitch, euler_yaw, roll_rate, pitch_rate, yaw_rate,
      ant_az1, ant_el1, ant_az2, ant_el2, saw1, saw2, saw3, saw4,
      icps_qw, icps_qx, icps_qy, icps_qz, icps_active, spacecraft_mode,
      rcs_thrusters_json, rcs_status1, rcs_status2,
      saw1_ig, saw1_og, saw2_ig, saw2_og, saw3_ig, saw3_og, saw4_ig, saw4_og,
      raw_params_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    arow.icps.active ? 1 : 0, arow.spacecraftMode,
    arow.rcsThrusters ? JSON.stringify(arow.rcsThrusters.thrusters) : null,
    arow.rcsThrusters?.status1 ?? null,
    arow.rcsThrusters?.status2 ?? null,
    arow.sawGimbals?.saw1.ig ?? null, arow.sawGimbals?.saw1.og ?? null,
    arow.sawGimbals?.saw2.ig ?? null, arow.sawGimbals?.saw2.og ?? null,
    arow.sawGimbals?.saw3.ig ?? null, arow.sawGimbals?.saw3.og ?? null,
    arow.sawGimbals?.saw4.ig ?? null, arow.sawGimbals?.saw4.og ?? null,
    rawParamsJson ?? null,
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

/**
 * Get a downsampled time series for a state_vectors column.
 * Used for sparklines — returns ~N evenly-spaced points from the last `hours`.
 */
export function getMetricHistory(
  column: "speed_km_s" | "speed_km_h" | "moon_rel_speed_km_h" | "altitude_km" | "earth_dist_km" | "moon_dist_km" | "g_force",
  hours: number,
  maxPoints = 60
): { ts: number; value: number }[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT timestamp, ${column} as value
    FROM state_vectors
    WHERE created_at >= datetime('now', ? || ' hours')
    AND ${column} IS NOT NULL
    ORDER BY created_at
  `).all(-hours) as { timestamp: string; value: number }[];

  if (rows.length <= maxPoints) {
    return rows.map((r) => ({ ts: new Date(r.timestamp).getTime(), value: r.value }));
  }

  // Downsample
  const step = rows.length / maxPoints;
  const out: { ts: number; value: number }[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.floor(i * step);
    const row = rows[idx];
    out.push({ ts: new Date(row.timestamp).getTime(), value: row.value });
  }
  return out;
}

/** Get solar activity metric history for sparklines. */
export function getSolarMetricHistory(
  column: "kp_index" | "xray_flux" | "proton_10mev",
  hours: number,
  maxPoints = 60
): { ts: number; value: number }[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT timestamp, ${column} as value
    FROM solar_activity
    WHERE created_at >= datetime('now', ? || ' hours')
    AND ${column} IS NOT NULL
    ORDER BY created_at
  `).all(-hours) as { timestamp: string; value: number }[];

  if (rows.length <= maxPoints) {
    return rows.map((r) => ({ ts: new Date(r.timestamp).getTime(), value: r.value }));
  }
  const step = rows.length / maxPoints;
  const out: { ts: number; value: number }[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.floor(i * step);
    const row = rows[idx];
    out.push({ ts: new Date(row.timestamp).getTime(), value: row.value });
  }
  return out;
}

/** Get the closest state_vector snapshot at or before a given MET time. */
export function getStateSnapshotAt(metMs: number): {
  timestamp: string;
  met_ms: number;
  pos_x: number; pos_y: number; pos_z: number;
  vel_x: number; vel_y: number; vel_z: number;
  moon_x: number | null; moon_y: number | null; moon_z: number | null;
  earth_dist_km: number; moon_dist_km: number;
  speed_km_s: number; speed_km_h: number; altitude_km: number;
  periapsis_km: number; apoapsis_km: number; g_force: number;
} | null {
  const db = getDb();
  return db.prepare(`
    SELECT timestamp, met_ms, pos_x, pos_y, pos_z, vel_x, vel_y, vel_z,
           moon_x, moon_y, moon_z, earth_dist_km, moon_dist_km,
           speed_km_s, speed_km_h, altitude_km, periapsis_km, apoapsis_km, g_force
    FROM state_vectors
    WHERE met_ms <= ?
    ORDER BY met_ms DESC
    LIMIT 1
  `).get(metMs) as any;
}

/** Get the closest DSN snapshot at or before a given UTC timestamp. */
export function getDsnSnapshotAt(utcMs: number): {
  timestamp: string;
  signal_active: number;
  dishes_json: string;
} | null {
  const db = getDb();
  const iso = new Date(utcMs).toISOString();
  return db.prepare(`
    SELECT timestamp, signal_active, dishes_json
    FROM dsn_contacts
    WHERE timestamp <= ?
    ORDER BY timestamp DESC
    LIMIT 1
  `).get(iso) as any;
}

/** Get the closest solar snapshot at or before a given UTC timestamp. */
export function getSolarSnapshotAt(utcMs: number): {
  timestamp: string;
  kp_index: number;
  kp_label: string;
  xray_flux: number;
  xray_class: string;
  proton_1mev: number;
  proton_10mev: number;
  proton_100mev: number;
  radiation_risk: string;
} | null {
  const db = getDb();
  const iso = new Date(utcMs).toISOString();
  return db.prepare(`
    SELECT * FROM solar_activity
    WHERE timestamp <= ?
    ORDER BY timestamp DESC
    LIMIT 1
  `).get(iso) as any;
}

/** Mission totals for the /stats page. */
export function getMissionStats() {
  const db = getDb();

  const svStats = db.prepare(`
    SELECT
      MAX(speed_km_h) as maxSpeedKmH,
      MAX(earth_dist_km) as maxEarthDistKm,
      MIN(moon_dist_km) as minMoonDistKm,
      MAX(g_force) as maxGForce,
      COUNT(*) as stateVectorSamples,
      MIN(timestamp) as firstSampleTs,
      MAX(timestamp) as latestSampleTs
    FROM state_vectors
  `).get() as any;

  // Approximate total distance: avg_speed_km_s * total_duration_s
  const avgDuration = db.prepare(`
    SELECT
      AVG(speed_km_s) as avgSpeedKmS,
      (JULIANDAY(MAX(timestamp)) - JULIANDAY(MIN(timestamp))) * 86400 as durationSec
    FROM state_vectors
  `).get() as any;
  const totalDistanceKm = (avgDuration?.avgSpeedKmS ?? 0) * (avgDuration?.durationSec ?? 0);

  const solarStats = db.prepare(`
    SELECT
      MAX(kp_index) as maxKpIndex,
      SUM(CASE WHEN kp_index >= 4 THEN 1 ELSE 0 END) as solarEventCount,
      COUNT(*) as solarSamples
    FROM solar_activity
  `).get() as any;

  const dsnStats = db.prepare(`
    SELECT
      COUNT(*) as dsnSamples,
      SUM(CASE WHEN signal_active = 1 THEN 1 ELSE 0 END) as signalActiveSamples
    FROM dsn_contacts
  `).get() as any;

  // DSN signal uptime percentage
  const dsnSignalUptime = (dsnStats?.dsnSamples ?? 0) > 0
    ? ((dsnStats?.signalActiveSamples ?? 0) / dsnStats.dsnSamples) * 100
    : 0;

  // Longest comm blackout: find longest consecutive run of signal_active=0
  let longestBlackoutSec = 0;
  try {
    const dsnRows = db.prepare(`
      SELECT timestamp, signal_active FROM dsn_contacts ORDER BY timestamp
    `).all() as Array<{ timestamp: string; signal_active: number }>;
    let blackoutStart: number | null = null;
    for (const row of dsnRows) {
      const ts = new Date(row.timestamp).getTime();
      if (row.signal_active === 0) {
        if (blackoutStart === null) blackoutStart = ts;
      } else {
        if (blackoutStart !== null) {
          const dur = (ts - blackoutStart) / 1000;
          if (dur > longestBlackoutSec) longestBlackoutSec = dur;
          blackoutStart = null;
        }
      }
    }
  } catch { /* non-fatal */ }

  // AROW telemetry sample count
  let arowSamples = 0;
  try {
    const arowCount = db.prepare("SELECT COUNT(*) as cnt FROM arow_telemetry").get() as any;
    arowSamples = arowCount?.cnt ?? 0;
  } catch { /* non-fatal */ }

  return {
    maxSpeedKmH: svStats?.maxSpeedKmH ?? 0,
    maxEarthDistKm: svStats?.maxEarthDistKm ?? 0,
    minMoonDistKm: svStats?.minMoonDistKm ?? 0,
    maxGForce: svStats?.maxGForce ?? 0,
    totalDistanceKm,
    maxKpIndex: solarStats?.maxKpIndex ?? 0,
    solarEventCount: solarStats?.solarEventCount ?? 0,
    dsnSignalUptime,
    longestBlackoutSec,
    stateVectorSamples: svStats?.stateVectorSamples ?? 0,
    dsnSamples: dsnStats?.dsnSamples ?? 0,
    solarSamples: solarStats?.solarSamples ?? 0,
    arowSamples,
    firstSampleTs: svStats?.firstSampleTs ?? null,
    latestSampleTs: svStats?.latestSampleTs ?? null,
  };
}

// ---------------------------------------------------------------------------
// Page view counter
// ---------------------------------------------------------------------------

export function incrementPageViews(): number {
  const db = getDb();
  const row = db.prepare("UPDATE page_views SET count = count + 1 WHERE id = 1 RETURNING count").get() as { count: number };
  return row.count;
}

export function getPageViews(): number {
  const db = getDb();
  const row = db.prepare("SELECT count FROM page_views WHERE id = 1").get() as { count: number } | undefined;
  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Email subscribers
// ---------------------------------------------------------------------------

/** Returns true if newly added, false if already existed. */
export function addSubscriber(email: string): boolean {
  const db = getDb();
  try {
    db.prepare("INSERT INTO subscribers (email) VALUES (?)").run(email);
    return true;
  } catch {
    // UNIQUE constraint violation — email already exists
    return false;
  }
}

export function getSubscriberCount(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM subscribers").get() as { count: number };
  return row.count;
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
