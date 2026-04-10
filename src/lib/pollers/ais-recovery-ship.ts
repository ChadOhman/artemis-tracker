// src/lib/pollers/ais-recovery-ship.ts
// Real-time position tracking for USS John P. Murtha (LPD-26) via aisstream.io.
// US Navy ships frequently run AIS-dark during operations, so this is
// best-effort — when no data is available we fall back to a hardcoded
// recovery staging area.

import WebSocket from "ws";

// USS John P. Murtha — MMSI 368926266
export const RECOVERY_SHIP_MMSI = "368926266";
export const RECOVERY_SHIP_NAME = "USS John P. Murtha";
export const RECOVERY_SHIP_HULL = "LPD-26";

// Splashdown target / staging area (~offshore San Diego)
export const RECOVERY_STAGING_LAT = 31.0;
export const RECOVERY_STAGING_LON = -117.5;

export interface RecoveryShipPosition {
  lat: number;
  lon: number;
  speedKnots: number | null;
  courseDeg: number | null;
  timestamp: string;
  /** True when AIS data is live (< 1 hour old) */
  isLive: boolean;
  source: "ais" | "staging";
}

// Singleton state on globalThis so Next.js dev HMR doesn't leak old connections.
// Each HMR cycle re-evaluates this module; using globalThis means we reuse the
// same state across reloads instead of spawning a new WebSocket every time.
interface AisSingleton {
  lastPosition: RecoveryShipPosition | null;
  ws: WebSocket | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  shuttingDown: boolean;
  reconnectAttempts: number;
  poisoned: boolean;
  started: boolean;
}

const aisGlobal = globalThis as unknown as { __aisState?: AisSingleton };

if (!aisGlobal.__aisState) {
  aisGlobal.__aisState = {
    lastPosition: null,
    ws: null,
    reconnectTimer: null,
    shuttingDown: false,
    reconnectAttempts: 0,
    poisoned: false,
    started: false,
  };
}
const s: AisSingleton = aisGlobal.__aisState!;

const AIS_STREAM_URL = "wss://stream.aisstream.io/v0/stream";
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export function getRecoveryShipPosition(): RecoveryShipPosition {
  if (s.lastPosition && s.lastPosition.source === "ais") {
    const age = Date.now() - new Date(s.lastPosition.timestamp).getTime();
    if (age < STALE_THRESHOLD_MS) {
      return { ...s.lastPosition, isLive: true };
    }
  }
  return {
    lat: RECOVERY_STAGING_LAT,
    lon: RECOVERY_STAGING_LON,
    speedKnots: null,
    courseDeg: null,
    timestamp: s.lastPosition?.timestamp ?? new Date().toISOString(),
    isLive: false,
    source: "staging",
  };
}

/** Connect to aisstream.io and subscribe to the recovery ship MMSI. */
export function startRecoveryShipPoller(): void {
  const apiKey = process.env.AISSTREAM_API_KEY;
  if (!apiKey) {
    console.warn("[AIS] AISSTREAM_API_KEY not set — recovery ship tracking disabled");
    return;
  }

  // Idempotent: survives HMR reloads because `started` lives on globalThis
  if (s.started) return;
  if (s.ws) return;
  if (s.shuttingDown) return;
  if (s.poisoned) return;
  s.started = true;

  try {
    s.ws = new WebSocket(AIS_STREAM_URL);

    s.ws.on("open", () => {
      // Tight bounding box around the Pacific recovery zone. A global box
      // would receive ~300 msg/s worldwide.
      const subscribe = {
        APIKey: apiKey,
        BoundingBoxes: [[[25.0, -125.0], [35.0, -115.0]]],
        FiltersShipMMSI: [RECOVERY_SHIP_MMSI],
        FilterMessageTypes: ["PositionReport"],
      };
      s.ws?.send(JSON.stringify(subscribe));
      console.log(`[AIS] Connected and subscribed to MMSI ${RECOVERY_SHIP_MMSI}`);
    });

    // Rate limiter: drop messages above 20/sec; close the connection if we
    // see sustained bursts. This protects against event-loop starvation.
    let msgCountInWindow = 0;
    let windowStart = Date.now();
    const MAX_MSG_PER_SEC = 20;

    s.ws.on("message", (data: WebSocket.Data) => {
      const now = Date.now();
      if (now - windowStart >= 1000) {
        msgCountInWindow = 0;
        windowStart = now;
      }
      msgCountInWindow++;
      if (msgCountInWindow > MAX_MSG_PER_SEC) {
        if (msgCountInWindow === MAX_MSG_PER_SEC + 1) {
          s.reconnectAttempts++;
          console.error(
            `[AIS] Message flood detected (>${MAX_MSG_PER_SEC}/s) — closing connection (attempt ${s.reconnectAttempts})`
          );
          if (s.reconnectAttempts >= 3) {
            console.error("[AIS] Giving up after 3 flood events — tracking disabled");
            s.poisoned = true;
          }
          s.ws?.close();
        }
        return;
      }

      try {
        const msg = JSON.parse(data.toString());
        if (msg.MessageType !== "PositionReport") return;
        const report = msg.Message?.PositionReport;
        if (!report) return;

        const reportedMmsi = String(
          msg.MetaData?.MMSI ?? msg.Message?.MetaData?.MMSI ?? ""
        );
        if (reportedMmsi && reportedMmsi !== RECOVERY_SHIP_MMSI) return;

        s.lastPosition = {
          lat: report.Latitude,
          lon: report.Longitude,
          speedKnots: report.Sog ?? null,
          courseDeg: report.Cog ?? null,
          timestamp: new Date().toISOString(),
          isLive: true,
          source: "ais",
        };
        console.log(
          `[AIS] ${RECOVERY_SHIP_NAME} position: ${report.Latitude.toFixed(4)}, ${report.Longitude.toFixed(4)}`
        );
      } catch {
        // Malformed message — ignore
      }
    });

    s.ws.on("close", () => {
      console.log("[AIS] Connection closed, reconnecting in 30s...");
      s.ws = null;
      s.started = false;
      if (!s.shuttingDown && !s.poisoned) {
        s.reconnectTimer = setTimeout(startRecoveryShipPoller, 30_000);
      }
    });

    s.ws.on("error", (err: Error) => {
      console.error("[AIS] WebSocket error:", err.message);
    });
  } catch (err) {
    console.error("[AIS] Failed to connect:", err);
    s.started = false;
    s.reconnectTimer = setTimeout(startRecoveryShipPoller, 30_000);
  }
}

export function stopRecoveryShipPoller(): void {
  s.shuttingDown = true;
  s.started = false;
  if (s.reconnectTimer) {
    clearTimeout(s.reconnectTimer);
    s.reconnectTimer = null;
  }
  if (s.ws) {
    s.ws.close();
    s.ws = null;
  }
}
