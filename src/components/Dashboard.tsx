"use client";
import { useEffect } from "react";
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
import { BuyMeACoffee } from "./BuyMeACoffee";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useSimTelemetry } from "@/hooks/useSimTelemetry";
import { useTimeline } from "@/hooks/useTimeline";
import { MetProvider, useMetContext } from "@/context/MetContext";

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
    connected,
    reconnecting,
    lastUpdate,
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
        />
      </div>
      <div className="dashboard-left">
        <OrbitMapPanel stateVector={stateVector} moonPosition={moonPosition} metMs={metMs} telemetry={telemetry} />
        <TelemetryPanel telemetry={telemetry} timeline={timeline} arow={mode === "LIVE" ? arow : null} />
        <DsnPanel dsn={dsn} />
      </div>
      <div className="dashboard-timeline">
        <TimelinePanel metMs={metMs} timeline={timeline} />
      </div>
      <div className="dashboard-center">
        <ActivityDetailPanel timeline={timeline} metMs={metMs} />
        <NextMilestonePanel timeline={timeline} metMs={metMs} />
        <LiveStreamPanel />
      </div>
      <div className="dashboard-right">
        <CurrentActivitiesPanel timeline={timeline} />
        <UpcomingPanel timeline={timeline} metMs={metMs} />
        <MilestonesPanel timeline={timeline} metMs={metMs} />
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
