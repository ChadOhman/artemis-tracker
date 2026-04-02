"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { TimelineState } from "@/hooks/useTimeline";

interface TimelinePanelProps {
  metMs: number;
  timeline: TimelineState;
}

export function TimelinePanel({ metMs, timeline }: TimelinePanelProps) {
  return (
    <PanelFrame title="Mission Timeline" icon="📅" accentColor="var(--accent-cyan)">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 100,
          color: "var(--text-dim)",
          fontSize: 11,
          letterSpacing: "0.06em",
          textAlign: "center",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 22, opacity: 0.3 }}>▬▬▬</span>
        <span>Mission timeline loading...</span>
      </div>
    </PanelFrame>
  );
}
