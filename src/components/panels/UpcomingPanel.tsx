"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { TimelineState } from "@/hooks/useTimeline";
import type { ActivityType, TimelineActivity } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";
import { translateActivityName } from "@/lib/activity-translations";

interface UpcomingPanelProps {
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

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "now";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

function UpcomingRow({
  activity,
  diffMs,
  badgeLabel,
  activityLabel,
}: {
  activity: TimelineActivity;
  diffMs: number;
  badgeLabel: string;
  activityLabel: string;
}) {
  const color = TYPE_COLORS[activity.type] ?? "var(--color-other)";

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
        borderBottom: "1px solid var(--border-subtle)",
        listStyle: "none",
      }}
    >
      {/* Type color bar */}
      <div
        style={{
          width: 3,
          height: 32,
          borderRadius: 2,
          background: color,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {activityLabel}
        </div>
        <span className={`activity-badge ${activity.type}`}>{badgeLabel}</span>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--accent-yellow)",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
          textAlign: "right",
          minWidth: 40,
        }}
      >
        {formatCountdown(diffMs)}
      </div>
    </li>
  );
}

export function UpcomingPanel({ timeline, metMs }: UpcomingPanelProps) {
  const { t, locale } = useLocale();
  const upcoming = timeline.upcomingActivities;

  return (
    <PanelFrame
      title={t("upcoming.title")}
      icon="⏭"
      accentColor="var(--accent-yellow)"
      headerRight={
        <span style={{ fontSize: 9, color: "var(--text-dim)" }}>
          {t("upcoming.next")} {upcoming.length}
        </span>
      }
    >
      {upcoming.length === 0 ? (
        <div
          style={{
            color: "var(--text-dim)",
            fontSize: 11,
            textAlign: "center",
            padding: "12px 0",
            letterSpacing: "0.06em",
          }}
        >
          {t("activityDetail.noCurrent")}
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0 }}>
          {upcoming.map((activity) => (
            <UpcomingRow
              key={`${activity.name}-${activity.startMetMs}`}
              activity={activity}
              diffMs={activity.startMetMs - metMs}
              badgeLabel={t(`activityTypes.${activity.type}`)}
              activityLabel={translateActivityName(activity.name, locale)}
            />
          ))}
        </ul>
      )}
    </PanelFrame>
  );
}
