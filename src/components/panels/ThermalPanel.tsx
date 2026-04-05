"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { computeThermal } from "@/lib/thermal";
import type { StateVector, ArowTelemetry } from "@/lib/types";
import { LAUNCH_TIME_MS } from "@/lib/constants";

interface ThermalPanelProps {
  stateVector: StateVector | null;
  arow: ArowTelemetry | null;
  metMs: number;
}

export function ThermalPanel({ stateVector, arow, metMs }: ThermalPanelProps) {
  if (!stateVector) {
    return (
      <PanelFrame title="Thermal" icon="🌡️" accentColor="var(--accent-orange)">
        <div style={{ padding: 12, color: "var(--text-dim)", fontSize: 11 }}>
          Waiting for telemetry...
        </div>
      </PanelFrame>
    );
  }

  const utcMs = LAUNCH_TIME_MS + metMs;
  const thermal = computeThermal(
    stateVector.position,
    arow?.quaternion ?? null,
    utcMs
  );

  const hotColor = thermal.hotSideC > 50 ? "var(--accent-red)"
    : thermal.hotSideC > 0 ? "var(--accent-orange)"
    : "var(--text-secondary)";
  const coldColor = "var(--accent-cyan)";

  return (
    <PanelFrame
      title="Thermal"
      icon="🌡️"
      accentColor="var(--accent-orange)"
      headerRight={
        <span style={{
          fontSize: 9,
          color: thermal.dataSource === "modeled" ? "var(--accent-green)" : "var(--text-dim)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          {thermal.dataSource === "modeled" ? "live" : "est."}
        </span>
      }
    >
      <div style={{ padding: "8px 4px" }}>
        {/* Thermometer visualization */}
        <div style={{ display: "flex", justifyContent: "space-around", padding: "8px 0 12px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}>☀ Hot Side</div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: hotColor,
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
            }}>
              {thermal.hotSideC > 0 ? "+" : ""}{thermal.hotSideC}°C
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}>❄ Cold Side</div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: coldColor,
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
            }}>
              {thermal.coldSideC}°C
            </div>
          </div>
        </div>

        <div className="telem-row">
          <span className="telem-label">Sun Angle</span>
          <span className="telem-value">{thermal.sunAngleDeg}°</span>
        </div>
        <div className="telem-row">
          <span className="telem-label">Status</span>
          <span className="telem-value" style={{
            color: thermal.inShadow ? "var(--accent-cyan)" : "var(--accent-orange)"
          }}>
            {thermal.inShadow ? "In Earth shadow" : "Sunlit"}
          </span>
        </div>

        {thermal.dataSource === "estimated" && (
          <div style={{
            fontSize: 9,
            color: "var(--text-dim)",
            marginTop: 8,
            paddingTop: 6,
            borderTop: "1px solid var(--border-panel)",
            lineHeight: 1.5,
          }}>
            Estimated — attitude telemetry unavailable. Values shown assume side-on solar exposure.
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
