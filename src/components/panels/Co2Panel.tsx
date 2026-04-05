"use client";
import { useMemo } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { useLocale } from "@/context/LocaleContext";

interface Co2PanelProps {
  metMs: number;
}

function computeCo2(metMs: number): { ppm: number; mmHg: number; scrubberActive: boolean } {
  const hours = metMs / 3600000;
  const cyclePhase = (hours % 3) / 3; // 0-1 within 3-hour cycle
  const base = 2.0; // baseline mmHg
  const amplitude = 1.5;
  // Sine wave — scrubbers pull CO2 down during active phase
  const mmHg = base + amplitude * Math.sin(cyclePhase * 2 * Math.PI);
  const ppm = mmHg * 1315.8; // rough conversion
  const scrubberActive = Math.cos(cyclePhase * 2 * Math.PI) < 0;
  return { ppm, mmHg, scrubberActive };
}

function getCo2Color(mmHg: number): string {
  if (mmHg > 6) return "var(--accent-red)";
  if (mmHg > 4) return "var(--accent-yellow)";
  return "var(--accent-green)";
}

const SPARKLINE_SAMPLES = 60;
const SPARKLINE_WINDOW_MS = 12 * 3600000; // 12 hours

export function Co2Panel({ metMs }: Co2PanelProps) {
  const { t } = useLocale();
  const current = computeCo2(metMs);
  const color = getCo2Color(current.mmHg);

  // Compute sparkline data — 60 samples over last 12 hours
  const sparklinePoints = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i < SPARKLINE_SAMPLES; i++) {
      const sampleMetMs = metMs - SPARKLINE_WINDOW_MS + (i / (SPARKLINE_SAMPLES - 1)) * SPARKLINE_WINDOW_MS;
      points.push(computeCo2(Math.max(0, sampleMetMs)).mmHg);
    }
    return points;
  }, [metMs]);

  // Sparkline SVG geometry
  const sparklineWidth = 200;
  const sparklineHeight = 32;
  const minVal = 0;
  const maxVal = 6;

  const toX = (i: number) => (i / (SPARKLINE_SAMPLES - 1)) * sparklineWidth;
  const toY = (v: number) =>
    sparklineHeight - ((Math.min(maxVal, Math.max(minVal, v)) - minVal) / (maxVal - minVal)) * sparklineHeight;

  const pathD =
    sparklinePoints
      .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
      .join(" ");

  return (
    <PanelFrame
      title={t("co2.title")}
      icon="🫁"
      accentColor="var(--accent-green)"
      headerRight={
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: current.scrubberActive ? "var(--accent-green)" : "var(--accent-cyan)",
          }}
        >
          {current.scrubberActive ? t("co2.regenActive") : t("co2.scrubbing")}
        </span>
      }
    >
      {/* Large reading */}
      <div style={{ textAlign: "center", paddingBottom: 8, borderBottom: "1px solid var(--border-panel)", marginBottom: 8 }}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color,
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {current.mmHg.toFixed(2)}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, letterSpacing: "0.06em" }}>
          mmHg
        </div>
        <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
          {current.ppm.toFixed(0)} ppm
        </div>
      </div>

      {/* Scrubber status */}
      <div
        className="telem-row"
        style={{ marginBottom: 8 }}
      >
        <span className="telem-label">{t("co2.scrubberStatus")}</span>
        <span
          className="telem-value"
          style={{ color: current.scrubberActive ? "var(--accent-green)" : "var(--accent-cyan)" }}
        >
          {current.scrubberActive ? t("co2.regenActive") : t("co2.scrubbing")}
        </span>
      </div>

      {/* Safe range reference */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {[
          { labelKey: "co2.normal", range: "<4 mmHg", color: "var(--accent-green)" },
          { labelKey: "co2.warning", range: "4–6 mmHg", color: "var(--accent-yellow)" },
          { labelKey: "co2.critical", range: ">6 mmHg", color: "var(--accent-red)" },
        ].map((r) => (
          <div key={r.labelKey} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 8, color: r.color, fontWeight: 700, letterSpacing: "0.06em" }}>{t(r.labelKey)}</div>
            <div style={{ fontSize: 8, color: "var(--text-dim)" }}>{r.range}</div>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: 3, textTransform: "uppercase" }}>
          {t("co2.last12h")}
        </div>
        <svg
          width="100%"
          viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
          style={{ display: "block", overflow: "visible" }}
          aria-label="CO2 sparkline"
        >
          {/* Warning threshold line at 4 mmHg */}
          <line
            x1={0}
            y1={toY(4)}
            x2={sparklineWidth}
            y2={toY(4)}
            stroke="var(--accent-yellow)"
            strokeWidth={0.5}
            strokeDasharray="3,3"
            opacity={0.5}
          />
          {/* Critical threshold line at 6 mmHg */}
          <line
            x1={0}
            y1={toY(6)}
            x2={sparklineWidth}
            y2={toY(6)}
            stroke="var(--accent-red)"
            strokeWidth={0.5}
            strokeDasharray="3,3"
            opacity={0.5}
          />
          {/* Sparkline path */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Footer note */}
      <div
        style={{
          fontSize: 8,
          color: "var(--text-dim)",
          fontStyle: "italic",
          letterSpacing: "0.04em",
          textAlign: "center",
          paddingTop: 4,
          borderTop: "1px solid var(--border-panel)",
        }}
      >
        {t("co2.estimatedNote")}
      </div>
    </PanelFrame>
  );
}
