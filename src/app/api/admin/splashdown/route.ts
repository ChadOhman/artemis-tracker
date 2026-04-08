// src/app/api/admin/splashdown/route.ts
// Trigger or retract the splashdown celebration for all connected clients.

import { getSplashdownTriggered, setSplashdownTriggered } from "@/lib/splashdown";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ triggered: getSplashdownTriggered() });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const trigger = body.triggered === true;

  setSplashdownTriggered(trigger);

  // Broadcast to all connected SSE clients
  try {
    const { sseManager } = await import("@/app/api/telemetry/stream/route");
    const event = trigger ? "splashdown" : "splashdown-dismiss";
    sseManager.broadcast(event, { triggered: trigger });
  } catch {
    // SSE manager may not be initialized if no clients connected — non-fatal
  }

  return Response.json({ triggered: trigger });
}
