"use client";
import { useRef, useEffect, useCallback } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { StateVector, Telemetry } from "@/lib/types";
import { getGroundTrackLabel } from "@/lib/ground-track";

interface OrbitMapPanelProps {
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  metMs: number;
  telemetry: Telemetry | null;
}

interface TrajectoryPoint {
  x: number;
  y: number;
  metMs: number;
}

/** Stored path point in km (J2000 geocentric X, Y). */
interface PathPoint {
  x: number;
  y: number;
}

function generateReferenceTrajectory(): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  // All coordinates in normalized space: Earth at (0,0), Moon at (1,0)
  // Y positive = up on canvas (we flip later)

  const tliMetMs = (25 * 3600 + 8 * 60 + 42) * 1000;
  const lunarSoiMetMs = (4 * 24 * 3600 + 6 * 3600 + 38 * 60) * 1000;
  const exitMetMs = (5 * 24 * 3600 + 18 * 3600 + 53 * 60) * 1000;
  const entryMetMs = (9 * 24 * 3600 + 1 * 3600 + 29 * 60) * 1000;

  // Phase 1: Spiraling Earth orbits (LEO -> HEO) - 2.5 revolutions
  const spiralRevs = 2.5;
  const spiralSteps = 60;
  for (let i = 0; i <= spiralSteps; i++) {
    const t = i / spiralSteps;
    const angle = -Math.PI * 0.5 + t * spiralRevs * Math.PI * 2;
    const r = 0.018 + t * 0.06;
    points.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      metMs: t * tliMetMs,
    });
  }

  // Phase 2: Trans-lunar injection - sweeping arc upward-right to Moon
  const p0 = { x: 0.06, y: 0.04 };
  const cp = { x: 0.45, y: 0.42 };
  const p2 = { x: 0.97, y: 0.05 };
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

  // Phase 3: Lunar flyby - tight loop behind the Moon's far side
  const flybyR = 0.045;
  const flybySteps = 40;
  const flybyStartAngle = -Math.PI * 0.15;
  const flybyEndAngle = Math.PI * 1.15;
  for (let i = 1; i <= flybySteps; i++) {
    const t = i / flybySteps;
    const angle = flybyStartAngle + t * (flybyEndAngle - flybyStartAngle);
    const rx = flybyR * (1 + 0.3 * Math.sin(angle));
    const ry = flybyR;
    points.push({
      x: 1.0 + Math.cos(angle) * rx,
      y: Math.sin(angle) * ry,
      metMs: lunarSoiMetMs + t * (exitMetMs - lunarSoiMetMs),
    });
  }

  // Phase 4: Return coast - sweeping arc below the outbound path back to Earth
  const r0 = points[points.length - 1];
  const rcp = { x: 0.45, y: -0.30 };
  const r2 = { x: 0.0, y: -0.02 };
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

/** Earth-Moon distance in km */
const MOON_DIST_KM = 384400;

/** Maximum number of path-history points to keep. */
const MAX_PATH_POINTS = 500;

/** Format a number with commas: 12345 -> "12,345" */
function fmtKm(km: number): string {
  return Math.round(km).toLocaleString("en-US");
}

export function OrbitMapPanel({ stateVector, moonPosition, metMs, telemetry }: OrbitMapPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Accumulated path history (km coordinates)
  const pathRef = useRef<PathPoint[]>([]);
  // Track last pushed position to avoid duplicates
  const lastPushedRef = useRef<{ x: number; y: number } | null>(null);

  // Push current position into path history when stateVector changes
  if (stateVector && (stateVector.position.x !== 0 || stateVector.position.y !== 0)) {
    const px = stateVector.position.x;
    const py = stateVector.position.y;
    const last = lastPushedRef.current;
    // Only push if position actually changed (avoid duplicates on re-renders)
    if (!last || last.x !== px || last.y !== py) {
      pathRef.current.push({ x: px, y: py });
      if (pathRef.current.length > MAX_PATH_POINTS) {
        pathRef.current = pathRef.current.slice(pathRef.current.length - MAX_PATH_POINTS);
      }
      lastPushedRef.current = { x: px, y: py };
    }
  }

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

    // ---- Fixed-scale layout ----
    // Canvas represents ~450,000 km across horizontally.
    // Earth at left-center, Moon at right-center (384,400 km away).
    const earthPx = { x: w * 0.12, y: h * 0.52 };
    const moonPx = { x: w * 0.88, y: h * 0.52 };
    const trackWidth = moonPx.x - earthPx.x; // pixels between Earth and Moon
    const kmPerPixel = MOON_DIST_KM / trackWidth;
    const pixelsPerKm = trackWidth / MOON_DIST_KM;

    // Helper: km coords (Earth = 0,0) -> canvas pixels.  Y+ = up (flip for canvas)
    function kmToCanvas(xKm: number, yKm: number): { x: number; y: number } {
      return {
        x: earthPx.x + xKm * pixelsPerKm,
        y: earthPx.y - yKm * pixelsPerKm, // flip Y
      };
    }

    // Helper: normalized coords (Earth=0,0  Moon=1,0  Y+=up) -> canvas pixels
    function toCanvas(nx: number, ny: number): { x: number; y: number } {
      return kmToCanvas(nx * MOON_DIST_KM, ny * MOON_DIST_KM);
    }

    // --- Distance label between Earth and Moon ---
    ctx.save();
    ctx.font = "9px monospace";
    ctx.fillStyle = "rgba(100,160,255,0.25)";
    ctx.textAlign = "center";
    const midX = (earthPx.x + moonPx.x) / 2;
    ctx.fillText("384,400 km", midX, earthPx.y + 4);
    ctx.restore();

    // --- FREE-RETURN TRAJECTORY subtitle ---
    ctx.save();
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "rgba(0,220,255,0.35)";
    ctx.textAlign = "center";
    ctx.fillText("FREE-RETURN TRAJECTORY", w / 2, h - 8);
    ctx.restore();

    // --- Reference trajectory ---
    // Find where Orion is on the reference trajectory
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

    // Draw past reference path (solid, cyan)
    if (orionRefIdx > 0) {
      ctx.save();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(0,220,255,0.4)";
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
    let hasLivePosition = false;

    if (stateVector && (stateVector.position.x !== 0 || stateVector.position.y !== 0)) {
      // Use live state vector - position is in km, geocentric
      orionPx = kmToCanvas(stateVector.position.x, stateVector.position.y);
      hasLivePosition = true;
    } else {
      // Estimate from reference trajectory with smooth interpolation
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

    // --- Draw actual traveled path (solid bright green/cyan line) ---
    const path = pathRef.current;
    if (path.length > 1) {
      ctx.save();
      ctx.setLineDash([]);
      ctx.lineWidth = 2;

      // Gradient: starts more cyan, ends bright green
      ctx.strokeStyle = "#00ff88";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // Draw with a subtle glow
      ctx.shadowColor = "rgba(0,255,136,0.3)";
      ctx.shadowBlur = 4;

      ctx.beginPath();
      const p0c = kmToCanvas(path[0].x, path[0].y);
      ctx.moveTo(p0c.x, p0c.y);
      for (let i = 1; i < path.length; i++) {
        const pc = kmToCanvas(path[i].x, path[i].y);
        ctx.lineTo(pc.x, pc.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // --- Distance line from Earth to Orion ---
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = "rgba(0,255,136,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(earthPx.x, earthPx.y);
    ctx.lineTo(orionPx.x, orionPx.y);
    ctx.stroke();
    ctx.restore();

    // Earth distance label along the line
    const earthDistKm = telemetry?.earthDistKm
      ?? (stateVector ? Math.sqrt(
          stateVector.position.x ** 2 +
          stateVector.position.y ** 2 +
          stateVector.position.z ** 2
        ) : null);

    if (earthDistKm != null) {
      const labelFrac = 0.35; // position label 35% along Earth->Orion line
      const lx = earthPx.x + (orionPx.x - earthPx.x) * labelFrac;
      const ly = earthPx.y + (orionPx.y - earthPx.y) * labelFrac;
      const distText = `${fmtKm(earthDistKm)} km`;

      ctx.save();
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "rgba(0,255,136,0.75)";
      ctx.textAlign = "center";
      // Draw with a dark background for readability
      const textW = ctx.measureText(distText).width;
      ctx.fillStyle = "rgba(6,11,20,0.7)";
      ctx.fillRect(lx - textW / 2 - 3, ly - 10, textW + 6, 14);
      ctx.fillStyle = "rgba(0,255,136,0.85)";
      ctx.fillText(distText, lx, ly);
      ctx.restore();
    }

    // --- Moon distance label (near the Moon) ---
    const moonDistKm = telemetry?.moonDistKm ?? null;
    if (moonDistKm != null) {
      const moonDistText = `${fmtKm(moonDistKm)} km`;
      ctx.save();
      ctx.font = "8px monospace";
      ctx.fillStyle = "rgba(180,185,190,0.6)";
      ctx.textAlign = "center";
      ctx.fillText(moonDistText, moonPx.x, moonPx.y - moonR - 6);
      ctx.restore();
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

    // Ground track - show what region Orion is above
    if (hasLivePosition && stateVector) {
      const groundLabel = getGroundTrackLabel(stateVector.position, metMs);
      ctx.save();
      ctx.font = "8px monospace";
      ctx.fillStyle = "rgba(0, 255, 136, 0.5)";
      ctx.textAlign = "left";
      ctx.fillText(groundLabel, orionPx.x + 7, orionPx.y + 4);
      ctx.restore();
    }
  }, [stateVector, moonPosition, metMs, telemetry]);

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

  // Compute accessible ground track description
  const groundLabel =
    stateVector && (stateVector.position.x !== 0 || stateVector.position.y !== 0)
      ? getGroundTrackLabel(stateVector.position, metMs)
      : null;
  const orbitDescription = groundLabel
    ? `Orbit map showing Orion spacecraft ${groundLabel.toLowerCase()}`
    : "Orbit map showing Orion spacecraft on free-return lunar flyby trajectory";

  return (
    <PanelFrame title="Figure-8 Lunar Flyby Trajectory" accentColor="var(--accent-cyan)" headerRight={<span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "1px" }}>2D TOP-DOWN VIEW</span>}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: 320, position: "relative", overflow: "hidden", borderRadius: 4 }}
      >
        <span className="sr-only">{orbitDescription}</span>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>
    </PanelFrame>
  );
}
