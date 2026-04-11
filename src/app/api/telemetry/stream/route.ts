// src/app/api/telemetry/stream/route.ts
import { TelemetryCache } from "@/lib/telemetry/cache";
import { SseManager } from "@/lib/telemetry/sse-manager";
import { transformStateVector } from "@/lib/telemetry/transformer";
import { pollJplHorizons } from "@/lib/pollers/jpl-horizons";
import { pollDsnNow } from "@/lib/pollers/dsn-now";
import { pollSolarActivity } from "@/lib/pollers/solar";
import { arowHub } from "@/lib/telemetry/arow-hub";
import {
  JPL_POLL_INTERVAL_MS,
  DSN_POLL_INTERVAL_MS,
  MISSION_ARCHIVED,
} from "@/lib/constants";
import type { SsePayload, DsnStatus, ArowTelemetry, SolarActivity, Telemetry } from "@/lib/types";
import { archiveStateVector, archiveArow, archiveDsn, archiveSolar, incrementPageViews, getPageViews } from "@/lib/db";
import { getLastCompactJson } from "@/lib/pollers/arow";
import { startRecoveryShipPoller } from "@/lib/pollers/ais-recovery-ship";
import { getSplashdownTriggered } from "@/lib/splashdown";
import { getStateC } from "@/lib/state-c";

// Singleton state on globalThis so Next.js dev HMR doesn't spawn duplicate
// pollers, WebSockets, and intervals each time a file reloads. In prod this
// is a one-time no-op since the module only loads once.
interface TelemetryGlobalState {
  cache: TelemetryCache;
  sseManager: SseManager;
  jplTimer: ReturnType<typeof setInterval> | null;
  dsnTimer: ReturnType<typeof setInterval> | null;
  visitorTimer: ReturnType<typeof setInterval> | null;
  solarTimer: ReturnType<typeof setInterval> | null;
  latestDsn: DsnStatus;
  latestArow: ArowTelemetry | null;
  latestSolar: SolarActivity | null;
  initialized: boolean;
  arowArchiveCounter: number;
}

const telemetryGlobal = globalThis as unknown as { __telemetryState?: TelemetryGlobalState };

if (!telemetryGlobal.__telemetryState) {
  telemetryGlobal.__telemetryState = {
    cache: new TelemetryCache(),
    sseManager: new SseManager(),
    jplTimer: null,
    dsnTimer: null,
    visitorTimer: null,
    solarTimer: null,
    latestDsn: { timestamp: new Date().toISOString(), dishes: [], signalActive: false },
    latestArow: null,
    latestSolar: null,
    initialized: false,
    arowArchiveCounter: 0,
  };
}
const tState = telemetryGlobal.__telemetryState!;

// Re-export the shared instances so other files see the same objects
export const cache = tState.cache;
export const sseManager = tState.sseManager;

// Getters so external modules read through the singleton and stay in sync
// across HMR reloads (previously these were module-level `export let`).
export function getLatestDsn(): DsnStatus { return tState.latestDsn; }
export function getLatestArow(): ArowTelemetry | null { return tState.latestArow; }
export function getLatestSolar(): SolarActivity | null { return tState.latestSolar; }

function broadcastVisitors(): void {
  sseManager.broadcast("visitors", { count: sseManager.clientCount, totalPageViews: getPageViews() });
}

async function pollJpl(): Promise<void> {
  const { orion, moonPosition, moonVelocity } = await pollJplHorizons();
  if (!orion || !moonPosition) return;
  const latest = cache.getLatest();
  const telemetry = transformStateVector(orion, moonPosition, latest?.stateVector, moonVelocity);
  cache.push(orion, telemetry, moonPosition);
  const payload: SsePayload = { telemetry, stateVector: orion, moonPosition, dsn: tState.latestDsn };
  sseManager.broadcast("telemetry", payload);
  try { archiveStateVector(orion, moonPosition, telemetry); } catch { /* db error — non-fatal */ }
}

async function pollDsn(): Promise<void> {
  tState.latestDsn = await pollDsnNow();
  sseManager.broadcast("dsn", tState.latestDsn);
  try { archiveDsn(tState.latestDsn); } catch { /* db error — non-fatal */ }
}

async function pollSolar(): Promise<void> {
  const solar = await pollSolarActivity();
  if (!solar) return;
  tState.latestSolar = solar;
  sseManager.broadcast("solar", solar);
  try { archiveSolar(solar); } catch { /* db error — non-fatal */ }
}

export function ensurePollers(): void {
  if (tState.initialized) return;
  tState.initialized = true;
  cache.loadFromDisk();

  // Archive mode: serve cached data only, no live pollers.
  // Visitor broadcasts are still cheap and useful for the live count.
  if (MISSION_ARCHIVED) {
    tState.visitorTimer = setInterval(broadcastVisitors, 5000);
    return;
  }

  pollJpl();
  pollDsn();
  tState.jplTimer = setInterval(pollJpl, JPL_POLL_INTERVAL_MS);
  tState.dsnTimer = setInterval(pollDsn, DSN_POLL_INTERVAL_MS);
  // AROW is handled by the shared hub — subscribe once for broadcast + archive.
  arowHub.subscribe((arow) => {
    tState.latestArow = arow;
    sseManager.broadcast("arow", arow);
    if (++tState.arowArchiveCounter % 10 === 0) {
      try { archiveArow(arow, getLastCompactJson()); } catch { /* db error — non-fatal */ }
    }
  });
  pollSolar();
  tState.solarTimer = setInterval(pollSolar, 60_000); // every 60 seconds
  tState.visitorTimer = setInterval(broadcastVisitors, 5000);
  startRecoveryShipPoller();
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensurePollers();
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const cleanup = sseManager.addClient(controller);
      // Count this page view and notify everyone a new viewer joined
      try { incrementPageViews(); } catch { /* db error — non-fatal */ }
      setTimeout(broadcastVisitors, 100);
      const latest = cache.getLatest();
      if (latest) {
        const prev = cache.getSecondLatest();
        // Disk-loaded entries have zeroed telemetry — recompute from the raw
        // state vector using the latest moonPosition (close enough for lerp)
        let prevTelemetry: Telemetry | undefined;
        if (prev) {
          if (prev.telemetry.speedKmS > 0) {
            prevTelemetry = prev.telemetry;
          } else {
            prevTelemetry = transformStateVector(prev.stateVector, latest.moonPosition);
          }
        }
        const payload: SsePayload = {
          telemetry: latest.telemetry,
          prevTelemetry,
          stateVector: latest.stateVector,
          moonPosition: latest.moonPosition,
          dsn: tState.latestDsn,
        };
        controller.enqueue(encoder.encode(SseManager.encodeEvent("telemetry", payload)));
      }
      // Send all cached data immediately on connect
      if (tState.latestDsn.signalActive || tState.latestDsn.dishes.length > 0) {
        controller.enqueue(encoder.encode(SseManager.encodeEvent("dsn", tState.latestDsn)));
      }
      if (tState.latestArow) {
        controller.enqueue(encoder.encode(SseManager.encodeEvent("arow", tState.latestArow)));
      }
      if (tState.latestSolar) {
        controller.enqueue(encoder.encode(SseManager.encodeEvent("solar", tState.latestSolar)));
      }
      // Send splashdown state if triggered (for clients connecting after the event)
      if (getSplashdownTriggered()) {
        controller.enqueue(encoder.encode(SseManager.encodeEvent("splashdown", { triggered: true })));
      }
      // Send state-c to late joiners if active
      const stateC = getStateC();
      if (stateC.active) {
        controller.enqueue(encoder.encode(SseManager.encodeEvent("state-c", stateC)));
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
              dsn: tState.latestDsn,
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
