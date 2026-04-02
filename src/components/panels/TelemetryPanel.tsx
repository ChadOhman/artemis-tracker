"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { Telemetry } from "@/lib/types";
import type { TimelineState } from "@/hooks/useTimeline";

interface TelemetryPanelProps {
  telemetry: Telemetry | null;
  timeline: TimelineState;
}

function fmt(n: number | undefined, decimals = 1): string {
  if (n === undefined || n === null) return "—";
  return n.toFixed(decimals);
}

function fmtKm(n: number | undefined, decimals = 1): string {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function TelemSection({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.14em",
        color: "var(--text-dim)",
        textTransform: "uppercase",
        paddingTop: 6,
        paddingBottom: 2,
        borderBottom: "1px solid var(--border-panel)",
        marginBottom: 2,
      }}
    >
      {label}
    </div>
  );
}

function TelemRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="telem-row">
      <span className="telem-label">{label}</span>
      <span className="telem-value">
        {value}
        {unit && <span className="telem-unit">{unit}</span>}
      </span>
    </div>
  );
}

export function TelemetryPanel({ telemetry, timeline }: TelemetryPanelProps) {
  const t = telemetry;
  const phaseName = timeline.currentPhaseName ?? "Unknown";

  return (
    <PanelFrame
      title="Telemetry"
      icon="📡"
      accentColor="var(--accent-cyan)"
      headerRight={
        <span
          style={{
            fontSize: 9,
            color: "var(--accent-green)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {phaseName}
        </span>
      }
    >
      <div aria-live="polite" aria-atomic="false">
      <TelemSection label="Dynamics" />
      <TelemRow
        label="Velocity"
        value={t ? Math.round(t.speedKmH).toLocaleString() : "—"}
        unit="km/h"
      />
      <TelemRow
        label="G-Force"
        value={fmt(t?.gForce, 4)}
        unit="g"
      />

      <TelemSection label="Position" />
      <TelemRow
        label="Altitude"
        value={fmtKm(t?.altitudeKm)}
        unit="km"
      />
      <TelemRow
        label="Earth Dist"
        value={fmtKm(t?.earthDistKm)}
        unit="km"
      />
      <TelemRow
        label="Moon Dist"
        value={fmtKm(t?.moonDistKm)}
        unit="km"
      />

      <TelemSection label="Orbit" />
      <TelemRow
        label="Periapsis"
        value={fmtKm(t?.periapsisKm)}
        unit="km"
      />
      <TelemRow
        label="Apoapsis"
        value={fmtKm(t?.apoapsisKm)}
        unit="km"
      />
      </div>
    </PanelFrame>
  );
}
