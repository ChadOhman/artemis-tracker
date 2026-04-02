"use client";
import { MetClock } from "./shared/MetClock";

interface BottomBarProps {
  metMs: number;
}

export function BottomBar({ metMs }: BottomBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: "100%",
        padding: "0 10px",
        background: "var(--bg-secondary)",
        gap: 8,
      }}
    >
      {/* Left: LIVE / SIM toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          style={{
            padding: "2px 10px",
            borderRadius: 3,
            border: "1px solid var(--accent-red)",
            background: "rgba(255,61,61,0.15)",
            color: "var(--accent-red)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            cursor: "default",
            fontFamily: "inherit",
          }}
        >
          LIVE
        </button>
        <button
          style={{
            padding: "2px 10px",
            borderRadius: 3,
            border: "1px solid var(--border-panel)",
            background: "transparent",
            color: "var(--text-dim)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            cursor: "default",
            fontFamily: "inherit",
          }}
        >
          SIM
        </button>
      </div>

      {/* Center: MET */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <MetClock metMs={metMs} size="small" showTPlus={false} />
      </div>

      {/* Right: attribution */}
      <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.06em" }}>
        <a
          href="https://cdnspace.ca"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text-dim)", textDecoration: "none" }}
        >
          Created by Canadian Space
        </a>
      </div>
    </div>
  );
}
