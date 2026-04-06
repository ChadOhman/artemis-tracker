"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { TimelineState } from "@/hooks/useTimeline";
import type { ActivityType, MissionPhase } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

/* ── colour maps ─────────────────────────────────────────────── */

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  sleep: "#263238",
  pao: "#1565c0",
  science: "#2e7d32",
  maneuver: "#7b1fa2",
  config: "#00838f",
  exercise: "#e65100",
  meal: "#4e342e",
  "off-duty": "#546e7a",
  other: "#455a64",
};

const PHASE_COLORS: Record<MissionPhase, string> = {
  Prelaunch: "#37474f",
  LEO: "#0d47a1",
  "High Earth Orbit": "#1a237e",
  "Trans-Lunar": "#4a148c",
  "Lunar Flyby": "#6a1b9a",
  "Trans-Earth": "#1b5e20",
  EDL: "#bf360c",
  Recovery: "#e65100",
};

/* ── constants ───────────────────────────────────────────────── */

const BG = "#080c12";
const GRID_COLOR = "#1c2531";
const GRID_ALPHA = 0.3;
const FD_COLOR = "#2a3a50";
const LABEL_GUTTER = 40;
const RULER_H = 25;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;
const MIN_RANGE = 30 * 60_000; // 30 min
const MAX_RANGE = 10 * MS_DAY; // full mission
const DEFAULT_RANGE = 8 * MS_HOUR;
const FONT = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";

/* ── helpers ─────────────────────────────────────────────────── */

function formatMET(ms: number): string {
  const neg = ms < 0;
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const prefix = neg ? "-" : "+";
  return `T${prefix}${String(h).padStart(3, "0")}:${String(m).padStart(2, "0")}`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (w <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/* ── component ───────────────────────────────────────────────── */

interface TimelinePanelProps {
  metMs: number;
  timeline: TimelineState;
}

export function TimelinePanel({ metMs, timeline }: TimelinePanelProps) {
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Store translated row labels in a ref so the draw loop can access them without re-creating the callback
  const rowLabelsRef = useRef({ crew: "CREW", att: "ATT", phase: "PHASE", sleep: "SLEEP" });

  const [autoTrack, setAutoTrack] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; description: string; met: string; isPast: boolean } | null>(null);

  // Store milestone pixel positions for hit testing (updated during draw)
  const milestoneHitsRef = useRef<{ x: number; metMs: number; name: string; description: string }[]>([]);

  // View state stored in refs for RAF loop performance
  const viewStartRef = useRef(metMs - DEFAULT_RANGE * 0.3);
  const viewRangeRef = useRef(DEFAULT_RANGE);

  // Drag state
  const dragRef = useRef<{ active: boolean; startX: number; startViewStart: number }>({
    active: false,
    startX: 0,
    startViewStart: 0,
  });

  // Keep translated row labels in sync
  rowLabelsRef.current = {
    crew: t("timeline.crew"),
    att: t("timeline.att"),
    phase: t("timeline.phase"),
    sleep: t("timeline.sleep"),
  };

  // Keep autoTrack ref in sync
  const autoTrackRef = useRef(autoTrack);
  autoTrackRef.current = autoTrack;

  // Keep metMs ref in sync
  const metMsRef = useRef(metMs);
  metMsRef.current = metMs;

  // Keep timeline ref in sync
  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;

  /* ── drawing ───────────────────────────────────────────────── */

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (w === 0 || h === 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const met = metMsRef.current;
    const tl = timelineRef.current;
    const raw = tl.raw;
    const viewRange = viewRangeRef.current;

    // Auto-track
    if (autoTrackRef.current) {
      viewStartRef.current = met - viewRange * 0.3;
    }

    const viewStart = viewStartRef.current;
    const viewEnd = viewStart + viewRange;

    // Pixel conversion
    const drawW = w - LABEL_GUTTER;
    const msToX = (ms: number) => LABEL_GUTTER + ((ms - viewStart) / viewRange) * drawW;

    // Row layout
    const bodyH = h - RULER_H;
    const crewH = bodyH * 0.32;
    const sleepH = bodyH * 0.1;
    const attH = bodyH * 0.18;
    const phaseH = bodyH * 0.18;
    // remaining ~22% is padding/milestones

    const crewY = RULER_H;
    const sleepY = crewY + crewH;
    const attY = sleepY + sleepH;
    const phaseY = attY + attH;

    /* ── background ──────────────────────────────────────────── */
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    /* ── grid lines ──────────────────────────────────────────── */
    // Determine tick spacing based on zoom
    let tickMs = MS_HOUR;
    if (viewRange < 2 * MS_HOUR) tickMs = 15 * 60_000;
    else if (viewRange < 6 * MS_HOUR) tickMs = MS_HOUR;
    else if (viewRange < MS_DAY) tickMs = 2 * MS_HOUR;
    else if (viewRange < 3 * MS_DAY) tickMs = 6 * MS_HOUR;
    else tickMs = 12 * MS_HOUR;

    const firstTick = Math.floor(viewStart / tickMs) * tickMs;

    ctx.save();
    ctx.globalAlpha = GRID_ALPHA;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let t = firstTick; t <= viewEnd; t += tickMs) {
      const x = msToX(t);
      if (x < LABEL_GUTTER || x > w) continue;
      ctx.beginPath();
      ctx.moveTo(x, RULER_H);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.restore();

    /* ── flight day boundaries ───────────────────────────────── */
    const firstDay = Math.floor(viewStart / MS_DAY);
    const lastDay = Math.ceil(viewEnd / MS_DAY);
    ctx.save();
    ctx.strokeStyle = FD_COLOR;
    ctx.lineWidth = 1;
    ctx.fillStyle = "#a0b8cf";
    ctx.font = `bold 9px ${FONT}`;
    for (let d = firstDay; d <= lastDay; d++) {
      const dayMs = d * MS_DAY;
      const x = msToX(dayMs);
      if (x >= LABEL_GUTTER && x <= w) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
        const label = `FD${String(d + 1).padStart(2, "0")}`;
        ctx.fillText(label, x + 3, 10);
      }
    }
    ctx.restore();

    /* ── time ruler ──────────────────────────────────────────── */
    ctx.fillStyle = "#0a0f18";
    ctx.fillRect(0, 0, w, RULER_H);

    ctx.fillStyle = "#9eb5cc";
    ctx.font = `9px ${FONT}`;
    ctx.textAlign = "center";
    for (let t = firstTick; t <= viewEnd; t += tickMs) {
      const x = msToX(t);
      if (x < LABEL_GUTTER || x > w) continue;
      // Tick mark
      ctx.strokeStyle = "#3a5a7a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, RULER_H - 5);
      ctx.lineTo(x, RULER_H);
      ctx.stroke();
      // Label
      ctx.fillText(formatMET(t), x, RULER_H - 8);
    }
    ctx.textAlign = "left";

    if (!raw) {
      ctx.fillStyle = "#8a9db0";
      ctx.font = `11px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("Loading timeline data…", w / 2, h / 2);
      ctx.textAlign = "left";
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    /* ── crew activity blocks ────────────────────────────────── */
    for (const act of raw.activities) {
      if (act.endMetMs < viewStart || act.startMetMs > viewEnd) continue;
      const x1 = Math.max(msToX(act.startMetMs), LABEL_GUTTER);
      const x2 = Math.min(msToX(act.endMetMs), w);
      const bw = x2 - x1;
      if (bw < 1) continue;

      ctx.fillStyle = ACTIVITY_COLORS[act.type] || "#455a64";
      roundedRect(ctx, x1, crewY + 2, bw, crewH - 4, 3);
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5;
      roundedRect(ctx, x1, crewY + 2, bw, crewH - 4, 3);
      ctx.stroke();

      // Label
      if (bw > 40) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `9px ${FONT}`;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x1 + 2, crewY, bw - 4, crewH);
        ctx.clip();
        ctx.fillText(act.name, x1 + 4, crewY + crewH / 2 + 3);
        ctx.restore();
      }
    }

    /* ── sleep row (dedicated row: pre-sleep | sleep | post-sleep) ── */
    const PRE_SLEEP_MS = 1.5 * MS_HOUR;
    const POST_SLEEP_MS = 0.5 * MS_HOUR;
    // Row label
    ctx.save();
    ctx.fillStyle = "#8a9db0";
    ctx.font = `bold 8px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(rowLabelsRef.current.sleep, LABEL_GUTTER - 4, sleepY + sleepH / 2 + 3);
    ctx.restore();

    for (const act of raw.activities) {
      if (act.type !== "sleep") continue;
      const preStart = act.startMetMs - PRE_SLEEP_MS;
      const postEnd = act.endMetMs + POST_SLEEP_MS;
      if (postEnd < viewStart || preStart > viewEnd) continue;

      // Pre-sleep block
      const px1 = Math.max(msToX(preStart), LABEL_GUTTER);
      const px2 = Math.min(msToX(act.startMetMs), w);
      const pbw = px2 - px1;
      if (pbw >= 1) {
        ctx.fillStyle = "#546e7a";
        roundedRect(ctx, px1, sleepY + 1, pbw, sleepH - 2, 2);
        ctx.fill();
        if (pbw > 40) {
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = `bold 7px ${FONT}`;
          ctx.save();
          ctx.beginPath();
          ctx.rect(px1, sleepY, pbw, sleepH);
          ctx.clip();
          ctx.fillText("Pre", px1 + 3, sleepY + sleepH / 2 + 3);
          ctx.restore();
        }
      }

      // Sleep block
      const sx1 = Math.max(msToX(act.startMetMs), LABEL_GUTTER);
      const sx2 = Math.min(msToX(act.endMetMs), w);
      const sbw = sx2 - sx1;
      if (sbw >= 1) {
        ctx.fillStyle = "#263238";
        roundedRect(ctx, sx1, sleepY + 1, sbw, sleepH - 2, 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 0.5;
        roundedRect(ctx, sx1, sleepY + 1, sbw, sleepH - 2, 2);
        ctx.stroke();
        if (sbw > 30) {
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = `bold 7px ${FONT}`;
          ctx.save();
          ctx.beginPath();
          ctx.rect(sx1, sleepY, sbw, sleepH);
          ctx.clip();
          ctx.fillText("Sleep", sx1 + 3, sleepY + sleepH / 2 + 3);
          ctx.restore();
        }
      }

      // Post-sleep block
      const qx1 = Math.max(msToX(act.endMetMs), LABEL_GUTTER);
      const qx2 = Math.min(msToX(postEnd), w);
      const qbw = qx2 - qx1;
      if (qbw >= 1) {
        ctx.fillStyle = "#546e7a";
        roundedRect(ctx, qx1, sleepY + 1, qbw, sleepH - 2, 2);
        ctx.fill();
        if (qbw > 40) {
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = `bold 7px ${FONT}`;
          ctx.save();
          ctx.beginPath();
          ctx.rect(qx1, sleepY, qbw, sleepH);
          ctx.clip();
          ctx.fillText("Post", qx1 + 3, sleepY + sleepH / 2 + 3);
          ctx.restore();
        }
      }
    }

    /* ── attitude blocks ─────────────────────────────────────── */
    for (const att of raw.attitudes) {
      if (att.endMetMs < viewStart || att.startMetMs > viewEnd) continue;
      const x1 = Math.max(msToX(att.startMetMs), LABEL_GUTTER);
      const x2 = Math.min(msToX(att.endMetMs), w);
      const bw = x2 - x1;
      if (bw < 1) continue;

      ctx.fillStyle = "#1a2636";
      roundedRect(ctx, x1, attY + 2, bw, attH - 4, 3);
      ctx.fill();

      ctx.strokeStyle = "rgba(100,180,255,0.15)";
      ctx.lineWidth = 0.5;
      roundedRect(ctx, x1, attY + 2, bw, attH - 4, 3);
      ctx.stroke();

      if (bw > 40) {
        ctx.fillStyle = "rgba(100,180,255,0.7)";
        ctx.font = `9px ${FONT}`;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x1 + 2, attY, bw - 4, attH);
        ctx.clip();
        ctx.fillText(att.mode, x1 + 4, attY + attH / 2 + 3);
        ctx.restore();
      }
    }

    /* ── phase blocks ────────────────────────────────────────── */
    for (const ph of raw.phases) {
      if (ph.endMetMs < viewStart || ph.startMetMs > viewEnd) continue;
      const x1 = Math.max(msToX(ph.startMetMs), LABEL_GUTTER);
      const x2 = Math.min(msToX(ph.endMetMs), w);
      const bw = x2 - x1;
      if (bw < 1) continue;

      ctx.fillStyle = PHASE_COLORS[ph.phase] || "#37474f";
      roundedRect(ctx, x1, phaseY + 2, bw, phaseH - 4, 3);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5;
      roundedRect(ctx, x1, phaseY + 2, bw, phaseH - 4, 3);
      ctx.stroke();

      if (bw > 40) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `9px ${FONT}`;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x1 + 2, phaseY, bw - 4, phaseH);
        ctx.clip();
        ctx.fillText(ph.phase, x1 + 4, phaseY + phaseH / 2 + 3);
        ctx.restore();
      }
    }

    /* ── milestones (diamonds on ruler) ─────────────────────── */
    const hits: typeof milestoneHitsRef.current = [];
    for (const ms of raw.milestones) {
      if (ms.metMs < viewStart || ms.metMs > viewEnd) continue;
      const x = msToX(ms.metMs);
      if (x < LABEL_GUTTER || x > w) continue;

      const isPast = met >= ms.metMs;

      // Diamond
      ctx.fillStyle = isPast ? "#ffd54f" : "rgba(255,213,79,0.4)";
      ctx.beginPath();
      ctx.moveTo(x, RULER_H - 2);
      ctx.lineTo(x + 4, RULER_H + 4);
      ctx.lineTo(x, RULER_H + 10);
      ctx.lineTo(x - 4, RULER_H + 4);
      ctx.closePath();
      ctx.fill();

      // Vertical tick line
      ctx.strokeStyle = isPast ? "rgba(255,213,79,0.2)" : "rgba(255,213,79,0.08)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, RULER_H + 10);
      ctx.lineTo(x, RULER_H + 18);
      ctx.stroke();

      hits.push({ x, metMs: ms.metMs, name: ms.name, description: ms.description });
    }
    milestoneHitsRef.current = hits;

    /* ── playhead ────────────────────────────────────────────── */
    const px = msToX(met);
    if (px >= LABEL_GUTTER && px <= w) {
      ctx.strokeStyle = "#e53935";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();

      // Triangle at top
      ctx.fillStyle = "#e53935";
      ctx.beginPath();
      ctx.moveTo(px - 5, 0);
      ctx.lineTo(px + 5, 0);
      ctx.lineTo(px, 7);
      ctx.closePath();
      ctx.fill();
    }

    /* ── row labels ──────────────────────────────────────────── */
    ctx.fillStyle = "#0a0f18";
    ctx.fillRect(0, RULER_H, LABEL_GUTTER, h - RULER_H);

    ctx.fillStyle = "#a0b8cf";
    ctx.font = `bold 8px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(rowLabelsRef.current.crew, LABEL_GUTTER / 2, crewY + crewH / 2 + 3);
    ctx.fillText(rowLabelsRef.current.att, LABEL_GUTTER / 2, attY + attH / 2 + 3);
    ctx.fillText(rowLabelsRef.current.phase, LABEL_GUTTER / 2, phaseY + phaseH / 2 + 3);
    ctx.textAlign = "left";

    /* ── separator lines ─────────────────────────────────────── */
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (const y of [crewY, attY, phaseY, phaseY + phaseH]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  /* ── lifecycle ─────────────────────────────────────────────── */

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  /* ── resize observer ───────────────────────────────────────── */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      /* RAF loop already running, it will pick up new size */
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  /* ── mouse handlers ────────────────────────────────────────── */

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startViewStart: viewStartRef.current,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.active) {
      const container = containerRef.current;
      if (!container) return;
      const dx = e.clientX - dragRef.current.startX;
      const drawW = container.getBoundingClientRect().width - LABEL_GUTTER;
      const msDelta = -(dx / drawW) * viewRangeRef.current;
      viewStartRef.current = dragRef.current.startViewStart + msDelta;
      setAutoTrack(false);
      setTooltip(null);
      return;
    }

    // Hit test milestones for tooltip
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Only check near the ruler area (top ~35px)
    if (mouseY > 35) {
      setTooltip(null);
      return;
    }

    const hitRadius = 12;
    let found = false;
    for (const hit of milestoneHitsRef.current) {
      if (Math.abs(mouseX - hit.x) < hitRadius) {
        const met = metMsRef.current;
        const isPast = met >= hit.metMs;
        setTooltip({
          x: hit.x,
          y: 30,
          name: hit.name,
          description: hit.description,
          met: formatMET(hit.metMs),
          isPast,
        });
        found = true;
        break;
      }
    }
    if (!found) setTooltip(null);
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragRef.current.active = false;
    setTooltip(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const drawW = rect.width - LABEL_GUTTER;
    const fraction = (mouseX - LABEL_GUTTER) / drawW;

    const oldRange = viewRangeRef.current;
    const zoomFactor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const newRange = Math.max(MIN_RANGE, Math.min(MAX_RANGE, oldRange * zoomFactor));

    // Keep the point under cursor fixed
    const cursorMs = viewStartRef.current + fraction * oldRange;
    viewStartRef.current = cursorMs - fraction * newRange;
    viewRangeRef.current = newRange;
    setAutoTrack(false);
  }, []);

  /* ── auto-track button ─────────────────────────────────────── */

  const trackButton = (
    <button
      onClick={() => {
        setAutoTrack((prev) => {
          if (!prev) {
            // Reset view range to default when re-enabling
            viewRangeRef.current = DEFAULT_RANGE;
          }
          return !prev;
        });
      }}
      aria-label={autoTrack ? "Timeline tracking enabled — click to disable" : "Enable timeline tracking"}
      aria-pressed={autoTrack}
      style={{
        background: autoTrack ? "rgba(0,200,150,0.15)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${autoTrack ? "rgba(0,200,150,0.4)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 3,
        color: autoTrack ? "#00c896" : "#8a9db0",
        fontSize: 9,
        padding: "2px 6px",
        cursor: "pointer",
        fontFamily: FONT,
        letterSpacing: "0.05em",
        lineHeight: "1.4",
      }}
    >
      {autoTrack ? t("timeline.tracking") : t("timeline.track")}
    </button>
  );

  // Accessible description of current timeline state
  const currentAct = timeline.raw?.activities.find(
    a => a.startMetMs <= metMs && a.endMetMs > metMs
  );
  const nextMilestone = timeline.raw?.milestones.find(m => m.metMs > metMs);
  const timelineDesc = [
    "Mission timeline.",
    currentAct ? `Current activity: ${currentAct.name}.` : "No current activity.",
    nextMilestone ? `Next milestone: ${nextMilestone.name}.` : "",
  ].filter(Boolean).join(" ");

  return (
    <PanelFrame
      title={t("timeline.title")}
      icon="📅"
      accentColor="var(--accent-cyan)"
      headerRight={trackButton}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "min(180px, 35vw)", position: "relative", cursor: dragRef.current.active ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <span className="sr-only">{timelineDesc}</span>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ display: "block", width: "100%", height: "100%" }}
        />
        {tooltip && (
          <div
            role="tooltip"
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y,
              transform: "translateX(-50%)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--accent-yellow)",
              borderRadius: "4px",
              padding: "8px 12px",
              zIndex: 10,
              pointerEvents: "none",
              maxWidth: "260px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-yellow)", marginBottom: "2px" }}>
              {tooltip.name}
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              {tooltip.met} — {tooltip.isPast ? t("milestones.completed") : t("milestones.upcoming")}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-primary)", lineHeight: "1.4" }}>
              {tooltip.description}
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
