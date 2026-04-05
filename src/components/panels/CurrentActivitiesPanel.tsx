"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { TimelineState } from "@/hooks/useTimeline";
import type { ActivityType } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";
import { translateActivityName, translateMissionPhase } from "@/lib/activity-translations";

interface CurrentActivitiesPanelProps {
  timeline: TimelineState;
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

export function CurrentActivitiesPanel({ timeline }: CurrentActivitiesPanelProps) {
  const { t, locale } = useLocale();
  const activity = timeline.currentActivity;
  const attitude = timeline.currentAttitude;
  const phase = timeline.currentPhase;

  return (
    <PanelFrame title={t("activityDetail.title")} icon="⚡" accentColor="var(--accent-cyan)">
      <div aria-live="polite" aria-atomic="true">
      {!activity ? (
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
        <>
          {/* Activity with colored bar */}
          <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 3,
                borderRadius: 2,
                background: TYPE_COLORS[activity.type] ?? "var(--accent-cyan)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginBottom: 2,
                }}
              >
                {translateActivityName(activity.name, locale)}
              </div>
              <span className={`activity-badge ${activity.type}`}>{t(`activityTypes.${activity.type}`)}</span>
            </div>
          </div>

          {/* Attitude */}
          {attitude && (
            <div className="telem-row">
              <span className="telem-label">{t("activityDetail.attitudeMode")}</span>
              <span className="telem-value" style={{ fontSize: 10 }}>
                {attitude.mode}
              </span>
            </div>
          )}

          {/* Phase */}
          {phase && (
            <div className="telem-row">
              <span className="telem-label">{t("activityDetail.missionPhase")}</span>
              <span
                className="telem-value"
                style={{ fontSize: 10, color: "var(--accent-green)" }}
              >
                {translateMissionPhase(phase.phase, locale)}
              </span>
            </div>
          )}
        </>
      )}
      </div>
    </PanelFrame>
  );
}
