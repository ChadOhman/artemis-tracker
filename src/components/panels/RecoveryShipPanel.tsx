"use client";
// Small panel showing the recovery ship's current position.
// Polls /api/recovery-ship every 30 seconds. Shows "AIS Dark" when
// US Navy warships have their AIS transponder disabled for operations.

import { useEffect, useState } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";

interface RecoveryShipData {
  name: string;
  hull: string;
  mmsi: string;
  lat: number;
  lon: number;
  speedKnots: number | null;
  courseDeg: number | null;
  timestamp: string;
  isLive: boolean;
  source: "ais" | "staging";
}

function fmtCoord(value: number, posChar: string, negChar: string): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  return `${deg}°${min.toFixed(2)}'${value >= 0 ? posChar : negChar}`;
}

function fmtAge(isoTimestamp: string): string {
  const age = Date.now() - new Date(isoTimestamp).getTime();
  if (age < 60_000) return "just now";
  const min = Math.floor(age / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function RecoveryShipPanel() {
  const [data, setData] = useState<RecoveryShipData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchPosition() {
      try {
        const res = await fetch("/api/recovery-ship");
        if (!res.ok) return;
        const json = (await res.json()) as RecoveryShipData;
        if (!cancelled) setData(json);
      } catch {
        // ignore
      }
    }
    fetchPosition();
    const id = setInterval(fetchPosition, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <PanelFrame
        title="Recovery Ship"
        icon="⚓"
        accentColor="#00d4e8"
      >
        <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
          Loading...
        </div>
      </PanelFrame>
    );
  }

  const statusColor = data.isLive ? "#00ff88" : "#ffaa00";
  const statusLabel = data.isLive ? "AIS LIVE" : "AIS DARK";

  return (
    <PanelFrame
      title="Recovery Ship"
      icon="⚓"
      accentColor="#00d4e8"
      headerRight={
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: statusColor,
            letterSpacing: "0.12em",
            fontFamily: "var(--font-mono)",
          }}
        >
          ● {statusLabel}
        </span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Vessel
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "0.02em",
            }}
          >
            {data.name}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {data.hull} · MMSI {data.mmsi}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Position {data.source === "staging" && "(Estimated Staging Area)"}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.02em",
            }}
          >
            {fmtCoord(data.lat, "N", "S")} &nbsp; {fmtCoord(data.lon, "E", "W")}
          </div>
        </div>

        {data.isLive && (data.speedKnots != null || data.courseDeg != null) && (
          <div style={{ display: "flex", gap: 16 }}>
            {data.speedKnots != null && (
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-dim)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  Speed
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {data.speedKnots.toFixed(1)} kn
                </div>
              </div>
            )}
            {data.courseDeg != null && (
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-dim)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  Course
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {data.courseDeg.toFixed(0)}°
                </div>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            fontSize: 9,
            color: "var(--text-dim)",
            fontStyle: "italic",
            lineHeight: 1.4,
            paddingTop: 6,
            borderTop: "1px solid var(--border-panel)",
          }}
        >
          {data.source === "ais"
            ? `AIS update ${fmtAge(data.timestamp)}`
            : "US Navy warships often run AIS-dark during operations. Position shown is the estimated splashdown recovery zone."}
        </div>
      </div>
    </PanelFrame>
  );
}
