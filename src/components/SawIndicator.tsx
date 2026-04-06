"use client";
import type { SawGimbalAngles } from "@/lib/types";

interface SawIndicatorProps {
  sawGimbals: SawGimbalAngles | null;
  sawAngles: { saw1: number; saw2: number; saw3: number; saw4: number } | null;
}

const WINGS: Array<{ label: string; key: "saw1" | "saw2" | "saw3" | "saw4" }> = [
  { label: "SAW 1", key: "saw1" },
  { label: "SAW 2", key: "saw2" },
  { label: "SAW 3", key: "saw3" },
  { label: "SAW 4", key: "saw4" },
];

// Sun-facing efficiency: how well the panel is oriented toward the sun.
// A panel perfectly face-on to the sun has 100% efficiency; edge-on has 0%.
// We use the outer gimbal angle to estimate this — cos(OG) gives the
// projection factor. When OG data isn't available, we use the composite
// sawAngles (params 5006-5009) which represent the total panel-to-sun angle.
function computeEfficiency(
  sawGimbals: SawGimbalAngles | null,
  sawAngles: { saw1: number; saw2: number; saw3: number; saw4: number } | null,
  key: "saw1" | "saw2" | "saw3" | "saw4",
): number {
  if (sawGimbals) {
    // OG is the tilt relative to sun — cos gives the projection factor.
    // IG rotates around the boom but doesn't affect sun exposure as much.
    // Combine both: efficiency ≈ |cos(OG)| × |cos(IG - nominal)|
    // Simplified: just use OG as the primary sun-angle driver.
    const og = sawGimbals[key].og * Math.PI / 180;
    return Math.abs(Math.cos(og));
  }
  if (sawAngles) {
    // Composite angle: 0° = face-on, ±90° = edge-on, ±180° = back-on
    const angle = sawAngles[key] * Math.PI / 180;
    return Math.max(0, Math.cos(angle));
  }
  return 0;
}

function efficiencyColor(eff: number): string {
  if (eff > 0.8) return "#00ff88"; // excellent — green
  if (eff > 0.5) return "#a6da95"; // good — light green
  if (eff > 0.2) return "#ffaa00"; // partial — amber
  return "#ff4455";                // poor — red
}

export function SawIndicator({ sawGimbals, sawAngles }: SawIndicatorProps) {
  const hasData = !!(sawGimbals || sawAngles);

  return (
    <div
      style={{
        width: 120,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        opacity: hasData ? 1 : 0.3,
      }}
      aria-label={hasData ? "Solar array sun efficiency" : "SAW indicator — no data"}
    >
      <div style={{
        fontSize: 7,
        color: "var(--text-dim)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        textAlign: "center",
        marginBottom: 1,
      }}>
        Sun Efficiency
      </div>
      {WINGS.map((wing) => {
        const eff = computeEfficiency(sawGimbals, sawAngles, wing.key);
        const pct = Math.round(eff * 100);
        const color = efficiencyColor(eff);

        return (
          <div key={wing.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              fontSize: 7,
              color: "var(--text-dim)",
              fontFamily: "var(--font-mono)",
              width: 10,
              textAlign: "right",
              flexShrink: 0,
            }}>
              {wing.label.slice(-1)}
            </span>
            <div style={{
              flex: 1,
              height: 6,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 3,
              overflow: "hidden",
              position: "relative",
            }}>
              <div style={{
                width: `${pct}%`,
                height: "100%",
                background: color,
                borderRadius: 3,
                transition: "width 1s ease, background 1s ease",
                boxShadow: eff > 0.5 ? `0 0 4px ${color}40` : "none",
              }} />
            </div>
            <span style={{
              fontSize: 7,
              color,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              width: 22,
              textAlign: "right",
              flexShrink: 0,
            }}>
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
