"use client";
import { useState } from "react";
import { MetClock } from "./shared/MetClock";
import { formatMet } from "@/lib/met";
import type { Telemetry, DsnStatus } from "@/lib/types";
import type { TimelineState } from "@/hooks/useTimeline";
import { CrewModal } from "./modals/CrewModal";
import { SpacecraftModal } from "./modals/SpacecraftModal";

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toFixed(1);
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

interface TopBarProps {
  metMs: number;
  telemetry: Telemetry | null;
  dsn: DsnStatus | null;
  timeline: TimelineState;
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

export function TopBar({ metMs, telemetry, dsn, timeline }: TopBarProps) {
  const [crewOpen, setCrewOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);

  // Find the first active dish (downlink or uplink)
  const activeDish = dsn?.dishes.find((d) => d.downlinkActive || d.uplinkActive) ?? null;
  const commsActive = dsn?.signalActive ?? false;

  const nextMilestone = timeline.nextMilestone;
  const countdownMs = nextMilestone ? nextMilestone.metMs - metMs : null;

  const flightDay = `FD${String(timeline.flightDay).padStart(2, "0")}`;

  return (
    <div
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
      {/* Title + LIVE */}
      <div style={{ ...pillStyle, gap: 8, paddingLeft: 12, paddingRight: 12 }}>
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
      </div>

      {/* MET Clock */}
      <div style={pillStyle}>
        <MetClock metMs={metMs} size="small" showTPlus={false} />
      </div>

      {/* Phase badge */}
      <div style={pillStyle}>
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
      <div style={pillStyle}>
        <span style={labelStyle}>Day</span>
        <span style={{ ...valueStyle, color: "var(--accent-yellow)" }}>
          {flightDay}
        </span>
      </div>

      {/* Comms */}
      <div style={pillStyle}>
        <span style={labelStyle}>DSN</span>
        <span
          className={`live-dot ${commsActive ? "" : "inactive"}`}
          style={{ width: 6, height: 6 }}
        />
        <span style={{ fontSize: 10, color: commsActive ? "var(--accent-green)" : "var(--text-dim)" }}>
          {activeDish ? activeDish.dish : "No contact"}
        </span>
      </div>

      {/* Telemetry: VEL, ALT, EARTH */}
      <div style={{ ...pillStyle, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={labelStyle}>VEL</span>
          <span style={valueStyle}>
            {telemetry ? telemetry.speedKmS.toFixed(2) : "—"}
          </span>
          <span style={unitStyle}>km/s</span>
        </div>
        <div style={{ width: 1, height: 14, background: "var(--border-subtle)" }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={labelStyle}>ALT</span>
          <span style={valueStyle}>
            {telemetry ? formatNumber(telemetry.altitudeKm) : "—"}
          </span>
          <span style={unitStyle}>km</span>
        </div>
        <div style={{ width: 1, height: 14, background: "var(--border-subtle)" }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={labelStyle}>Earth</span>
          <span style={valueStyle}>
            {telemetry ? formatNumber(telemetry.earthDistKm) : "—"}
          </span>
          <span style={unitStyle}>km</span>
        </div>
      </div>

      {/* Info buttons */}
      <button
        style={infoButtonStyle}
        onClick={() => setCrewOpen(true)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-cyan)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,0.35)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-panel)";
        }}
      >
        CREW
      </button>
      <button
        style={infoButtonStyle}
        onClick={() => setVehicleOpen(true)}
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
        <div style={{ ...pillStyle, gap: 8, marginLeft: "auto", borderColor: "rgba(255,140,0,0.3)" }}>
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
