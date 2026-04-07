// src/app/api/admin/force-poll/route.ts
// Triggers an immediate JPL Horizons poll outside the normal 5-minute cycle.

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Import the pollJpl function from the stream route
    const { ensurePollers } = await import("@/app/api/telemetry/stream/route");
    ensurePollers(); // make sure pollers are running

    // Trigger an immediate JPL poll
    const { pollJplHorizons } = await import("@/lib/pollers/jpl-horizons");
    const result = await pollJplHorizons();

    return Response.json({
      success: true,
      orion: result.orion ? {
        timestamp: result.orion.timestamp,
        earthDistKm: Math.sqrt(result.orion.position.x ** 2 + result.orion.position.y ** 2 + result.orion.position.z ** 2).toFixed(0),
      } : null,
      moonPosition: result.moonPosition ? "received" : "null",
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Poll failed" },
      { status: 500 }
    );
  }
}
