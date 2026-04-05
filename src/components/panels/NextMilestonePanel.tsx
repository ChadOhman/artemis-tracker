"use client";
import { formatMet, formatUtcShort } from "@/lib/met";
import { useMetContext } from "@/context/MetContext";
import type { TimelineState } from "@/hooks/useTimeline";
import { useLocale } from "@/context/LocaleContext";
import { translateMilestoneName } from "@/lib/activity-translations";

interface NextMilestonePanelProps {
  timeline: TimelineState;
  metMs: number;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "NOW";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function NextMilestonePanel({ timeline, metMs }: NextMilestonePanelProps) {
  const { timeFormat } = useMetContext();
  const { t, locale } = useLocale();
  const useUtc = timeFormat === "UTC";
  const milestone = timeline.nextMilestone;
  if (!milestone) return null;

  const diffMs = milestone.metMs - metMs;

  return (
    <div
      role="status"
      aria-live="polite"
      className="panel"
      style={{
        borderLeft: "2px solid var(--accent-orange)",
        background: "rgba(255, 140, 0, 0.05)",
      }}
    >
      <div className="panel-header">
        <div className="panel-header-title" style={{ color: "var(--accent-orange)" }}>
          <span>🎯</span>
          {t("nextMilestone.title")}
        </div>
        <div className="panel-header-right">
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--accent-orange)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.05em",
            }}
          >
            T-{formatCountdown(diffMs)}
          </span>
        </div>
      </div>
      <div className="panel-body">
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 4,
            letterSpacing: "0.02em",
          }}
        >
          {translateMilestoneName(milestone.name, locale)}
        </div>
        {milestone.description && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              marginBottom: 6,
            }}
          >
            {milestone.description}
          </div>
        )}
        <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.08em" }}>
          {useUtc ? formatUtcShort(milestone.metMs) : `MET ${formatMet(milestone.metMs)}`}
        </div>
      </div>
    </div>
  );
}
