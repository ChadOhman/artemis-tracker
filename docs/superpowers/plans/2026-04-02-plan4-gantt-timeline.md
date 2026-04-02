# Plan 4: Gantt-Style Mission Timeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the timeline placeholder with an interactive Gantt-style horizontal timeline showing crew activities, attitude modes, and mission phases as colored bars across all 10 flight days, with a red playhead at current MET, auto-scrolling, and click-to-select activity detail.

**Architecture:** Canvas-based Gantt renderer for performance (100+ activity blocks at 60fps). Three horizontal rows (Crew, Attitude, Phase) with colored blocks. A red vertical playhead line tracks current MET. The timeline is pannable/zoomable with auto-track mode that keeps the playhead centered.

**Tech Stack:** HTML Canvas 2D API, requestAnimationFrame

---

## File Structure

```
src/
├── components/
│   └── panels/
│       └── TimelinePanel.tsx           # Replace placeholder with Gantt canvas
```

---

### Task 1: Gantt Timeline Canvas

**Files:**
- Modify: `src/components/panels/TimelinePanel.tsx`

Replace the placeholder with a full Canvas-based Gantt timeline. The component should:

**Layout (top to bottom within the canvas):**
- **Time ruler** at top — tick marks with MET labels (every few hours when zoomed out, finer when zoomed in), flight day boundaries marked
- **Crew activities row** (~40% of remaining height) — colored blocks per activity, labels inside blocks that fit
- **Attitude row** (~20%) — attitude mode blocks
- **Phase row** (~20%) — mission phase blocks  
- **Milestone markers** — small triangles/diamonds along the top, with labels for major milestones

**Interactivity:**
- **Red playhead** — vertical line at current MET, always visible
- **Auto-track** — when enabled (default), the view auto-scrolls to keep the playhead at ~30% from left. Toggle button in panel header.
- **Pan** — click and drag horizontally to pan the timeline. Disables auto-track.
- **Zoom** — mouse wheel zooms in/out on the time axis (centered on cursor position)
- **Click activity** — clicking on a crew activity block dispatches a callback (for future use by ActivityDetailPanel)

**Color scheme (from CSS variables):**
- sleep: #263238
- pao: #1565c0
- science: #2e7d32
- maneuver: #7b1fa2
- config: #00838f
- exercise: #e65100
- meal: #4e342e
- off-duty: #37474f

**Phase colors:**
- Prelaunch: #37474f
- LEO: #0d47a1
- High Earth Orbit: #1a237e
- Trans-Lunar: #4a148c
- Trans-Earth: #1b5e20
- EDL: #bf360c
- Recovery: #e65100

The component receives props: `{ metMs: number, timeline: TimelineState }` where TimelineState comes from the useTimeline hook (has .raw with activities, attitudes, phases, milestones).

- [ ] **Step 1: Read existing files**

Read:
- src/components/panels/TimelinePanel.tsx (current stub)
- src/hooks/useTimeline.ts (TimelineState interface)
- src/lib/types.ts (TimelineActivity, AttitudeBlock, PhaseBlock, Milestone types)
- src/components/shared/PanelFrame.tsx (PanelFrame props)

- [ ] **Step 2: Implement the Gantt canvas**

Replace TimelinePanel.tsx with the full canvas implementation. Key details:

**State:**
- `viewStartMs` / `viewEndMs` — the visible MET window  
- `autoTrack` — boolean, default true
- `isDragging` — for pan tracking
- `dragStartX` / `dragStartMs` — for pan calculation

**Rendering approach:**
- The canvas fills the panel body
- Use DPR scaling for crisp rendering
- Calculate `msPerPixel` from the view window and canvas width
- For each activity/attitude/phase, compute pixel x from MET, skip if off-screen
- Draw filled rounded rects for each block
- Draw text labels inside blocks (only if block is wide enough)
- Draw the red playhead line
- Draw milestone markers as small diamonds along the top

**Auto-track logic:**
- When autoTrack is true, on each frame, set viewStartMs so the playhead is at 30% of the canvas width
- Maintain a consistent zoom level (e.g., show ~6 hours of timeline)

**Pan logic:**
- On mousedown: record start position and current viewStartMs, set isDragging, disable autoTrack
- On mousemove while dragging: shift view proportionally
- On mouseup: stop dragging

**Zoom logic:**
- On wheel: zoom in/out centered on cursor position
- Clamp zoom to reasonable range (min: 1 hour visible, max: full mission)

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/panels/TimelinePanel.tsx
git commit -m "feat: add Gantt-style mission timeline with pan, zoom, and auto-track"
```

---

### Task 2: Build Verification

- [ ] **Step 1: Run all tests**

```bash
npm test -- --verbose
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Visual check**

Open http://localhost:3000 and verify:
- Gantt timeline renders in center column
- Colored activity blocks are visible
- Red playhead is at current MET
- Auto-track keeps playhead visible
- Mouse wheel zooms in/out
- Click and drag pans the timeline
- Attitude and phase rows show below crew activities
- Milestone markers visible along top
