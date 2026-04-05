// src/app/api/stats/route.ts
// Cumulative mission statistics for the /stats page.

import { getMissionStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const stats = getMissionStats();
    return Response.json(stats);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 }
    );
  }
}
