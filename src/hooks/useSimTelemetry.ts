"use client";
import { useState, useEffect, useRef } from "react";
import type { Telemetry, StateVector } from "@/lib/types";
import { interpolateStateVector } from "@/lib/interpolation";
import { LAUNCH_TIME_MS } from "@/lib/constants";

/**
 * Derives speed (km/h), altitude, and earth distance from a StateVector.
 * These are rough approximations for SIM display — the real values come from
 * the JPL Horizons poller in live mode.
 */
function telemetryFromStateVector(sv: StateVector): Telemetry {
  const speedKmS = Math.sqrt(
    sv.velocity.x ** 2 + sv.velocity.y ** 2 + sv.velocity.z ** 2
  );
  const earthDistKm = Math.sqrt(
    sv.position.x ** 2 + sv.position.y ** 2 + sv.position.z ** 2
  );
  // Earth radius ≈ 6371 km
  const altitudeKm = Math.max(0, earthDistKm - 6371);

  return {
    metMs: sv.metMs,
    speedKmS,
    speedKmH: speedKmS * 3600,
    altitudeKm,
    earthDistKm,
    // Moon position not available here — leave as 0 approximation
    moonDistKm: 0,
    periapsisKm: 0,
    apoapsisKm: 0,
    gForce: 0,
  };
}

interface SimTelemetryState {
  telemetry: Telemetry | null;
  stateVector: StateVector | null;
  loading: boolean;
}

const FETCH_WINDOW_MS = 2 * 60 * 60 * 1000; // ±1 hour window around simMetMs
const REFETCH_THRESHOLD_MS = 60 * 1000; // re-fetch if simMetMs drifts >60 s from last fetch center

/**
 * When in SIM mode, fetches historical state vectors bracketing `simMetMs` and
 * interpolates telemetry at the exact SIM time.  Returns null values when in
 * LIVE mode so the caller can fall back to live telemetry.
 */
export function useSimTelemetry(
  mode: "LIVE" | "SIM",
  simMetMs: number
): SimTelemetryState {
  const [vectors, setVectors] = useState<StateVector[]>([]);
  const [loading, setLoading] = useState(false);

  // Track the center of the last fetched window to know when to re-fetch
  const lastFetchCenterRef = useRef<number | null>(null);
  // Debounce timer for the scrubber
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== "SIM") {
      setVectors([]);
      lastFetchCenterRef.current = null;
      return;
    }

    const center = lastFetchCenterRef.current;
    const needsFetch =
      center === null ||
      Math.abs(simMetMs - center) > REFETCH_THRESHOLD_MS;

    if (!needsFetch) return;

    // Debounce 300 ms so rapid scrubbing doesn't spam the server
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const from = Math.max(0, simMetMs - FETCH_WINDOW_MS / 2);
      const to = simMetMs + FETCH_WINDOW_MS / 2;

      setLoading(true);
      lastFetchCenterRef.current = simMetMs;

      try {
        const basePath = (typeof window !== "undefined" && (window as any).__NEXT_DATA__?.basePath) || "";
        const res = await fetch(
          `${basePath}/api/telemetry/history?from=${Math.round(from)}&to=${Math.round(to)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { vectors: StateVector[] } = await res.json();
        setVectors(data.vectors ?? []);
      } catch {
        // Keep existing vectors on error so UI doesn't blank out
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Only trigger on meaningful simMetMs changes — comparing against the
    // last fetch center happens inside, so simMetMs change itself is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, simMetMs]);

  if (mode !== "SIM" || vectors.length === 0) {
    return { telemetry: null, stateVector: null, loading };
  }

  // Find the two state vectors bracketing simMetMs
  let before: StateVector | null = null;
  let after: StateVector | null = null;

  for (const sv of vectors) {
    if (sv.metMs <= simMetMs) {
      if (!before || sv.metMs > before.metMs) before = sv;
    } else {
      if (!after || sv.metMs < after.metMs) after = sv;
    }
  }

  if (!before && !after) {
    return { telemetry: null, stateVector: null, loading };
  }

  // If we only have one side, use the nearest
  const sv1 = before ?? after!;
  const sv2 = after ?? before!;

  let stateVector: StateVector;
  if (sv1 === sv2) {
    stateVector = { ...sv1, metMs: simMetMs };
  } else {
    const { position, velocity } = interpolateStateVector(sv1, sv2, simMetMs);
    stateVector = {
      timestamp: new Date(LAUNCH_TIME_MS + simMetMs).toISOString(),
      metMs: simMetMs,
      position,
      velocity,
    };
  }

  const telemetry = telemetryFromStateVector(stateVector);

  return { telemetry, stateVector, loading };
}
