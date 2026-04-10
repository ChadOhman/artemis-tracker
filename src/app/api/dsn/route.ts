// src/app/api/dsn/route.ts
import { ensurePollers, getLatestDsn } from "@/app/api/telemetry/stream/route";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensurePollers();
  return Response.json(getLatestDsn());
}
