"use client";
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
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useMet } from "@/hooks/useMet";
import { useTimeline } from "@/hooks/useTimeline";

export function Dashboard() {
  const { telemetry, stateVector, moonPosition, dsn } = useTelemetryStream();
  const metMs = useMet();
  const timeline = useTimeline(metMs);

  return (
    <div className="dashboard-grid">
      <div className="dashboard-topbar">
        <TopBar metMs={metMs} telemetry={telemetry} dsn={dsn} timeline={timeline} />
      </div>
      <div className="dashboard-left">
        <OrbitMapPanel stateVector={stateVector} moonPosition={moonPosition} metMs={metMs} />
        <TelemetryPanel telemetry={telemetry} timeline={timeline} />
        <DsnPanel dsn={dsn} />
      </div>
      <div className="dashboard-center">
        <TimelinePanel metMs={metMs} timeline={timeline} />
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
        <BottomBar metMs={metMs} />
      </div>
    </div>
  );
}
