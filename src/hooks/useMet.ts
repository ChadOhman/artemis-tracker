"use client";
import { useState, useEffect, useRef } from "react";
import { LAUNCH_TIME_MS } from "@/lib/constants";

/**
 * Returns the current Mission Elapsed Time in milliseconds, updated every
 * animation frame. Negative before launch, positive after.
 */
export function useMet(): number {
  const [metMs, setMetMs] = useState<number>(() => Date.now() - LAUNCH_TIME_MS);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let running = true;

    function tick() {
      if (!running) return;
      setMetMs(Date.now() - LAUNCH_TIME_MS);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return metMs;
}
