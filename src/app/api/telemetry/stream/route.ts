// src/app/api/telemetry/stream/route.ts
import { TelemetryCache } from "@/lib/telemetry/cache";
import { SseManager } from "@/lib/telemetry/sse-manager";
import { transformStateVector } from "@/lib/telemetry/transformer";
import { pollJplHorizons } from "@/lib/pollers/jpl-horizons";
import { pollDsnNow } from "@/lib/pollers/dsn-now";
import { JPL_POLL_INTERVAL_MS, DSN_POLL_INTERVAL_MS } from "@/lib/constants";
import type { SsePayload, DsnStatus } from "@/lib/types";

const cache = new TelemetryCache();
const sseManager = new SseManager();
let jplTimer: ReturnType<typeof setInterval> | null = null;
let dsnTimer: ReturnType<typeof setInterval> | null = null;
let latestDsn: DsnStatus = { timestamp: new Date().toISOString(), dishes: [], signalActive: false };
let initialized = false;

async function pollJpl(): Promise<void> {
  const { orion, moonPosition } = await pollJplHorizons();
  if (!orion || !moonPosition) return;
  const latest = cache.getLatest();
  const telemetry = transformStateVector(orion, moonPosition, latest?.stateVector);
  cache.push(orion, telemetry, moonPosition);
  const payload: SsePayload = { telemetry, stateVector: orion, moonPosition, dsn: latestDsn };
  sseManager.broadcast("telemetry", payload);
}

async function pollDsn(): Promise<void> {
  latestDsn = await pollDsnNow();
  sseManager.broadcast("dsn", latestDsn);
}

function ensurePollers(): void {
  if (initialized) return;
  initialized = true;
  cache.loadFromDisk();
  pollJpl();
  pollDsn();
  jplTimer = setInterval(pollJpl, JPL_POLL_INTERVAL_MS);
  dsnTimer = setInterval(pollDsn, DSN_POLL_INTERVAL_MS);
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensurePollers();
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const cleanup = sseManager.addClient(controller);
      const latest = cache.getLatest();
      if (latest) {
        const payload: SsePayload = {
          telemetry: latest.telemetry,
          stateVector: latest.stateVector,
          moonPosition: latest.moonPosition,
          dsn: latestDsn,
        };
        const message = SseManager.encodeEvent("telemetry", payload);
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
