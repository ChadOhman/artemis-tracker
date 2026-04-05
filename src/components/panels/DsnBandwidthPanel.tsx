"use client";
import { useState, useEffect, useRef } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { DsnStatus } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface HistoryPoint {
  ts: number;
  downKbps: number;
  upKbps: number;
}

interface DsnBandwidthPanelProps {
  dsn: DsnStatus | null;
}

function fmtKbps(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${Math.round(kbps).toLocaleString()} kbps`;
}

export function DsnBandwidthPanel({ dsn }: DsnBandwidthPanelProps) {
  const { t } = useLocale();
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Hydrate from server-side history on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dsn/history?minutes=30")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data?.history)) return;
        const cutoff = Date.now() - 30 * 60 * 1000;
        const filtered = (data.history as HistoryPoint[]).filter((p) => p.ts > cutoff);
        setHistory(filtered);
      })
      .catch(() => {
        // History unavailable — will build up from live stream
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Append from live DSN updates
  useEffect(() => {
    if (!dsn) return;
    const activeDish = dsn.dishes.find((d) => d.downlinkActive);
    const downKbps = activeDish ? activeDish.downlinkRate / 1000 : 0;
    const upDish = dsn.dishes.find((d) => d.uplinkActive);
    const upKbps = upDish ? upDish.uplinkRate / 1000 : 0;
    const newPoint = { ts: Date.now(), downKbps, upKbps };
    setHistory((prev) => {
      // Avoid duplicate timestamps (history fetch + first live event)
      const lastTs = prev[prev.length - 1]?.ts ?? 0;
      const next = newPoint.ts > lastTs + 500 ? [...prev, newPoint] : prev;
      const cutoff = Date.now() - 30 * 60 * 1000;
      return next.filter((p) => p.ts > cutoff);
    });
  }, [dsn]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.offsetWidth;
    const cssH = canvas.offsetHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    const W = cssW;
    const H = cssH;
    const PAD_L = 4;
    const PAD_R = 4;
    const PAD_T = 6;
    const PAD_B = 16;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    // Background
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.clearRect(0, 0, W, H);

    if (history.length < 2) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText("Collecting data…", W / 2, H / 2);
      return;
    }

    const now = Date.now();
    const windowMs = 30 * 60 * 1000;
    const tMin = now - windowMs;
    const tMax = now;

    const maxVal = Math.max(
      ...history.map((p) => Math.max(p.downKbps, p.upKbps)),
      1
    );

    const toX = (ts: number) =>
      PAD_L + ((ts - tMin) / (tMax - tMin)) * chartW;
    const toY = (val: number) =>
      PAD_T + chartH - (val / maxVal) * chartH;

    // Grid lines (horizontal)
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD_T + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(PAD_L + chartW, y);
      ctx.stroke();
    }

    // Grid lines (vertical — every 5 min)
    for (let m = 5; m < 30; m += 5) {
      const x = toX(now - m * 60 * 1000);
      ctx.beginPath();
      ctx.moveTo(x, PAD_T);
      ctx.lineTo(x, PAD_T + chartH);
      ctx.stroke();
    }

    // Downlink line (cyan)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,229,255,0.85)";
    ctx.lineWidth = 1.5;
    history.forEach((p, i) => {
      const x = toX(p.ts);
      const y = toY(p.downKbps);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Uplink line (dim cyan)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,180,200,0.45)";
    ctx.lineWidth = 1;
    history.forEach((p, i) => {
      const x = toX(p.ts);
      const y = toY(p.upKbps);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = `9px JetBrains Mono, monospace`;
    ctx.textAlign = "right";
    ctx.fillText(fmtKbps(maxVal), PAD_L + chartW - 2, PAD_T + 9);
    ctx.fillText("0", PAD_L + chartW - 2, PAD_T + chartH);

    // X-axis labels
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = `8px JetBrains Mono, monospace`;
    ctx.fillText("−30m", PAD_L + 12, PAD_T + chartH + 12);
    ctx.fillText("now", PAD_L + chartW, PAD_T + chartH + 12);
  }, [history]);

  const latest = history[history.length - 1];

  return (
    <PanelFrame
      title={t("dsnBandwidth.title")}
      icon="📊"
      accentColor="var(--accent-cyan)"
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: 100, display: "block" }}
      />
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 6,
          fontSize: 11,
          fontFamily: "JetBrains Mono, monospace",
          color: "var(--text-secondary)",
        }}
      >
        <span>
          <span style={{ color: "var(--accent-cyan)" }}>↓</span>{" "}
          {latest ? fmtKbps(latest.downKbps) : "—"}
        </span>
        <span style={{ opacity: 0.6 }}>
          <span style={{ color: "var(--accent-cyan)" }}>↑</span>{" "}
          {latest ? fmtKbps(latest.upKbps) : "—"}
        </span>
      </div>
    </PanelFrame>
  );
}
