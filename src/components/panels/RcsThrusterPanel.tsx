"use client";
import { useRef } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { useLocale } from "@/context/LocaleContext";
import type { ArowTelemetry } from "@/lib/types";

const RECENT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface RcsThrusterPanelProps {
  arow: ArowTelemetry | null;
}

// ESM RCS thruster layout — 4 pods (A/B/C/D) plus roll thrusters (R group).
// Positioned as if looking at the ESM from aft (engine nozzle facing viewer).
// Pods are spaced around the circumference at roughly 90° intervals.
const THRUSTER_LAYOUT: Array<{
  name: string;
  cx: number; // % from left
  cy: number; // % from top
  pod: string;
}> = [
  // Pod A — top-right
  { name: "SA3A", cx: 68, cy: 18, pod: "A" },
  { name: "SA4A", cx: 78, cy: 18, pod: "A" },
  { name: "SA3F", cx: 68, cy: 28, pod: "A" },
  { name: "SA4F", cx: 78, cy: 28, pod: "A" },
  // Pod B — bottom-right
  { name: "SB5A", cx: 68, cy: 62, pod: "B" },
  { name: "SB6A", cx: 78, cy: 62, pod: "B" },
  { name: "SB5F", cx: 68, cy: 72, pod: "B" },
  { name: "SB6F", cx: 78, cy: 72, pod: "B" },
  // Pod C — bottom-left
  { name: "SC1A", cx: 22, cy: 62, pod: "C" },
  { name: "SC2A", cx: 32, cy: 62, pod: "C" },
  { name: "SC1F", cx: 22, cy: 72, pod: "C" },
  { name: "SC2F", cx: 32, cy: 72, pod: "C" },
  // Pod D — top-left
  { name: "SD5A", cx: 22, cy: 18, pod: "D" },
  { name: "SD6A", cx: 32, cy: 18, pod: "D" },
  { name: "SD5F", cx: 22, cy: 28, pod: "D" },
  { name: "SD6F", cx: 32, cy: 28, pod: "D" },
  // Roll thrusters — cardinal positions
  { name: "SR1R", cx: 55, cy: 8, pod: "R" },
  { name: "SR2R", cx: 60, cy: 8, pod: "R" },
  { name: "SR1L", cx: 55, cy: 88, pod: "R" },
  { name: "SR2L", cx: 60, cy: 88, pod: "R" },
  { name: "SR3R", cx: 88, cy: 45, pod: "R" },
  { name: "SR4R", cx: 88, cy: 50, pod: "R" },
  { name: "SR3L", cx: 12, cy: 45, pod: "R" },
  { name: "SR4L", cx: 12, cy: 50, pod: "R" },
];

const POD_LABELS = [
  { label: "A", cx: 73, cy: 12 },
  { label: "B", cx: 73, cy: 78 },
  { label: "C", cx: 27, cy: 78 },
  { label: "D", cx: 27, cy: 12 },
];

export function RcsThrusterPanel({ arow }: RcsThrusterPanelProps) {
  const { t } = useLocale();
  const thrusters = arow?.rcsThrusters?.thrusters ?? {};

  // Track when each thruster was last seen firing
  const lastFiredRef = useRef<Record<string, number>>({});
  const now = Date.now();
  for (const [name, firing] of Object.entries(thrusters)) {
    if (firing) lastFiredRef.current[name] = now;
  }

  const anyFiring = Object.values(thrusters).some(Boolean);
  const recentCount = Object.keys(lastFiredRef.current).filter(
    (name) => now - (lastFiredRef.current[name] ?? 0) < RECENT_WINDOW_MS
  ).length;
  const firingCount = Object.values(thrusters).filter(Boolean).length;

  return (
    <PanelFrame
      title={t("panels.rcsThrusters")}
      icon="🔥"
      accentColor="var(--accent-yellow)"
      headerRight={
        anyFiring ? (
          <span
            style={{
              fontSize: 9,
              color: "var(--accent-green)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {firingCount} {t("telemetry.firing")}
          </span>
        ) : recentCount > 0 ? (
          <span
            style={{
              fontSize: 9,
              color: "var(--accent-yellow)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {recentCount} RECENT
          </span>
        ) : (
          <span
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {t("telemetry.idle")}
          </span>
        )
      }
    >
      <div style={{ padding: "4px 0" }}>
        {/* Thruster diagram — SVG */}
        <svg
          viewBox="0 0 100 95"
          style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}
          aria-label="RCS thruster diagram"
        >
          {/* ESM body outline */}
          <circle
            cx="50"
            cy="47"
            r="32"
            fill="none"
            stroke="rgba(100,160,255,0.15)"
            strokeWidth="0.8"
          />
          {/* Engine nozzle (center) */}
          <circle
            cx="50"
            cy="47"
            r="6"
            fill="rgba(100,160,255,0.06)"
            stroke="rgba(100,160,255,0.2)"
            strokeWidth="0.5"
          />
          <text
            x="50"
            y="48.5"
            textAnchor="middle"
            fontSize="3.5"
            fill="rgba(100,160,255,0.35)"
            fontFamily="monospace"
          >
            OMS
          </text>

          {/* Pod labels */}
          {POD_LABELS.map((p) => (
            <text
              key={p.label}
              x={p.cx}
              y={p.cy}
              textAnchor="middle"
              fontSize="4"
              fontWeight="700"
              fill="rgba(180,190,210,0.4)"
              fontFamily="monospace"
            >
              {p.label}
            </text>
          ))}

          {/* Thrusters */}
          {THRUSTER_LAYOUT.map((th) => {
            const firing = thrusters[th.name] === true;
            const lastFired = lastFiredRef.current[th.name];
            const recent = !firing && lastFired != null && (now - lastFired) < RECENT_WINDOW_MS;
            // Fade amber from 1.0 to 0.3 over the 5-minute window
            const recentOpacity = recent ? 0.3 + 0.7 * (1 - (now - lastFired!) / RECENT_WINDOW_MS) : 0;

            const fillColor = firing ? "#00ff88" : recent ? `rgba(255,170,0,${recentOpacity})` : "rgba(80,90,100,0.5)";
            const strokeColor = firing ? "rgba(0,255,136,0.6)" : recent ? `rgba(255,170,0,${recentOpacity * 0.8})` : "rgba(80,90,100,0.3)";
            const labelColor = firing ? "rgba(0,255,136,0.9)" : recent ? `rgba(255,170,0,${recentOpacity})` : "rgba(140,150,160,0.5)";

            return (
              <g key={th.name}>
                {/* Glow when firing or recent */}
                {(firing || recent) && (
                  <circle
                    cx={th.cx}
                    cy={th.cy}
                    r="3.5"
                    fill={firing ? "rgba(0,255,136,0.25)" : `rgba(255,170,0,${recentOpacity * 0.2})`}
                  />
                )}
                {/* Thruster dot */}
                <rect
                  x={th.cx - 2}
                  y={th.cy - 2}
                  width="4"
                  height="4"
                  rx="0.8"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="0.3"
                  suppressHydrationWarning
                >
                  <title suppressHydrationWarning>{th.name}: {firing ? t("telemetry.firing") : recent ? "RECENT" : t("telemetry.idle")}</title>
                </rect>
                {/* Label */}
                <text
                  x={th.cx}
                  y={th.cy + 5.5}
                  textAnchor="middle"
                  fontSize="2.2"
                  fill={labelColor}
                  fontFamily="monospace"
                >
                  {th.name.slice(1)}
                </text>
              </g>
            );
          })}

          {/* "AFT VIEW" label */}
          <text
            x="50"
            y="93"
            textAnchor="middle"
            fontSize="3"
            fill="rgba(100,160,255,0.3)"
            fontFamily="monospace"
            fontWeight="700"
            letterSpacing="0.15em"
          >
            {t("rcs.aftView")}
          </text>
        </svg>

        {/* Status bytes */}
        {arow?.rcsThrusters && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginTop: 6,
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              color: "var(--text-dim)",
            }}
          >
            {arow.rcsThrusters.status1 && (
              <span>GRP1: 0x{arow.rcsThrusters.status1.toUpperCase()}</span>
            )}
            {arow.rcsThrusters.status2 && (
              <span>GRP2: 0x{arow.rcsThrusters.status2.toUpperCase()}</span>
            )}
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
