"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { useMetContext } from "@/context/MetContext";
import type { Telemetry, ArowTelemetry } from "@/lib/types";
import type { TimelineState } from "@/hooks/useTimeline";
import { AttitudeIndicator } from "@/components/AttitudeIndicator";

interface TelemetryPanelProps {
  telemetry: Telemetry | null;
  timeline: TimelineState;
  arow: ArowTelemetry | null;
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

function fmtDeg(n: number | undefined, decimals = 1): string {
  if (n === undefined || n === null) return "—";
  return n.toFixed(decimals) + "°";
}

/** Convert quaternion to euler angles (roll, pitch, yaw) in degrees for ICPS display. */
function quaternionToEulerDeg(q: { w: number; x: number; y: number; z: number }): {
  roll: number;
  pitch: number;
  yaw: number;
} {
  const { w, x, y, z } = q;
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp) * (180 / Math.PI);
  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1
    ? (Math.sign(sinp) * 90)
    : Math.asin(sinp) * (180 / Math.PI);
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp) * (180 / Math.PI);
  return { roll, pitch, yaw };
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

export function TelemetryPanel({ telemetry, timeline, arow }: TelemetryPanelProps) {
  const t = telemetry;
  const phaseName = timeline.currentPhaseName ?? "Unknown";
  const { speedUnit } = useMetContext();

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
        value={t ? (speedUnit === "km/h" ? Math.round(t.speedKmH).toLocaleString() : (t.speedKmS * 1000).toFixed(1)) : "—"}
        unit={speedUnit}
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

      <TelemSection label="Attitude" />
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <TelemRow label="Roll" value={arow?.eulerDeg ? fmtDeg(arow.eulerDeg.roll) : "—"} />
          <TelemRow label="Pitch" value={arow?.eulerDeg ? fmtDeg(arow.eulerDeg.pitch) : "—"} />
          <TelemRow label="Yaw" value={arow?.eulerDeg ? fmtDeg(arow.eulerDeg.yaw) : "—"} />
          <TelemRow label="Roll Rate" value={arow?.rollRate != null ? fmt(arow.rollRate, 2) : "—"} unit="°/s" />
          <TelemRow label="Pitch Rate" value={arow?.pitchRate != null ? fmt(arow.pitchRate, 2) : "—"} unit="°/s" />
          <TelemRow label="Yaw Rate" value={arow?.yawRate != null ? fmt(arow.yawRate, 2) : "—"} unit="°/s" />
        </div>
        <AttitudeIndicator quaternion={arow?.quaternion ?? null} />
      </div>

      <TelemSection label="Solar Arrays" />
      <TelemRow label="SAW 1" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw1) : "—"} />
      <TelemRow label="SAW 2" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw2) : "—"} />
      <TelemRow label="SAW 3" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw3) : "—"} />
      <TelemRow label="SAW 4" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw4) : "—"} />

      <TelemSection label="Comm Link" />
      <TelemRow
        label="Ant 1 Az/El"
        value={arow?.antennaGimbal ? `${fmt(arow.antennaGimbal.az1)}° / ${fmt(arow.antennaGimbal.el1)}°` : "—"}
      />
      <TelemRow
        label="Ant 2 Az/El"
        value={arow?.antennaGimbal ? `${fmt(arow.antennaGimbal.az2)}° / ${fmt(arow.antennaGimbal.el2)}°` : "—"}
      />
      <TelemRow
        label="Mode"
        value={arow ? `0x${arow.spacecraftMode.toUpperCase()}` : "—"}
      />

      <TelemSection label="ICPS Upper Stage" />
      {arow ? (
        <div className="telem-row">
          <span className="telem-label">Status</span>
          <span
            className="telem-value"
            style={{
              color: arow.icps.active ? "var(--accent-green)" : "var(--text-dim)",
              fontWeight: 700,
            }}
          >
            {arow.icps.active ? "ACTIVE" : "LOST"}
          </span>
        </div>
      ) : (
        <TelemRow label="Status" value={"—"} />
      )}
      {arow && arow.icps.active && (() => {
        const e = quaternionToEulerDeg(arow.icps.quaternion);
        return (
          <>
            <TelemRow label="ICPS Roll" value={fmtDeg(e.roll)} />
            <TelemRow label="ICPS Pitch" value={fmtDeg(e.pitch)} />
            <TelemRow label="ICPS Yaw" value={fmtDeg(e.yaw)} />
          </>
        );
      })()}
      </div>
    </PanelFrame>
  );
}
