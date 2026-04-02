"use client";
import { useRef, useEffect } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { formatMet } from "@/lib/met";
import type { TimelineState } from "@/hooks/useTimeline";
import type { Milestone } from "@/lib/types";

interface MilestonesPanelProps {
  timeline: TimelineState;
  metMs: number;
}

function MilestoneRow({
  milestone,
  status,
  isNext,
}: {
  milestone: Milestone;
  status: "completed" | "next" | "upcoming";
  isNext: boolean;
}) {
  const dotClass = `milestone-dot ${status}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "5px 0",
        borderBottom: "1px solid var(--border-subtle)",
        opacity: status === "upcoming" ? 0.7 : 1,
      }}
    >
      <span
        className={dotClass}
        style={{ marginTop: 3, flexShrink: 0 }}
        aria-hidden="true"
      />
      <span className="sr-only">
        {status === "completed" ? "(completed)" : status === "next" ? "(next)" : "(upcoming)"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: status === "upcoming" ? 400 : 600,
            color:
              status === "completed"
                ? "var(--text-secondary)"
                : status === "next"
                ? "var(--accent-cyan)"
                : "var(--text-primary)",
            marginBottom: 1,
          }}
        >
          {milestone.name}
        </div>
        {milestone.description && status !== "upcoming" && (
          <div
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              marginBottom: 1,
              lineHeight: 1.4,
            }}
          >
            {milestone.description}
          </div>
        )}
        <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.06em" }}>
          MET {formatMet(milestone.metMs)}
        </div>
      </div>
    </div>
  );
}

export function MilestonesPanel({ timeline, metMs }: MilestonesPanelProps) {
  const milestones = timeline.raw?.milestones ?? [];
  const nextMilestone = timeline.nextMilestone;
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const lastScrolledTo = useRef<string>("");

  const completed = milestones.filter((m) => m.metMs <= metMs);

  // Auto-scroll to the "next" milestone when it changes
  // Uses scrollTop on the container instead of scrollIntoView to avoid scrolling the whole page on mobile
  useEffect(() => {
    if (!nextMilestone || !nextRef.current || !scrollRef.current) return;
    const key = `${nextMilestone.name}-${nextMilestone.metMs}`;
    if (lastScrolledTo.current === key) return;
    lastScrolledTo.current = key;
    const container = scrollRef.current;
    const element = nextRef.current;
    const containerTop = container.getBoundingClientRect().top;
    const elementTop = element.getBoundingClientRect().top;
    const offset = elementTop - containerTop - container.clientHeight / 2 + element.clientHeight / 2;
    container.scrollTo({ top: container.scrollTop + offset, behavior: "smooth" });
  }, [nextMilestone]);

  return (
    <PanelFrame
      title="Milestones"
      icon="🎯"
      accentColor="var(--accent-purple)"
      headerRight={
        <span style={{ fontSize: 9, color: "var(--text-dim)" }}>
          {completed.length}/{milestones.length}
        </span>
      }
    >
      <div
        ref={scrollRef}
        style={{
          maxHeight: "350px",
          overflowY: "auto",
        }}
      >
        {milestones.length === 0 ? (
          <div
            style={{
              color: "var(--text-dim)",
              fontSize: 11,
              textAlign: "center",
              padding: "12px 0",
              letterSpacing: "0.06em",
            }}
          >
            Loading milestones...
          </div>
        ) : (
          milestones.map((milestone) => {
            const isCompleted = milestone.metMs <= metMs;
            const isNext = milestone === nextMilestone;
            const status: "completed" | "next" | "upcoming" = isCompleted
              ? "completed"
              : isNext
              ? "next"
              : "upcoming";

            return (
              <div
                key={`${milestone.name}-${milestone.metMs}`}
                ref={isNext ? nextRef : undefined}
              >
                <MilestoneRow
                  milestone={milestone}
                  status={status}
                  isNext={isNext}
                />
              </div>
            );
          })
        )}
      </div>
    </PanelFrame>
  );
}
