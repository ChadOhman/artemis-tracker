"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { StateVector } from "@/lib/types";

interface OrbitMapPanelProps {
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  metMs: number;
}

export function OrbitMapPanel({ stateVector, moonPosition, metMs }: OrbitMapPanelProps) {
  return (
    <PanelFrame title="Orbital Map" icon="🛸" accentColor="var(--accent-cyan)">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 120,
          color: "var(--text-dim)",
          fontSize: 11,
          letterSpacing: "0.06em",
          textAlign: "center",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 24, opacity: 0.3 }}>◎</span>
        <span>Orbit visualization loading...</span>
      </div>
    </PanelFrame>
  );
}
