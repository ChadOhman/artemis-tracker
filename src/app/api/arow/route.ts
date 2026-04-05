// src/app/api/arow/route.ts
import { arowHub } from "@/lib/telemetry/arow-hub";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  // Start the shared AROW poller if nothing else has yet.
  arowHub.ensurePolling();

  const latest = arowHub.latest;
  if (!latest) {
    return Response.json(
      { error: "No data available" },
      { status: 503 }
    );
  }

  return Response.json(latest);
}
