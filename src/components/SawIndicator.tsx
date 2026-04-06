"use client";
import type { SawGimbalAngles } from "@/lib/types";

// Sun-facing efficiency: how well the panel is oriented toward the sun.
// cos(OG) gives the projection factor. Falls back to composite sawAngles.
export function computeSawEfficiency(
  sawGimbals: SawGimbalAngles | null,
  sawAngles: { saw1: number; saw2: number; saw3: number; saw4: number } | null,
  key: "saw1" | "saw2" | "saw3" | "saw4",
): number {
  if (sawGimbals) {
    const og = sawGimbals[key].og * Math.PI / 180;
    return Math.abs(Math.cos(og));
  }
  if (sawAngles) {
    const angle = sawAngles[key] * Math.PI / 180;
    return Math.max(0, Math.cos(angle));
  }
  return 0;
}

function efficiencyColor(eff: number): string {
  if (eff > 0.8) return "#00ff88";
  if (eff > 0.5) return "#a6da95";
  if (eff > 0.2) return "#ffaa00";
  return "#ff4455";
}

/** Inline efficiency bar — designed to sit in a TelemRow's sparkline slot */
export function SawEfficiencyBar({ efficiency }: { efficiency: number }) {
  const pct = Math.round(efficiency * 100);
  const color = efficiencyColor(efficiency);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
      <div style={{
        flex: 1,
        height: 6,
        background: "rgba(255,255,255,0.05)",
        borderRadius: 3,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 3,
          transition: "width 1s ease, background 1s ease",
          boxShadow: efficiency > 0.5 ? `0 0 4px ${color}40` : "none",
        }} />
      </div>
      <span style={{
        fontSize: 8,
        color,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        width: 22,
        textAlign: "right",
      }}>
        {pct}%
      </span>
    </div>
  );
}
