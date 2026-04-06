"use client";

import { useEffect, useState } from "react";

interface MissionStats {
  maxSpeedKmH: number;
  maxEarthDistKm: number;
  minMoonDistKm: number;
  totalDistanceKm: number;
  maxKpIndex: number;
  solarEventCount: number;
  stateVectorSamples: number;
  dsnSamples: number;
  solarSamples: number;
  firstSampleTs: string | null;
  latestSampleTs: string | null;
}

function fmtNum(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false,
    }) + " UTC";
  } catch {
    return iso;
  }
}

function StatCard({
  label,
  value,
  unit,
  color,
  subtext,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
  subtext?: string;
}) {
  return (
    <div
      style={{
        background: "#0d1117",
        border: `1px solid ${color}25`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: "#5a7a8a",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1.1,
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "#5a7a8a",
              marginLeft: 6,
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {subtext && (
        <div style={{ fontSize: 11, color: "#4a5a6a" }}>{subtext}</div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<MissionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#060a10",
        color: "#c0c8d4",
        fontFamily: "system-ui, sans-serif",
        padding: "0 0 48px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 24px 14px",
          borderBottom: "1px solid rgba(0,229,255,0.08)",
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/"
            style={{
              fontSize: 11,
              color: "#5a7a8a",
              textDecoration: "none",
            }}
          >
            &larr; Dashboard
          </a>
          <div
            style={{
              width: 3,
              height: 22,
              background: "#00e5ff",
              borderRadius: 2,
            }}
          />
          <h1
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "#e0e8f0",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Mission Statistics
          </h1>
        </div>
        {stats && (
          <div
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#5a7a8a",
            }}
          >
            {fmtNum(stats.stateVectorSamples)} samples since {fmtDate(stats.firstSampleTs)}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 24, color: "#ff4455", fontSize: 13 }}>
          Error loading stats: {error}
        </div>
      )}

      {!stats && !error && (
        <div style={{ padding: 24, color: "#5a7a8a", fontSize: 13 }}>
          Loading mission statistics...
        </div>
      )}

      {stats && (
        <div style={{ padding: "28px 24px" }}>
          {/* Primary stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard
              label="Maximum Speed"
              value={fmtNum(stats.maxSpeedKmH)}
              unit="km/h"
              color="#00e5ff"
              subtext={`${fmtNum(stats.maxSpeedKmH * 0.621371)} mph · ${fmtNum(stats.maxSpeedKmH / 3.6, 1)} m/s`}
            />
            <StatCard
              label="Maximum Earth Distance"
              value={fmtNum(stats.maxEarthDistKm)}
              unit="km"
              color="#00ff88"
              subtext={`${fmtNum(stats.maxEarthDistKm * 0.621371)} miles`}
            />
            <StatCard
              label="Closest Moon Approach"
              value={fmtNum(stats.minMoonDistKm)}
              unit="km"
              color="#b388ff"
              subtext={stats.minMoonDistKm > 0 ? `${fmtNum(stats.minMoonDistKm * 0.621371)} miles` : "Awaiting flyby"}
            />
            <StatCard
              label="Total Distance Traveled"
              value={fmtNum(stats.totalDistanceKm)}
              unit="km"
              color="#ffaa00"
              subtext={`${fmtNum(stats.totalDistanceKm * 0.621371)} miles`}
            />
          </div>

          {/* Space weather */}
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "#00e5ff",
              textTransform: "uppercase",
              margin: "0 0 16px",
            }}
          >
            Space Weather
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard
              label="Peak Kp Index"
              value={stats.maxKpIndex.toFixed(1)}
              color={stats.maxKpIndex >= 5 ? "#ff4455" : stats.maxKpIndex >= 4 ? "#ffaa00" : "#00ff88"}
              subtext={stats.maxKpIndex >= 5 ? "Storm conditions" : stats.maxKpIndex >= 4 ? "Unsettled" : "Quiet"}
            />
            <StatCard
              label="Geomagnetic Events"
              value={fmtNum(stats.solarEventCount)}
              unit="events"
              color="#ffaa00"
              subtext="Kp ≥ 4 observations"
            />
          </div>

          {/* Data collection */}
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "#00e5ff",
              textTransform: "uppercase",
              margin: "0 0 16px",
            }}
          >
            Data Collection
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <StatCard
              label="Orbital Fixes"
              value={fmtNum(stats.stateVectorSamples)}
              color="#00e5ff"
              subtext="JPL Horizons state vectors"
            />
            <StatCard
              label="DSN Observations"
              value={fmtNum(stats.dsnSamples)}
              color="#00ff88"
              subtext="Deep Space Network contacts"
            />
            <StatCard
              label="Space Weather Readings"
              value={fmtNum(stats.solarSamples)}
              color="#ffaa00"
              subtext="NOAA SWPC observations"
            />
            <StatCard
              label="Tracking Since"
              value={fmtDate(stats.firstSampleTs)}
              color="#5a7a8a"
              subtext={`Latest: ${fmtDate(stats.latestSampleTs)}`}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 40,
              paddingTop: 16,
              borderTop: "1px solid #1a2332",
              fontSize: 11,
              color: "#4a5a6a",
              textAlign: "center",
            }}
          >
            Statistics computed from archived telemetry stored in the mission database.
            Data retention: 14 days for AROW/DSN/Solar, 28 days for state vectors.
          </div>
        </div>
      )}
    </main>
  );
}
