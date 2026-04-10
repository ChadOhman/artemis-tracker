"use client";
// Overlay shown when AROW data is lost during the re-entry window.
// Tracks blackout duration and celebrates signal reacquired.

import { useEffect, useRef, useState } from "react";

interface BlackoutOverlayProps {
  /** Milliseconds since epoch of the last AROW update, or null if none yet */
  arowLastUpdate: number | null;
  /** True if we're in the re-entry window */
  isReentryMode: boolean;
}

const BLACKOUT_THRESHOLD_MS = 15_000;          // 15s of silence = blackout
const EXPECTED_BLACKOUT_DURATION_MS = 5 * 60_000; // ~5 minutes
const REACQUIRED_FLASH_DURATION_MS = 10_000;   // hold the "SIGNAL REACQUIRED" screen for 10s

export function BlackoutOverlay({ arowLastUpdate, isReentryMode }: BlackoutOverlayProps) {
  const [now, setNow] = useState(Date.now());
  const [wasInBlackout, setWasInBlackout] = useState(false);
  const [reacquiredAt, setReacquiredAt] = useState<number | null>(null);
  const blackoutStartRef = useRef<number | null>(null);

  // Tick once per second — enough resolution for the timer
  useEffect(() => {
    if (!isReentryMode) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isReentryMode]);

  const silenceMs =
    arowLastUpdate != null ? now - arowLastUpdate : BLACKOUT_THRESHOLD_MS + 1;
  const inBlackout = isReentryMode && silenceMs >= BLACKOUT_THRESHOLD_MS;

  // State machine: track blackout transitions via effect (no setState in render)
  useEffect(() => {
    if (inBlackout && !wasInBlackout) {
      setWasInBlackout(true);
      blackoutStartRef.current = Date.now() - silenceMs;
    }
    if (!inBlackout && wasInBlackout && reacquiredAt == null) {
      setReacquiredAt(Date.now());
    }
  }, [inBlackout, wasInBlackout, reacquiredAt, silenceMs]);

  // Auto-dismiss the reacquired flash after ~10s
  useEffect(() => {
    if (reacquiredAt == null) return;
    const timeout = setTimeout(() => {
      setWasInBlackout(false);
      setReacquiredAt(null);
    }, REACQUIRED_FLASH_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [reacquiredAt]);

  if (!isReentryMode) return null;

  // Show the reacquired flash
  if (reacquiredAt != null && !inBlackout) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 20, 40, 0.92)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          borderRadius: 4,
          animation: "reentry-signal-in 0.6s ease-out",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#00ff88",
            letterSpacing: "0.08em",
            textShadow: "0 0 20px rgba(0,255,136,0.6)",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          ★ SIGNAL REACQUIRED ★
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#aab8c0",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Earthrise
        </div>
        {blackoutStartRef.current != null && (
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "var(--font-mono)",
              marginTop: 6,
            }}
          >
            Blackout duration: {fmtDuration(now - blackoutStartRef.current)}
          </div>
        )}
      </div>
    );
  }

  if (!inBlackout) return null;

  // Blackout active
  const elapsed = blackoutStartRef.current != null ? now - blackoutStartRef.current : silenceMs;
  const progress = Math.min(100, (elapsed / EXPECTED_BLACKOUT_DURATION_MS) * 100);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(20, 0, 0, 0.94)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        borderRadius: 4,
        animation: "reentry-blackout-pulse 3s ease-in-out infinite",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#ff6644",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 10,
          fontWeight: 700,
        }}
      >
        Loss of Signal
      </div>
      <div
        style={{
          fontSize: 34,
          fontWeight: 800,
          color: "#ff4455",
          letterSpacing: "0.08em",
          textShadow: "0 0 20px rgba(255,68,85,0.5)",
          marginBottom: 4,
        }}
      >
        NO SIGNAL
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.04em",
          marginBottom: 14,
          marginTop: 8,
        }}
      >
        {fmtDuration(elapsed)}
      </div>
      <div
        style={{
          fontSize: 9,
          color: "var(--text-dim)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 4,
          fontFamily: "var(--font-mono)",
        }}
      >
        Expected ~5:00
      </div>
      <div
        style={{
          width: "70%",
          height: 4,
          background: "#2a1010",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "#ff4455",
            transition: "width 1s linear",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 9,
          color: "var(--text-dim)",
          textAlign: "center",
          lineHeight: 1.5,
          maxWidth: 280,
          fontStyle: "italic",
        }}
      >
        Ionised plasma around the heat shield blocks all radio signals during peak heating.
      </div>
    </div>
  );
}

function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
