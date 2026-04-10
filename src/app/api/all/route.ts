// src/app/api/all/route.ts
import { ensurePollers, cache, getLatestDsn, getLatestSolar } from "@/app/api/telemetry/stream/route";
import { arowHub } from "@/lib/telemetry/arow-hub";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensurePollers();
  const latest = cache.getLatest();

  return Response.json({
    telemetry: latest?.telemetry ?? null,
    stateVector: latest?.stateVector ?? null,
    moonPosition: latest?.moonPosition ?? null,
    dsn: getLatestDsn(),
    arow: arowHub.latest,
    solar: getLatestSolar(),
  });
}
