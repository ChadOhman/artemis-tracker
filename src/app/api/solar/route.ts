// src/app/api/solar/route.ts
import { ensurePollers, latestSolar } from "@/app/api/telemetry/stream/route";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensurePollers();

  if (!latestSolar) {
    return Response.json({ error: "No data available" }, { status: 503 });
  }

  return Response.json(latestSolar);
}
