// src/app/api/dsn/history/route.ts
import { getDsnBandwidthHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

interface DishSnapshot {
  dish: string;
  station?: string;
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
      const stations: string[] = [];
      const dishDetails: { dish: string; station: string; downKbps: number; upKbps: number }[] = [];
      try {
        const dishes: DishSnapshot[] = JSON.parse(row.dishes_json);
        const activeDown = dishes.find((d) => d.downlinkActive);
        const activeUp = dishes.find((d) => d.uplinkActive);
        downKbps = activeDown ? (activeDown.downlinkRate ?? 0) / 1000 : 0;
        upKbps = activeUp ? (activeUp.uplinkRate ?? 0) / 1000 : 0;
        // Collect active stations and per-dish breakdown
        for (const d of dishes) {
          if (d.station && (d.downlinkActive || d.uplinkActive)) {
            if (!stations.includes(d.station)) stations.push(d.station);
            dishDetails.push({
              dish: d.dish,
              station: d.station ?? "",
              downKbps: d.downlinkActive ? (d.downlinkRate ?? 0) / 1000 : 0,
              upKbps: d.uplinkActive ? (d.uplinkRate ?? 0) / 1000 : 0,
            });
          }
        }
      } catch {
        // malformed row — skip
      }
      return {
        ts: new Date(row.timestamp).getTime(),
        downKbps,
        upKbps,
        stations,
        dishes: dishDetails,
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
