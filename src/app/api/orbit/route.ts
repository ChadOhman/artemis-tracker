// src/app/api/orbit/route.ts
import { ensurePollers, cache } from "@/app/api/telemetry/stream/route";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensurePollers();
  const latest = cache.getLatest();

  if (!latest) {
    return Response.json({ error: "No data available" }, { status: 503 });
  }

  return Response.json(latest.telemetry);
}
