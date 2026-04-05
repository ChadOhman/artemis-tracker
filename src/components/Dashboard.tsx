"use client";
import { useEffect, memo } from "react";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";
import { OrbitMapPanel } from "./panels/OrbitMapPanel";
import { TelemetryPanel } from "./panels/TelemetryPanel";
import { DsnPanel } from "./panels/DsnPanel";
import { TimelinePanel } from "./panels/TimelinePanel";
import { ActivityDetailPanel } from "./panels/ActivityDetailPanel";
import { NextMilestonePanel } from "./panels/NextMilestonePanel";
import { LiveStreamPanel } from "./panels/LiveStreamPanel";
import { CurrentActivitiesPanel } from "./panels/CurrentActivitiesPanel";
import { UpcomingPanel } from "./panels/UpcomingPanel";
import { MilestonesPanel } from "./panels/MilestonesPanel";
import { SolarPanel } from "./panels/SolarPanel";
import { DeltaVPanel } from "./panels/DeltaVPanel";
import { Co2Panel } from "./panels/Co2Panel";
import { StationSchedulePanel } from "./panels/StationSchedulePanel";
import { DsnBandwidthPanel } from "./panels/DsnBandwidthPanel";
import { BuyMeACoffee } from "./BuyMeACoffee";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useSimTelemetry } from "@/hooks/useSimTelemetry";
import { useTimeline } from "@/hooks/useTimeline";
import { MetProvider, useMetContext } from "@/context/MetContext";

const MemoOrbitMap = memo(OrbitMapPanel);
const MemoTimeline = memo(TimelinePanel);
const MemoTelemetry = memo(TelemetryPanel);
const MemoDsn = memo(DsnPanel);
const MemoSolar = memo(SolarPanel);
const MemoDeltaV = memo(DeltaVPanel);
const MemoCo2 = memo(Co2Panel);
const MemoStationSchedule = memo(StationSchedulePanel);
const MemoDsnBandwidth = memo(DsnBandwidthPanel);
const MemoActivity = memo(ActivityDetailPanel);
const MemoNextMilestone = memo(NextMilestonePanel);
const MemoCurrentActivities = memo(CurrentActivitiesPanel);
const MemoUpcoming = memo(UpcomingPanel);
const MemoMilestones = memo(MilestonesPanel);

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const BUILD_CHECK_INTERVAL = 60_000; // check every 60 seconds

function useBuildCheck() {
  useEffect(() => {
    if (!BUILD_ID) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/build");
        const data = await res.json();
        if (data.buildId && data.buildId !== BUILD_ID) {
          window.location.reload();
        }
      } catch {
        // ignore fetch errors
      }
    }, BUILD_CHECK_INTERVAL);
    return () => clearInterval(id);
  }, []);
}

function DashboardInner() {
  useBuildCheck();
  const { metMs, mode, simMetMs } = useMetContext();

  // Live SSE stream — always running, provides connected/lastUpdate/reconnecting
  const {
    telemetry: liveTelemetry,
    stateVector: liveStateVector,
    moonPosition: liveMoonPosition,
    dsn,
    arow,
    solar,
    connected,
    reconnecting,
    lastUpdate,
    visitorCount,
  } = useTelemetryStream();

  // SIM-mode historical fetch — returns non-null values only in SIM mode
  const {
    telemetry: simTelemetry,
    stateVector: simStateVector,
  } = useSimTelemetry(mode, simMetMs);

  // In SIM mode prefer sim-derived values; fall back to live if history not yet loaded
  const telemetry = mode === "SIM" ? (simTelemetry ?? liveTelemetry) : liveTelemetry;
  const stateVector = mode === "SIM" ? (simStateVector ?? liveStateVector) : liveStateVector;
  // Moon position is not derived from history vectors, so always use live
  const moonPosition = liveMoonPosition;

  const timeline = useTimeline(metMs);

  return (
    <div id="main-content" role="main" className="dashboard-grid">
      <div className="dashboard-topbar">
        <TopBar
          metMs={metMs}
          telemetry={telemetry}
          dsn={dsn}
          timeline={timeline}
          connected={connected}
          reconnecting={reconnecting}
          lastUpdate={lastUpdate}
          visitorCount={visitorCount}
        />
      </div>
      <div className="dashboard-left">
        <MemoOrbitMap stateVector={stateVector} moonPosition={moonPosition} metMs={metMs} telemetry={telemetry} />
        <MemoTelemetry telemetry={telemetry} timeline={timeline} arow={mode === "LIVE" ? arow : null} />
        <MemoDsn dsn={dsn} />
        <MemoDsnBandwidth dsn={dsn} />
        <MemoSolar solar={solar} />
        <MemoDeltaV metMs={metMs} />
        <MemoCo2 metMs={metMs} />
        <MemoStationSchedule stateVector={stateVector} />
      </div>
      <div className="dashboard-timeline">
        <MemoTimeline metMs={metMs} timeline={timeline} />
      </div>
      <div className="dashboard-center">
        <MemoActivity timeline={timeline} metMs={metMs} />
        <MemoNextMilestone timeline={timeline} metMs={metMs} />
        <LiveStreamPanel />
      </div>
      <div className="dashboard-right">
        <MemoCurrentActivities timeline={timeline} />
        <MemoUpcoming timeline={timeline} metMs={metMs} />
        <MemoMilestones timeline={timeline} metMs={metMs} />
      </div>
      <div className="dashboard-bottombar">
        <BottomBar milestones={timeline.raw?.milestones ?? []} lastUpdate={lastUpdate} />
      </div>
      <BuyMeACoffee />
    </div>
  );
}

export function Dashboard() {
  return (
    <MetProvider>
      <DashboardInner />
    </MetProvider>
  );
}
