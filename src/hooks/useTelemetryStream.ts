"use client";
import { useState, useEffect, useRef } from "react";
import type { Telemetry, StateVector, DsnStatus } from "@/lib/types";

interface TelemetryStreamState {
  telemetry: Telemetry | null;
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  dsn: DsnStatus | null;
  connected: boolean;
}

const INITIAL_STATE: TelemetryStreamState = {
  telemetry: null,
  stateVector: null,
  moonPosition: null,
  dsn: null,
  connected: false,
};

/**
 * Opens a persistent SSE connection to /api/telemetry/stream.
 * Listens for "telemetry" events (SsePayload) and "dsn" events (DsnStatus).
 * Auto-reconnects with exponential backoff on failure.
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

      const es = new EventSource("/api/telemetry/stream");
      esRef.current = es;

      es.addEventListener("open", () => {
        if (unmounted) return;
        backoffRef.current = 1000; // reset backoff on successful connect
        setState((prev) => ({ ...prev, connected: true }));
      });

      es.addEventListener("telemetry", (event: MessageEvent) => {
        if (unmounted) return;
        try {
          const payload = JSON.parse(event.data);
          setState((prev) => ({
            ...prev,
            telemetry: payload.telemetry ?? prev.telemetry,
            stateVector: payload.stateVector ?? prev.stateVector,
            moonPosition: payload.moonPosition ?? prev.moonPosition,
            connected: true,
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

      es.addEventListener("error", () => {
        if (unmounted) return;
        es.close();
        setState((prev) => ({ ...prev, connected: false }));

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
