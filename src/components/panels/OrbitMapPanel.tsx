"use client";
import { useRef, useEffect, useCallback, useState } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { StateVector, Telemetry } from "@/lib/types";
import { getGroundTrackLabel } from "@/lib/ground-track";
import { useLocale } from "@/context/LocaleContext";

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
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const insetRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [showInset, setShowInset] = useState(false);

  // Store translated inset labels in a ref for use inside the draw callback
  const insetLabelsRef = useRef({ moonDetail: "MOON DETAIL", kmView: "km view" });
  insetLabelsRef.current = {
    moonDetail: t("orbitMap.moonDetail").toUpperCase(),
    kmView: t("orbitMap.kmView"),
  };

  // Auto-enable inset during lunar approach (within 100,000 km of Moon)
  useEffect(() => {
    if (telemetry && telemetry.moonDistKm < 100000) {
      setShowInset(true);
    }
  }, [telemetry?.moonDistKm != null && telemetry.moonDistKm < 100000]);


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
    ctx.fillStyle = "rgba(0,220,255,0.55)";
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

    // Determine how far along the trajectory Orion actually is (by distance)
    const earthDist = telemetry?.earthDistKm ?? 0;
    const distFrac = earthDist / MOON_DIST_KM;
    let distIdx = 0;
    for (let i = 0; i < REFERENCE_TRAJECTORY.length; i++) {
      if (REFERENCE_TRAJECTORY[i].x <= distFrac) {
        distIdx = i;
      }
    }
    const splitIdx = Math.max(distIdx, orionRefIdx);

    // Draw past path (solid, cyan) — up to Orion's actual position
    let lastPastPt: { x: number; y: number } | null = null;
    if (splitIdx > 0) {
      ctx.save();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(0,220,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const first = toCanvas(REFERENCE_TRAJECTORY[0].x, REFERENCE_TRAJECTORY[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i <= Math.min(splitIdx, REFERENCE_TRAJECTORY.length - 1); i++) {
        const p = toCanvas(REFERENCE_TRAJECTORY[i].x, REFERENCE_TRAJECTORY[i].y);
        ctx.lineTo(p.x, p.y);
        lastPastPt = p;
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw future path (dashed, faint) — from Orion's position onward
    if (splitIdx < REFERENCE_TRAJECTORY.length - 1) {
      ctx.save();
      ctx.setLineDash([8, 12]);
      ctx.strokeStyle = "rgba(0,220,255,0.18)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const sf = toCanvas(REFERENCE_TRAJECTORY[splitIdx].x, REFERENCE_TRAJECTORY[splitIdx].y);
      ctx.moveTo(sf.x, sf.y);
      for (let i = splitIdx + 1; i < REFERENCE_TRAJECTORY.length; i++) {
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
        ctx.fillStyle = passed ? "rgba(0,220,255,0.9)" : "rgba(0,220,255,0.55)";
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.font = "9px monospace";
      ctx.fillStyle = passed ? "rgba(255,213,79,0.9)" : "rgba(255,213,79,0.65)";
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

    // --- Day/Night terminator ---
    // Sun direction determines which half of Earth is lit.
    // Approximate: sun longitude moves ~15°/hour, at equinox the terminator is a vertical line.
    const utcNow = Date.now();
    const hourOfDay = ((utcNow % 86400000) / 3600000); // 0-24
    // Sun is at local noon at longitude = (12 - hourOfDay) * 15 degrees
    // Terminator angle relative to Earth on our map (viewed from above ecliptic pole)
    const sunAngle = ((12 - hourOfDay) * 15 - 90) * Math.PI / 180;

    ctx.save();
    ctx.beginPath();
    // Draw a half-circle on the night side
    ctx.arc(earthPx.x, earthPx.y, earthR + 1, sunAngle, sunAngle + Math.PI);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();
    ctx.restore();

    // --- Lunar gravity contours ---
    // Draw concentric rings around the Moon showing gravitational influence.
    // Lunar Hill sphere ≈ 61,500 km — the region where Moon's gravity dominates.
    const LUNAR_HILL_SPHERE_KM = 61500;
    const hillPx = LUNAR_HILL_SPHERE_KM * pixelsPerKm;

    // Gravity contour rings at various distances (km from Moon center)
    const gravityRings = [
      { radiusKm: 10000, opacity: 0.12, label: "" },
      { radiusKm: 20000, opacity: 0.09, label: "" },
      { radiusKm: 35000, opacity: 0.06, label: "" },
      { radiusKm: LUNAR_HILL_SPHERE_KM, opacity: 0.10, label: "Hill Sphere" },
    ];

    for (const ring of gravityRings) {
      const rPx = ring.radiusKm * pixelsPerKm;
      if (rPx < 3) continue; // too small to render

      ctx.save();
      ctx.beginPath();
      ctx.arc(moonPx.x, moonPx.y, rPx, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180, 190, 210, ${ring.opacity})`;
      ctx.lineWidth = ring.radiusKm === LUNAR_HILL_SPHERE_KM ? 1.2 : 0.6;
      if (ring.radiusKm === LUNAR_HILL_SPHERE_KM) {
        ctx.setLineDash([4, 6]);
      }
      ctx.stroke();
      ctx.restore();

      // Label for Hill sphere
      if (ring.label && rPx > 20) {
        ctx.save();
        ctx.font = "7px monospace";
        ctx.fillStyle = `rgba(180, 190, 210, 0.35)`;
        ctx.textAlign = "center";
        ctx.fillText(ring.label, moonPx.x, moonPx.y - rPx - 3);
        ctx.restore();
      }
    }

    // Subtle radial gradient showing gravity well
    ctx.save();
    const gravGrad = ctx.createRadialGradient(
      moonPx.x, moonPx.y, 0,
      moonPx.x, moonPx.y, hillPx
    );
    gravGrad.addColorStop(0, "rgba(140, 160, 200, 0.06)");
    gravGrad.addColorStop(0.3, "rgba(140, 160, 200, 0.03)");
    gravGrad.addColorStop(1, "rgba(140, 160, 200, 0)");
    ctx.beginPath();
    ctx.arc(moonPx.x, moonPx.y, hillPx, 0, Math.PI * 2);
    ctx.fillStyle = gravGrad;
    ctx.fill();
    ctx.restore();

    // Also show Earth's gravity influence as a subtle gradient
    ctx.save();
    const earthGravR = w * 0.35; // visual representation, not to scale
    const earthGravGrad = ctx.createRadialGradient(
      earthPx.x, earthPx.y, 0,
      earthPx.x, earthPx.y, earthGravR
    );
    earthGravGrad.addColorStop(0, "rgba(80, 140, 255, 0.04)");
    earthGravGrad.addColorStop(0.5, "rgba(80, 140, 255, 0.015)");
    earthGravGrad.addColorStop(1, "rgba(80, 140, 255, 0)");
    ctx.beginPath();
    ctx.arc(earthPx.x, earthPx.y, earthGravR, 0, Math.PI * 2);
    ctx.fillStyle = earthGravGrad;
    ctx.fill();
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

    // --- Splashdown zone (Pacific, off Baja California) ---
    // Only show during return phase (after lunar flyby, ~MET 5+ days)
    if (metMs > 5 * 24 * 3600 * 1000) {
      // Splashdown coordinates: approximately 25°N, 120°W
      // On our map, Earth is at left. The splashdown zone is relative to Earth.
      // We can show it as a small marker near Earth with a label.
      const splashAngle = Math.PI * 0.8; // position it below-left of Earth
      const splashDist = earthR * 1.8;
      const splashX = earthPx.x + Math.cos(splashAngle) * splashDist;
      const splashY = earthPx.y + Math.sin(splashAngle) * splashDist;

      // Target zone circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(splashX, splashY, 5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,140,0,0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.restore();

      // Crosshair
      ctx.save();
      ctx.strokeStyle = "rgba(255,140,0,0.4)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(splashX - 8, splashY);
      ctx.lineTo(splashX + 8, splashY);
      ctx.moveTo(splashX, splashY - 8);
      ctx.lineTo(splashX, splashY + 8);
      ctx.stroke();
      ctx.restore();

      // Label
      ctx.save();
      ctx.font = "7px monospace";
      ctx.fillStyle = "rgba(255,140,0,0.6)";
      ctx.textAlign = "center";
      ctx.fillText("SPLASHDOWN", splashX, splashY + 12);
      ctx.fillText("ZONE", splashX, splashY + 20);
      ctx.restore();
    }

    // --- Orion position ---
    // Use Earth distance from telemetry to place Orion along the reference trajectory
    // at the correct fractional distance, rather than interpolating by MET alone.
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

    // Place Orion on the reference trajectory curve at the distance-matched position.
    // Find the two reference points that bracket the actual distance fraction,
    // then interpolate Y to keep Orion exactly on the drawn curve.
    let orionPx: { x: number; y: number };
    if (telemetry?.earthDistKm != null) {
      const frac = telemetry.earthDistKm / MOON_DIST_KM;

      // Find the segment on the OUTBOUND arc where x brackets frac
      // (outbound only — x increases monotonically on the first half)
      let matchA = REFERENCE_TRAJECTORY[0];
      let matchB = REFERENCE_TRAJECTORY[1];
      const isOutbound = metMs < 5 * 24 * 3600 * 1000; // before closest approach

      if (isOutbound) {
        // Search outbound half (first ~60% of trajectory points)
        const midIdx = Math.floor(REFERENCE_TRAJECTORY.length * 0.55);
        for (let i = 0; i < midIdx - 1; i++) {
          if (REFERENCE_TRAJECTORY[i].x <= frac && REFERENCE_TRAJECTORY[i + 1].x >= frac) {
            matchA = REFERENCE_TRAJECTORY[i];
            matchB = REFERENCE_TRAJECTORY[i + 1];
            break;
          }
        }
      } else {
        // Search return half (last ~45% of trajectory points, x decreases)
        const midIdx = Math.floor(REFERENCE_TRAJECTORY.length * 0.55);
        for (let i = REFERENCE_TRAJECTORY.length - 2; i >= midIdx; i--) {
          if (REFERENCE_TRAJECTORY[i].x <= frac && REFERENCE_TRAJECTORY[i + 1].x >= frac) {
            matchA = REFERENCE_TRAJECTORY[i + 1];
            matchB = REFERENCE_TRAJECTORY[i];
            break;
          }
          if (REFERENCE_TRAJECTORY[i].x >= frac && REFERENCE_TRAJECTORY[i + 1].x <= frac) {
            matchA = REFERENCE_TRAJECTORY[i];
            matchB = REFERENCE_TRAJECTORY[i + 1];
            break;
          }
        }
      }

      // Interpolate Y between the two bracketing points
      const dx = matchB.x - matchA.x;
      const t = dx !== 0 ? (frac - matchA.x) / dx : 0;
      const interpY = matchA.y + t * (matchB.y - matchA.y);
      orionPx = toCanvas(frac, interpY);
    } else {
      orionPx = toCanvas(refPt.x, refPt.y);
    }

    // Connect past path to Orion's actual position
    if (lastPastPt) {
      ctx.save();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(0,220,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lastPastPt.x, lastPastPt.y);
      ctx.lineTo(orionPx.x, orionPx.y);
      ctx.stroke();
      ctx.restore();
    }

    // --- Earth distance label near Orion ---
    const earthDistKm = telemetry?.earthDistKm ?? null;
    if (earthDistKm != null) {
      const distText = `${fmtKm(earthDistKm)} km`;
      ctx.save();
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      const textW = ctx.measureText(distText).width;
      ctx.fillStyle = "rgba(6,11,20,0.7)";
      ctx.fillRect(orionPx.x - textW / 2 - 3, orionPx.y + 18, textW + 6, 14);
      ctx.fillStyle = "rgba(0,255,136,0.85)";
      ctx.fillText(distText, orionPx.x, orionPx.y + 28);
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

    // --- Moon detail inset ---
    const inset = insetRef.current;
    if (showInset && inset && telemetry) {
      const iw = inset.clientWidth;
      const ih = inset.clientHeight;
      if (iw > 0 && ih > 0) {
        // Only resize the backing buffer. Leave inline CSS alone (clamp sizing).
        if (inset.width !== iw * dpr || inset.height !== ih * dpr) {
          inset.width = iw * dpr;
          inset.height = ih * dpr;
        }
        const ictx = inset.getContext("2d");
        if (ictx) {
          ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ictx.clearRect(0, 0, iw, ih);

          // Background
          ictx.fillStyle = "#060b14";
          ictx.fillRect(0, 0, iw, ih);

          // Zoom parameters: viewport spans ~60,000 km centered on the Moon
          const viewKm = 60000;
          const moonCx = iw / 2;
          const moonCy = ih / 2;
          const insetPxPerKm = Math.min(iw, ih) / viewKm;

          // Gravity rings (Moon-centered, reusing LUNAR_HILL_SPHERE_KM)
          const innerRings = [2000, 5000, 8000];
          for (const rKm of innerRings) {
            const rPx = rKm * insetPxPerKm;
            if (rPx < 2 || rPx > Math.max(iw, ih)) continue;
            ictx.save();
            ictx.beginPath();
            ictx.arc(moonCx, moonCy, rPx, 0, Math.PI * 2);
            ictx.strokeStyle = "rgba(180, 190, 210, 0.15)";
            ictx.lineWidth = 0.5;
            ictx.stroke();
            ictx.restore();
          }

          // Orion position in inset-local frame
          // Real Moon-to-Orion vector = Orion position - Moon position
          // moonDistKm is the magnitude. For the inset, we project the 2D
          // displacement onto the viewport. We use X as "along Earth-Moon line"
          // and Y as perpendicular, matching the main view orientation.
          const moonDistKm = telemetry.moonDistKm;
          // Estimate Orion's X offset from Moon using Earth distance fraction
          // At closest approach, Orion is "behind" the Moon from Earth's view.
          // Simple projection: Orion's X relative to Moon = -(moonDistKm * cos(angle))
          // where angle ~= time since/until closest approach.
          // For simplicity, place Orion on a circle at moonDistKm around Moon,
          // with angle based on MET relative to closest approach (MET ~5d 00:31).
          const CLOSEST_APPROACH_MS = (5 * 24 * 3600 + 0 * 3600 + 31 * 60) * 1000;
          const hoursToCa = (metMs - CLOSEST_APPROACH_MS) / 3600000;
          // Angle sweeps from ~-135° (approaching) through 0° (closest) to ~+135° (departing)
          const approachAngle = Math.max(-2.5, Math.min(2.5, hoursToCa * 0.15));
          const orionRelX = moonDistKm * Math.cos(approachAngle);
          const orionRelY = moonDistKm * Math.sin(approachAngle);
          const orionIx = moonCx + orionRelX * insetPxPerKm;
          const orionIy = moonCy + orionRelY * insetPxPerKm;

          // Flyby trajectory curve (parametric arc across approach phase)
          ictx.save();
          ictx.setLineDash([]);
          ictx.strokeStyle = "rgba(0,220,255,0.35)";
          ictx.lineWidth = 1.2;
          ictx.beginPath();
          const steps = 60;
          // Assume roughly constant distance on the flyby (hyperbolic arc)
          const caDistKm = 6513; // closest approach from NASA
          for (let i = 0; i <= steps; i++) {
            const ang = -2.5 + (5.0 * i / steps);
            // Hyperbolic-ish: distance increases as we move away from CA
            const d = caDistKm + Math.abs(ang) * 2500;
            const px = moonCx + d * Math.cos(ang) * insetPxPerKm;
            const py = moonCy + d * Math.sin(ang) * insetPxPerKm;
            if (i === 0) ictx.moveTo(px, py);
            else ictx.lineTo(px, py);
          }
          ictx.stroke();
          ictx.restore();

          // Moon
          const moonR = Math.max(12, Math.min(iw, ih) * 0.14);
          const mGrad = ictx.createRadialGradient(
            moonCx - moonR * 0.3, moonCy - moonR * 0.3, 0,
            moonCx, moonCy, moonR
          );
          mGrad.addColorStop(0, "#e8ecef");
          mGrad.addColorStop(0.6, "#9aa0a4");
          mGrad.addColorStop(1, "#3a3e42");
          ictx.save();
          ictx.beginPath();
          ictx.arc(moonCx, moonCy, moonR, 0, Math.PI * 2);
          ictx.fillStyle = mGrad;
          ictx.fill();
          // Surface craters for texture
          ictx.fillStyle = "rgba(0,0,0,0.2)";
          ictx.beginPath();
          ictx.arc(moonCx - moonR * 0.3, moonCy - moonR * 0.2, moonR * 0.12, 0, Math.PI * 2);
          ictx.fill();
          ictx.beginPath();
          ictx.arc(moonCx + moonR * 0.2, moonCy + moonR * 0.3, moonR * 0.08, 0, Math.PI * 2);
          ictx.fill();
          ictx.restore();

          // Moon label
          ictx.save();
          ictx.font = "bold 9px monospace";
          ictx.fillStyle = "rgba(180,185,190,0.9)";
          ictx.textAlign = "center";
          ictx.fillText("Moon", moonCx, moonCy + moonR + 11);
          ictx.restore();

          // Orion dot in inset
          if (orionIx > 0 && orionIx < iw && orionIy > 0 && orionIy < ih) {
            ictx.save();
            const glow = ictx.createRadialGradient(orionIx, orionIy, 0, orionIx, orionIy, 10);
            glow.addColorStop(0, "rgba(0,255,136,0.55)");
            glow.addColorStop(1, "rgba(0,255,136,0)");
            ictx.beginPath();
            ictx.arc(orionIx, orionIy, 10, 0, Math.PI * 2);
            ictx.fillStyle = glow;
            ictx.fill();
            ictx.beginPath();
            ictx.arc(orionIx, orionIy, 3.5, 0, Math.PI * 2);
            ictx.fillStyle = "#00ff88";
            ictx.fill();
            // Label + distance
            ictx.font = "bold 8px monospace";
            ictx.fillStyle = "#00ff88";
            ictx.textAlign = "left";
            ictx.fillText("Orion", orionIx + 6, orionIy - 6);
            ictx.font = "7px monospace";
            ictx.fillStyle = "rgba(0,255,136,0.7)";
            ictx.fillText(`${Math.round(moonDistKm).toLocaleString()} km`, orionIx + 6, orionIy + 5);
            ictx.restore();
          }

          // Inset title
          ictx.save();
          ictx.font = "bold 8px monospace";
          ictx.fillStyle = "rgba(0,229,255,0.7)";
          ictx.textAlign = "left";
          ictx.fillText(insetLabelsRef.current.moonDetail, 8, 12);
          ictx.font = "7px monospace";
          ictx.fillStyle = "rgba(160,184,207,0.6)";
          ictx.fillText(`${viewKm.toLocaleString()} ${insetLabelsRef.current.kmView}`, 8, 22);
          ictx.restore();
        }
      }
    }
  }, [stateVector, moonPosition, metMs, telemetry, showInset]);

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
  const orbitDescription = [
    "Lunar flyby trajectory map.",
    telemetry ? `Orion is ${Math.round(telemetry.earthDistKm).toLocaleString()} km from Earth` : "",
    telemetry ? `and ${Math.round(telemetry.moonDistKm).toLocaleString()} km from the Moon.` : "",
    groundLabel || "",
    metMs < 5 * 24 * 3600 * 1000 ? "Outbound trajectory." : "Return trajectory.",
  ].filter(Boolean).join(" ");

  return (
    <PanelFrame title={t("orbitMap.title")} accentColor="var(--accent-cyan)" headerRight={<span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "1px" }}>{t("orbitMap.topDown").toUpperCase()}</span>}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "min(320px, 50vw)", position: "relative", overflow: "hidden", borderRadius: 4 }}
      >
        <span className="sr-only">{orbitDescription}</span>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ display: "block", width: "100%", height: "100%" }}
        />

        {/* Moon detail toggle button */}
        <button
          onClick={() => setShowInset((v) => !v)}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "4px 10px",
            background: showInset ? "rgba(0,229,255,0.15)" : "rgba(6,11,20,0.8)",
            border: "1px solid rgba(0,229,255,0.3)",
            borderRadius: 4,
            color: "var(--accent-cyan)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
          }}
          aria-label={showInset ? "Hide Moon detail" : "Show Moon detail"}
        >
          🌙 {showInset ? "✕" : t("orbitMap.zoom")}
        </button>

        {/* Moon detail inset canvas — always mounted so dimensions are valid */}
        <canvas
          ref={insetRef}
          aria-hidden="true"
          width={360}
          height={360}
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 180,
            height: 180,
            border: "2px solid rgba(0,229,255,0.5)",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            background: "#060b14",
            opacity: showInset ? 1 : 0,
            pointerEvents: showInset ? "auto" : "none",
            transition: "opacity 200ms ease-out",
            zIndex: 10,
          }}
        />
      </div>
    </PanelFrame>
  );
}
