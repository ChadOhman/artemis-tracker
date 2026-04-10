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

let lastPosition: RecoveryShipPosition | null = null;
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let shuttingDown = false;

const AIS_STREAM_URL = "wss://stream.aisstream.io/v0/stream";
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export function getRecoveryShipPosition(): RecoveryShipPosition {
  // Check freshness
  if (lastPosition && lastPosition.source === "ais") {
    const age = Date.now() - new Date(lastPosition.timestamp).getTime();
    if (age < STALE_THRESHOLD_MS) {
      return { ...lastPosition, isLive: true };
    }
  }
  // Stale or missing — return staging area
  return {
    lat: RECOVERY_STAGING_LAT,
    lon: RECOVERY_STAGING_LON,
    speedKnots: null,
    courseDeg: null,
    timestamp: lastPosition?.timestamp ?? new Date().toISOString(),
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

  if (ws) return; // Already connected
  if (shuttingDown) return;

  try {
    ws = new WebSocket(AIS_STREAM_URL);

    ws.on("open", () => {
      // Subscribe to position messages for the target MMSI
      const subscribe = {
        APIKey: apiKey,
        BoundingBoxes: [[[-90, -180], [90, 180]]], // global — server-side filter by MMSI
        FiltersShipMMSI: [RECOVERY_SHIP_MMSI],
        FilterMessageTypes: ["PositionReport"],
      };
      ws?.send(JSON.stringify(subscribe));
      console.log(`[AIS] Connected and subscribed to MMSI ${RECOVERY_SHIP_MMSI}`);
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.MessageType !== "PositionReport") return;
        const report = msg.Message?.PositionReport;
        if (!report) return;

        lastPosition = {
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

    ws.on("close", () => {
      console.log("[AIS] Connection closed, reconnecting in 30s...");
      ws = null;
      if (!shuttingDown) {
        reconnectTimer = setTimeout(startRecoveryShipPoller, 30_000);
      }
    });

    ws.on("error", (err: Error) => {
      console.error("[AIS] WebSocket error:", err.message);
      // The 'close' handler will fire and handle reconnect
    });
  } catch (err) {
    console.error("[AIS] Failed to connect:", err);
    reconnectTimer = setTimeout(startRecoveryShipPoller, 30_000);
  }
}

export function stopRecoveryShipPoller(): void {
  shuttingDown = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}
