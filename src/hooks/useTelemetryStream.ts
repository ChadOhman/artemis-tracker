"use client";
import { useState, useEffect, useRef } from "react";
import type { Telemetry, StateVector, DsnStatus, ArowTelemetry, SolarActivity } from "@/lib/types";

interface TelemetryStreamState {
  telemetry: Telemetry | null;
  prevTelemetry: Telemetry | null;
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  dsn: DsnStatus | null;
  arow: ArowTelemetry | null;
  arowLastUpdate: number | null;
  solar: SolarActivity | null;
  connected: boolean;
  reconnecting: boolean;
  lastUpdate: number | null;
  visitorCount: number;
  splashdownTriggered: boolean;
  stateCActive: boolean;
  stateCTriggeredAt: string | null;
}

const INITIAL_STATE: TelemetryStreamState = {
  telemetry: null,
  prevTelemetry: null,
  stateVector: null,
  moonPosition: null,
  dsn: null,
  arow: null,
  arowLastUpdate: null,
  solar: null,
  connected: false,
  reconnecting: false,
  lastUpdate: null,
  visitorCount: 0,
  splashdownTriggered: false,
  stateCActive: false,
  stateCTriggeredAt: null,
};

/**
 * Opens a persistent SSE connection to /api/telemetry/stream.
 * Listens for "telemetry" events (SsePayload) and "dsn" events (DsnStatus).
 * Auto-reconnects with exponential backoff on failure.
 *
 * Also exposes:
 *   - `reconnecting` — true while waiting to reconnect after an error drop
 *   - `lastUpdate`   — Date.now() of the last successful telemetry event
 */
export function useTelemetryStream(): TelemetryStreamState {
  const [state, setState] = useState<TelemetryStreamState>(INITIAL_STATE);
  const backoffRef = useRef<number>(1000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      const basePath = (typeof window !== "undefined" && (window as any).__NEXT_DATA__?.basePath) || "";
      const es = new EventSource(`${basePath}/api/telemetry/stream`);
      esRef.current = es;

      es.addEventListener("open", () => {
        if (unmounted) return;
        backoffRef.current = 1000; // reset backoff on successful connect
        setState((prev) => ({ ...prev, connected: true, reconnecting: false }));
      });

      es.addEventListener("telemetry", (event: MessageEvent) => {
        if (unmounted) return;
        try {
          const payload = JSON.parse(event.data);
          setState((prev) => ({
            ...prev,
            prevTelemetry: payload.prevTelemetry ?? prev.telemetry,
            telemetry: payload.telemetry ?? prev.telemetry,
            stateVector: payload.stateVector ?? prev.stateVector,
            moonPosition: payload.moonPosition ?? prev.moonPosition,
            connected: true,
            reconnecting: false,
            lastUpdate: Date.now(),
          }));
        } catch {
          // malformed payload — ignore
        }
      });

      es.addEventListener("dsn", (event: MessageEvent) => {
        if (unmounted) return;
        try {
          const dsn: DsnStatus = JSON.parse(event.data);
          setState((prev) => ({ ...prev, dsn }));
        } catch {
          // malformed payload — ignore
        }
      });

      es.addEventListener("arow", (event: MessageEvent) => {
        if (unmounted) return;
        try {
          const arow: ArowTelemetry = JSON.parse(event.data);
          setState((prev) => ({ ...prev, arow, arowLastUpdate: Date.now() }));
        } catch {
          // malformed payload — ignore
        }
      });

      es.addEventListener("solar", (event: MessageEvent) => {
        if (unmounted) return;
        try {
          const solar: SolarActivity = JSON.parse(event.data);
          setState((prev) => ({ ...prev, solar }));
        } catch {
          // malformed payload — ignore
        }
      });

      es.addEventListener("visitors", (event: MessageEvent) => {
        if (unmounted) return;
        try {
          const { count } = JSON.parse(event.data);
          setState((prev) => ({ ...prev, visitorCount: count }));
        } catch {
          // ignore
        }
      });

      es.addEventListener("splashdown", (event: MessageEvent) => {
        if (unmounted) return;
        setState((prev) => ({ ...prev, splashdownTriggered: true }));
      });

      es.addEventListener("splashdown-dismiss", (event: MessageEvent) => {
        if (unmounted) return;
        setState((prev) => ({ ...prev, splashdownTriggered: false }));
      });

      es.addEventListener("state-c", (event: MessageEvent) => {
        if (unmounted) return;
        try {
          const payload = JSON.parse(event.data);
          setState((prev) => ({
            ...prev,
            stateCActive: payload.active === true,
            stateCTriggeredAt: payload.triggeredAt ?? null,
          }));
        } catch {
          // malformed payload — ignore
        }
      });

      es.addEventListener("error", () => {
        if (unmounted) return;
        es.close();
        setState((prev) => ({ ...prev, connected: false, reconnecting: true }));

        // exponential backoff, cap at 30 s
        const delay = Math.min(backoffRef.current, 30_000);
        backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
        timerRef.current = setTimeout(connect, delay);
      });
    }

    connect();

    return () => {
      unmounted = true;
      esRef.current?.close();
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return state;
}
