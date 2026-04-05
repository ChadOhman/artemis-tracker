"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { useMetContext } from "@/context/MetContext";
import type { Telemetry, ArowTelemetry } from "@/lib/types";
import type { TimelineState } from "@/hooks/useTimeline";
import { AttitudeIndicator } from "@/components/AttitudeIndicator";
import { useLocale } from "@/context/LocaleContext";
import { Sparkline } from "@/components/shared/Sparkline";

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
  sparkline,
}: {
  label: string;
  value: string;
  unit?: string;
  sparkline?: React.ReactNode;
}) {
  return (
    <div className="telem-row">
      <span className="telem-label">{label}</span>
      <span className="telem-value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {sparkline}
        <span>
          {value}
          {unit && <span className="telem-unit">{unit}</span>}
        </span>
      </span>
    </div>
  );
}

export function TelemetryPanel({ telemetry, timeline, arow }: TelemetryPanelProps) {
  const t = telemetry;
  const phaseName = timeline.currentPhaseName ?? "Unknown";
  const { speedUnit } = useMetContext();
  const { t: tr } = useLocale();

  return (
    <PanelFrame
      title={tr("panels.telemetry")}
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
      <TelemSection label={tr("panels.dynamics")} />
      <TelemRow
        label={tr("telemetry.speed")}
        value={t ? (speedUnit === "km/h" ? Math.round(t.speedKmH).toLocaleString() : (t.speedKmS * 1000).toFixed(1)) : "—"}
        unit={speedUnit}
        sparkline={<Sparkline metric="speed_km_h" hours={24} color="#00e5ff" />}
      />
      <TelemRow
        label={tr("telemetry.gForce")}
        value={fmt(t?.gForce, 4)}
        unit="g"
      />

      <TelemSection label={tr("panels.position")} />
      <TelemRow
        label={tr("topbar.altitude")}
        value={fmtKm(t?.altitudeKm)}
        unit="km"
        sparkline={<Sparkline metric="altitude_km" hours={24} color="#00e5ff" />}
      />
      <TelemRow
        label={tr("telemetry.earthDist")}
        value={fmtKm(t?.earthDistKm)}
        unit="km"
        sparkline={<Sparkline metric="earth_dist_km" hours={24} color="#00e5ff" />}
      />
      <TelemRow
        label={tr("telemetry.moonDist")}
        value={fmtKm(t?.moonDistKm)}
        unit="km"
        sparkline={<Sparkline metric="moon_dist_km" hours={24} color="#b388ff" />}
      />

      <TelemSection label={tr("panels.orbit")} />
      <TelemRow
        label={tr("telemetry.periapsis")}
        value={fmtKm(t?.periapsisKm)}
        unit="km"
      />
      <TelemRow
        label={tr("telemetry.apoapsis")}
        value={fmtKm(t?.apoapsisKm)}
        unit="km"
      />

      <TelemSection label={tr("panels.attitude")} />
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <TelemRow label={tr("telemetry.roll")} value={arow?.eulerDeg ? fmtDeg(arow.eulerDeg.roll) : "—"} />
          <TelemRow label={tr("telemetry.pitch")} value={arow?.eulerDeg ? fmtDeg(arow.eulerDeg.pitch) : "—"} />
          <TelemRow label={tr("telemetry.yaw")} value={arow?.eulerDeg ? fmtDeg(arow.eulerDeg.yaw) : "—"} />
          <TelemRow label={tr("telemetry.rollRate")} value={arow?.rollRate != null ? fmt(arow.rollRate, 2) : "—"} unit="°/s" />
          <TelemRow label={tr("telemetry.pitchRate")} value={arow?.pitchRate != null ? fmt(arow.pitchRate, 2) : "—"} unit="°/s" />
          <TelemRow label={tr("telemetry.yawRate")} value={arow?.yawRate != null ? fmt(arow.yawRate, 2) : "—"} unit="°/s" />
        </div>
        <AttitudeIndicator quaternion={arow?.quaternion ?? null} eulerDeg={arow?.eulerDeg} />
      </div>

      <TelemSection label={tr("panels.solarArrays")} />
      <TelemRow label="SAW 1" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw1) : "—"} />
      <TelemRow label="SAW 2" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw2) : "—"} />
      <TelemRow label="SAW 3" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw3) : "—"} />
      <TelemRow label="SAW 4" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw4) : "—"} />

      <TelemSection label={tr("panels.commLink")} />
      <TelemRow
        label={tr("telemetry.antenna1")}
        value={arow?.antennaGimbal ? `${fmt(arow.antennaGimbal.az1)}° / ${fmt(arow.antennaGimbal.el1)}°` : "—"}
      />
      <TelemRow
        label={tr("telemetry.antenna2")}
        value={arow?.antennaGimbal ? `${fmt(arow.antennaGimbal.az2)}° / ${fmt(arow.antennaGimbal.el2)}°` : "—"}
      />
      <TelemRow
        label={tr("telemetry.mode")}
        value={arow ? `0x${arow.spacecraftMode.toUpperCase()}` : "—"}
      />

      <TelemSection label={tr("panels.icpsUpperStage")} />
      {arow ? (
        <div className="telem-row">
          <span className="telem-label">{tr("telemetry.status")}</span>
          <span
            className="telem-value"
            style={{
              color: arow.icps.active ? "var(--accent-green)" : "var(--text-dim)",
              fontWeight: 700,
            }}
          >
            {arow.icps.active ? tr("telemetry.active") : tr("telemetry.lost")}
          </span>
        </div>
      ) : (
        <TelemRow label={tr("telemetry.status")} value={"—"} />
      )}
      {arow && arow.icps.active && (() => {
        const e = quaternionToEulerDeg(arow.icps.quaternion);
        return (
          <>
            <TelemRow label={tr("telemetry.icpsRoll")} value={fmtDeg(e.roll)} />
            <TelemRow label={tr("telemetry.icpsPitch")} value={fmtDeg(e.pitch)} />
            <TelemRow label={tr("telemetry.icpsYaw")} value={fmtDeg(e.yaw)} />
          </>
        );
      })()}
      </div>
    </PanelFrame>
  );
}
