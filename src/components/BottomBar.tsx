"use client";
import { useState, useEffect } from "react";
import { MetClock } from "./shared/MetClock";
import { useMetContext, type PlaybackSpeed, type SpeedUnit } from "@/context/MetContext";
import { MISSION_DURATION_MS } from "@/lib/constants";
import type { Milestone } from "@/lib/types";
import { CreditsModal } from "./modals/CreditsModal";
import { ChangelogModal } from "./modals/ChangelogModal";
import { useLocale } from "@/context/LocaleContext";

interface BottomBarProps {
  milestones: Milestone[];
  lastUpdate: number | null;
}

const SPEED_OPTIONS: { label: string; value: PlaybackSpeed }[] = [
  { label: "\u23F8", value: 0 },
  { label: "1\u00D7", value: 1 },
  { label: "10\u00D7", value: 10 },
  { label: "100\u00D7", value: 100 },
  { label: "1000\u00D7", value: 1000 },
];

export function BottomBar({ milestones, lastUpdate }: BottomBarProps) {
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [ago, setAgo] = useState<number | null>(null);
  const { locale, setLocale, t } = useLocale();

  useEffect(() => {
    const id = setInterval(() => {
      if (lastUpdate != null) {
        setAgo(Math.floor((Date.now() - lastUpdate) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);
  const {
    metMs,
    mode,
    setMode,
    simMetMs,
    setSimMetMs,
    playbackSpeed,
    setPlaybackSpeed,
    jumpTo,
    speedUnit,
    setSpeedUnit,
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
        flexWrap: "wrap",
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
          {t("common.live")}
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
          {t("common.sim")}
        </button>
      </div>

      {/* Speed unit toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
        {(["km/h", "m/s", "mph", "kn"] as SpeedUnit[]).map((unit) => (
          <button
            key={unit}
            onClick={() => setSpeedUnit(unit)}
            aria-label={`Show velocity in ${unit}`}
            aria-pressed={speedUnit === unit}
            style={{
              padding: "2px 8px",
              borderRadius: 3,
              border: speedUnit === unit
                ? "1px solid var(--accent-purple)"
                : "1px solid var(--border-panel)",
              background: speedUnit === unit ? "rgba(179,136,255,0.15)" : "transparent",
              color: speedUnit === unit ? "var(--accent-purple)" : "var(--text-dim)",
              fontSize: 9,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.04em",
            }}
          >
            {unit}
          </button>
        ))}
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
          {t("bottomBar.createdBy")}
        </a>
        <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
        <button
          onClick={() => setCreditsOpen(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            cursor: "pointer",
            padding: 0,
            fontSize: "inherit",
            fontFamily: "inherit",
            letterSpacing: "inherit",
          }}
        >
          {t("bottomBar.credits")}
        </button>
        <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
        <button
          onClick={() => setChangelogOpen(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            cursor: "pointer",
            padding: 0,
            fontSize: "inherit",
            fontFamily: "inherit",
            letterSpacing: "inherit",
          }}
        >
          Changelog
        </button>
        <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
        <a
          href="/track"
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          {t("bottomBar.track")}
        </a>
        <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
        <a
          href="/dsn"
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          {t("bottomBar.dsn")}
        </a>
        <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
        <a
          href="/stats"
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          Stats
        </a>
        <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
        <a
          href="/api-docs"
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          API
        </a>
        <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
        <a
          href="mailto:cdnspace@chadohman.ca?subject=Artemis%20II%20Tracker%20Feedback"
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          {t("bottomBar.feedback")}
        </a>
        <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
        <button
          onClick={() => setLocale(locale === "en" ? "fr" : "en")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            cursor: "pointer",
            padding: 0,
            fontSize: "inherit",
            fontFamily: "inherit",
            letterSpacing: "inherit",
          }}
        >
          {locale === "en" ? "🇨🇦 FR" : "🇬🇧 EN"}
        </button>
        {ago != null && (
          <span style={{ marginLeft: 8, opacity: 0.5 }}>
            {t("bottomBar.updated")} {ago}{t("bottomBar.secondsAgo")}
          </span>
        )}
        {process.env.NEXT_PUBLIC_BUILD_ID && (
          <span style={{ marginLeft: 8, opacity: 0.5 }}>
            {t("bottomBar.build")} {process.env.NEXT_PUBLIC_BUILD_ID}
          </span>
        )}
      </div>
      <CreditsModal isOpen={creditsOpen} onClose={() => setCreditsOpen(false)} />
      <ChangelogModal manualOpen={changelogOpen} onManualClose={() => setChangelogOpen(false)} />
    </div>
  );
}
