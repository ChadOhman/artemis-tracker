// src/app/api/all/route.ts
import { ensurePollers, cache, latestDsn, latestArow, latestSolar } from "@/app/api/telemetry/stream/route";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensurePollers();
  const latest = cache.getLatest();

  return Response.json({
    telemetry: latest?.telemetry ?? null,
    stateVector: latest?.stateVector ?? null,
    moonPosition: latest?.moonPosition ?? null,
    dsn: latestDsn,
    arow: latestArow,
    solar: latestSolar,
  });
}
