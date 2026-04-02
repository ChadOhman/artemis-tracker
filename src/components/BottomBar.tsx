"use client";
import { MetClock } from "./shared/MetClock";
import { useMetContext, type PlaybackSpeed } from "@/context/MetContext";
import { MISSION_DURATION_MS } from "@/lib/constants";
import type { Milestone } from "@/lib/types";

interface BottomBarProps {
  milestones: Milestone[];
}

const SPEED_OPTIONS: { label: string; value: PlaybackSpeed }[] = [
  { label: "\u23F8", value: 0 },
  { label: "1\u00D7", value: 1 },
  { label: "10\u00D7", value: 10 },
  { label: "100\u00D7", value: 100 },
  { label: "1000\u00D7", value: 1000 },
];

export function BottomBar({ milestones }: BottomBarProps) {
  const {
    metMs,
    mode,
    setMode,
    simMetMs,
    setSimMetMs,
    playbackSpeed,
    setPlaybackSpeed,
    jumpTo,
  } = useMetContext();

  const handleSwitchToSim = () => {
    // Switch to SIM at current MET, paused
    setSimMetMs(Math.max(0, metMs));
    setPlaybackSpeed(0);
    setMode("SIM");
  };

  const handleSwitchToLive = () => {
    setMode("LIVE");
  };

  const isLive = mode === "LIVE";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: "100%",
        padding: "0 10px",
        background: "var(--bg-secondary)",
        gap: 8,
      }}
    >
      {/* LIVE / SIM toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <button
          onClick={handleSwitchToLive}
          aria-pressed={isLive}
          style={{
            padding: "2px 10px",
            borderRadius: 3,
            border: isLive
              ? "1px solid var(--accent-red)"
              : "1px solid var(--border-panel)",
            background: isLive ? "rgba(255,61,61,0.15)" : "transparent",
            color: isLive ? "var(--accent-red)" : "var(--text-dim)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          LIVE
        </button>
        <button
          onClick={isLive ? handleSwitchToSim : undefined}
          aria-pressed={!isLive}
          style={{
            padding: "2px 10px",
            borderRadius: 3,
            border: !isLive
              ? "1px solid var(--accent-cyan)"
              : "1px solid var(--border-panel)",
            background: !isLive ? "rgba(0,229,255,0.15)" : "transparent",
            color: !isLive ? "var(--accent-cyan)" : "var(--text-dim)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            cursor: isLive ? "pointer" : "default",
            fontFamily: "inherit",
          }}
        >
          SIM
        </button>
      </div>

      {/* SIM controls — only visible in SIM mode */}
      {!isLive && (
        <>
          {/* Scrubber */}
          <input
            type="range"
            className="sim-scrubber"
            min={0}
            max={MISSION_DURATION_MS}
            value={simMetMs}
            onChange={(e) => {
              setSimMetMs(Number(e.target.value));
              setPlaybackSpeed(0);
            }}
            aria-label="Mission time scrubber"
            style={{ flex: 1, minWidth: 80 }}
          />

          {/* Playback speed pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPlaybackSpeed(opt.value)}
                aria-label={opt.value === 0 ? "Pause simulation" : `Set playback speed to ${opt.value}×`}
                aria-pressed={playbackSpeed === opt.value}
                style={{
                  padding: "2px 6px",
                  borderRadius: 3,
                  border:
                    playbackSpeed === opt.value
                      ? "1px solid var(--accent-cyan)"
                      : "1px solid var(--border-panel)",
                  background:
                    playbackSpeed === opt.value
                      ? "rgba(0,229,255,0.15)"
                      : "transparent",
                  color:
                    playbackSpeed === opt.value
                      ? "var(--accent-cyan)"
                      : "var(--text-dim)",
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.04em",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* JUMP TO dropdown */}
          {milestones.length > 0 && (
            <select
              className="sim-jump-select"
              value=""
              onChange={(e) => {
                const ms = Number(e.target.value);
                if (!isNaN(ms)) jumpTo(ms);
              }}
              aria-label="Jump to milestone"
              style={{ flexShrink: 0 }}
            >
              <option value="" disabled>
                JUMP TO
              </option>
              {milestones.map((m) => (
                <option key={m.metMs} value={m.metMs}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </>
      )}

      {/* Center: MET */}
      <div
        style={{
          flex: isLive ? 1 : undefined,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <MetClock metMs={metMs} size="small" showTPlus={false} />
      </div>

      {/* Right: attribution */}
      <div
        style={{
          fontSize: 9,
          color: "var(--text-dim)",
          letterSpacing: "0.06em",
          flexShrink: 0,
          marginLeft: isLive ? 0 : "auto",
        }}
      >
        <a
          href="https://cdnspace.ca"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          Created by Canadian Space
        </a>
      </div>
    </div>
  );
}
