// src/app/api/telemetry/stream/route.ts
import { TelemetryCache } from "@/lib/telemetry/cache";
import { SseManager } from "@/lib/telemetry/sse-manager";
import { transformStateVector } from "@/lib/telemetry/transformer";
import { pollJplHorizons } from "@/lib/pollers/jpl-horizons";
import { pollDsnNow } from "@/lib/pollers/dsn-now";
import { pollArow } from "@/lib/pollers/arow";
import { pollSolarActivity } from "@/lib/pollers/solar";
import {
  JPL_POLL_INTERVAL_MS,
  DSN_POLL_INTERVAL_MS,
  AROW_POLL_INTERVAL_MS,
} from "@/lib/constants";
import type { SsePayload, DsnStatus, ArowTelemetry, SolarActivity } from "@/lib/types";
import { archiveStateVector, archiveArow, archiveDsn, archiveSolar, pruneOldData } from "@/lib/db";

export const cache = new TelemetryCache();
const sseManager = new SseManager();
let jplTimer: ReturnType<typeof setInterval> | null = null;
let dsnTimer: ReturnType<typeof setInterval> | null = null;
export let latestDsn: DsnStatus = { timestamp: new Date().toISOString(), dishes: [], signalActive: false };
let arowTimer: ReturnType<typeof setInterval> | null = null;
let solarTimer: ReturnType<typeof setInterval> | null = null;
/** Latest AROW telemetry — exported so the REST endpoint can read it. */
export let latestArow: ArowTelemetry | null = null;
export let latestSolar: SolarActivity | null = null;
let initialized = false;
let arowArchiveCounter = 0;

async function pollJpl(): Promise<void> {
  const { orion, moonPosition } = await pollJplHorizons();
  if (!orion || !moonPosition) return;
  const latest = cache.getLatest();
  const telemetry = transformStateVector(orion, moonPosition, latest?.stateVector);
  cache.push(orion, telemetry, moonPosition);
  const payload: SsePayload = { telemetry, stateVector: orion, moonPosition, dsn: latestDsn };
  sseManager.broadcast("telemetry", payload);
  try { archiveStateVector(orion, moonPosition, telemetry); } catch { /* db error — non-fatal */ }
}

async function pollDsn(): Promise<void> {
  latestDsn = await pollDsnNow();
  sseManager.broadcast("dsn", latestDsn);
  try { archiveDsn(latestDsn); } catch { /* db error — non-fatal */ }
}

async function pollArowData(): Promise<void> {
  const arow = await pollArow();
  if (!arow) return;
  latestArow = arow;
  sseManager.broadcast("arow", arow);
  if (++arowArchiveCounter % 10 === 0) {
    try { archiveArow(arow); } catch { /* db error — non-fatal */ }
  }
}

async function pollSolar(): Promise<void> {
  const solar = await pollSolarActivity();
  if (!solar) return;
  latestSolar = solar;
  sseManager.broadcast("solar", solar);
  try { archiveSolar(solar); } catch { /* db error — non-fatal */ }
}

export function ensurePollers(): void {
  if (initialized) return;
  initialized = true;
  cache.loadFromDisk();
  try { pruneOldData(); } catch { /* non-fatal */ }
  pollJpl();
  pollDsn();
  jplTimer = setInterval(pollJpl, JPL_POLL_INTERVAL_MS);
  dsnTimer = setInterval(pollDsn, DSN_POLL_INTERVAL_MS);
  pollArowData();
  arowTimer = setInterval(pollArowData, AROW_POLL_INTERVAL_MS);
  pollSolar();
  solarTimer = setInterval(pollSolar, 60_000); // every 60 seconds
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
        controller.enqueue(encoder.encode(SseManager.encodeEvent("telemetry", payload)));
      }
      // Send all cached data immediately on connect
      if (latestDsn.signalActive || latestDsn.dishes.length > 0) {
        controller.enqueue(encoder.encode(SseManager.encodeEvent("dsn", latestDsn)));
      }
      if (latestArow) {
        controller.enqueue(encoder.encode(SseManager.encodeEvent("arow", latestArow)));
      }
      if (latestSolar) {
        controller.enqueue(encoder.encode(SseManager.encodeEvent("solar", latestSolar)));
      }
      if (!latest) {
        // Data not yet available — retry every 2 s for up to 30 s so the first
        // client doesn't sit on "—" until the next scheduled poll fires.
        const checkInterval = setInterval(() => {
          const data = cache.getLatest();
          if (data) {
            clearInterval(checkInterval);
            const payload: SsePayload = {
              telemetry: data.telemetry,
              stateVector: data.stateVector,
              moonPosition: data.moonPosition,
              dsn: latestDsn,
            };
            try {
              controller.enqueue(encoder.encode(SseManager.encodeEvent("telemetry", payload)));
            } catch {
              // Client disconnected before data arrived — ignore.
            }
          }
        }, 2000);
        // Stop retrying after 30 seconds regardless.
        setTimeout(() => clearInterval(checkInterval), 30000);
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
