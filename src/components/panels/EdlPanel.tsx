"use client";
// Entry Descent Landing panel — shown automatically during re-entry mode.
// Aggregates the critical re-entry events into a focused timeline.

import { PanelFrame } from "@/components/shared/PanelFrame";
import type { Telemetry } from "@/lib/types";

interface EdlPanelProps {
  metMs: number;
  telemetry: Telemetry | null;
}

interface EdlEvent {
  id: string;
  label: string;
  metHours: number;
}

// From src/lib/timeline/data.ts milestones
const EDL_EVENTS: EdlEvent[] = [
  { id: "smsep",   label: "SM SEP",   metHours: 216.5 },
  { id: "entry",   label: "ENTRY",    metHours: 217.0 },
  { id: "blackout",label: "BLACKOUT", metHours: 217.1 },
  { id: "drogue",  label: "DROGUE",   metHours: 217.3 },
  { id: "mains",   label: "MAINS",    metHours: 217.4 },
  { id: "splash",  label: "SPLASH",   metHours: 217.53 },
  { id: "recovery",label: "RECOVERY", metHours: 218.0 },
];

const ENTRY_INTERFACE_MET_MS = 217 * 3600 * 1000;

// Crew g-force limit per NASA expected design
const CREW_G_LIMIT = 3.9;

function fmtCountdown(ms: number): string {
  const neg = ms < 0;
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const sign = neg ? "T+" : "T−";
  if (h > 0) return `${sign}${h}:${pad(m)}:${pad(s)}`;
  return `${sign}${pad(m)}:${pad(s)}`;
}

function fmtRelative(ms: number): string {
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (ms < 0) {
    // past
    if (h > 0) return `${h}h ${m}m ago`;
    if (m > 0) return `${m}m ${s}s ago`;
    return `${s}s ago`;
  }
  // future
  if (h > 0) return `in ${h}h ${pad(m)}m`;
  if (m > 0) return `in ${m}m ${pad(s)}s`;
  return `in ${s}s`;
}

/** Estimate heat shield temperature based on altitude during entry.
 *  Peak ~2,760°C at peak heating (~50-60km altitude during the plasma phase). */
function estimateHeatShieldTemp(altitudeKm: number | null, metMs: number): number | null {
  if (altitudeKm == null) return null;
  // Only meaningful between entry interface and main chutes
  if (metMs < ENTRY_INTERFACE_MET_MS) return null;
  if (metMs > 217.4 * 3600 * 1000) return null;
  // Rough model: peak at ~55km altitude, scales with speed² but we don't have speed here
  // Use altitude as a proxy — peak heating roughly 40-70km
  if (altitudeKm > 120) return 200;
  if (altitudeKm > 90) return 800;
  if (altitudeKm > 70) return 1800;
  if (altitudeKm > 50) return 2760; // peak
  if (altitudeKm > 30) return 1500;
  if (altitudeKm > 15) return 400;
  return 150;
}

export function EdlPanel({ metMs, telemetry }: EdlPanelProps) {
  const entryDelta = ENTRY_INTERFACE_MET_MS - metMs;
  const nextEvent = EDL_EVENTS.find((e) => e.metHours * 3600 * 1000 > metMs);
  const currentPhase = (() => {
    // Find the most recent event <= metMs
    let current: EdlEvent | null = null;
    for (const e of EDL_EVENTS) {
      if (e.metHours * 3600 * 1000 <= metMs) current = e;
    }
    return current;
  })();

  const altitudeKm = telemetry?.altitudeKm ?? null;
  const speedKmH = telemetry?.speedKmH ?? null;
  const gForce = telemetry?.gForce ?? 0;
  const heatShieldTemp = estimateHeatShieldTemp(altitudeKm, metMs);

  const gPercent = Math.min(100, (gForce / CREW_G_LIMIT) * 100);
  const gOverLimit = gForce > CREW_G_LIMIT;

  // Signal status — blackout window
  const inBlackout =
    metMs >= 217.1 * 3600 * 1000 && metMs < 217.25 * 3600 * 1000;
  const signalStatus = inBlackout ? "BLACKOUT" : "NOMINAL";
  const signalColor = inBlackout ? "#ff4455" : "#00ff88";

  return (
    <PanelFrame
      title="Entry Descent Landing"
      icon="🔥"
      accentColor="#ff6644"
      headerRight={
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: entryDelta > 0 ? "#ffaa00" : "#ff4455",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
          }}
        >
          {fmtCountdown(entryDelta)}
        </span>
      }
    >
      {/* Current phase */}
      <div
        style={{
          padding: "8px 10px",
          background: "rgba(255, 102, 68, 0.08)",
          border: "1px solid rgba(255, 102, 68, 0.25)",
          borderRadius: 4,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Phase
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#ff8866",
            letterSpacing: "0.04em",
          }}
        >
          {currentPhase?.label ?? "PRE-EDL"}
        </div>
      </div>

      {/* Event checklist */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Timeline
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {EDL_EVENTS.map((e) => {
            const eventMs = e.metHours * 3600 * 1000;
            const delta = eventMs - metMs;
            const isPast = delta < 0;
            const isNext = nextEvent?.id === e.id;
            const isCurrent = currentPhase?.id === e.id && !isPast && delta > -60000;

            return (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "3px 6px",
                  background: isNext
                    ? "rgba(255, 170, 0, 0.1)"
                    : isCurrent
                    ? "rgba(255, 68, 85, 0.15)"
                    : "transparent",
                  borderRadius: 3,
                  opacity: isPast ? 0.5 : 1,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: isPast ? "#00ff88" : isNext ? "#ffaa00" : "var(--text-dim)",
                  }}
                >
                  {isPast ? "●" : isNext ? "◉" : "○"}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    minWidth: 76,
                    letterSpacing: "0.04em",
                  }}
                >
                  {e.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                    flex: 1,
                    textAlign: "right",
                  }}
                >
                  {fmtRelative(delta)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Telemetry readouts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Altitude
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            {altitudeKm != null ? `${altitudeKm.toFixed(1)} km` : "—"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Speed
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            {speedKmH != null ? `${speedKmH.toLocaleString("en-US", { maximumFractionDigits: 0 })} km/h` : "—"}
          </span>
        </div>

        {/* G-force bar */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              G-Force
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: gOverLimit ? "#ff4455" : "var(--text-primary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {gForce.toFixed(2)} g
            </span>
          </div>
          <div
            style={{
              background: "#1a2332",
              height: 8,
              borderRadius: 3,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${gPercent}%`,
                height: "100%",
                background: gOverLimit ? "#ff4455" : gPercent > 75 ? "#ffaa00" : "#00e5ff",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 2,
              fontSize: 8,
              color: "var(--text-dim)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span>0</span>
            <span>crew limit: {CREW_G_LIMIT}g</span>
          </div>
        </div>

        {/* Heat shield temp */}
        {heatShieldTemp != null && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Heat Shield (est.)
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: heatShieldTemp > 2000 ? "#ff6644" : "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              ~{heatShieldTemp.toLocaleString()} °C
            </span>
          </div>
        )}

        {/* Signal status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Signal
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: signalColor,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
            }}
          >
            {signalStatus}
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid var(--border-panel)",
          fontSize: 8,
          color: "var(--text-dim)",
          fontStyle: "italic",
          letterSpacing: "0.04em",
          lineHeight: 1.4,
        }}
      >
        Heat shield temperature is an estimate based on phase. G-force limit 3.9g is NASA's expected peak for the crew.
      </div>
    </PanelFrame>
  );
}
