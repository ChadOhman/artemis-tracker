"use client";
import { useRef, useEffect, useCallback } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { StateVector } from "@/lib/types";

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
  const moonDist = 384400;
  const tliMetMs = (25 * 3600 + 8 * 60 + 42) * 1000;
  const lunarSoiMetMs = (4 * 24 * 3600 + 6 * 3600 + 38 * 60) * 1000;
  const flybyMetMs = (5 * 24 * 3600 + 30 * 60) * 1000;
  const exitMetMs = (5 * 24 * 3600 + 18 * 3600 + 53 * 60) * 1000;
  const entryMetMs = (9 * 24 * 3600 + 1 * 3600 + 29 * 60) * 1000;

  // Phase 1: Earth orbit spiral
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const angle = t * Math.PI * 2;
    const r = 6571 + t * 50000;
    points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r, metMs: t * tliMetMs });
  }

  // Phase 2: Trans-lunar coast (curve upward)
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    const x = 50000 + t * (moonDist - 50000);
    const y = Math.sin(t * Math.PI * 0.3) * 30000;
    points.push({ x, y, metMs: tliMetMs + t * (lunarSoiMetMs - tliMetMs) });
  }

  // Phase 3: Lunar flyby (arc behind Moon)
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const angle = -Math.PI * 0.3 + t * Math.PI * 0.8;
    const r = 6513 + Math.sin(t * Math.PI) * 5000;
    points.push({ x: moonDist + Math.cos(angle) * r, y: Math.sin(angle) * r, metMs: lunarSoiMetMs + t * (flybyMetMs - lunarSoiMetMs) });
  }

  // Phase 4: Return coast (curve below outbound)
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    const x = moonDist * (1 - t);
    const y = -Math.sin(t * Math.PI * 0.4) * 40000;
    points.push({ x, y, metMs: exitMetMs + t * (entryMetMs - exitMetMs) });
  }

  return points;
}

const REFERENCE_TRAJECTORY = generateReferenceTrajectory();

const WAYPOINTS = [
  { label: "TLI", metMs: (25 * 3600 + 8 * 60 + 42) * 1000 },
  { label: "Lunar SOI", metMs: (4 * 24 * 3600 + 6 * 3600 + 38 * 60) * 1000 },
  { label: "Closest ~6,513 km", metMs: (5 * 24 * 3600 + 30 * 60) * 1000 },
  { label: "SOI Exit", metMs: (5 * 24 * 3600 + 18 * 3600 + 53 * 60) * 1000 },
];

function generateStars(count: number): { x: number; y: number; r: number; a: number }[] {
  const stars: { x: number; y: number; r: number; a: number }[] = [];
  // Use a seeded-like approach by cycling through fixed values
  for (let i = 0; i < count; i++) {
    const frac1 = (i * 0.6180339887) % 1;
    const frac2 = (i * 0.3819660112) % 1;
    stars.push({
      x: frac1,
      y: frac2,
      r: 0.4 + (i % 3) * 0.3,
      a: 0.3 + (i % 5) * 0.14,
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

    // Coordinate system: Earth at 20% from left, vertically centered
    const earthPx = { x: w * 0.2, y: h * 0.5 };
    const moonPx = { x: w * 0.8, y: h * 0.5 };
    const moonDist = 384400; // km
    const scale = (moonPx.x - earthPx.x) / moonDist; // px per km

    // Helper: km coords (Earth-centered, Y up) -> canvas pixels
    function toCanvas(xKm: number, yKm: number): { x: number; y: number } {
      return {
        x: earthPx.x + xKm * scale,
        y: earthPx.y - yKm * scale, // flip Y
      };
    }

    // --- Dashed line Earth-Moon ---
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(100,160,255,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(earthPx.x, earthPx.y);
    ctx.lineTo(moonPx.x, moonPx.y);
    ctx.stroke();
    ctx.restore();

    // Distance label
    ctx.save();
    ctx.font = "9px monospace";
    ctx.fillStyle = "rgba(100,160,255,0.5)";
    ctx.textAlign = "center";
    ctx.fillText("380,540 km", (earthPx.x + moonPx.x) / 2, earthPx.y - 8);
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
      ctx.strokeStyle = "rgba(0,220,255,0.18)";
      ctx.lineWidth = 1.5;
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
      ctx.strokeStyle = "rgba(0,220,255,0.7)";
      ctx.lineWidth = 1.5;
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
    for (const wp of WAYPOINTS) {
      // Find the trajectory point nearest this waypoint's metMs
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

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = passed ? "rgba(0,220,255,0.9)" : "rgba(0,220,255,0.35)";
      ctx.fill();

      ctx.font = "8px monospace";
      ctx.fillStyle = passed ? "rgba(0,220,255,0.85)" : "rgba(0,220,255,0.3)";
      ctx.textAlign = "center";
      ctx.fillText(wp.label, p.x, p.y - 6);
      ctx.restore();
    }

    // --- Earth ---
    const earthR = Math.max(10, Math.min(w, h) * 0.055);
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
      // Use live state vector
      orionPx = toCanvas(stateVector.position.x, stateVector.position.y);
    } else {
      // Estimate from reference trajectory
      let refPt = REFERENCE_TRAJECTORY[orionRefIdx];
      // Interpolate between points if possible
      if (orionRefIdx < REFERENCE_TRAJECTORY.length - 1) {
        const a = REFERENCE_TRAJECTORY[orionRefIdx];
        const b = REFERENCE_TRAJECTORY[orionRefIdx + 1];
        const span = b.metMs - a.metMs;
        if (span > 0) {
          const t = (metMs - a.metMs) / span;
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
    ctx.fillText("Orion", orionPx.x + 7, orionPx.y - 5);
    ctx.restore();
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
    <PanelFrame title="Orbital Map" icon="🛸" accentColor="var(--accent-cyan)">
      <div
        ref={containerRef}
        style={{ width: "100%", height: 240, position: "relative", overflow: "hidden", borderRadius: 4 }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>
    </PanelFrame>
  );
}
