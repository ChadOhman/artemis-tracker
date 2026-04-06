"use client";
import { useState } from "react";
import { MetClock } from "./shared/MetClock";
import { formatMet } from "@/lib/met";
import type { Telemetry, DsnStatus } from "@/lib/types";
import type { TimelineState } from "@/hooks/useTimeline";
import { CrewModal } from "./modals/CrewModal";
import { SpacecraftModal } from "./modals/SpacecraftModal";
import { useMetContext } from "@/context/MetContext";
import { useLocale } from "@/context/LocaleContext";

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "now";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

interface TopBarProps {
  metMs: number;
  telemetry: Telemetry | null;
  dsn: DsnStatus | null;
  timeline: TimelineState;
  connected: boolean;
  reconnecting: boolean;
  lastUpdate: number | null;
  visitorCount: number;
}

const pillStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "var(--bg-panel)",
  border: "1px solid var(--border-panel)",
  borderRadius: 4,
  padding: "3px 10px",
  height: 32,
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  color: "var(--text-dim)",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const valueStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-primary)",
  fontVariantNumeric: "tabular-nums",
};

const unitStyle: React.CSSProperties = {
  fontSize: 9,
  color: "var(--text-dim)",
  marginLeft: 1,
};

const infoButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  background: "var(--bg-panel)",
  border: "1px solid var(--border-panel)",
  borderRadius: 4,
  padding: "3px 10px",
  height: 32,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: "inherit",
  flexShrink: 0,
  transition: "color 0.15s, border-color 0.15s",
};

export function TopBar({ metMs, telemetry, dsn, timeline, connected, reconnecting, lastUpdate, visitorCount }: TopBarProps) {
  const [crewOpen, setCrewOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const { speedUnit } = useMetContext();
  const { t } = useLocale();

  const isStale =
    lastUpdate !== null && Date.now() - lastUpdate > STALE_THRESHOLD_MS;

  // Find the first active dish (downlink or uplink)
  const activeDish = dsn?.dishes.find((d) => d.downlinkActive || d.uplinkActive) ?? null;
  const commsActive = dsn?.signalActive ?? false;

  const nextMilestone = timeline.nextMilestone;
  const countdownMs = nextMilestone ? nextMilestone.metMs - metMs : null;

  const flightDay = `FD${String(timeline.flightDay).padStart(2, "0")}`;

  return (
    <div
      className="topbar-inner"
      style={{
        display: "flex",
        alignItems: "center",
        height: "100%",
        padding: "0 8px",
        gap: 6,
        background: "var(--bg-secondary)",
        overflow: "hidden",
      }}
    >
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      {/* Title + LIVE */}
      <div className="topbar-pill" style={{ ...pillStyle, gap: 8, paddingLeft: 12, paddingRight: 12 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--accent-cyan)",
          }}
        >
          ARTEMIS II
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 9,
            fontWeight: 700,
            color: "var(--accent-red)",
            letterSpacing: "0.1em",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent-red)",
              boxShadow: "0 0 6px var(--accent-red)",
              display: "inline-block",
              animation: "pulse-live 2s ease-in-out infinite",
            }}
          />
          LIVE
        </span>
        {/* Connection status indicators */}
        {reconnecting && (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "var(--accent-orange)",
              letterSpacing: "0.08em",
              borderLeft: "1px solid var(--border-subtle)",
              paddingLeft: 6,
            }}
          >
            RECONNECTING…
          </span>
        )}
        {!reconnecting && isStale && (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "#d4b800",
              letterSpacing: "0.08em",
              borderLeft: "1px solid var(--border-subtle)",
              paddingLeft: 6,
            }}
          >
            TELEMETRY DELAYED
          </span>
        )}
      </div>

      {/* MET Clock */}
      <div className="topbar-pill" style={pillStyle}>
        <MetClock metMs={metMs} size="small" showTPlus={false} />
      </div>

      {/* Phase badge */}
      <div className="topbar-pill" style={pillStyle}>
        <span style={labelStyle}>Phase</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--accent-green)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {timeline.currentPhaseName ?? "—"}
        </span>
      </div>

      {/* Flight Day */}
      <div className="topbar-pill" style={pillStyle}>
        <span style={labelStyle}>Day</span>
        <span style={{ ...valueStyle, color: "var(--accent-yellow)" }}>
          {flightDay}
        </span>
      </div>

      {/* Comms */}
      <div className="topbar-pill" style={pillStyle}>
        <span style={labelStyle}>DSN</span>
        <span
          className={`live-dot ${commsActive ? "" : "inactive"}`}
          style={{ width: 6, height: 6 }}
        />
        <span style={{ fontSize: 10, color: commsActive ? "var(--accent-green)" : "var(--text-dim)" }}>
          {activeDish ? activeDish.dish : "No contact"}
        </span>
      </div>

      {/* Crew */}
      <button
        className="topbar-pill"
        onClick={() => setCrewOpen(true)}
        style={{
          ...pillStyle,
          background: "none",
          border: "1px solid var(--border-subtle)",
          cursor: "pointer",
          gap: 4,
          padding: "2px 10px",
        }}
      >
        <span style={{ fontSize: 10, letterSpacing: 1 }}>🇺🇸🇺🇸🇺🇸🇨🇦</span>
        <span style={{ ...labelStyle, fontSize: 9 }}>{t("topbar.crew")}</span>
      </button>

      {/* Toilet Status */}
      <div className="topbar-pill" style={pillStyle} title="Toilet status — ground reported, not live telemetry">
        <span style={labelStyle}>{t("topbar.toilet")}</span>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-red)", display: "inline-block" }} />
        <span style={{ fontSize: 10, color: "var(--accent-red)", fontWeight: 700 }}>{t("common.inop")}</span>
      </div>

      {/* Visitor counter */}
      {visitorCount > 0 && (
        <div className="topbar-pill topbar-hide-mobile" style={pillStyle} title={`${visitorCount} people watching`}>
          <span style={{ fontSize: 11 }}>👀</span>
          <span style={{ fontSize: 11, color: "var(--accent-cyan)", fontWeight: 700 }}>{visitorCount}</span>
        </div>
      )}

      {/* Comm Status */}
      {dsn && !dsn.signalActive && (
        <div className="topbar-pill" style={{ ...pillStyle, borderColor: "rgba(255,61,61,0.3)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-red)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 10, color: "var(--accent-red)", fontWeight: 700 }}>{t("common.los")}</span>
        </div>
      )}

      {/* Telemetry: VEL, ALT, EARTH */}
      <div className="topbar-pill" aria-live="polite" aria-atomic="true" style={{ ...pillStyle, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={labelStyle}>{t("topbar.velocity")}</span>
          <span style={valueStyle}>
            {telemetry ? (speedUnit === "km/h" ? formatNumber(telemetry.speedKmH) : (telemetry.speedKmS * 1000).toFixed(1)) : "—"}
          </span>
          <span style={unitStyle}>{speedUnit}</span>
        </div>
        <div style={{ width: 1, height: 14, background: "var(--border-subtle)" }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={labelStyle}>{t("topbar.altitude")}</span>
          <span style={valueStyle}>
            {telemetry ? formatNumber(telemetry.altitudeKm) : "—"}
          </span>
          <span style={unitStyle}>km</span>
        </div>
      </div>

      {/* Crew sleep countdown */}
      {(() => {
        const nextSleep = timeline.raw?.activities.find(
          (a) => a.type === "sleep" && a.startMetMs > metMs
        );
        if (!nextSleep) return null;
        const sleepIn = nextSleep.startMetMs - metMs;
        return (
          <div className="topbar-pill topbar-hide-mobile" style={{ ...pillStyle, gap: 6 }}>
            <span style={labelStyle}>{t("topbar.sleep")}</span>
            <span style={{ fontSize: 10, color: "var(--accent-purple)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatCountdown(sleepIn)}
            </span>
          </div>
        );
      })()}

      {/* Lunar Approach Countdown */}
      {telemetry && telemetry.moonDistKm < 100000 && (
        <div className="topbar-pill" style={{ ...pillStyle, borderColor: "rgba(180,185,190,0.3)" }}>
          <span style={labelStyle}>{t("topbar.moon")}</span>
          <span style={{ fontSize: 12, color: "#d0d4d8", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(telemetry.moonDistKm).toLocaleString()} km
          </span>
        </div>
      )}

      {/* Signal Light-Time Delay */}
      {telemetry && telemetry.earthDistKm > 1000 && (
        <div className="topbar-pill topbar-hide-mobile" style={pillStyle} title="One-way signal travel time (speed of light)">
          <span style={labelStyle}>{t("topbar.delay")}</span>
          <span style={{ fontSize: 12, color: "#d0d4d8", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {(telemetry.earthDistKm / 299792).toFixed(2)}s
          </span>
        </div>
      )}

      {/* Info buttons */}
      <button
        className="topbar-pill topbar-hide-mobile"
        style={infoButtonStyle}
        onClick={() => setVehicleOpen(true)}
        aria-label="View vehicle information"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-cyan)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,0.35)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-panel)";
        }}
      >
        VEHICLE
      </button>

      {/* Next event countdown */}
      {nextMilestone && countdownMs !== null && (
        <div className="topbar-pill" style={{ ...pillStyle, gap: 8, marginLeft: "auto", borderColor: "rgba(255,140,0,0.3)" }}>
          <span style={labelStyle}>Next</span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-secondary)",
              maxWidth: 120,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {nextMilestone.name}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--accent-orange)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCountdown(countdownMs)}
          </span>
        </div>
      )}
      <CrewModal isOpen={crewOpen} onClose={() => setCrewOpen(false)} />
      <SpacecraftModal isOpen={vehicleOpen} onClose={() => setVehicleOpen(false)} />
    </div>
  );
}
