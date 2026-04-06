"use client";
import { useState, useEffect, useRef } from "react";
import type { Telemetry, StateVector, DsnStatus, SolarActivity } from "@/lib/types";

interface SimTelemetryState {
  telemetry: Telemetry | null;
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  dsn: DsnStatus | null;
  solar: SolarActivity | null;
  loading: boolean;
}

const REFETCH_THRESHOLD_MS = 60 * 1000; // re-fetch when simMetMs drifts >60s from last fetch

/**
 * In SIM mode, fetches a full point-in-time snapshot from /api/snapshot
 * and returns telemetry, state vector, Moon position, DSN, and solar data
 * for the given MET timestamp. Returns nulls in LIVE mode.
 */
export function useSimTelemetry(
  mode: "LIVE" | "SIM",
  simMetMs: number
): SimTelemetryState {
  const [state, setState] = useState<SimTelemetryState>({
    telemetry: null,
    stateVector: null,
    moonPosition: null,
    dsn: null,
    solar: null,
    loading: false,
  });

  const lastFetchMetRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== "SIM") {
      setState((s) => s.telemetry ? {
        telemetry: null, stateVector: null, moonPosition: null,
        dsn: null, solar: null, loading: false,
      } : s);
      lastFetchMetRef.current = null;
      return;
    }

    const lastFetch = lastFetchMetRef.current;
    const needsFetch =
      lastFetch === null ||
      Math.abs(simMetMs - lastFetch) > REFETCH_THRESHOLD_MS;

    if (!needsFetch) return;

    // Debounce 300ms so rapid scrubbing doesn't spam the server
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true }));
      lastFetchMetRef.current = simMetMs;

      try {
        const res = await fetch(`/api/snapshot?metMs=${Math.round(simMetMs)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setState({
          telemetry: data.telemetry ?? null,
          stateVector: data.stateVector ?? null,
          moonPosition: data.moonPosition ?? null,
          dsn: data.dsn ?? null,
          solar: data.solar ?? null,
          loading: false,
        });
      } catch {
        // Keep existing state on error so UI doesn't blank out
        setState((s) => ({ ...s, loading: false }));
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mode, simMetMs]);

  return state;
}
