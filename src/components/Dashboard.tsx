"use client";
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";
import { OrbitMapPanel } from "./panels/OrbitMapPanel";
import { TelemetryPanel } from "./panels/TelemetryPanel";
import { DsnPanel } from "./panels/DsnPanel";
import { TimelinePanel } from "./panels/TimelinePanel";
import { ActivityDetailPanel } from "./panels/ActivityDetailPanel";
import { NextMilestonePanel } from "./panels/NextMilestonePanel";
import { LiveStreamPanel } from "./panels/LiveStreamPanel";
import { Apollo8Panel } from "./panels/Apollo8Panel";
import { CurrentActivitiesPanel } from "./panels/CurrentActivitiesPanel";
import { UpcomingPanel } from "./panels/UpcomingPanel";
import { MilestonesPanel } from "./panels/MilestonesPanel";
import { SolarPanel } from "./panels/SolarPanel";
import { DeltaVPanel } from "./panels/DeltaVPanel";
// Co2Panel removed — simulated data, not live telemetry
import { StationSchedulePanel } from "./panels/StationSchedulePanel";
import { DsnBandwidthPanel } from "./panels/DsnBandwidthPanel";
// ThermalPanel removed — estimated model, not live telemetry
import { BuyMeACoffee } from "./BuyMeACoffee";
// ChangelogModal is rendered in BottomBar — not here to avoid double-mount
import { WakeupSongsPanel } from "./panels/WakeupSongsPanel";
import { RcsThrusterPanel } from "./panels/RcsThrusterPanel";
import { PanelErrorBoundary } from "./shared/PanelErrorBoundary";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useSimTelemetry } from "@/hooks/useSimTelemetry";
import { useTimeline } from "@/hooks/useTimeline";
import { MetProvider, useMetContext } from "@/context/MetContext";
import { defaultPanelVisibility, defaultPanelColumns, isTypingTarget, type PanelId, type PanelColumn } from "@/lib/panel-visibility";
import { lerpTelemetry } from "@/lib/telemetry/lerp";
import { defaultTopBarVisibility, type TopBarItemId } from "@/lib/topbar-visibility";
import {
  readStoredPresetsState,
  writeStoredPresetsState,
  getSnapshotForPresetId,
  getDefaultSnapshot,
  listPresetOptions,
  setActivePresetId,
  saveNewPreset,
  deletePreset,
  DEFAULT_PRESET_ID,
  type DashboardLayoutSnapshot,
  type StoredPresetsState,
} from "@/lib/dashboard-layout-presets";
import { PanelVisibilityModal } from "./modals/PanelVisibilityModal";
import SplashdownModal from "@/components/SplashdownModal";
import { EdlPanel } from "./panels/EdlPanel";
import { ReentryBanner } from "./ReentryBanner";
import { BlackoutOverlay } from "./BlackoutOverlay";

const MemoOrbitMap = memo(OrbitMapPanel);
const MemoTimeline = memo(TimelinePanel);
const MemoTelemetry = memo(TelemetryPanel);
const MemoDsn = memo(DsnPanel);
const MemoSolar = memo(SolarPanel);
const MemoDeltaV = memo(DeltaVPanel);
const MemoEdl = memo(EdlPanel);

// Re-entry mode window: activates 4h before entry interface, ends at recovery
const REENTRY_MODE_START_MS = 213 * 3600 * 1000;
const REENTRY_MODE_END_MS = 218 * 3600 * 1000;

const MemoStationSchedule = memo(StationSchedulePanel);
const MemoDsnBandwidth = memo(DsnBandwidthPanel);
const MemoActivity = memo(ActivityDetailPanel);
const MemoNextMilestone = memo(NextMilestonePanel);
const MemoCurrentActivities = memo(CurrentActivitiesPanel);
const MemoUpcoming = memo(UpcomingPanel);
const MemoMilestones = memo(MilestonesPanel);
const MemoApollo8 = memo(Apollo8Panel);
const MemoWakeupSongs = memo(WakeupSongsPanel);
const MemoRcsThrusters = memo(RcsThrusterPanel);

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const BUILD_CHECK_INTERVAL = 60_000; // check every 60 seconds

function useBuildCheck() {
  // Restore scroll position after a build-triggered reload
  useEffect(() => {
    const savedScroll = sessionStorage.getItem("scrollRestore");
    if (savedScroll) {
      sessionStorage.removeItem("scrollRestore");
      const y = parseInt(savedScroll, 10);
      // Defer so the layout has rendered
      requestAnimationFrame(() => {
        const scrollable = document.querySelector(".dashboard-left") as HTMLElement
          ?? document.scrollingElement;
        if (scrollable) scrollable.scrollTop = y;
      });
    }
  }, []);

  useEffect(() => {
    if (!BUILD_ID) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/build");
        const data = await res.json();
        if (data.buildId && data.buildId !== BUILD_ID) {
          // Save scroll position before reload so we can restore it
          const scrollable = document.querySelector(".dashboard-left") as HTMLElement
            ?? document.scrollingElement;
          if (scrollable) {
            sessionStorage.setItem("scrollRestore", String(scrollable.scrollTop));
          }
          window.location.reload();
        }
      } catch {
        // ignore fetch errors
      }
    }, BUILD_CHECK_INTERVAL);
    return () => clearInterval(id);
  }, []);
}

function useLayoutPresets() {
  const [presetsState, setPresetsState] = useState<StoredPresetsState>(() => readStoredPresetsState());

  const activeSnapshot = useMemo(() => {
    return getSnapshotForPresetId(presetsState.activePresetId, presetsState);
  }, [presetsState]);

  const [panelVisibility, setPanelVisibility] = useState<Record<PanelId, boolean>>(
    () => activeSnapshot.panelVisibility,
  );
  const [panelColumns, setPanelColumns] = useState<Record<PanelId, PanelColumn>>(
    () => activeSnapshot.panelColumns,
  );
  const [topBarVisibility, setTopBarVisibility] = useState<Record<TopBarItemId, boolean>>(
    () => activeSnapshot.topBarVisibility,
  );

  // When active preset changes, sync the live state
  const applySnapshot = useCallback((snap: DashboardLayoutSnapshot) => {
    setPanelVisibility(snap.panelVisibility);
    setPanelColumns(snap.panelColumns);
    setTopBarVisibility(snap.topBarVisibility);
  }, []);

  const presetOptions = useMemo(() => listPresetOptions(presetsState), [presetsState]);

  const handlePresetChange = useCallback(
    (presetId: string) => {
      const next = setActivePresetId(presetId, presetsState);
      setPresetsState(next);
      writeStoredPresetsState(next);
      applySnapshot(getSnapshotForPresetId(presetId, next));
    },
    [presetsState, applySnapshot],
  );

  const handleSavePreset = useCallback(
    (name: string): boolean => {
      const currentSnapshot: DashboardLayoutSnapshot = {
        panelVisibility,
        panelColumns,
        topBarVisibility,
      };
      const result = saveNewPreset(name, currentSnapshot, presetsState);
      if (!result) return false;
      setPresetsState(result.state);
      writeStoredPresetsState(result.state);
      return true;
    },
    [panelVisibility, panelColumns, topBarVisibility, presetsState],
  );

  const handleDeletePreset = useCallback(() => {
    const next = deletePreset(presetsState.activePresetId, presetsState);
    setPresetsState(next);
    writeStoredPresetsState(next);
    applySnapshot(getSnapshotForPresetId(next.activePresetId, next));
  }, [presetsState, applySnapshot]);

  const handlePanelToggle = useCallback((id: PanelId, visible: boolean) => {
    setPanelVisibility((prev) => ({ ...prev, [id]: visible }));
  }, []);

  const handleColumnChange = useCallback((id: PanelId, col: PanelColumn) => {
    setPanelColumns((prev) => ({ ...prev, [id]: col }));
  }, []);

  const handleTopBarToggle = useCallback((id: TopBarItemId, visible: boolean) => {
    setTopBarVisibility((prev) => ({ ...prev, [id]: visible }));
  }, []);

  return {
    panelVisibility,
    panelColumns,
    topBarVisibility,
    presetsState,
    presetOptions,
    handlePresetChange,
    handleSavePreset,
    handleDeletePreset,
    handlePanelToggle,
    handleColumnChange,
    handleTopBarToggle,
  };
}

function DashboardInner() {
  useBuildCheck();

  // Dashboard is a fixed grid — prevent body scroll (Brave, etc.)
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  const { metMs, mode, simMetMs } = useMetContext();

  // Layout / panel visibility
  const {
    panelVisibility,
    panelColumns,
    topBarVisibility,
    presetsState,
    presetOptions,
    handlePresetChange,
    handleSavePreset,
    handleDeletePreset,
    handlePanelToggle,
    handleColumnChange,
    handleTopBarToggle,
  } = useLayoutPresets();

  const [showPanelModal, setShowPanelModal] = useState(false);

  // Keyboard shortcut: 'M' toggles the panel visibility modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "m" || e.key === "M") {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        setShowPanelModal((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Live SSE stream — always running, provides connected/lastUpdate/reconnecting
  const {
    telemetry: liveTelemetry,
    prevTelemetry: livePrevTelemetry,
    stateVector: liveStateVector,
    moonPosition: liveMoonPosition,
    dsn,
    arow,
    arowLastUpdate,
    solar,
    connected,
    reconnecting,
    lastUpdate,
    visitorCount,
    splashdownTriggered,
  } = useTelemetryStream();

  // Splashdown modal — dismiss persists to localStorage
  const [showSplashdown, setShowSplashdown] = useState(false);

  useEffect(() => {
    if (splashdownTriggered) {
      const dismissed = localStorage.getItem("splashdown-dismissed");
      if (!dismissed) {
        setShowSplashdown(true);
      }
    } else {
      // Admin retracted — close for everyone
      setShowSplashdown(false);
    }
  }, [splashdownTriggered]);

  function handleDismissSplashdown() {
    setShowSplashdown(false);
    localStorage.setItem("splashdown-dismissed", "1");
  }

  // SIM-mode historical fetch — returns full snapshots from /api/snapshot
  const {
    telemetry: simTelemetry,
    stateVector: simStateVector,
    moonPosition: simMoonPosition,
    dsn: simDsn,
    solar: simSolar,
  } = useSimTelemetry(mode, simMetMs);

  // In SIM mode prefer snapshot-derived values; fall back to live if not yet loaded.
  // Note: AROW position (params 2003-2005) is in a different reference frame than
  // JPL Horizons and produces a ~6,000 km offset, so we do NOT use it for distance
  // calculations. JPL-derived distances update every 5 minutes which is sufficient.
  const rawTelemetry = mode === "SIM" ? (simTelemetry ?? liveTelemetry) : liveTelemetry;
  const prevTelemetry = mode === "SIM" ? null : livePrevTelemetry;
  const stateVector = mode === "SIM" ? (simStateVector ?? liveStateVector) : liveStateVector;
  const moonPosition = mode === "SIM" ? (simMoonPosition ?? liveMoonPosition) : liveMoonPosition;

  // Interpolate telemetry at 2 Hz — quantize metMs to 500ms buckets
  const quantizedMetMs = Math.floor(metMs / 500) * 500;
  const telemetry = useMemo(() => {
    if (prevTelemetry && rawTelemetry) {
      return lerpTelemetry(prevTelemetry, rawTelemetry, quantizedMetMs);
    }
    return rawTelemetry;
  }, [prevTelemetry, rawTelemetry, quantizedMetMs]);
  const dsnData = mode === "SIM" ? (simDsn ?? dsn) : dsn;
  const solarData = mode === "SIM" ? (simSolar ?? solar) : solar;

  const timeline = useTimeline(metMs);

  // Helper: check if a panel should render (visible AND assigned to this column)
  const show = (id: PanelId, col: PanelColumn) =>
    panelVisibility[id] && panelColumns[id] === col;

  // Wrap a panel in an error boundary (prevents one crash from taking down the dashboard)
  const safe = (name: string, node: React.ReactNode) => (
    <PanelErrorBoundary panelName={name}>{node}</PanelErrorBoundary>
  );

  const isReentryMode = metMs >= REENTRY_MODE_START_MS && metMs < REENTRY_MODE_END_MS;

  return (
    <div
      id="main-content"
      role="main"
      className={`dashboard-grid${isReentryMode ? " reentry-mode" : ""}`}
    >
      <div className="dashboard-topbar">
        <TopBar
          metMs={metMs}
          telemetry={telemetry}
          dsn={dsnData}
          timeline={timeline}
          connected={connected}
          reconnecting={reconnecting}
          lastUpdate={lastUpdate}
          visitorCount={visitorCount}
          barVisibility={topBarVisibility}
        />
        {isReentryMode && <ReentryBanner metMs={metMs} />}
      </div>
      <div className="dashboard-left">
        {show("orbitMap", "left") && safe("Orbit Map", <MemoOrbitMap stateVector={stateVector} moonPosition={moonPosition} metMs={metMs} telemetry={telemetry} />)}
        {show("telemetry", "left") && safe("Telemetry", <MemoTelemetry telemetry={telemetry} timeline={timeline} arow={mode === "LIVE" ? arow : null} />)}
        {show("rcsThrusters", "left") && safe("RCS Thrusters", <MemoRcsThrusters arow={mode === "LIVE" ? arow : null} />)}
        {show("dsn", "left") && safe("DSN", <MemoDsn dsn={dsnData} />)}
        {show("stationSchedule", "left") && safe("Station Schedule", <MemoStationSchedule stateVector={stateVector} />)}
        {show("dsnBandwidth", "left") && safe("DSN Bandwidth", <MemoDsnBandwidth dsn={dsnData} />)}
        {show("solar", "left") && safe("Solar", <MemoSolar solar={solarData} />)}
        {show("deltaV", "left") && safe("Delta-V", <MemoDeltaV metMs={metMs} />)}
        {show("activityDetail", "left") && safe("Activity", <MemoActivity timeline={timeline} metMs={metMs} />)}
        {show("nextMilestone", "left") && safe("Next Milestone", <MemoNextMilestone timeline={timeline} metMs={metMs} />)}
        {show("liveStream", "left") && safe("Live Stream", <LiveStreamPanel />)}
        {show("apollo8", "left") && safe("Apollo 8", <MemoApollo8 metMs={metMs} />)}
        {show("wakeupSongs", "left") && safe("Wake-Up Songs", <MemoWakeupSongs />)}
        {show("currentActivities", "left") && safe("Activities", <MemoCurrentActivities timeline={timeline} />)}
        {show("upcoming", "left") && safe("Upcoming", <MemoUpcoming timeline={timeline} metMs={metMs} />)}
        {show("milestones", "left") && safe("Milestones", <MemoMilestones timeline={timeline} metMs={metMs} />)}
      </div>
      <div className="dashboard-timeline">
        {panelVisibility.timeline && safe("Timeline", <MemoTimeline metMs={metMs} timeline={timeline} />)}
      </div>
      <div className="dashboard-center">
        {isReentryMode && (
          <div style={{ position: "relative" }}>
            {safe("EDL", <MemoEdl metMs={metMs} telemetry={telemetry} />)}
            <BlackoutOverlay arowLastUpdate={arowLastUpdate} isReentryMode={isReentryMode} />
          </div>
        )}
        {show("orbitMap", "center") && safe("Orbit Map", <MemoOrbitMap stateVector={stateVector} moonPosition={moonPosition} metMs={metMs} telemetry={telemetry} />)}
        {show("telemetry", "center") && safe("Telemetry", <MemoTelemetry telemetry={telemetry} timeline={timeline} arow={mode === "LIVE" ? arow : null} />)}
        {show("rcsThrusters", "center") && safe("RCS Thrusters", <MemoRcsThrusters arow={mode === "LIVE" ? arow : null} />)}
        {show("dsn", "center") && safe("DSN", <MemoDsn dsn={dsnData} />)}
        {show("stationSchedule", "center") && safe("Station Schedule", <MemoStationSchedule stateVector={stateVector} />)}
        {show("dsnBandwidth", "center") && safe("DSN Bandwidth", <MemoDsnBandwidth dsn={dsnData} />)}
        {show("solar", "center") && safe("Solar", <MemoSolar solar={solarData} />)}
        {show("deltaV", "center") && safe("Delta-V", <MemoDeltaV metMs={metMs} />)}
        {show("activityDetail", "center") && safe("Activity", <MemoActivity timeline={timeline} metMs={metMs} />)}
        {show("nextMilestone", "center") && safe("Next Milestone", <MemoNextMilestone timeline={timeline} metMs={metMs} />)}
        {show("liveStream", "center") && safe("Live Stream", <LiveStreamPanel />)}
        {show("apollo8", "center") && safe("Apollo 8", <MemoApollo8 metMs={metMs} />)}
        {show("wakeupSongs", "center") && safe("Wake-Up Songs", <MemoWakeupSongs />)}
        {show("currentActivities", "center") && safe("Activities", <MemoCurrentActivities timeline={timeline} />)}
        {show("upcoming", "center") && safe("Upcoming", <MemoUpcoming timeline={timeline} metMs={metMs} />)}
        {show("milestones", "center") && safe("Milestones", <MemoMilestones timeline={timeline} metMs={metMs} />)}
      </div>
      <div className="dashboard-right">
        {show("orbitMap", "right") && safe("Orbit Map", <MemoOrbitMap stateVector={stateVector} moonPosition={moonPosition} metMs={metMs} telemetry={telemetry} />)}
        {show("telemetry", "right") && safe("Telemetry", <MemoTelemetry telemetry={telemetry} timeline={timeline} arow={mode === "LIVE" ? arow : null} />)}
        {show("rcsThrusters", "right") && safe("RCS Thrusters", <MemoRcsThrusters arow={mode === "LIVE" ? arow : null} />)}
        {show("dsn", "right") && safe("DSN", <MemoDsn dsn={dsnData} />)}
        {show("stationSchedule", "right") && safe("Station Schedule", <MemoStationSchedule stateVector={stateVector} />)}
        {show("dsnBandwidth", "right") && safe("DSN Bandwidth", <MemoDsnBandwidth dsn={dsnData} />)}
        {show("solar", "right") && safe("Solar", <MemoSolar solar={solarData} />)}
        {show("deltaV", "right") && safe("Delta-V", <MemoDeltaV metMs={metMs} />)}
        {show("activityDetail", "right") && safe("Activity", <MemoActivity timeline={timeline} metMs={metMs} />)}
        {show("nextMilestone", "right") && safe("Next Milestone", <MemoNextMilestone timeline={timeline} metMs={metMs} />)}
        {show("liveStream", "right") && safe("Live Stream", <LiveStreamPanel />)}
        {show("apollo8", "right") && safe("Apollo 8", <MemoApollo8 metMs={metMs} />)}
        {show("wakeupSongs", "right") && safe("Wake-Up Songs", <MemoWakeupSongs />)}
        {show("currentActivities", "right") && safe("Activities", <MemoCurrentActivities timeline={timeline} />)}
        {show("upcoming", "right") && safe("Upcoming", <MemoUpcoming timeline={timeline} metMs={metMs} />)}
        {show("milestones", "right") && safe("Milestones", <MemoMilestones timeline={timeline} metMs={metMs} />)}
      </div>
      <div className="dashboard-bottombar">
        <BottomBar milestones={timeline.raw?.milestones ?? []} lastUpdate={lastUpdate} />
      </div>
      <BuyMeACoffee />
      {/* ChangelogModal lives in BottomBar to avoid double-mount */}

      {/* Settings button — fixed bottom-left, opens panel visibility modal */}
      <button
        type="button"
        onClick={() => setShowPanelModal(true)}
        aria-label="Layout settings (M)"
        title="Layout settings (M)"
        style={{
          position: "fixed",
          bottom: 4,
          left: 8,
          zIndex: 900,
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-panel)",
          borderRadius: 6,
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
          transition: "color 0.15s, border-color 0.15s",
        }}
      >
        &#9881;
      </button>

      <PanelVisibilityModal
        isOpen={showPanelModal}
        onClose={() => setShowPanelModal(false)}
        activePresetId={presetsState.activePresetId}
        presetOptions={presetOptions}
        onPresetChange={handlePresetChange}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        topBarVisibility={topBarVisibility}
        onTopBarToggle={handleTopBarToggle}
        visibility={panelVisibility}
        onToggle={handlePanelToggle}
        columns={panelColumns}
        onColumnChange={handleColumnChange}
      />
        <SplashdownModal
          isOpen={showSplashdown}
          onDismiss={handleDismissSplashdown}
        />
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
