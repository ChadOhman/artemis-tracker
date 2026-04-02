# Plan 6: SIM Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SIM mode — a time scrubber in the bottom bar that lets users jump to any point in the 10-day mission, with playback speed controls and a JUMP TO milestone dropdown. When in SIM mode, the entire dashboard (MET clock, orbit map, telemetry, timeline, activity detail, milestones) rewinds/fast-forwards to the scrubbed position.

**Architecture:** A MET context provider wraps the dashboard. In LIVE mode it returns wall-clock MET. In SIM mode it returns a controlled MET from the scrubber. All components already consume metMs as a prop — switching the source is all that's needed. Playback uses requestAnimationFrame to advance MET at configurable speed multipliers.

**Tech Stack:** React Context, requestAnimationFrame

---

## File Structure

```
src/
├── context/
│   └── MetContext.tsx                  # MET provider — LIVE vs SIM mode
├── components/
│   ├── Dashboard.tsx                   # Wrap with MetProvider, use context
│   ├── BottomBar.tsx                   # Add scrubber, speed controls, JUMP TO
│   └── panels/ (no changes — they already use metMs prop)
├── hooks/
│   └── useMet.ts                      # Refactor to use context
```

---

### Task 1: MET Context Provider

**Files:**
- Create: `src/context/MetContext.tsx`

Create a React context that provides:
- `metMs` — current MET in milliseconds
- `mode` — "LIVE" | "SIM"
- `setMode` — switch between LIVE and SIM
- `simMetMs` — the SIM position (only relevant in SIM mode)
- `setSimMetMs` — set the SIM position (for scrubber)
- `playbackSpeed` — 0 (paused), 1, 10, 100, 1000
- `setPlaybackSpeed` — change playback speed
- `jumpTo` — function to jump to a specific MET

In LIVE mode: metMs = Date.now() - LAUNCH_TIME_MS, updated via requestAnimationFrame
In SIM mode: metMs = simMetMs, advancing by playbackSpeed * elapsed real time per frame

- [ ] **Step 1: Create MetContext.tsx**

```tsx
// src/context/MetContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { LAUNCH_TIME_MS, MISSION_DURATION_MS } from "@/lib/constants";

interface MetContextValue {
  metMs: number;
  mode: "LIVE" | "SIM";
  setMode: (mode: "LIVE" | "SIM") => void;
  simMetMs: number;
  setSimMetMs: (metMs: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  jumpTo: (metMs: number) => void;
}

const MetContext = createContext<MetContextValue | null>(null);

export function MetProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"LIVE" | "SIM">("LIVE");
  const [simMetMs, setSimMetMs] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(0); // 0 = paused in SIM
  const [liveMetMs, setLiveMetMs] = useState(() => Date.now() - LAUNCH_TIME_MS);
  const lastFrameRef = useRef(performance.now());
  const rafRef = useRef(0);

  const jumpTo = useCallback((met: number) => {
    setMode("SIM");
    setSimMetMs(Math.max(0, Math.min(met, MISSION_DURATION_MS)));
    setPlaybackSpeed(0);
  }, []);

  useEffect(() => {
    function tick(now: number) {
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      if (mode === "LIVE") {
        setLiveMetMs(Date.now() - LAUNCH_TIME_MS);
      } else if (playbackSpeed !== 0) {
        setSimMetMs((prev) => {
          const next = prev + delta * playbackSpeed;
          return Math.max(0, Math.min(next, MISSION_DURATION_MS));
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, playbackSpeed]);

  const metMs = mode === "LIVE" ? liveMetMs : simMetMs;

  return (
    <MetContext.Provider value={{
      metMs, mode, setMode, simMetMs, setSimMetMs,
      playbackSpeed, setPlaybackSpeed, jumpTo,
    }}>
      {children}
    </MetContext.Provider>
  );
}

export function useMetContext(): MetContextValue {
  const ctx = useContext(MetContext);
  if (!ctx) throw new Error("useMetContext must be used within MetProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/MetContext.tsx
git commit -m "feat: add MET context provider with LIVE/SIM mode and playback controls"
```

---

### Task 2: Integrate MetContext into Dashboard

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/hooks/useMet.ts`

- [ ] **Step 1: Update Dashboard.tsx**

Wrap the dashboard grid with MetProvider. Replace the useMet() hook call with useMetContext(). Pass the full context to BottomBar so it can control mode/scrubber/speed.

The Dashboard should:
1. Import MetProvider and useMetContext
2. Create an inner component that uses useMetContext() for metMs
3. Wrap with MetProvider

- [ ] **Step 2: Update useMet.ts**

Refactor useMet to optionally use the context if available, or fall back to the standalone RAF loop. Or simply have Dashboard use useMetContext directly and keep useMet as-is for any standalone usage.

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard.tsx src/hooks/useMet.ts
git commit -m "feat: integrate MET context into dashboard for LIVE/SIM mode switching"
```

---

### Task 3: BottomBar with SIM Controls

**Files:**
- Modify: `src/components/BottomBar.tsx`

Replace the static LIVE/SIM buttons with functional controls:

**LIVE mode view:**
- LIVE button (active, red)
- SIM button (inactive, grey) — clicking switches to SIM mode at current MET

**SIM mode view:**
- LIVE button (inactive) — clicking switches back to LIVE
- SIM button (active, cyan)
- **Time scrubber** — range input slider spanning 0 to MISSION_DURATION_MS, showing current simMetMs
- **Playback controls**: ⏸ (pause), 1x, 10x, 100x, 1000x speed buttons
- **JUMP TO** dropdown — select element with all milestones, selecting one calls jumpTo(milestone.metMs)
- Current MET display updates to show SIM time

The BottomBar needs access to the MET context, so it should use useMetContext().

Also needs access to milestones for the JUMP TO dropdown — it can receive timeline as a prop or fetch from context.

- [ ] **Step 1: Read existing BottomBar**

Read src/components/BottomBar.tsx and src/components/Dashboard.tsx to understand current props.

- [ ] **Step 2: Update BottomBar**

Add the full SIM control UI. The BottomBar should now use useMetContext() directly instead of receiving metMs as a prop (since it needs setMode, setSimMetMs, etc).

It also needs milestones for the JUMP TO dropdown — pass timeline data as a prop from Dashboard, or have it import useTimeline. Simplest: pass milestones as an optional prop.

The scrubber slider should:
- Be styled to match the dark theme (custom CSS for range input)
- Show MET at the current position
- Dragging it updates simMetMs in real-time
- Full width of available space between the mode buttons and the credit

The playback speed buttons should be small pills showing the speed, with the active one highlighted.

- [ ] **Step 3: Add scrubber CSS to globals.css**

Add custom range input styling to globals.css for the dark theme scrubber:

```css
/* SIM mode scrubber */
input[type="range"].sim-scrubber {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--border-panel);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

input[type="range"].sim-scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-cyan);
  cursor: pointer;
  border: 2px solid var(--bg-secondary);
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomBar.tsx src/app/globals.css
git commit -m "feat: add SIM mode controls — scrubber, playback speed, JUMP TO milestones"
```

---

### Task 4: Build Verification & Final Test

- [ ] **Step 1: Run all tests**

```bash
npm test -- --verbose
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Visual verification**

Open http://localhost:3000 and verify:
- LIVE mode works as before (MET ticking, everything updating)
- Clicking SIM switches to SIM mode, paused at current MET
- Scrubber slider appears and is draggable
- Dragging scrubber updates: MET clock, orbit map position, Gantt playhead, telemetry, activity detail, milestones
- Playback speed buttons (1x, 10x, 100x, 1000x) animate the mission forward
- JUMP TO dropdown lists all milestones; selecting one jumps there
- Clicking LIVE returns to real-time tracking
