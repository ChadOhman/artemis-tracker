"use client";
import { useEffect, useRef, useState } from "react";

interface SparklineProps {
  metric: string;
  hours?: number;
  color?: string;
  width?: number;
  height?: number;
  showArea?: boolean;
}

interface Point {
  ts: number;
  value: number;
}

// Simple in-memory cache so many sparklines on the same metric don't hammer the API
const cache = new Map<string, { data: Point[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function Sparkline({
  metric,
  hours = 24,
  color = "var(--accent-cyan)",
  width = 48,
  height = 14,
  showArea = true,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<Point[]>([]);

  // Fetch history once on mount (cached)
  useEffect(() => {
    const cacheKey = `${metric}:${hours}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data);
      return;
    }

    let cancelled = false;
    fetch(`/api/history?metric=${metric}&hours=${hours}&points=60`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !Array.isArray(json?.data)) return;
        cache.set(cacheKey, { data: json.data, ts: Date.now() });
        setData(json.data);
      })
      .catch(() => {
        // silent — sparkline just stays empty
      });

    return () => {
      cancelled = true;
    };
  }, [metric, hours]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (data.length < 2) return;

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const xStep = width / (data.length - 1);
    const toY = (v: number) => height - 1 - ((v - min) / range) * (height - 2);

    // Resolve CSS variable to actual color if needed
    let resolvedColor = color;
    if (color.startsWith("var(")) {
      const varName = color.match(/var\(([^)]+)\)/)?.[1];
      if (varName) {
        resolvedColor = getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || "#00e5ff";
      }
    }

    // Area fill
    if (showArea) {
      ctx.beginPath();
      ctx.moveTo(0, height);
      data.forEach((d, i) => {
        ctx.lineTo(i * xStep, toY(d.value));
      });
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = resolvedColor + "22"; // alpha
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = i * xStep;
      const y = toY(d.value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = resolvedColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [data, width, height, color, showArea]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        width,
        height,
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  );
}
