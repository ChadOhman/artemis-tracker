// src/app/api/history/route.ts
// Generic history endpoint for sparklines and trend charts.
// Query params:
//   metric: speed_km_h | earth_dist_km | moon_dist_km | altitude_km | g_force | kp_index | xray_flux | proton_10mev
//   hours: how many hours of history (default 24, max 720 = 30 days)
//   points: max downsampled points (default 60)

import { getMetricHistory, getSolarMetricHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATE_METRICS = new Set([
  "speed_km_h",
  "speed_km_s",
  "moon_rel_speed_km_h",
  "earth_dist_km",
  "moon_dist_km",
  "altitude_km",
  "g_force",
]);
const SOLAR_METRICS = new Set(["kp_index", "xray_flux", "proton_10mev"]);

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const metric = url.searchParams.get("metric") ?? "";
  const hours = Math.min(
    720,
    Math.max(1, parseInt(url.searchParams.get("hours") ?? "24", 10) || 24)
  );
  const points = Math.min(
    500,
    Math.max(5, parseInt(url.searchParams.get("points") ?? "60", 10) || 60)
  );

  try {
    if (STATE_METRICS.has(metric)) {
      const data = getMetricHistory(metric as Parameters<typeof getMetricHistory>[0], hours, points);
      return Response.json({ metric, hours, data });
    }
    if (SOLAR_METRICS.has(metric)) {
      const data = getSolarMetricHistory(metric as Parameters<typeof getSolarMetricHistory>[0], hours, points);
      return Response.json({ metric, hours, data });
    }
    return Response.json({ error: `Unknown metric: ${metric}` }, { status: 400 });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 }
    );
  }
}
