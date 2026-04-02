"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { DsnStatus, DsnDish } from "@/lib/types";

interface DsnPanelProps {
  dsn: DsnStatus | null;
}

function fmtRate(bps: number): string {
  if (bps >= 1_000_000) return (bps / 1_000_000).toFixed(1) + " Mbps";
  if (bps >= 1_000) return (bps / 1_000).toFixed(1) + " kbps";
  return bps.toFixed(0) + " bps";
}

function fmtRange(km: number): string {
  if (km >= 1_000_000) return (km / 1_000_000).toFixed(2) + "M km";
  if (km >= 1_000) return (km / 1_000).toFixed(1) + "k km";
  return km.toFixed(0) + " km";
}

function fmtRtlt(s: number): string {
  if (s >= 60) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  return `${s.toFixed(1)}s`;
}

function DishCard({ dish }: { dish: DsnDish }) {
  const hasSignal = dish.downlinkActive || dish.uplinkActive;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 4,
        padding: "6px 8px",
        marginBottom: 4,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span
          className={`live-dot ${hasSignal ? "" : "inactive"}`}
          style={{ width: 7, height: 7, flexShrink: 0 }}
          aria-hidden="true"
        />
        <span className="sr-only">{hasSignal ? "(active)" : "(no signal)"}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: hasSignal ? "var(--accent-green)" : "var(--text-secondary)",
            letterSpacing: "0.05em",
          }}
        >
          {dish.dish}
        </span>
        <span style={{ fontSize: 9, color: "var(--text-dim)", marginLeft: "auto" }}>
          {dish.stationName}
        </span>
      </div>

      {/* Signal indicators */}
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            opacity: dish.downlinkActive ? 1 : 0.35,
          }}
        >
          <span style={{ color: "var(--accent-cyan)", fontSize: 11 }}>↓</span>
          <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>
            {dish.downlinkActive ? fmtRate(dish.downlinkRate) : "No DL"}
          </span>
          {dish.downlinkBand && (
            <span
              style={{
                fontSize: 8,
                color: "var(--text-dim)",
                background: "var(--bg-panel)",
                padding: "1px 4px",
                borderRadius: 2,
              }}
            >
              {dish.downlinkBand}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            opacity: dish.uplinkActive ? 1 : 0.35,
          }}
        >
          <span style={{ color: "var(--accent-orange)", fontSize: 11 }}>↑</span>
          <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>
            {dish.uplinkActive ? fmtRate(dish.uplinkRate) : "No UL"}
          </span>
          {dish.uplinkBand && (
            <span
              style={{
                fontSize: 8,
                color: "var(--text-dim)",
                background: "var(--bg-panel)",
                padding: "1px 4px",
                borderRadius: 2,
              }}
            >
              {dish.uplinkBand}
            </span>
          )}
        </div>
      </div>

      {/* Range + RTLT */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
          <span style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.08em" }}>
            RANGE
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>
            {fmtRange(dish.rangeKm)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
          <span style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.08em" }}>
            RTLT
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>
            {fmtRtlt(dish.rtltSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DsnPanel({ dsn }: DsnPanelProps) {
  const activeDishes = dsn?.dishes.filter((d) => d.downlinkActive || d.uplinkActive) ?? [];
  const allDishes = dsn?.dishes ?? [];
  const signalActive = dsn?.signalActive ?? false;

  return (
    <PanelFrame
      title="DSN Comms"
      icon="📶"
      accentColor="var(--accent-green)"
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            className={`live-dot ${signalActive ? "" : "inactive"}`}
            style={{ width: 6, height: 6 }}
          />
          <span style={{ fontSize: 9, color: signalActive ? "var(--accent-green)" : "var(--text-dim)" }}>
            {signalActive ? "SIGNAL" : "NO CONTACT"}
          </span>
        </div>
      }
    >
      {allDishes.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 60,
            color: "var(--text-dim)",
            fontSize: 11,
            letterSpacing: "0.06em",
          }}
        >
          No active DSN contact
        </div>
      ) : (
        allDishes.map((dish) => <DishCard key={dish.dish} dish={dish} />)
      )}
    </PanelFrame>
  );
}
