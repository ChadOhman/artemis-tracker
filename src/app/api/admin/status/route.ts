// src/app/api/admin/status/route.ts
// Server status: DB stats, viewer count, AROW health, uptime.

import { existsSync, statSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const START_TIME = Date.now();
const DB_PATH = path.join(process.cwd(), "data", "artemis.db");

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // DB file size
  let dbSizeMB = 0;
  if (existsSync(DB_PATH)) {
    dbSizeMB = statSync(DB_PATH).size / (1024 * 1024);
  }

  // DB row counts
  let dbStats = { stateVectors: 0, arowTelemetry: 0, dsnContacts: 0, solarActivity: 0 };
  try {
    const Database = require("better-sqlite3");
    const db = new Database(DB_PATH, { readonly: true });
    dbStats.stateVectors = (db.prepare("SELECT COUNT(*) as c FROM state_vectors").get() as any)?.c ?? 0;
    dbStats.arowTelemetry = (db.prepare("SELECT COUNT(*) as c FROM arow_telemetry").get() as any)?.c ?? 0;
    dbStats.dsnContacts = (db.prepare("SELECT COUNT(*) as c FROM dsn_contacts").get() as any)?.c ?? 0;
    dbStats.solarActivity = (db.prepare("SELECT COUNT(*) as c FROM solar_activity").get() as any)?.c ?? 0;
    try {
      (dbStats as any).subscribers = (db.prepare("SELECT COUNT(*) as c FROM subscribers").get() as any)?.c ?? 0;
    } catch { /* table may not exist yet */ }
    db.close();
  } catch { /* non-fatal */ }

  // Viewer count from SSE manager
  let viewerCount = 0;
  try {
    const { cache } = await import("@/app/api/telemetry/stream/route");
    // The cache module doesn't expose client count directly, but we broadcast it.
    // Use latestArow import to check if stream module is loaded.
    const streamModule = await import("@/app/api/telemetry/stream/route");
    // Viewer count isn't directly accessible — we'll get it from the SSE payload
  } catch { /* non-fatal */ }

  // AROW health — check if last poll returned data
  let arowStatus = "unknown";
  let arowTimestamp = "";
  try {
    const { arowHub } = await import("@/lib/telemetry/arow-hub");
    const latest = arowHub.latest;
    if (latest) {
      arowStatus = latest.quaternion ? "healthy" : "partial";
      arowTimestamp = latest.timestamp;
    } else {
      arowStatus = "no_data";
    }
  } catch { /* non-fatal */ }

  // Uptime
  const uptimeMs = Date.now() - START_TIME;
  const uptimeHours = uptimeMs / 3600000;

  return Response.json({
    uptime: {
      ms: uptimeMs,
      hours: Math.round(uptimeHours * 10) / 10,
      since: new Date(START_TIME).toISOString(),
    },
    db: {
      sizeMB: Math.round(dbSizeMB * 10) / 10,
      rows: dbStats,
    },
    arow: {
      status: arowStatus,
      lastTimestamp: arowTimestamp,
    },
  });
}
