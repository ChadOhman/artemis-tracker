"use client";
import { useState, useEffect, useMemo } from "react";
import type {
  TimelineData,
  TimelineActivity,
  AttitudeBlock,
  PhaseBlock,
  Milestone,
  MissionPhase,
  ActivityType,
} from "@/lib/types";

export interface TimelineState {
  /** Raw data fetched from the API */
  raw: TimelineData | null;
  /** Loading state */
  loading: boolean;
  /** Activity currently in progress at metMs */
  currentActivity: TimelineActivity | null;
  /** Current attitude block */
  currentAttitude: AttitudeBlock | null;
  /** Current mission phase */
  currentPhase: PhaseBlock | null;
  /** Current phase name for convenience */
  currentPhaseName: MissionPhase | null;
  /** The next upcoming milestone */
  nextMilestone: Milestone | null;
  /** Next 8 upcoming activities */
  upcomingActivities: TimelineActivity[];
  /** Current flight day (1-indexed) */
  flightDay: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Fetches timeline data on mount and derives resolved state from metMs.
 * All derived values are computed via useMemo for performance.
 */
export function useTimeline(metMs: number): TimelineState {
  const [raw, setRaw] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTimeline() {
      try {
        const res = await fetch("/api/timeline");
        if (!res.ok) throw new Error(`Timeline fetch failed: ${res.status}`);
        const data: TimelineData = await res.json();
        if (!cancelled) {
          setRaw(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTimeline();
    return () => { cancelled = true; };
  }, []);

  const derived = useMemo<Omit<TimelineState, "raw" | "loading">>(() => {
    if (!raw) {
      return {
        currentActivity: null,
        currentAttitude: null,
        currentPhase: null,
        currentPhaseName: null,
        nextMilestone: null,
        upcomingActivities: [],
        flightDay: 1,
      };
    }

    // Current activity: last one whose window contains metMs
    const currentActivity =
      [...raw.activities]
        .reverse()
        .find((a) => metMs >= a.startMetMs && metMs < a.endMetMs) ?? null;

    // Current attitude block
    const currentAttitude =
      raw.attitudes.find((a) => metMs >= a.startMetMs && metMs < a.endMetMs) ??
      null;

    // Current phase block
    const currentPhase =
      raw.phases.find((p) => metMs >= p.startMetMs && metMs < p.endMetMs) ??
      null;

    const currentPhaseName: MissionPhase | null = currentPhase?.phase ?? null;

    // Next milestone: first one still in the future
    const nextMilestone =
      raw.milestones.find((m) => m.metMs > metMs) ?? null;

    // Upcoming activities: next 8 that haven't started yet
    const upcomingActivities = raw.activities
      .filter((a) => a.startMetMs > metMs)
      .slice(0, 8);

    // Flight day: 1-indexed, starts at 1 on launch day
    const flightDay = Math.max(1, Math.floor(metMs / MS_PER_DAY) + 1);

    return {
      currentActivity,
      currentAttitude,
      currentPhase,
      currentPhaseName,
      nextMilestone,
      upcomingActivities,
      flightDay,
    };
  }, [raw, metMs]);

  return { raw, loading, ...derived };
}
