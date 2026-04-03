// src/app/api/arow/stream/route.ts
import { SseManager } from "@/lib/telemetry/sse-manager";
import { pollArow } from "@/lib/pollers/arow";
import { AROW_POLL_INTERVAL_MS } from "@/lib/constants";
import type { ArowTelemetry } from "@/lib/types";

const arowSseManager = new SseManager();
let arowTimer: ReturnType<typeof setInterval> | null = null;
let latestArow: ArowTelemetry | null = null;
let initialized = false;

async function pollArowData(): Promise<void> {
  const arow = await pollArow();
  if (!arow) return;
  latestArow = arow;
  arowSseManager.broadcast("arow", arow);
}

function ensureArowPoller(): void {
  if (initialized) return;
  initialized = true;
  pollArowData();
  arowTimer = setInterval(pollArowData, AROW_POLL_INTERVAL_MS);
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensureArowPoller();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const cleanup = arowSseManager.addClient(controller);

      // Send latest data immediately if available
      if (latestArow) {
        const message = SseManager.encodeEvent("arow", latestArow);
        controller.enqueue(encoder.encode(message));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
