"use client";
import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { LAUNCH_TIME_MS, MISSION_DURATION_MS } from "@/lib/constants";

export type MetMode = "LIVE" | "SIM";
export type PlaybackSpeed = 0 | 1 | 10 | 100 | 1000;

interface MetContextValue {
  metMs: number;
  mode: MetMode;
  setMode: (mode: MetMode) => void;
  simMetMs: number;
  setSimMetMs: (ms: number) => void;
  playbackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  jumpTo: (metMs: number) => void;
}

const MetContext = createContext<MetContextValue | null>(null);

function clampMet(ms: number): number {
  return Math.max(0, Math.min(ms, MISSION_DURATION_MS));
}

export function MetProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<MetMode>("LIVE");
  const [simMetMs, setSimMetMsRaw] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(0);
  const [liveMetMs, setLiveMetMs] = useState<number>(
    () => Date.now() - LAUNCH_TIME_MS
  );

  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const setSimMetMs = useCallback((ms: number) => {
    setSimMetMsRaw(clampMet(ms));
  }, []);

  const jumpTo = useCallback((targetMetMs: number) => {
    setMode("SIM");
    setPlaybackSpeed(0);
    setSimMetMsRaw(clampMet(targetMetMs));
  }, []);

  // Single RAF loop handles both LIVE and SIM ticking
  useEffect(() => {
    let running = true;
    lastFrameRef.current = null;

    function tick(now: number) {
      if (!running) return;

      if (mode === "LIVE") {
        setLiveMetMs(Date.now() - LAUNCH_TIME_MS);
      } else {
        // SIM mode: advance by playbackSpeed * realDelta
        if (lastFrameRef.current !== null && playbackSpeed > 0) {
          const delta = now - lastFrameRef.current;
          setSimMetMsRaw((prev) => clampMet(prev + playbackSpeed * delta));
        }
      }

      lastFrameRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [mode, playbackSpeed]);

  const metMs = mode === "LIVE" ? liveMetMs : simMetMs;

  return (
    <MetContext.Provider
      value={{
        metMs,
        mode,
        setMode,
        simMetMs,
        setSimMetMs,
        playbackSpeed,
        setPlaybackSpeed,
        jumpTo,
      }}
    >
      {children}
    </MetContext.Provider>
  );
}

export function useMetContext(): MetContextValue {
  const ctx = useContext(MetContext);
  if (!ctx) {
    throw new Error("useMetContext must be used within a MetProvider");
  }
  return ctx;
}
