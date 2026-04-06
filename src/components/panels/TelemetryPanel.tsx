"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { useMetContext } from "@/context/MetContext";
import type { Telemetry, ArowTelemetry } from "@/lib/types";
import type { TimelineState } from "@/hooks/useTimeline";
import { AttitudeIndicator } from "@/components/AttitudeIndicator";
import { SawEfficiencyBar, computeSawEfficiency } from "@/components/SawIndicator";
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

/** Convert km/h to the selected speed unit and format */
function fmtSpeed(kmh: number, unit: string): string {
  switch (unit) {
    case "mph": return Math.round(kmh * 0.621371).toLocaleString();
    case "kn":  return Math.round(kmh * 0.539957).toLocaleString();
    case "m/s": return (kmh / 3.6).toFixed(1);
    default:    return Math.round(kmh).toLocaleString();
  }
}

/** Decode spacecraft mode hex byte to a human-readable label */
function decodeSpacecraftMode(hex: string): string {
  const modeMap: Record<string, string> = {
    "80": "Attitude Hold",
    "81": "Sun Safe",
    "82": "Rate Damp",
    "ad": "Burn Attitude",
    "ae": "Observation",
    "b0": "Coast",
    "ec": "Maneuver",
    "ed": "Separation",
  };
  const upper = hex.toUpperCase();
  return modeMap[hex.toLowerCase()] ?? `0x${upper}`;
}

/** Dead-band indicator — shows where the angular rate sits within ±band */
function DeadBandBar({ rate, band }: { rate: number | null; band: number }) {
  if (rate == null) return null;
  const clamped = Math.max(-band, Math.min(band, rate));
  const pct = ((clamped + band) / (2 * band)) * 100;
  const inBand = Math.abs(rate) <= band;
  const color = inBand ? "var(--accent-green)" : "var(--accent-red)";
  return (
    <div style={{ width: 48, height: 6, flexShrink: 0, background: "rgba(255,255,255,0.05)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
      {/* Center line */}
      <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: "rgba(255,255,255,0.15)" }} />
      {/* Rate marker */}
      <div style={{
        position: "absolute",
        left: `${pct}%`,
        top: 0,
        width: 3,
        height: "100%",
        background: color,
        borderRadius: 1,
        transform: "translateX(-1.5px)",
        boxShadow: `0 0 3px ${color}`,
      }} />
    </div>
  );
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
      <span className="telem-value" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
        <span style={{ width: 48, flexShrink: 0, display: "inline-flex", justifyContent: "flex-end" }}>{sparkline ?? null}</span>
        <span style={{ textAlign: "right" }}>
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
        value={t ? fmtSpeed(t.speedKmH, speedUnit) : "—"}
        unit={speedUnit}
        sparkline={<Sparkline metric="speed_km_h" hours={24} color="#00e5ff" />}
      />
      <TelemRow
        label={tr("telemetry.moonRelSpeed")}
        value={t?.moonRelSpeedKmH ? fmtSpeed(t.moonRelSpeedKmH, speedUnit) : "—"}
        unit={speedUnit}
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
          <TelemRow label={tr("telemetry.rollRate")} value={arow?.rollRate != null ? fmt(arow.rollRate, 2) : "—"} unit="°/s"
            sparkline={<DeadBandBar rate={arow?.rollRate ?? null} band={1.0} />}
          />
          <TelemRow label={tr("telemetry.pitchRate")} value={arow?.pitchRate != null ? fmt(arow.pitchRate, 2) : "—"} unit="°/s"
            sparkline={<DeadBandBar rate={arow?.pitchRate ?? null} band={1.0} />}
          />
          <TelemRow label={tr("telemetry.yawRate")} value={arow?.yawRate != null ? fmt(arow.yawRate, 2) : "—"} unit="°/s"
            sparkline={<DeadBandBar rate={arow?.yawRate ?? null} band={1.0} />}
          />
        </div>
        <AttitudeIndicator quaternion={arow?.quaternion ?? null} eulerDeg={arow?.eulerDeg} />
      </div>
      {/* Gyro cross-check — outside the flex container so it's full-width */}
      {arow?.rollRate != null && arow?.rollRateFallback != null && (() => {
        const maxDelta = Math.max(
          Math.abs((arow.rollRate ?? 0) - (arow.rollRateFallback ?? 0)),
          Math.abs((arow.pitchRate ?? 0) - (arow.pitchRateFallback ?? 0)),
          Math.abs((arow.yawRate ?? 0) - (arow.yawRateFallback ?? 0)),
        );
        return (
          <TelemRow
            label={tr("telemetry.gyroHealth")}
            value={`${fmt(maxDelta, 3)}°/s`}
          />
        );
      })()}

      <TelemSection label={tr("panels.solarArrays")} />
      {(["saw1", "saw2", "saw3", "saw4"] as const).map((k, i) => {
        const eff = computeSawEfficiency(arow?.sawGimbals ?? null, arow?.sawAngles ?? null, k);
        const g = arow?.sawGimbals?.[k];
        return (
          <div key={k} className="telem-row" style={{ flexDirection: "column", gap: 2, alignItems: "stretch" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="telem-label">{tr("telemetry.saw")} {i + 1}</span>
              <span className="telem-value" style={{ minWidth: 130 }}>
                {g ? (
                  <>
                    <span title="Inner Gimbal — rotation around the boom axis" style={{ cursor: "help", borderBottom: "1px dotted var(--text-dim)" }}>IG</span>
                    {" "}{fmtDeg(g.ig)}
                    {"  "}
                    <span title="Outer Gimbal — tilt toward/away from the sun" style={{ cursor: "help", borderBottom: "1px dotted var(--text-dim)" }}>OG</span>
                    {" "}{fmtDeg(g.og)}
                  </>
                ) : arow?.sawAngles ? fmtDeg(arow.sawAngles[k]) : "—"}
              </span>
            </div>
            <SawEfficiencyBar efficiency={eff} />
          </div>
        );
      })}

      {/* Solar power estimate — 11.2 kW nominal ESM output × average SAW efficiency */}
      {arow && (arow.sawGimbals || arow.sawAngles) && (() => {
        const NOMINAL_KW = 11.2;
        let totalEff = 0;
        for (const k of ["saw1", "saw2", "saw3", "saw4"] as const) {
          totalEff += computeSawEfficiency(arow.sawGimbals, arow.sawAngles, k);
        }
        const avgEff = totalEff / 4;
        const powerKw = NOMINAL_KW * avgEff;
        const color = avgEff > 0.7 ? "var(--accent-green)" : avgEff > 0.4 ? "var(--accent-yellow)" : "var(--accent-red)";
        return (
          <TelemRow
            label={tr("telemetry.solarPower")}
            value={`~${powerKw.toFixed(1)} kW`}
            sparkline={<span style={{ fontSize: 7, color, fontWeight: 700 }}>{Math.round(avgEff * 100)}% eff</span>}
          />
        );
      })()}

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
        label={tr("telemetry.lightTime")}
        value={arow?.signalLightTimeSec != null ? `${arow.signalLightTimeSec.toFixed(2)}s` : "—"}
        sparkline={arow?.signalLightTimeSec != null ? (
          <span style={{ fontSize: 7, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
            {tr("telemetry.measured")} {arow.signalLightTimeSec.toFixed(1)}s {tr("telemetry.ago")}
          </span>
        ) : undefined}
      />
      <TelemRow
        label={tr("telemetry.mode")}
        value={arow ? decodeSpacecraftMode(arow.spacecraftMode) : "—"}
      />

      </div>
    </PanelFrame>
  );
}
