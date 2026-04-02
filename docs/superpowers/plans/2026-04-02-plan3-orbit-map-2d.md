# Plan 3: 2D Canvas Orbit Map

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the orbit map placeholder with an animated HTML Canvas showing Earth, Moon, the figure-8 trajectory, and Orion's position interpolated at 60fps. Include waypoint labels, distance indicators, and a starfield background.

**Architecture:** A single Canvas component that renders the 2D top-down orbit visualization. Uses a client-side Hermite interpolation engine to smoothly animate Orion's position between state vectors from the SSE stream. The trajectory path is drawn from historical vectors fetched on mount + accumulated from the live stream. Earth and Moon are drawn at schematic (enlarged) scale for readability.

**Tech Stack:** HTML Canvas 2D API, requestAnimationFrame, Hermite interpolation

---

## File Structure

```
src/
├── lib/
│   └── interpolation.ts             # Hermite interpolation engine
├── components/
│   └── panels/
│       └── OrbitMapPanel.tsx         # Replace placeholder with Canvas map
├── hooks/
│   └── useOrbitMap.ts               # Canvas rendering loop + state management
```

---

### Task 1: Hermite Interpolation Engine

**Files:**
- Create: `src/lib/interpolation.ts`
- Test: `__tests__/lib/interpolation.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/interpolation.test.ts
import { hermiteInterpolate, interpolateStateVector } from "@/lib/interpolation";
import type { StateVector } from "@/lib/types";

describe("Hermite interpolation", () => {
  test("hermiteInterpolate returns start value at t=0", () => {
    const result = hermiteInterpolate(0, 10, 1, 1, 0);
    expect(result).toBeCloseTo(0, 5);
  });

  test("hermiteInterpolate returns end value at t=1", () => {
    const result = hermiteInterpolate(0, 10, 1, 1, 1);
    expect(result).toBeCloseTo(10, 5);
  });

  test("hermiteInterpolate returns midpoint-ish at t=0.5", () => {
    const result = hermiteInterpolate(0, 10, 0, 0, 0.5);
    expect(result).toBeCloseTo(5, 0);
  });

  test("interpolateStateVector interpolates position and velocity between two vectors", () => {
    const sv1: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 0,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 10, y: 0, z: 0 },
    };
    const sv2: StateVector = {
      timestamp: "2026-04-02T01:00:00Z",
      metMs: 3600000,
      position: { x: 36000, y: 0, z: 0 },
      velocity: { x: 10, y: 0, z: 0 },
    };

    // At t=0, should be at sv1
    const at0 = interpolateStateVector(sv1, sv2, 0);
    expect(at0.position.x).toBeCloseTo(0, 0);

    // At t=3600000 (end), should be at sv2
    const atEnd = interpolateStateVector(sv1, sv2, 3600000);
    expect(atEnd.position.x).toBeCloseTo(36000, 0);

    // At midpoint, should be roughly halfway
    const atMid = interpolateStateVector(sv1, sv2, 1800000);
    expect(atMid.position.x).toBeCloseTo(18000, -2);
  });

  test("interpolateStateVector clamps outside range", () => {
    const sv1: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 1000,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
    };
    const sv2: StateVector = {
      timestamp: "2026-04-02T00:01:00Z",
      metMs: 2000,
      position: { x: 1, y: 0, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
    };

    // Before range: clamp to start
    const before = interpolateStateVector(sv1, sv2, 0);
    expect(before.position.x).toBeCloseTo(0, 5);

    // After range: clamp to end
    const after = interpolateStateVector(sv1, sv2, 5000);
    expect(after.position.x).toBeCloseTo(1, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/interpolation.test.ts -v
```

- [ ] **Step 3: Implement interpolation.ts**

```typescript
// src/lib/interpolation.ts
import type { StateVector } from "./types";

/**
 * Cubic Hermite interpolation between two values with tangents.
 * p0: start value, p1: end value
 * m0: start tangent (velocity * dt), m1: end tangent (velocity * dt)
 * t: normalized parameter [0, 1]
 */
export function hermiteInterpolate(
  p0: number,
  p1: number,
  m0: number,
  m1: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

/**
 * Interpolate a full state vector between two known vectors at a given MET.
 * Uses Hermite interpolation with velocity as tangents for physically accurate arcs.
 */
export function interpolateStateVector(
  sv1: StateVector,
  sv2: StateVector,
  metMs: number
): { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } } {
  const dt = sv2.metMs - sv1.metMs;
  if (dt <= 0) {
    return { position: { ...sv1.position }, velocity: { ...sv1.velocity } };
  }

  // Clamp t to [0, 1]
  let t = (metMs - sv1.metMs) / dt;
  t = Math.max(0, Math.min(1, t));

  // Convert velocity from km/s to km per interval (tangent scaling)
  const dtSeconds = dt / 1000;

  const position = {
    x: hermiteInterpolate(
      sv1.position.x, sv2.position.x,
      sv1.velocity.x * dtSeconds, sv2.velocity.x * dtSeconds, t
    ),
    y: hermiteInterpolate(
      sv1.position.y, sv2.position.y,
      sv1.velocity.y * dtSeconds, sv2.velocity.y * dtSeconds, t
    ),
    z: hermiteInterpolate(
      sv1.position.z, sv2.position.z,
      sv1.velocity.z * dtSeconds, sv2.velocity.z * dtSeconds, t
    ),
  };

  // Linear interpolation for velocity (good enough for display)
  const velocity = {
    x: sv1.velocity.x + (sv2.velocity.x - sv1.velocity.x) * t,
    y: sv1.velocity.y + (sv2.velocity.y - sv1.velocity.y) * t,
    z: sv1.velocity.z + (sv2.velocity.z - sv1.velocity.z) * t,
  };

  return { position, velocity };
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/lib/interpolation.test.ts -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/interpolation.ts __tests__/lib/interpolation.test.ts
git commit -m "feat: add Hermite interpolation engine for smooth orbit animation"
```

---

### Task 2: Orbit Map Canvas Renderer

**Files:**
- Modify: `src/components/panels/OrbitMapPanel.tsx`

This is the main visual component. It renders a Canvas with:

1. **Starfield** — random dots, rendered once to an offscreen canvas and reused
2. **Trajectory path** — drawn from accumulated state vectors. Path behind Orion = solid cyan line, path ahead = dashed line. Uses a pre-computed reference trajectory for the full figure-8 shape.
3. **Earth** — left-center, drawn as a blue gradient circle with glow
4. **Moon** — right area, drawn as a grey gradient circle
5. **Orion** — bright green dot with glow, positioned via interpolation
6. **Waypoint labels** — TLI, Closest Approach, etc.
7. **Distance labels** — Earth-Moon distance, closest approach distance

The coordinate system maps the 2D projection (X-Y plane of the J2000 frame) to canvas pixels. Earth is at the origin. We scale so the full trajectory fits with padding.

- [ ] **Step 1: Replace OrbitMapPanel with Canvas implementation**

Read the existing OrbitMapPanel.tsx first, then replace it with the full canvas implementation. The component should:

```tsx
// src/components/panels/OrbitMapPanel.tsx
"use client";

import { useRef, useEffect, useCallback } from "react";
import { PanelFrame } from "../shared/PanelFrame";
import { interpolateStateVector } from "@/lib/interpolation";
import type { StateVector } from "@/lib/types";

interface OrbitMapPanelProps {
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  metMs: number;
  trajectoryHistory?: StateVector[];
}

// Pre-computed approximate figure-8 trajectory points (X, Y in km)
// These represent the expected path from launch through lunar flyby and return
// Generated from the mission profile: LEO -> HEO -> TLI -> Lunar flyby -> Return
const REFERENCE_TRAJECTORY = generateReferenceTrajectory();

function generateReferenceTrajectory(): { x: number; y: number; metMs: number }[] {
  const points: { x: number; y: number; metMs: number }[] = [];
  const moonDist = 384400; // km average Earth-Moon distance

  // Phase 1: Earth orbit (0 to TLI at ~1d 1h)
  const tliMetMs = (25 * 3600 + 8 * 60 + 42) * 1000;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const angle = t * Math.PI * 2;
    const r = 6571 + t * 50000; // spiral out
    points.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      metMs: t * tliMetMs,
    });
  }

  // Phase 2: Trans-lunar coast (TLI to lunar SOI ~4d 6h)
  const lunarSoiMetMs = (4 * 24 * 3600 + 6 * 3600 + 38 * 60) * 1000;
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    const x = 50000 + t * (moonDist - 50000);
    // Slight curve upward on approach
    const y = Math.sin(t * Math.PI * 0.3) * 30000;
    points.push({
      x,
      y,
      metMs: tliMetMs + t * (lunarSoiMetMs - tliMetMs),
    });
  }

  // Phase 3: Lunar flyby (around far side, closest approach ~5d 0h 30m)
  const flybyMetMs = (5 * 24 * 3600 + 30 * 60) * 1000;
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const angle = -Math.PI * 0.3 + t * Math.PI * 0.8; // arc behind Moon
    const r = 6513 + Math.sin(t * Math.PI) * 5000; // closest at midpoint
    points.push({
      x: moonDist + Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      metMs: lunarSoiMetMs + t * (flybyMetMs - lunarSoiMetMs),
    });
  }

  // Phase 4: Return coast (lunar SOI exit ~5d 18h to entry ~9d 1h)
  const exitMetMs = (5 * 24 * 3600 + 18 * 3600 + 53 * 60) * 1000;
  const entryMetMs = (9 * 24 * 3600 + 1 * 3600 + 29 * 60) * 1000;
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    const x = moonDist * (1 - t);
    // Return path curves below the outbound path
    const y = -Math.sin(t * Math.PI * 0.4) * 40000;
    points.push({
      x,
      y,
      metMs: exitMetMs + t * (entryMetMs - exitMetMs),
    });
  }

  return points;
}

// Milestone positions along the trajectory for labels
const WAYPOINTS = [
  { label: "TLI", metMs: (25 * 3600 + 8 * 60 + 42) * 1000 },
  { label: "Lunar SOI", metMs: (4 * 24 * 3600 + 6 * 3600 + 38 * 60) * 1000 },
  { label: "Closest Approach\n~6,513 km", metMs: (5 * 24 * 3600 + 29 * 60 + 59) * 1000 },
  { label: "SOI Exit", metMs: (5 * 24 * 3600 + 18 * 3600 + 53 * 60) * 1000 },
];

export function OrbitMapPanel({ stateVector, moonPosition, metMs, trajectoryHistory }: OrbitMapPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<{ x: number; y: number; brightness: number }[]>([]);
  const rafRef = useRef<number>(0);

  // Initialize stars once
  useEffect(() => {
    if (starsRef.current.length === 0) {
      starsRef.current = Array.from({ length: 200 }, () => ({
        x: Math.random(),
        y: Math.random(),
        brightness: 0.2 + Math.random() * 0.6,
      }));
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Clear
    ctx.fillStyle = "#080c12";
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const star of starsRef.current) {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      ctx.fillRect(star.x * W, star.y * H, 1, 1);
    }

    // Coordinate mapping: Earth at 20% from left, Moon at 80%
    const earthX = W * 0.2;
    const earthY = H * 0.5;
    const moonX = W * 0.8;
    const moonY = H * 0.5;
    const moonDist = 384400;

    // Scale: map moonDist km to the pixel distance between Earth and Moon
    const pixelDist = moonX - earthX;
    const scale = pixelDist / moonDist;

    function toCanvasX(kmX: number): number {
      return earthX + kmX * scale;
    }
    function toCanvasY(kmY: number): number {
      return earthY - kmY * scale; // flip Y (canvas Y is down)
    }

    // Draw trajectory path
    if (REFERENCE_TRAJECTORY.length > 1) {
      // Find the index closest to current MET for the solid/dashed split
      let splitIdx = 0;
      for (let i = 0; i < REFERENCE_TRAJECTORY.length; i++) {
        if (REFERENCE_TRAJECTORY[i].metMs <= metMs) splitIdx = i;
      }

      // Solid path (traveled)
      if (splitIdx > 0) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.moveTo(
          toCanvasX(REFERENCE_TRAJECTORY[0].x),
          toCanvasY(REFERENCE_TRAJECTORY[0].y)
        );
        for (let i = 1; i <= splitIdx; i++) {
          ctx.lineTo(
            toCanvasX(REFERENCE_TRAJECTORY[i].x),
            toCanvasY(REFERENCE_TRAJECTORY[i].y)
          );
        }
        ctx.stroke();
      }

      // Dashed path (future)
      if (splitIdx < REFERENCE_TRAJECTORY.length - 1) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(
          toCanvasX(REFERENCE_TRAJECTORY[splitIdx].x),
          toCanvasY(REFERENCE_TRAJECTORY[splitIdx].y)
        );
        for (let i = splitIdx + 1; i < REFERENCE_TRAJECTORY.length; i++) {
          ctx.lineTo(
            toCanvasX(REFERENCE_TRAJECTORY[i].x),
            toCanvasY(REFERENCE_TRAJECTORY[i].y)
          );
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw Earth
    const earthRadius = Math.max(14, W * 0.035);
    const earthGradient = ctx.createRadialGradient(
      earthX - earthRadius * 0.3, earthY - earthRadius * 0.3, earthRadius * 0.1,
      earthX, earthY, earthRadius
    );
    earthGradient.addColorStop(0, "#4fc3f7");
    earthGradient.addColorStop(0.6, "#0277bd");
    earthGradient.addColorStop(1, "#01579b");

    // Earth glow
    ctx.beginPath();
    ctx.arc(earthX, earthY, earthRadius + 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(79, 195, 247, 0.08)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
    ctx.fillStyle = earthGradient;
    ctx.fill();

    // Earth label
    ctx.fillStyle = "#667788";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Earth", earthX, earthY + earthRadius + 16);

    // Draw Moon
    const moonRadius = Math.max(8, W * 0.02);
    const moonGradient = ctx.createRadialGradient(
      moonX - moonRadius * 0.3, moonY - moonRadius * 0.3, moonRadius * 0.1,
      moonX, moonY, moonRadius
    );
    moonGradient.addColorStop(0, "#e0e0e0");
    moonGradient.addColorStop(0.5, "#9e9e9e");
    moonGradient.addColorStop(1, "#757575");

    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fillStyle = moonGradient;
    ctx.fill();

    // Moon label
    ctx.fillStyle = "#667788";
    ctx.textAlign = "center";
    ctx.fillText("Moon", moonX, moonY + moonRadius + 16);

    // Distance label
    ctx.fillStyle = "rgba(0, 229, 255, 0.3)";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("380,540 km", (earthX + moonX) / 2, earthY - 10);

    // Draw dashed line between Earth and Moon
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0, 229, 255, 0.08)";
    ctx.setLineDash([2, 6]);
    ctx.moveTo(earthX + earthRadius + 4, earthY);
    ctx.lineTo(moonX - moonRadius - 4, moonY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Orion position
    // Use actual state vector if available, otherwise estimate from reference trajectory
    let orionCanvasX: number;
    let orionCanvasY: number;

    if (stateVector) {
      orionCanvasX = toCanvasX(stateVector.position.x);
      orionCanvasY = toCanvasY(stateVector.position.y);
    } else {
      // Estimate from reference trajectory
      let idx = 0;
      for (let i = 0; i < REFERENCE_TRAJECTORY.length - 1; i++) {
        if (REFERENCE_TRAJECTORY[i].metMs <= metMs) idx = i;
      }
      const p = REFERENCE_TRAJECTORY[idx];
      orionCanvasX = toCanvasX(p.x);
      orionCanvasY = toCanvasY(p.y);
    }

    // Orion glow
    const orionGlow = ctx.createRadialGradient(
      orionCanvasX, orionCanvasY, 0,
      orionCanvasX, orionCanvasY, 12
    );
    orionGlow.addColorStop(0, "rgba(0, 255, 136, 0.6)");
    orionGlow.addColorStop(1, "rgba(0, 255, 136, 0)");
    ctx.beginPath();
    ctx.arc(orionCanvasX, orionCanvasY, 12, 0, Math.PI * 2);
    ctx.fillStyle = orionGlow;
    ctx.fill();

    // Orion dot
    ctx.beginPath();
    ctx.arc(orionCanvasX, orionCanvasY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#00ff88";
    ctx.fill();

    // Orion label
    ctx.fillStyle = "#00ff88";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("Orion", orionCanvasX + 10, orionCanvasY - 8);

    // Waypoint labels
    ctx.font = "8px 'JetBrains Mono', monospace";
    for (const wp of WAYPOINTS) {
      // Find closest reference point
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < REFERENCE_TRAJECTORY.length; i++) {
        const d = Math.abs(REFERENCE_TRAJECTORY[i].metMs - wp.metMs);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = i;
        }
      }
      const p = REFERENCE_TRAJECTORY[closestIdx];
      const wpX = toCanvasX(p.x);
      const wpY = toCanvasY(p.y);

      // Small dot
      ctx.beginPath();
      ctx.arc(wpX, wpY, 2, 0, Math.PI * 2);
      ctx.fillStyle = wp.metMs <= metMs ? "rgba(0, 229, 255, 0.6)" : "rgba(0, 229, 255, 0.25)";
      ctx.fill();

      // Label (handle multiline)
      ctx.fillStyle = wp.metMs <= metMs ? "rgba(0, 229, 255, 0.6)" : "rgba(0, 229, 255, 0.25)";
      const lines = wp.label.split("\n");
      lines.forEach((line, li) => {
        ctx.fillText(line, wpX + 6, wpY - 4 + li * 10);
      });
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [stateVector, moonPosition, metMs]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <PanelFrame
      title="Orbit Map"
      headerRight={<span style={{ fontSize: "9px", color: "var(--text-muted)" }}>2D TOP-DOWN VIEW</span>}
    >
      <div ref={containerRef} style={{ height: "280px", borderRadius: "4px", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ display: "block" }} />
      </div>
    </PanelFrame>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/OrbitMapPanel.tsx
git commit -m "feat: add 2D Canvas orbit map with Earth, Moon, trajectory, and Orion"
```

---

### Task 3: Build Verification

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
- Starfield background renders
- Earth (blue gradient, left) and Moon (grey, right) are visible
- Figure-8 trajectory path is drawn
- Orion green dot is positioned along the path
- Waypoint labels appear at correct positions
- Distance label between Earth and Moon shows
- Path behind Orion is solid, ahead is dashed
