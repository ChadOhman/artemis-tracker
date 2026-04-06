"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { useMetContext } from "@/context/MetContext";
import type { Telemetry, ArowTelemetry } from "@/lib/types";
import type { TimelineState } from "@/hooks/useTimeline";
import { AttitudeIndicator } from "@/components/AttitudeIndicator";
import { useLocale } from "@/context/LocaleContext";
import { Sparkline } from "@/components/shared/Sparkline";

// NOTE: ICPS upper stage deorbited after TLI — no longer tracked on the
// dashboard. AROW parser and archive still accept ICPS fields for historical
// completeness but nothing renders them.

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
        {sparkline && <span style={{ width: 48, flexShrink: 0, display: "inline-flex" }}>{sparkline}</span>}
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
        label={tr("telemetry.moonRelSpeed")}
        value={t?.moonRelSpeedKmH ? Math.round(t.moonRelSpeedKmH).toLocaleString() : "—"}
        unit="km/h"
        sparkline={<Sparkline metric="moon_rel_speed_km_h" hours={24} color="#b388ff" />}
      />
      <TelemRow
        label={tr("telemetry.gForce")}
        value={fmt(t?.gForce, 4)}
        unit="g"
        sparkline={<Sparkline metric="g_force" hours={24} color="#ffab40" />}
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
      {arow?.sawGimbals ? (
        <>
          {(["saw1", "saw2", "saw3", "saw4"] as const).map((k, i) => (
            <TelemRow
              key={k}
              label={`SAW ${i + 1}`}
              value={`${tr("telemetry.innerGimbal")} ${fmtDeg(arow.sawGimbals![k].ig)}  ${tr("telemetry.outerGimbal")} ${fmtDeg(arow.sawGimbals![k].og)}`}
            />
          ))}
        </>
      ) : (
        <>
          <TelemRow label="SAW 1" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw1) : "—"} />
          <TelemRow label="SAW 2" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw2) : "—"} />
          <TelemRow label="SAW 3" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw3) : "—"} />
          <TelemRow label="SAW 4" value={arow?.sawAngles ? fmtDeg(arow.sawAngles.saw4) : "—"} />
        </>
      )}

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

      </div>
    </PanelFrame>
  );
}
