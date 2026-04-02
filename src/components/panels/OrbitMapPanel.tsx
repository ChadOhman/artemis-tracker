"use client";
import { useRef, useEffect, useCallback } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { StateVector } from "@/lib/types";
import { getGroundTrackLabel, positionToLatLon } from "@/lib/ground-track";

interface OrbitMapPanelProps {
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  metMs: number;
}

interface TrajectoryPoint {
  x: number;
  y: number;
  metMs: number;
}

function generateReferenceTrajectory(): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  // All coordinates in normalized space: Earth at (0,0), Moon at (1,0)
  // Y positive = up on canvas (we flip later)

  const tliMetMs = (25 * 3600 + 8 * 60 + 42) * 1000;
  const lunarSoiMetMs = (4 * 24 * 3600 + 6 * 3600 + 38 * 60) * 1000;
  const flybyMetMs = (5 * 24 * 3600 + 30 * 60) * 1000;
  const exitMetMs = (5 * 24 * 3600 + 18 * 3600 + 53 * 60) * 1000;
  const entryMetMs = (9 * 24 * 3600 + 1 * 3600 + 29 * 60) * 1000;

  // Phase 1: Spiraling Earth orbits (LEO → HEO) — 2.5 revolutions
  const spiralRevs = 2.5;
  const spiralSteps = 60;
  for (let i = 0; i <= spiralSteps; i++) {
    const t = i / spiralSteps;
    const angle = -Math.PI * 0.5 + t * spiralRevs * Math.PI * 2;
    const r = 0.018 + t * 0.06; // small radius growing outward
    points.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      metMs: t * tliMetMs,
    });
  }

  // Phase 2: Trans-lunar injection — sweeping arc upward-right to Moon
  // Uses a quadratic Bezier: P0 near Earth, P1 control above midpoint, P2 near Moon
  const p0 = { x: 0.06, y: 0.04 }; // departure tangent direction
  const cp = { x: 0.45, y: 0.42 }; // control point — arc peaks well above midline
  const p2 = { x: 0.97, y: 0.05 }; // approach Moon from below-right
  const outboundSteps = 50;
  for (let i = 1; i <= outboundSteps; i++) {
    const t = i / outboundSteps;
    const u = 1 - t;
    const bx = u * u * p0.x + 2 * u * t * cp.x + t * t * p2.x;
    const by = u * u * p0.y + 2 * u * t * cp.y + t * t * p2.y;
    points.push({
      x: bx,
      y: by,
      metMs: tliMetMs + t * (lunarSoiMetMs - tliMetMs),
    });
  }

  // Phase 3: Lunar flyby — tight loop behind the Moon's far side
  // Arc swings behind (positive x past Moon), loops over top, comes back below
  const flybyR = 0.045;
  const flybySteps = 40;
  const flybyStartAngle = -Math.PI * 0.15; // entering from below-left
  const flybyEndAngle = Math.PI * 1.15; // exiting below-right after going behind
  for (let i = 1; i <= flybySteps; i++) {
    const t = i / flybySteps;
    const angle = flybyStartAngle + t * (flybyEndAngle - flybyStartAngle);
    // Slight ellipse — wider behind Moon
    const rx = flybyR * (1 + 0.3 * Math.sin(angle));
    const ry = flybyR;
    points.push({
      x: 1.0 + Math.cos(angle) * rx,
      y: Math.sin(angle) * ry,
      metMs: lunarSoiMetMs + t * (exitMetMs - lunarSoiMetMs),
    });
  }

  // Phase 4: Return coast — sweeping arc below the outbound path back to Earth
  // Bezier: from Moon exit point, arcs downward, curves back to Earth
  const r0 = points[points.length - 1]; // last flyby point
  const rcp = { x: 0.45, y: -0.30 }; // control point — arc dips well below
  const r2 = { x: 0.0, y: -0.02 }; // arrive near Earth from below
  const returnSteps = 50;
  for (let i = 1; i <= returnSteps; i++) {
    const t = i / returnSteps;
    const u = 1 - t;
    const bx = u * u * r0.x + 2 * u * t * rcp.x + t * t * r2.x;
    const by = u * u * r0.y + 2 * u * t * rcp.y + t * t * r2.y;
    points.push({
      x: bx,
      y: by,
      metMs: exitMetMs + t * (entryMetMs - exitMetMs),
    });
  }

  return points;
}

const REFERENCE_TRAJECTORY = generateReferenceTrajectory();

const WAYPOINTS = [
  { label: "TLI", metMs: (25 * 3600 + 8 * 60 + 42) * 1000, align: "center" as const, offsetY: -10 },
  { label: "Closest Approach", metMs: (5 * 24 * 3600 + 30 * 60) * 1000, align: "right" as const, offsetY: -14 },
  { label: "~6,513 km", metMs: (5 * 24 * 3600 + 30 * 60) * 1000, align: "right" as const, offsetY: -4 },
];

function generateStars(count: number): { x: number; y: number; r: number; a: number }[] {
  const stars: { x: number; y: number; r: number; a: number }[] = [];
  // Simple seeded PRNG (mulberry32) for deterministic but random-looking stars
  let seed = 42;
  function rand(): number {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(),
      y: rand(),
      r: 0.3 + rand() * 0.7,
      a: 0.15 + rand() * 0.45,
    });
  }
  return stars;
}

const STARS = generateStars(200);

export function OrbitMapPanel({ stateVector, moonPosition, metMs }: OrbitMapPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#060b14";
    ctx.fillRect(0, 0, w, h);

    // Starfield
    for (const star of STARS) {
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${star.a})`;
      ctx.fill();
    }

    // Horizontal layout: Earth on left, Moon on right, both centered vertically
    const earthPx = { x: w * 0.18, y: h * 0.52 };
    const moonPx = { x: w * 0.82, y: h * 0.52 };
    const scaleX = moonPx.x - earthPx.x; // pixels per normalized unit along X
    const scaleY = scaleX; // same scale for Y to preserve aspect ratio

    // Helper: normalized coords (Earth=0,0  Moon=1,0  Y+ = up) → canvas pixels
    function toCanvas(nx: number, ny: number): { x: number; y: number } {
      return {
        x: earthPx.x + nx * scaleX,
        y: earthPx.y - ny * scaleY, // flip Y: positive = up on screen
      };
    }

    // Distance label (centered between Earth and Moon, no connecting line)
    ctx.save();
    ctx.font = "9px monospace";
    ctx.fillStyle = "rgba(100,160,255,0.25)";
    ctx.textAlign = "center";
    const midX = (earthPx.x + moonPx.x) / 2;
    ctx.fillText("379,050 km", midX, earthPx.y + 4);
    ctx.restore();

    // --- FREE-RETURN TRAJECTORY subtitle ---
    ctx.save();
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "rgba(0,220,255,0.35)";
    ctx.textAlign = "center";
    ctx.fillText("FREE-RETURN TRAJECTORY", w / 2, h - 8);
    ctx.restore();

    // --- Reference trajectory ---
    // Find where Orion is on the trajectory
    let orionRefIdx = 0;
    for (let i = 0; i < REFERENCE_TRAJECTORY.length; i++) {
      if (REFERENCE_TRAJECTORY[i].metMs <= metMs) {
        orionRefIdx = i;
      }
    }

    // Draw future path (dashed, faint)
    if (orionRefIdx < REFERENCE_TRAJECTORY.length - 1) {
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "rgba(0,220,255,0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const startFuture = REFERENCE_TRAJECTORY[orionRefIdx];
      const sf = toCanvas(startFuture.x, startFuture.y);
      ctx.moveTo(sf.x, sf.y);
      for (let i = orionRefIdx + 1; i < REFERENCE_TRAJECTORY.length; i++) {
        const p = toCanvas(REFERENCE_TRAJECTORY[i].x, REFERENCE_TRAJECTORY[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw past path (solid, cyan)
    if (orionRefIdx > 0) {
      ctx.save();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(0,220,255,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const first = toCanvas(REFERENCE_TRAJECTORY[0].x, REFERENCE_TRAJECTORY[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i <= orionRefIdx; i++) {
        const p = toCanvas(REFERENCE_TRAJECTORY[i].x, REFERENCE_TRAJECTORY[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // --- Waypoint labels ---
    const drawnDots = new Set<number>();
    for (const wp of WAYPOINTS) {
      let nearest = REFERENCE_TRAJECTORY[0];
      let minDiff = Infinity;
      for (const pt of REFERENCE_TRAJECTORY) {
        const diff = Math.abs(pt.metMs - wp.metMs);
        if (diff < minDiff) {
          minDiff = diff;
          nearest = pt;
        }
      }
      const passed = metMs >= wp.metMs;
      const p = toCanvas(nearest.x, nearest.y);

      // Only draw dot once per metMs
      if (!drawnDots.has(wp.metMs)) {
        drawnDots.add(wp.metMs);
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = passed ? "rgba(0,220,255,0.9)" : "rgba(0,220,255,0.35)";
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.font = "9px monospace";
      ctx.fillStyle = passed ? "rgba(255,213,79,0.9)" : "rgba(255,213,79,0.4)";
      ctx.textAlign = wp.align || "center";
      const labelX = wp.align === "right" ? p.x + 8 : p.x;
      ctx.fillText(wp.label, labelX, p.y + (wp.offsetY || -8));
      ctx.restore();
    }

    // --- Earth ---
    const earthR = Math.max(12, Math.min(w, h) * 0.06);
    const earthGrad = ctx.createRadialGradient(
      earthPx.x - earthR * 0.3, earthPx.y - earthR * 0.3, 0,
      earthPx.x, earthPx.y, earthR
    );
    earthGrad.addColorStop(0, "#6ab4ff");
    earthGrad.addColorStop(0.5, "#1a6bb5");
    earthGrad.addColorStop(1, "#0a2a50");

    // Glow
    ctx.save();
    const earthGlow = ctx.createRadialGradient(earthPx.x, earthPx.y, earthR * 0.8, earthPx.x, earthPx.y, earthR * 2.2);
    earthGlow.addColorStop(0, "rgba(30,100,200,0.18)");
    earthGlow.addColorStop(1, "rgba(30,100,200,0)");
    ctx.beginPath();
    ctx.arc(earthPx.x, earthPx.y, earthR * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = earthGlow;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(earthPx.x, earthPx.y, earthR, 0, Math.PI * 2);
    ctx.fillStyle = earthGrad;
    ctx.fill();
    ctx.restore();

    // Earth label
    ctx.save();
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "rgba(100,180,255,0.85)";
    ctx.textAlign = "center";
    ctx.fillText("Earth", earthPx.x, earthPx.y + earthR + 13);
    ctx.restore();

    // --- Moon ---
    const moonR = Math.max(6, Math.min(w, h) * 0.03);
    const moonGrad = ctx.createRadialGradient(
      moonPx.x - moonR * 0.25, moonPx.y - moonR * 0.25, 0,
      moonPx.x, moonPx.y, moonR
    );
    moonGrad.addColorStop(0, "#d0d4d8");
    moonGrad.addColorStop(0.6, "#8a8e92");
    moonGrad.addColorStop(1, "#3a3e42");

    ctx.save();
    ctx.beginPath();
    ctx.arc(moonPx.x, moonPx.y, moonR, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();
    ctx.restore();

    // Moon label
    ctx.save();
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "rgba(180,185,190,0.85)";
    ctx.textAlign = "center";
    ctx.fillText("Moon", moonPx.x, moonPx.y + moonR + 13);
    ctx.restore();

    // --- Orion position ---
    let orionPx: { x: number; y: number };

    if (stateVector && (stateVector.position.x !== 0 || stateVector.position.y !== 0)) {
      // Use live state vector — convert km to normalized coords
      const moonDistKm = 384400;
      orionPx = toCanvas(stateVector.position.x / moonDistKm, stateVector.position.y / moonDistKm);
    } else {
      // Estimate from reference trajectory with smooth interpolation
      // Find the two nearest reference points bracketing current metMs
      let idxA = 0;
      for (let i = 0; i < REFERENCE_TRAJECTORY.length; i++) {
        if (REFERENCE_TRAJECTORY[i].metMs <= metMs) {
          idxA = i;
        }
      }
      let refPt = REFERENCE_TRAJECTORY[idxA];
      if (idxA < REFERENCE_TRAJECTORY.length - 1) {
        const a = REFERENCE_TRAJECTORY[idxA];
        const b = REFERENCE_TRAJECTORY[idxA + 1];
        const span = b.metMs - a.metMs;
        if (span > 0) {
          const t = Math.max(0, Math.min(1, (metMs - a.metMs) / span));
          refPt = {
            x: a.x + t * (b.x - a.x),
            y: a.y + t * (b.y - a.y),
            metMs,
          };
        }
      }
      orionPx = toCanvas(refPt.x, refPt.y);
    }

    // Orion glow
    ctx.save();
    const orionGlow = ctx.createRadialGradient(orionPx.x, orionPx.y, 0, orionPx.x, orionPx.y, 14);
    orionGlow.addColorStop(0, "rgba(0,255,136,0.55)");
    orionGlow.addColorStop(1, "rgba(0,255,136,0)");
    ctx.beginPath();
    ctx.arc(orionPx.x, orionPx.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = orionGlow;
    ctx.fill();
    ctx.restore();

    // Orion dot
    ctx.save();
    ctx.beginPath();
    ctx.arc(orionPx.x, orionPx.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#00ff88";
    ctx.fill();
    ctx.restore();

    // Orion label
    ctx.save();
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#00ff88";
    ctx.textAlign = "left";
    ctx.fillText("Orion", orionPx.x + 7, orionPx.y - 8);
    ctx.restore();

    // Ground track — show what region Orion is above
    if (stateVector && (stateVector.position.x !== 0 || stateVector.position.y !== 0)) {
      const groundLabel = getGroundTrackLabel(stateVector.position, metMs);
      ctx.save();
      ctx.font = "8px monospace";
      ctx.fillStyle = "rgba(0, 255, 136, 0.5)";
      ctx.textAlign = "left";
      ctx.fillText(groundLabel, orionPx.x + 7, orionPx.y + 4);
      ctx.restore();

    }
  }, [stateVector, moonPosition, metMs]);

  // Animation loop
  useEffect(() => {
    let alive = true;

    function loop() {
      if (!alive) return;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      alive = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      draw();
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, [draw]);

  return (
    <PanelFrame title="Figure-8 Lunar Flyby Trajectory" accentColor="var(--accent-cyan)" headerRight={<span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "1px" }}>2D TOP-DOWN VIEW</span>}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: 320, position: "relative", overflow: "hidden", borderRadius: 4 }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>
    </PanelFrame>
  );
}
