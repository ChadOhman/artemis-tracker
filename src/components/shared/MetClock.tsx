"use client";
import { useState, useEffect } from "react";
import { formatMet } from "@/lib/met";

type MetClockSize = "large" | "medium" | "small";

interface MetClockProps {
  metMs: number;
  size?: MetClockSize;
  /** If true, shows "T+" prefix; if false shows "MET " prefix */
  showTPlus?: boolean;
  className?: string;
}

const SIZE_STYLES: Record<MetClockSize, React.CSSProperties> = {
  large: {
    fontSize: "2rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    lineHeight: 1,
  },
  medium: {
    fontSize: "1.1rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    lineHeight: 1,
  },
  small: {
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.04em",
    lineHeight: 1,
  },
};

const LABEL_STYLES: Record<MetClockSize, React.CSSProperties> = {
  large: { fontSize: "0.6rem" },
  medium: { fontSize: "0.55rem" },
  small: { fontSize: "0.5rem" },
};

export function MetClock({
  metMs,
  size = "medium",
  showTPlus = false,
  className = "",
}: MetClockProps) {
  // Avoid hydration mismatch: render placeholder on server, real time on client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const formatted = mounted ? formatMet(metMs) : "---:--:--:--";
  const prefix = showTPlus ? "T+" : "MET ";
  const isNegative = metMs < 0;

  return (
    <span
      className={`tabular-nums ${className}`}
      style={{
        ...SIZE_STYLES[size],
        color: isNegative ? "var(--accent-yellow)" : "var(--accent-cyan)",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.25em",
      }}
    >
      <span style={{ ...LABEL_STYLES[size], color: "var(--text-dim)", fontWeight: 400 }}>
        {prefix}
      </span>
      {formatted}
    </span>
  );
}
