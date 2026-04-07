// src/app/api/admin/backup/route.ts
// Downloads the SQLite database as a file for backup purposes.

import { readFileSync, existsSync, copyFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DB_PATH = path.join(process.cwd(), "data", "artemis.db");

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!existsSync(DB_PATH)) {
    return Response.json({ error: "Database not found" }, { status: 404 });
  }

  // Copy the DB to a temp file first to avoid reading while SQLite has it locked
  const backupPath = DB_PATH + ".backup";
  try {
    copyFileSync(DB_PATH, backupPath);
    const data = readFileSync(backupPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return new Response(data, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="artemis-${timestamp}.db"`,
        "Content-Length": String(data.length),
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Backup failed" },
      { status: 500 }
    );
  }
}
