# Plan 2: Dashboard Layout & Core UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mission-control dark theme, full viewport layout with top bar (MET clock, telemetry readouts, phase badge), three-column panel structure, bottom bar, and client-side SSE connection — producing a working real-time dashboard shell that subsequent plans fill with orbit maps, Gantt timelines, and modals.

**Architecture:** Single-page React app using CSS Grid for the five-zone layout (top bar, left/center/right columns, bottom bar). Client connects to SSE endpoint on mount, MET clock ticks via requestAnimationFrame. All panels are React components receiving telemetry state from a shared context provider. Dark theme with monospace typography throughout.

**Tech Stack:** Next.js 16 (App Router), React, Tailwind CSS, Server-Sent Events (EventSource API)

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                      # Root layout — dark theme, fonts
│   ├── page.tsx                        # Dashboard page — layout grid
│   └── globals.css                     # Tailwind + custom CSS variables
├── components/
│   ├── Dashboard.tsx                   # Main grid layout container
│   ├── TopBar.tsx                      # Top bar with all readouts
│   ├── BottomBar.tsx                   # LIVE/SIM toggle, MET, credit
│   ├── panels/
│   │   ├── OrbitMapPanel.tsx           # Left: orbit map placeholder
│   │   ├── TelemetryPanel.tsx          # Left: orbital telemetry readouts
│   │   ├── DsnPanel.tsx               # Left: DSN comm status
│   │   ├── TimelinePanel.tsx           # Center: Gantt placeholder
│   │   ├── ActivityDetailPanel.tsx     # Center: current activity detail
│   │   ├── NextMilestonePanel.tsx      # Center: next milestone callout
│   │   ├── LiveStreamPanel.tsx         # Center: NASA Live YouTube embed
│   │   ├── CurrentActivitiesPanel.tsx  # Right: current crew/attitude/phase
│   │   ├── UpcomingPanel.tsx           # Right: upcoming activities
│   │   └── MilestonesPanel.tsx         # Right: milestone tracker
│   └── shared/
│       ├── MetClock.tsx                # Ticking MET clock component
│       └── PanelFrame.tsx              # Reusable panel container with header
├── hooks/
│   ├── useTelemetryStream.ts           # SSE connection + state management
│   ├── useMet.ts                       # Real-time MET from requestAnimationFrame
│   └── useTimeline.ts                  # Fetch + resolve current timeline state
└── lib/
    └── interpolation.ts                # Client-side Hermite interpolation engine
```

---

### Task 1: Global Theme & Layout Shell

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/components/Dashboard.tsx`

- [ ] **Step 1: Update globals.css with dark mission-control theme**

Replace the existing Tailwind content in `src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  /* Mission control dark theme */
  --bg-primary: #0a0e14;
  --bg-secondary: #0d1117;
  --bg-panel: #111820;
  --bg-panel-hover: #161d27;
  --border-panel: #1c2531;
  --border-accent: rgba(0, 229, 255, 0.15);

  --text-primary: #e0e0e0;
  --text-secondary: #667788;
  --text-muted: #3d4f5f;

  --accent-cyan: #00e5ff;
  --accent-green: #00ff88;
  --accent-yellow: #ffd740;
  --accent-orange: #ff9800;
  --accent-red: #ff4444;
  --accent-purple: #ce93d8;
  --accent-blue: #4fc3f7;

  /* Activity type colors */
  --color-sleep: #263238;
  --color-pao: #1565c0;
  --color-science: #2e7d32;
  --color-maneuver: #7b1fa2;
  --color-config: #00838f;
  --color-exercise: #e65100;
  --color-meal: #4e342e;
  --color-off-duty: #37474f;

  --font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 13px;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: var(--bg-primary);
}
::-webkit-scrollbar-thumb {
  background: var(--border-panel);
  border-radius: 2px;
}

/* Dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 35fr 40fr 25fr;
  grid-template-areas:
    "topbar topbar topbar"
    "left center right"
    "bottombar bottombar bottombar";
  height: 100vh;
  width: 100vw;
  gap: 1px;
  background: var(--bg-primary);
}

.dashboard-topbar { grid-area: topbar; }
.dashboard-left { grid-area: left; overflow-y: auto; }
.dashboard-center { grid-area: center; overflow-y: auto; }
.dashboard-right { grid-area: right; overflow-y: auto; }
.dashboard-bottombar { grid-area: bottombar; }

/* Panel styling */
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-panel);
  border-radius: 4px;
  margin: 4px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-panel);
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--accent-cyan);
}

.panel-body {
  padding: 8px 10px;
}

/* Telemetry value styling */
.telem-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 2px 0;
  font-size: 12px;
}

.telem-label {
  color: var(--text-secondary);
  font-size: 10px;
  letter-spacing: 0.5px;
}

.telem-value {
  color: var(--text-primary);
  font-weight: bold;
}

.telem-unit {
  color: var(--text-secondary);
  font-size: 10px;
  margin-left: 2px;
}

/* Live indicator */
.live-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-red);
  animation: pulse 2s ease-in-out infinite;
  margin-right: 6px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Milestone indicators */
.milestone-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

.milestone-dot.completed { background: var(--accent-green); }
.milestone-dot.active { background: var(--accent-yellow); animation: pulse 1.5s ease-in-out infinite; }
.milestone-dot.upcoming { background: var(--text-muted); }
```

- [ ] **Step 2: Update layout.tsx**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artemis II Tracker — Live Mission Control",
  description: "Real-time mission control dashboard for NASA Artemis II crewed lunar flyby",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create Dashboard.tsx**

```tsx
// src/components/Dashboard.tsx
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
        <TopBar
          metMs={metMs}
          telemetry={telemetry}
          dsn={dsn}
          timeline={timeline}
        />
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
```

- [ ] **Step 4: Update page.tsx**

```tsx
// src/app/page.tsx
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return <Dashboard />;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/app/page.tsx src/components/Dashboard.tsx
git commit -m "feat: add dark mission-control theme and dashboard grid layout"
```

---

### Task 2: Shared Components (MetClock + PanelFrame)

**Files:**
- Create: `src/components/shared/MetClock.tsx`
- Create: `src/components/shared/PanelFrame.tsx`

- [ ] **Step 1: Create PanelFrame**

```tsx
// src/components/shared/PanelFrame.tsx
"use client";

import { ReactNode, useState } from "react";

interface PanelFrameProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  headerRight?: ReactNode;
}

export function PanelFrame({
  title,
  subtitle,
  accentColor,
  collapsible = false,
  defaultOpen = true,
  children,
  headerRight,
}: PanelFrameProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="panel">
      <div
        className="panel-header"
        style={accentColor ? { color: accentColor } : undefined}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: collapsible ? "pointer" : "default" }}>
          {collapsible && (
            <span style={{ fontSize: "8px", transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0)" }}>
              ▶
            </span>
          )}
          <span>{title}</span>
          {subtitle && <span style={{ color: "var(--text-muted)", letterSpacing: "0", textTransform: "none", fontSize: "10px" }}>{subtitle}</span>}
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      {isOpen && <div className="panel-body">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create MetClock**

```tsx
// src/components/shared/MetClock.tsx
"use client";

import { formatMet } from "@/lib/met";

interface MetClockProps {
  metMs: number;
  size?: "large" | "medium" | "small";
}

export function MetClock({ metMs, size = "large" }: MetClockProps) {
  const formatted = formatMet(metMs);

  const fontSize = size === "large" ? "32px" : size === "medium" ? "20px" : "14px";

  return (
    <div style={{
      fontFamily: "var(--font-mono)",
      fontSize,
      fontWeight: 700,
      color: "var(--accent-cyan)",
      letterSpacing: "2px",
      lineHeight: 1,
    }}>
      {formatted}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/
git commit -m "feat: add MetClock and PanelFrame shared components"
```

---

### Task 3: Hooks (useMet, useTelemetryStream, useTimeline)

**Files:**
- Create: `src/hooks/useMet.ts`
- Create: `src/hooks/useTelemetryStream.ts`
- Create: `src/hooks/useTimeline.ts`

- [ ] **Step 1: Create useMet hook**

```tsx
// src/hooks/useMet.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { LAUNCH_TIME_MS } from "@/lib/constants";

export function useMet(): number {
  const [metMs, setMetMs] = useState(() => Date.now() - LAUNCH_TIME_MS);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      setMetMs(Date.now() - LAUNCH_TIME_MS);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return metMs;
}
```

- [ ] **Step 2: Create useTelemetryStream hook**

```tsx
// src/hooks/useTelemetryStream.ts
"use client";

import { useState, useEffect, useRef } from "react";
import type { Telemetry, StateVector, DsnStatus, SsePayload } from "@/lib/types";

interface TelemetryState {
  telemetry: Telemetry | null;
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  dsn: DsnStatus | null;
  connected: boolean;
}

export function useTelemetryStream(): TelemetryState {
  const [state, setState] = useState<TelemetryState>({
    telemetry: null,
    stateVector: null,
    moonPosition: null,
    dsn: null,
    connected: false,
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/telemetry/stream");
    esRef.current = es;

    es.addEventListener("telemetry", (event) => {
      const payload: SsePayload = JSON.parse(event.data);
      setState({
        telemetry: payload.telemetry,
        stateVector: payload.stateVector,
        moonPosition: payload.moonPosition,
        dsn: payload.dsn,
        connected: true,
      });
    });

    es.addEventListener("dsn", (event) => {
      const dsn: DsnStatus = JSON.parse(event.data);
      setState((prev) => ({ ...prev, dsn }));
    });

    es.onopen = () => {
      setState((prev) => ({ ...prev, connected: true }));
    };

    es.onerror = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };

    return () => {
      es.close();
    };
  }, []);

  return state;
}
```

- [ ] **Step 3: Create useTimeline hook**

```tsx
// src/hooks/useTimeline.ts
"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  TimelineData,
  TimelineActivity,
  AttitudeBlock,
  PhaseBlock,
  Milestone,
  MissionPhase,
} from "@/lib/types";

export interface TimelineState {
  data: TimelineData | null;
  currentActivity: TimelineActivity | null;
  currentAttitude: AttitudeBlock | null;
  currentPhase: PhaseBlock | null;
  nextMilestone: Milestone | null;
  upcomingActivities: TimelineActivity[];
  flightDay: number;
  loading: boolean;
}

function getFlightDay(metMs: number): number {
  if (metMs < 0) return 0;
  return Math.floor(metMs / (24 * 3600 * 1000)) + 1;
}

function findCurrent<T extends { startMetMs: number; endMetMs: number }>(
  items: T[],
  metMs: number
): T | null {
  return items.find((item) => metMs >= item.startMetMs && metMs < item.endMetMs) ?? null;
}

export function useTimeline(metMs: number): TimelineState {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/timeline")
      .then((res) => res.json())
      .then((d: TimelineData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return useMemo(() => {
    if (!data) {
      return {
        data: null,
        currentActivity: null,
        currentAttitude: null,
        currentPhase: null,
        nextMilestone: null,
        upcomingActivities: [],
        flightDay: getFlightDay(metMs),
        loading,
      };
    }

    const currentActivity = findCurrent(data.activities, metMs);
    const currentAttitude = findCurrent(data.attitudes, metMs);
    const currentPhase = findCurrent(data.phases, metMs);
    const nextMilestone = data.milestones.find((m) => m.metMs > metMs) ?? null;

    const upcomingActivities = data.activities
      .filter((a) => a.startMetMs > metMs)
      .slice(0, 8);

    return {
      data,
      currentActivity,
      currentAttitude,
      currentPhase,
      nextMilestone,
      upcomingActivities,
      flightDay: getFlightDay(metMs),
      loading,
    };
  }, [data, metMs, loading]);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useMet, useTelemetryStream, and useTimeline hooks"
```

---

### Task 4: TopBar Component

**Files:**
- Create: `src/components/TopBar.tsx`

- [ ] **Step 1: Create TopBar**

```tsx
// src/components/TopBar.tsx
"use client";

import { MetClock } from "./shared/MetClock";
import type { Telemetry, DsnStatus } from "@/lib/types";
import type { TimelineState } from "@/hooks/useTimeline";
import { formatMet } from "@/lib/met";

interface TopBarProps {
  metMs: number;
  telemetry: Telemetry | null;
  dsn: DsnStatus | null;
  timeline: TimelineState;
}

function formatNumber(n: number, decimals: number = 1): string {
  if (Math.abs(n) >= 1000) {
    return (n / 1000).toFixed(decimals) + "k";
  }
  return n.toFixed(decimals);
}

export function TopBar({ metMs, telemetry, dsn, timeline }: TopBarProps) {
  const activeDish = dsn?.dishes.find((d) => d.downlinkActive || d.uplinkActive);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "8px 16px",
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border-panel)",
      minHeight: "56px",
      flexWrap: "wrap",
    }}>
      {/* Title + Live */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "8px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "2px", color: "var(--accent-cyan)" }}>
          ARTEMIS II
        </span>
        <span className="live-dot" />
        <span style={{ fontSize: "10px", color: "var(--accent-red)", fontWeight: 700 }}>LIVE</span>
      </div>

      {/* MET Clock */}
      <div style={{
        background: "rgba(0, 229, 255, 0.06)",
        border: "1px solid var(--border-accent)",
        borderRadius: "4px",
        padding: "4px 14px",
      }}>
        <div style={{ fontSize: "9px", color: "var(--text-secondary)", letterSpacing: "1px" }}>MISSION ELAPSED TIME</div>
        <MetClock metMs={metMs} size="medium" />
      </div>

      {/* Phase badge */}
      {timeline.currentPhase && (
        <div style={{
          background: "rgba(0, 200, 0, 0.08)",
          border: "1px solid rgba(0, 200, 0, 0.25)",
          borderRadius: "4px",
          padding: "6px 12px",
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--accent-green)",
          letterSpacing: "1px",
        }}>
          {timeline.currentPhase.phase.toUpperCase()}
        </div>
      )}

      {/* Flight Day + Comms */}
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-panel)",
          borderRadius: "4px",
          padding: "4px 10px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "8px", color: "var(--text-secondary)", letterSpacing: "1px" }}>FLIGHT DAY</div>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>FD{String(timeline.flightDay).padStart(2, "0")}</div>
        </div>

        <div style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-panel)",
          borderRadius: "4px",
          padding: "4px 10px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "8px", color: "var(--text-secondary)", letterSpacing: "1px" }}>COMMS</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: dsn?.signalActive ? "var(--accent-green)" : "var(--text-muted)",
              display: "inline-block",
            }} />
            <span style={{ fontSize: "12px", fontWeight: 700 }}>
              {activeDish ? `${activeDish.dish}` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick telemetry */}
      <div style={{ display: "flex", gap: "8px" }}>
        {[
          { label: "VEL", value: telemetry ? formatNumber(telemetry.speedKmS) : "—", unit: "km/s" },
          { label: "ALT", value: telemetry ? formatNumber(telemetry.altitudeKm) : "—", unit: "km" },
          { label: "EARTH", value: telemetry ? formatNumber(telemetry.earthDistKm) : "—", unit: "km" },
        ].map(({ label, value, unit }) => (
          <div key={label} style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-panel)",
            borderRadius: "4px",
            padding: "4px 10px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "8px", color: "var(--text-secondary)", letterSpacing: "1px" }}>{label}</div>
            <div>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>{value}</span>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", marginLeft: "2px" }}>{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Next event */}
      {timeline.nextMilestone && (
        <div style={{
          marginLeft: "auto",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-panel)",
          borderRadius: "4px",
          padding: "4px 14px",
          textAlign: "right",
        }}>
          <div style={{ fontSize: "8px", color: "var(--text-secondary)", letterSpacing: "1px" }}>NEXT EVENT</div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-yellow)" }}>
            {timeline.nextMilestone.name}
          </div>
          <div style={{ fontSize: "10px", color: "var(--accent-orange)" }}>
            T-{formatMet(timeline.nextMilestone.metMs - metMs)}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "feat: add TopBar with MET clock, phase badge, telemetry readouts, next event"
```

---

### Task 5: BottomBar Component

**Files:**
- Create: `src/components/BottomBar.tsx`

- [ ] **Step 1: Create BottomBar**

```tsx
// src/components/BottomBar.tsx
"use client";

import { formatMet } from "@/lib/met";

interface BottomBarProps {
  metMs: number;
}

export function BottomBar({ metMs }: BottomBarProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 16px",
      background: "var(--bg-secondary)",
      borderTop: "1px solid var(--border-panel)",
      fontSize: "11px",
    }}>
      {/* LIVE / SIM toggle */}
      <div style={{ display: "flex", gap: "2px" }}>
        <button style={{
          background: "var(--accent-red)",
          color: "#fff",
          border: "none",
          borderRadius: "3px",
          padding: "3px 10px",
          fontSize: "10px",
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
          letterSpacing: "1px",
        }}>
          LIVE
        </button>
        <button style={{
          background: "var(--bg-panel)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-panel)",
          borderRadius: "3px",
          padding: "3px 10px",
          fontSize: "10px",
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
          letterSpacing: "1px",
        }}>
          SIM
        </button>
      </div>

      {/* Current MET */}
      <div style={{ color: "var(--text-secondary)" }}>
        {formatMet(metMs)}
      </div>

      {/* Credit */}
      <div>
        <a
          href="https://cdnspace.ca"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: "10px",
            letterSpacing: "0.5px",
          }}
        >
          Created by <span style={{ color: "var(--accent-cyan)" }}>Canadian Space</span>
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomBar.tsx
git commit -m "feat: add BottomBar with LIVE/SIM toggle and Canadian Space credit"
```

---

### Task 6: Left Column Panels (OrbitMap placeholder, Telemetry, DSN)

**Files:**
- Create: `src/components/panels/OrbitMapPanel.tsx`
- Create: `src/components/panels/TelemetryPanel.tsx`
- Create: `src/components/panels/DsnPanel.tsx`

- [ ] **Step 1: Create OrbitMapPanel (placeholder)**

```tsx
// src/components/panels/OrbitMapPanel.tsx
"use client";

import { PanelFrame } from "../shared/PanelFrame";
import type { StateVector } from "@/lib/types";

interface OrbitMapPanelProps {
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  metMs: number;
}

export function OrbitMapPanel({ stateVector, moonPosition, metMs }: OrbitMapPanelProps) {
  return (
    <PanelFrame title="Orbit Map" subtitle="Free-Return Trajectory" headerRight={<span style={{ fontSize: "9px", color: "var(--text-muted)" }}>2D TOP-DOWN VIEW</span>}>
      <div style={{
        height: "280px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.3)",
        borderRadius: "4px",
        color: "var(--text-muted)",
        fontSize: "11px",
      }}>
        {/* Canvas orbit map will be implemented in Plan 3 */}
        Orbit visualization loading...
      </div>
    </PanelFrame>
  );
}
```

- [ ] **Step 2: Create TelemetryPanel**

```tsx
// src/components/panels/TelemetryPanel.tsx
"use client";

import { PanelFrame } from "../shared/PanelFrame";
import type { Telemetry } from "@/lib/types";
import type { TimelineState } from "@/hooks/useTimeline";

interface TelemetryPanelProps {
  telemetry: Telemetry | null;
  timeline: TimelineState;
}

function fmt(n: number | undefined, decimals: number = 1): string {
  if (n === undefined || n === null) return "—";
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(decimals) + "M";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(decimals) + "k";
  return n.toFixed(decimals);
}

export function TelemetryPanel({ telemetry, timeline }: TelemetryPanelProps) {
  const phase = timeline.currentPhase?.phase ?? "—";

  return (
    <PanelFrame
      title="Orbital Telemetry"
      subtitle="estimated"
      headerRight={<span style={{ color: "var(--accent-green)", fontSize: "10px" }}>{phase}</span>}
    >
      {/* Dynamics */}
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontSize: "9px", color: "var(--accent-cyan)", letterSpacing: "1px", marginBottom: "4px" }}>DYNAMICS</div>
        <div className="telem-row">
          <span className="telem-label">VELOCITY</span>
          <span><span className="telem-value">{telemetry ? fmt(telemetry.speedKmS, 2) : "—"}</span><span className="telem-unit">km/s</span></span>
        </div>
        <div className="telem-row">
          <span className="telem-label">G-FORCE</span>
          <span><span className="telem-value">{telemetry ? telemetry.gForce.toFixed(3) : "—"}</span><span className="telem-unit">g</span></span>
        </div>
      </div>

      {/* Position */}
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontSize: "9px", color: "var(--accent-cyan)", letterSpacing: "1px", marginBottom: "4px" }}>POSITION</div>
        <div className="telem-row">
          <span className="telem-label">ALTITUDE</span>
          <span><span className="telem-value">{telemetry ? fmt(telemetry.altitudeKm) : "—"}</span><span className="telem-unit">km</span></span>
        </div>
        <div className="telem-row">
          <span className="telem-label">EARTH DIST</span>
          <span><span className="telem-value">{telemetry ? fmt(telemetry.earthDistKm) : "—"}</span><span className="telem-unit">km</span></span>
        </div>
        <div className="telem-row">
          <span className="telem-label">MOON DIST</span>
          <span><span className="telem-value">{telemetry ? fmt(telemetry.moonDistKm) : "—"}</span><span className="telem-unit">km</span></span>
        </div>
      </div>

      {/* Orbit */}
      <div>
        <div style={{ fontSize: "9px", color: "var(--accent-cyan)", letterSpacing: "1px", marginBottom: "4px" }}>ORBIT</div>
        <div className="telem-row">
          <span className="telem-label">PERIAPSIS</span>
          <span><span className="telem-value">{telemetry ? fmt(telemetry.periapsisKm) : "—"}</span><span className="telem-unit">km</span></span>
        </div>
        <div className="telem-row">
          <span className="telem-label">APOAPSIS</span>
          <span><span className="telem-value">{telemetry ? fmt(telemetry.apoapsisKm) : "—"}</span><span className="telem-unit">km</span></span>
        </div>
      </div>
    </PanelFrame>
  );
}
```

- [ ] **Step 3: Create DsnPanel**

```tsx
// src/components/panels/DsnPanel.tsx
"use client";

import { PanelFrame } from "../shared/PanelFrame";
import type { DsnStatus } from "@/lib/types";

interface DsnPanelProps {
  dsn: DsnStatus | null;
}

export function DsnPanel({ dsn }: DsnPanelProps) {
  const activeDishes = dsn?.dishes.filter((d) => d.downlinkActive || d.uplinkActive) ?? [];

  return (
    <PanelFrame
      title="DSN Communications"
      headerRight={
        <span style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "10px",
        }}>
          <span style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: dsn?.signalActive ? "var(--accent-green)" : "var(--text-muted)",
            display: "inline-block",
            animation: dsn?.signalActive ? "pulse 2s ease-in-out infinite" : "none",
          }} />
          <span style={{ color: dsn?.signalActive ? "var(--accent-green)" : "var(--text-muted)" }}>
            {dsn?.signalActive ? "SIGNAL" : "NO SIGNAL"}
          </span>
        </span>
      }
    >
      {activeDishes.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: "11px", padding: "8px 0" }}>
          No active DSN contact
        </div>
      ) : (
        activeDishes.map((dish) => (
          <div key={dish.dish} style={{
            padding: "6px 0",
            borderBottom: "1px solid var(--border-panel)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontWeight: 700, fontSize: "12px" }}>{dish.dish}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>{dish.stationName}</span>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "10px" }}>
              {dish.downlinkActive && (
                <span>
                  <span style={{ color: "var(--accent-green)" }}>↓</span>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{(dish.downlinkRate / 1000).toFixed(0)}k {dish.downlinkBand}-band</span>
                </span>
              )}
              {dish.uplinkActive && (
                <span>
                  <span style={{ color: "var(--accent-orange)" }}>↑</span>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{(dish.uplinkRate / 1000).toFixed(0)}k {dish.uplinkBand}-band</span>
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "10px", marginTop: "2px", color: "var(--text-secondary)" }}>
              <span>Range: {(dish.rangeKm / 1000).toFixed(1)}k km</span>
              <span>RTLT: {dish.rtltSeconds.toFixed(2)}s</span>
            </div>
          </div>
        ))
      )}
    </PanelFrame>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/panels/OrbitMapPanel.tsx src/components/panels/TelemetryPanel.tsx src/components/panels/DsnPanel.tsx
git commit -m "feat: add left column panels (orbit map placeholder, telemetry, DSN comms)"
```

---

### Task 7: Center Column Panels (Timeline placeholder, Activity, Milestone, LiveStream)

**Files:**
- Create: `src/components/panels/TimelinePanel.tsx`
- Create: `src/components/panels/ActivityDetailPanel.tsx`
- Create: `src/components/panels/NextMilestonePanel.tsx`
- Create: `src/components/panels/LiveStreamPanel.tsx`

- [ ] **Step 1: Create TimelinePanel (placeholder)**

```tsx
// src/components/panels/TimelinePanel.tsx
"use client";

import { PanelFrame } from "../shared/PanelFrame";
import type { TimelineState } from "@/hooks/useTimeline";

interface TimelinePanelProps {
  metMs: number;
  timeline: TimelineState;
}

export function TimelinePanel({ metMs, timeline }: TimelinePanelProps) {
  return (
    <PanelFrame
      title="Mission Overview"
      headerRight={<span style={{ fontSize: "9px", color: "var(--text-muted)" }}>FD{String(timeline.flightDay).padStart(2, "0")}</span>}
    >
      <div style={{
        height: "120px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "4px",
        color: "var(--text-muted)",
        fontSize: "11px",
      }}>
        {/* Gantt timeline will be implemented in Plan 4 */}
        Mission timeline loading...
      </div>
    </PanelFrame>
  );
}
```

- [ ] **Step 2: Create ActivityDetailPanel**

```tsx
// src/components/panels/ActivityDetailPanel.tsx
"use client";

import { PanelFrame } from "../shared/PanelFrame";
import type { TimelineState } from "@/hooks/useTimeline";
import { formatMet } from "@/lib/met";

interface ActivityDetailPanelProps {
  timeline: TimelineState;
  metMs: number;
}

export function ActivityDetailPanel({ timeline, metMs }: ActivityDetailPanelProps) {
  const { currentActivity, currentAttitude, currentPhase } = timeline;

  const activityProgress = currentActivity
    ? Math.min(100, ((metMs - currentActivity.startMetMs) / (currentActivity.endMetMs - currentActivity.startMetMs)) * 100)
    : 0;

  const phaseProgress = currentPhase
    ? Math.min(100, ((metMs - currentPhase.startMetMs) / (currentPhase.endMetMs - currentPhase.startMetMs)) * 100)
    : 0;

  return (
    <PanelFrame title="Activity Detail" headerRight={<span style={{ fontSize: "9px", color: "var(--text-muted)" }}>FD{String(timeline.flightDay).padStart(2, "0")}</span>}>
      {/* Crew activity */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "9px", color: "var(--accent-green)", letterSpacing: "1px" }}>CREW</div>
        <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px" }}>
          {currentActivity?.name ?? "—"}
        </div>
        {currentActivity && (
          <>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "2px" }}>
              {formatMet(currentActivity.startMetMs)} → {formatMet(currentActivity.endMetMs)}
              {" "}({Math.round((currentActivity.endMetMs - currentActivity.startMetMs) / 60000)}m)
            </div>
            <div style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: "2px",
              height: "4px",
              marginTop: "4px",
              overflow: "hidden",
            }}>
              <div style={{
                background: "var(--accent-green)",
                height: "100%",
                width: `${activityProgress}%`,
                borderRadius: "2px",
                transition: "width 1s linear",
              }} />
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-secondary)", textAlign: "right", marginTop: "1px" }}>
              {Math.round(activityProgress)}%
            </div>
          </>
        )}
      </div>

      {/* Attitude */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "9px", color: "var(--accent-purple)", letterSpacing: "1px" }}>ATT</div>
        <div style={{ fontSize: "12px", marginTop: "2px" }}>
          {currentAttitude?.mode ?? "—"}
        </div>
      </div>

      {/* Phase */}
      <div>
        <div style={{ fontSize: "9px", color: "var(--accent-blue)", letterSpacing: "1px" }}>PHASE</div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-green)", marginTop: "2px" }}>
          {currentPhase?.phase ?? "—"}
        </div>
        {currentPhase && (
          <>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "2px" }}>
              {formatMet(currentPhase.startMetMs)} → {formatMet(currentPhase.endMetMs)}
            </div>
            <div style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: "2px",
              height: "4px",
              marginTop: "4px",
              overflow: "hidden",
            }}>
              <div style={{
                background: "var(--accent-blue)",
                height: "100%",
                width: `${phaseProgress}%`,
                borderRadius: "2px",
                transition: "width 1s linear",
              }} />
            </div>
          </>
        )}
      </div>
    </PanelFrame>
  );
}
```

- [ ] **Step 3: Create NextMilestonePanel**

```tsx
// src/components/panels/NextMilestonePanel.tsx
"use client";

import type { TimelineState } from "@/hooks/useTimeline";
import { formatMet } from "@/lib/met";

interface NextMilestonePanelProps {
  timeline: TimelineState;
  metMs: number;
}

export function NextMilestonePanel({ timeline, metMs }: NextMilestonePanelProps) {
  const { nextMilestone } = timeline;

  if (!nextMilestone) return null;

  const countdown = nextMilestone.metMs - metMs;

  return (
    <div style={{
      margin: "4px",
      padding: "10px 14px",
      background: "rgba(255, 152, 0, 0.05)",
      border: "1px solid rgba(255, 152, 0, 0.15)",
      borderRadius: "4px",
    }}>
      <div style={{ fontSize: "9px", color: "var(--accent-orange)", letterSpacing: "1px", marginBottom: "4px" }}>
        NEXT MILESTONE
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span style={{ color: "var(--accent-orange)" }}>▶</span>
        <span style={{ fontSize: "13px", fontWeight: 700 }}>{nextMilestone.name}</span>
        <span style={{ fontSize: "11px", color: "var(--accent-orange)" }}>in {formatMet(countdown)}</span>
      </div>
      <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "4px", marginLeft: "18px" }}>
        {nextMilestone.description}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create LiveStreamPanel**

```tsx
// src/components/panels/LiveStreamPanel.tsx
"use client";

import { useState } from "react";
import { PanelFrame } from "../shared/PanelFrame";

const STREAMS = {
  official: { id: "m3kR2KK8TEs", label: "Official Broadcast" },
  orion: { id: "6RwfNBtepa4", label: "Orion Views" },
} as const;

type StreamKey = keyof typeof STREAMS;

export function LiveStreamPanel() {
  const [activeStream, setActiveStream] = useState<StreamKey>("official");

  return (
    <PanelFrame
      title="NASA Live"
      collapsible
      defaultOpen={true}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="live-dot" style={{ width: "6px", height: "6px" }} />
          <div style={{ display: "flex", gap: "2px" }}>
            {(Object.keys(STREAMS) as StreamKey[]).map((key) => (
              <button
                key={key}
                onClick={(e) => { e.stopPropagation(); setActiveStream(key); }}
                style={{
                  background: activeStream === key ? "rgba(0, 229, 255, 0.15)" : "transparent",
                  border: activeStream === key ? "1px solid var(--border-accent)" : "1px solid transparent",
                  borderRadius: "3px",
                  padding: "2px 8px",
                  fontSize: "9px",
                  color: activeStream === key ? "var(--accent-cyan)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0",
                  textTransform: "none",
                }}
              >
                {STREAMS[key].label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div style={{
        position: "relative",
        paddingBottom: "56.25%",
        height: 0,
        overflow: "hidden",
        borderRadius: "4px",
      }}>
        <iframe
          src={`https://www.youtube.com/embed/${STREAMS[activeStream].id}?autoplay=1&mute=1`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </PanelFrame>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/TimelinePanel.tsx src/components/panels/ActivityDetailPanel.tsx src/components/panels/NextMilestonePanel.tsx src/components/panels/LiveStreamPanel.tsx
git commit -m "feat: add center column panels (timeline placeholder, activity detail, milestone, live stream)"
```

---

### Task 8: Right Column Panels (Current Activities, Upcoming, Milestones)

**Files:**
- Create: `src/components/panels/CurrentActivitiesPanel.tsx`
- Create: `src/components/panels/UpcomingPanel.tsx`
- Create: `src/components/panels/MilestonesPanel.tsx`

- [ ] **Step 1: Create CurrentActivitiesPanel**

```tsx
// src/components/panels/CurrentActivitiesPanel.tsx
"use client";

import { PanelFrame } from "../shared/PanelFrame";
import type { TimelineState } from "@/hooks/useTimeline";

interface CurrentActivitiesPanelProps {
  timeline: TimelineState;
}

const typeColors: Record<string, string> = {
  sleep: "var(--color-sleep)",
  pao: "var(--color-pao)",
  science: "var(--color-science)",
  maneuver: "var(--color-maneuver)",
  config: "var(--color-config)",
  exercise: "var(--color-exercise)",
  meal: "var(--color-meal)",
  "off-duty": "var(--color-off-duty)",
  other: "var(--text-muted)",
};

export function CurrentActivitiesPanel({ timeline }: CurrentActivitiesPanelProps) {
  const { currentActivity, currentAttitude, currentPhase } = timeline;

  return (
    <PanelFrame title="Current Activities">
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontSize: "9px", color: "var(--text-secondary)", letterSpacing: "1px" }}>CREW</div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
          {currentActivity && (
            <span style={{
              width: "4px",
              height: "14px",
              borderRadius: "2px",
              background: typeColors[currentActivity.type] ?? "var(--text-muted)",
              flexShrink: 0,
            }} />
          )}
          <span style={{ fontSize: "13px", fontWeight: 700 }}>
            {currentActivity?.name ?? "—"}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontSize: "9px", color: "var(--text-secondary)", letterSpacing: "1px" }}>ATTITUDE</div>
        <div style={{ fontSize: "12px", marginTop: "2px" }}>
          {currentAttitude?.mode ?? "—"}
        </div>
      </div>

      <div>
        <div style={{ fontSize: "9px", color: "var(--text-secondary)", letterSpacing: "1px" }}>PHASE</div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-green)", marginTop: "2px" }}>
          {currentPhase?.phase ?? "—"}
        </div>
      </div>
    </PanelFrame>
  );
}
```

- [ ] **Step 2: Create UpcomingPanel**

```tsx
// src/components/panels/UpcomingPanel.tsx
"use client";

import { PanelFrame } from "../shared/PanelFrame";
import type { TimelineState } from "@/hooks/useTimeline";
import { formatMet } from "@/lib/met";

interface UpcomingPanelProps {
  timeline: TimelineState;
  metMs: number;
}

const typeColors: Record<string, string> = {
  sleep: "var(--color-sleep)",
  pao: "var(--color-pao)",
  science: "var(--color-science)",
  maneuver: "var(--color-maneuver)",
  config: "var(--color-config)",
  exercise: "var(--color-exercise)",
  meal: "var(--color-meal)",
  "off-duty": "var(--color-off-duty)",
  other: "var(--text-muted)",
};

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return `${days}d ${remainHours}h`;
}

export function UpcomingPanel({ timeline, metMs }: UpcomingPanelProps) {
  return (
    <PanelFrame title="Upcoming">
      {timeline.upcomingActivities.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>No upcoming activities</div>
      ) : (
        timeline.upcomingActivities.map((activity, i) => (
          <div key={`${activity.name}-${i}`} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 0",
            borderBottom: i < timeline.upcomingActivities.length - 1 ? "1px solid var(--border-panel)" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                width: "3px",
                height: "12px",
                borderRadius: "1px",
                background: typeColors[activity.type] ?? "var(--text-muted)",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: "11px" }}>{activity.name}</span>
            </div>
            <span style={{ fontSize: "10px", color: "var(--text-secondary)", whiteSpace: "nowrap", marginLeft: "8px" }}>
              {formatCountdown(activity.startMetMs - metMs)}
            </span>
          </div>
        ))
      )}
    </PanelFrame>
  );
}
```

- [ ] **Step 3: Create MilestonesPanel**

```tsx
// src/components/panels/MilestonesPanel.tsx
"use client";

import { PanelFrame } from "../shared/PanelFrame";
import type { TimelineState } from "@/hooks/useTimeline";
import { formatMet } from "@/lib/met";

interface MilestonesPanelProps {
  timeline: TimelineState;
  metMs: number;
}

export function MilestonesPanel({ timeline, metMs }: MilestonesPanelProps) {
  const milestones = timeline.data?.milestones ?? [];

  return (
    <PanelFrame title="Milestones">
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {milestones.map((milestone, i) => {
          const isCompleted = metMs >= milestone.metMs;
          const isNext = !isCompleted && (i === 0 || metMs >= milestones[i - 1].metMs);

          return (
            <div key={milestone.name} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              padding: "4px 0",
              opacity: isCompleted || isNext ? 1 : 0.5,
            }}>
              <span
                className={`milestone-dot ${isCompleted ? "completed" : isNext ? "active" : "upcoming"}`}
                style={{ marginTop: "3px" }}
              />
              <div>
                <div style={{
                  fontSize: "11px",
                  fontWeight: isNext ? 700 : 400,
                  color: isNext ? "var(--accent-yellow)" : isCompleted ? "var(--text-primary)" : "var(--text-secondary)",
                }}>
                  {milestone.name}
                </div>
                <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                  {formatMet(milestone.metMs)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PanelFrame>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/panels/CurrentActivitiesPanel.tsx src/components/panels/UpcomingPanel.tsx src/components/panels/MilestonesPanel.tsx
git commit -m "feat: add right column panels (current activities, upcoming, milestones)"
```

---

### Task 9: Build Verification & Final Polish

- [ ] **Step 1: Verify build succeeds**

```bash
npm run build
```

Fix any TypeScript or import errors.

- [ ] **Step 2: Start dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:3000 and verify:
- Dark theme renders correctly
- Three-column layout fills viewport
- MET clock is ticking
- Top bar shows all readouts
- Panels are visible in correct columns
- Bottom bar shows LIVE/SIM and Canadian Space credit
- NASA Live stream embed loads

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "feat: complete Plan 2 — dashboard layout and core UI"
```
