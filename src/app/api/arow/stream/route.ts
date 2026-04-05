// src/app/api/arow/stream/route.ts
// Public SSE endpoint dedicated to AROW telemetry. Subscribes to the shared
// arowHub so NASA's AROW bucket is polled only once per process no matter
// how many SSE endpoints are served.

import { SseManager } from "@/lib/telemetry/sse-manager";
import { arowHub } from "@/lib/telemetry/arow-hub";

const arowSseManager = new SseManager();
let subscribed = false;

function ensureSubscribed(): void {
  if (subscribed) return;
  subscribed = true;
  arowHub.subscribe((arow) => {
    arowSseManager.broadcast("arow", arow);
  });
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensureSubscribed();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      arowSseManager.addClient(controller);

      // Send latest cached data immediately if available
      const latest = arowHub.latest;
      if (latest) {
        controller.enqueue(encoder.encode(SseManager.encodeEvent("arow", latest)));
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
