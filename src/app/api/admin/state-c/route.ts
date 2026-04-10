// src/app/api/admin/state-c/route.ts
// Toggle an internal override flag. Requires admin token AND a typed
// confirmation phrase so the flag cannot be flipped accidentally.

import { getStateC, setStateC } from "@/lib/state-c";

export const dynamic = "force-dynamic";

const ACTIVATE_PHRASE = "ACTIVATE MEMORIAL";
const RETRACT_PHRASE = "RETRACT MEMORIAL";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(getStateC());
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { active?: boolean; confirm?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const requestedActive = body.active === true;
  const confirmPhrase = body.confirm ?? "";
  const expected = requestedActive ? ACTIVATE_PHRASE : RETRACT_PHRASE;

  if (confirmPhrase !== expected) {
    return Response.json(
      { error: `Confirmation phrase mismatch. Type "${expected}" to proceed.` },
      { status: 400 }
    );
  }

  const newState = setStateC(requestedActive);

  // Broadcast to all connected SSE clients
  try {
    const { sseManager } = await import("@/app/api/telemetry/stream/route");
    sseManager.broadcast("state-c", newState);
  } catch {
    // SSE manager may not be initialized yet
  }

  return Response.json(newState);
}
