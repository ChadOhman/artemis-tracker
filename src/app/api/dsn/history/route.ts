// src/app/api/dsn/history/route.ts
import { getDsnBandwidthHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

interface DishSnapshot {
  dish: string;
  downlinkActive?: boolean;
  downlinkRate?: number;
  uplinkActive?: boolean;
  uplinkRate?: number;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const minutesParam = url.searchParams.get("minutes");
  const minutes = Math.max(1, Math.min(parseInt(minutesParam || "30", 10) || 30, 1440));

  try {
    const rows = getDsnBandwidthHistory(minutes);
    const history = rows.map((row) => {
      let downKbps = 0;
      let upKbps = 0;
      try {
        const dishes: DishSnapshot[] = JSON.parse(row.dishes_json);
        const activeDown = dishes.find((d) => d.downlinkActive);
        const activeUp = dishes.find((d) => d.uplinkActive);
        downKbps = activeDown ? (activeDown.downlinkRate ?? 0) / 1000 : 0;
        upKbps = activeUp ? (activeUp.uplinkRate ?? 0) / 1000 : 0;
      } catch {
        // malformed row — skip
      }
      return {
        ts: new Date(row.timestamp).getTime(),
        downKbps,
        upKbps,
      };
    });
    return Response.json({ history });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 }
    );
  }
}
