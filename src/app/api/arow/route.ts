// src/app/api/arow/route.ts
import { ensurePollers, latestArow } from "@/app/api/telemetry/stream/route";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensurePollers();

  if (!latestArow) {
    return Response.json(
      { error: "No data available" },
      { status: 503 }
    );
  }

  return Response.json(latestArow);
}
