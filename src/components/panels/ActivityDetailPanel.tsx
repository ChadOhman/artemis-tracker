"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { formatMet } from "@/lib/met";
import type { TimelineState } from "@/hooks/useTimeline";
import type { ActivityType } from "@/lib/types";

interface ActivityDetailPanelProps {
  timeline: TimelineState;
  metMs: number;
}

const TYPE_COLORS: Record<ActivityType, string> = {
  sleep: "var(--color-sleep)",
  pao: "var(--color-pao)",
  science: "var(--color-science)",
  maneuver: "var(--color-maneuver)",
  config: "var(--color-config)",
  exercise: "var(--color-exercise)",
  meal: "var(--color-meal)",
  "off-duty": "var(--color-off-duty)",
  other: "var(--color-other)",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "3px 0",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: 11,
      }}
    >
      <span style={{ color: "var(--text-dim)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      style={{
        height: 4,
        background: "var(--bg-surface)",
        borderRadius: 2,
        overflow: "hidden",
        marginTop: 4,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

export function ActivityDetailPanel({ timeline, metMs }: ActivityDetailPanelProps) {
  const activity = timeline.currentActivity;
  const attitude = timeline.currentAttitude;
  const phase = timeline.currentPhase;

  if (!activity) {
    return (
      <PanelFrame title="Current Activity" icon="⚡" accentColor="var(--accent-cyan)">
        <div
          style={{
            color: "var(--text-dim)",
            fontSize: 11,
            textAlign: "center",
            padding: "16px 0",
            letterSpacing: "0.06em",
          }}
        >
          No active activity
        </div>
      </PanelFrame>
    );
  }

  const typeColor = TYPE_COLORS[activity.type] ?? "var(--accent-cyan)";
  const durationMs = activity.endMetMs - activity.startMetMs;
  const elapsedMs = metMs - activity.startMetMs;
  const activityPct = durationMs > 0 ? (elapsedMs / durationMs) * 100 : 0;

  // Phase progress
  const phaseDurationMs = phase ? phase.endMetMs - phase.startMetMs : 0;
  const phaseElapsedMs = phase ? metMs - phase.startMetMs : 0;
  const phasePct = phaseDurationMs > 0 ? (phaseElapsedMs / phaseDurationMs) * 100 : 0;

  const durationMinutes = Math.round(durationMs / 60000);
  const durationStr =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
      : `${durationMinutes}m`;

  return (
    <PanelFrame
      title="Current Activity"
      icon="⚡"
      accentColor={typeColor}
      headerRight={
        <span className={`activity-badge ${activity.type}`}>{activity.type}</span>
      }
    >
      {/* Activity name with colored bar */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 3,
            borderRadius: 2,
            background: typeColor,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 2,
            }}
          >
            {activity.name}
          </div>
          {activity.notes && (
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {activity.notes}
            </div>
          )}
        </div>
      </div>

      {/* Activity progress bar */}
      <ProgressBar pct={activityPct} color={typeColor} />

      <InfoRow label="Start (MET)" value={formatMet(activity.startMetMs)} />
      <InfoRow label="End (MET)" value={formatMet(activity.endMetMs)} />
      <InfoRow label="Duration" value={durationStr} />
      <InfoRow label="Progress" value={`${Math.min(100, Math.max(0, activityPct)).toFixed(1)}%`} />

      {/* Attitude */}
      {attitude && (
        <>
          <div style={{ marginTop: 8 }}>
            <InfoRow label="Attitude Mode" value={attitude.mode} />
          </div>
        </>
      )}

      {/* Phase with progress bar */}
      {phase && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Mission Phase — {phase.phase}
          </div>
          <ProgressBar pct={phasePct} color="var(--accent-green)" />
          <div style={{ fontSize: 9, color: "var(--text-dim)", textAlign: "right" }}>
            {phasePct.toFixed(1)}% complete
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
