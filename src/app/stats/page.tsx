"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "@/context/LocaleContext";

const LAUNCH_TIME_MS = new Date("2026-04-01T22:35:00Z").getTime();
const TOTAL_MISSION_HOURS = 217.51;
const TOTAL_MISSION_MS = TOTAL_MISSION_HOURS * 3600 * 1000;

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
  maxGForce: number;
  dsnSignalUptime: number;
  longestBlackoutSec: number;
  arowSamples: number;
}

const MISSION_PHASE_KEYS = [
  "leo",
  "highEarthOrbit",
  "transLunar",
  "lunarFlyby",
  "transEarth",
] as const;

const MISSION_PHASES = [
  { key: "leo" as const, startH: 0, endH: 0.83 },
  { key: "highEarthOrbit" as const, startH: 0.83, endH: 25.23 },
  { key: "transLunar" as const, startH: 25.23, endH: 102.05 },
  { key: "lunarFlyby" as const, startH: 102.05, endH: 138.87 },
  { key: "transEarth" as const, startH: 138.87, endH: 217 },
] as const;

const CREWED_SPEED_RECORDS = [
  { mission: "Apollo 10", speedKmH: 39897 },
  { mission: "Apollo 13", speedKmH: 39732 },
  { mission: "Apollo 8", speedKmH: 38938 },
];

function fmtNum(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "\u2014";
  try {
    return (
      new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        hour12: false,
      }) + " UTC"
    );
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </h2>
  );
}

function getMetMs(): number {
  return Date.now() - LAUNCH_TIME_MS;
}

function getMetHours(): number {
  return getMetMs() / 3600000;
}

function getCurrentPhase(metH: number) {
  for (const phase of MISSION_PHASES) {
    if (metH >= phase.startH && metH < phase.endH) return phase;
  }
  if (metH >= MISSION_PHASES[MISSION_PHASES.length - 1].endH) return null; // mission complete
  return null;
}

function fmtMet(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export default function StatsPage() {
  const { t } = useLocale();
  const [stats, setStats] = useState<MissionStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Live ticker
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const metMs = now - LAUNCH_TIME_MS;
  const metH = metMs / 3600000;
  const missionProgress = Math.min(100, Math.max(0, (metMs / TOTAL_MISSION_MS) * 100));
  const currentPhase = getCurrentPhase(metH);

  // Live distance estimate
  const liveDistanceKm = stats
    ? stats.totalDistanceKm +
      (stats.maxSpeedKmH / 3600) *
        Math.max(0, (now - new Date(stats.latestSampleTs || now).getTime()) / 1000)
    : 0;

  // Crew heartbeats: 4 crew x 70 bpm x seconds in space
  const metSec = Math.max(0, metMs / 1000);
  const heartbeats = Math.floor(4 * 70 * (metSec / 60));

  // Speed ranking
  const getSpeedRanking = useCallback(
    (speedKmH: number) => {
      const all = [
        ...CREWED_SPEED_RECORDS,
        { mission: "Artemis II", speedKmH },
      ].sort((a, b) => b.speedKmH - a.speedKmH);
      return all;
    },
    []
  );

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
            &larr; {t("stats.dashboard")}
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
            {t("stats.title")}
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
            {fmtNum(stats.stateVectorSamples)} {t("stats.samplesSince")}{" "}
            {fmtDate(stats.firstSampleTs)}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 24, color: "#ff4455", fontSize: 13 }}>
          {t("stats.errorLoading")} {error}
        </div>
      )}

      {!stats && !error && (
        <div style={{ padding: 24, color: "#5a7a8a", fontSize: 13 }}>
          {t("stats.loadingStats")}
        </div>
      )}

      {stats && (
        <div style={{ padding: "28px 24px" }}>
          {/* Mission Progress Bar */}
          <SectionHeading>{t("stats.sections.missionProgress")}</SectionHeading>
          <div
            style={{
              background: "#0d1117",
              border: "1px solid rgba(0,229,255,0.1)",
              borderRadius: 8,
              padding: "20px 24px",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
                fontSize: 12,
                color: "#5a7a8a",
              }}
            >
              <span>T+00:00</span>
              <span
                style={{
                  color: "#00e5ff",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {missionProgress.toFixed(2)}%
              </span>
              <span>{TOTAL_MISSION_HOURS}h</span>
            </div>
            <div
              style={{
                background: "#1a2332",
                borderRadius: 6,
                height: 16,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${missionProgress}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, #00e5ff 0%, #00ff88 100%)",
                  borderRadius: 6,
                  transition: "width 1s linear",
                  boxShadow: "0 0 12px rgba(0,229,255,0.3)",
                }}
              />
              {/* Phase markers */}
              {MISSION_PHASES.slice(1).map((phase) => (
                <div
                  key={phase.key}
                  style={{
                    position: "absolute",
                    left: `${(phase.startH / TOTAL_MISSION_HOURS) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: 9,
                color: "#4a5a6a",
                letterSpacing: "0.05em",
              }}
            >
              {MISSION_PHASES.map((phase) => (
                <span
                  key={phase.key}
                  style={{
                    color:
                      currentPhase?.key === phase.key
                        ? "#00e5ff"
                        : metH > phase.endH
                          ? "#00ff88"
                          : "#4a5a6a",
                    fontWeight:
                      currentPhase?.key === phase.key ? 700 : 400,
                  }}
                >
                  {t(`stats.phases.${phase.key}`)}
                </span>
              ))}
            </div>
          </div>

          {/* Live Counters */}
          <SectionHeading>{t("stats.sections.liveCounters")}</SectionHeading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard
              label={t("stats.cards.met")}
              value={fmtMet(metMs)}
              color="#00e5ff"
              subtext={currentPhase ? `${t("stats.cards.currentPhase")} ${t(`stats.phases.${currentPhase.key}`)}` : missionProgress >= 100 ? t("stats.cards.missionComplete") : t("stats.cards.preLaunch")}
            />
            <StatCard
              label={t("stats.cards.approxDistance")}
              value={fmtNum(Math.floor(liveDistanceKm))}
              unit="km"
              color="#ffaa00"
              subtext={`${fmtNum(Math.floor(liveDistanceKm * 0.621371))} ${t("stats.cards.milesEstimated")}`}
            />
            <StatCard
              label={t("stats.cards.heartbeats")}
              value={fmtNum(heartbeats)}
              unit={t("stats.cards.beats")}
              color="#ff6688"
              subtext={t("stats.cards.heartbeatSubtext")}
            />
          </div>

          {/* Time in Each Phase */}
          <SectionHeading>{t("stats.sections.missionPhases")}</SectionHeading>
          <div
            style={{
              background: "#0d1117",
              border: "1px solid rgba(0,229,255,0.1)",
              borderRadius: 8,
              padding: "20px 24px",
              marginBottom: 28,
            }}
          >
            {MISSION_PHASES.map((phase) => {
              const phaseDuration = phase.endH - phase.startH;
              const isComplete = metH >= phase.endH;
              const isCurrent =
                metH >= phase.startH && metH < phase.endH;
              const timeInPhase = isComplete
                ? phaseDuration
                : isCurrent
                  ? metH - phase.startH
                  : 0;
              const phaseProgress = isComplete
                ? 100
                : isCurrent
                  ? ((metH - phase.startH) / phaseDuration) * 100
                  : 0;

              return (
                <div
                  key={phase.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "10px 0",
                    borderBottom: "1px solid #1a2332",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isComplete
                        ? "#00ff88"
                        : isCurrent
                          ? "#00e5ff"
                          : "#2a3a4a",
                      boxShadow: isCurrent
                        ? "0 0 8px rgba(0,229,255,0.5)"
                        : "none",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: "0 0 140px", fontSize: 13, color: isCurrent ? "#e0e8f0" : isComplete ? "#8a9aaa" : "#4a5a6a", fontWeight: isCurrent ? 700 : 400 }}>
                    {t(`stats.phases.${phase.key}`)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        background: "#1a2332",
                        borderRadius: 4,
                        height: 6,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${phaseProgress}%`,
                          height: "100%",
                          background: isComplete
                            ? "#00ff88"
                            : "#00e5ff",
                          borderRadius: 4,
                          transition: "width 1s linear",
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      flex: "0 0 120px",
                      textAlign: "right",
                      fontSize: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: isComplete
                        ? "#00ff88"
                        : isCurrent
                          ? "#00e5ff"
                          : "#4a5a6a",
                    }}
                  >
                    {timeInPhase > 0
                      ? `${timeInPhase.toFixed(2)}h / ${phaseDuration.toFixed(2)}h`
                      : `${phaseDuration.toFixed(2)}h`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Primary stats */}
          <SectionHeading>{t("stats.sections.flightRecords")}</SectionHeading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard
              label={t("stats.cards.maxSpeed")}
              value={fmtNum(stats.maxSpeedKmH)}
              unit="km/h"
              color="#00e5ff"
              subtext={`${fmtNum(stats.maxSpeedKmH * 0.621371)} mph \u00b7 ${fmtNum(stats.maxSpeedKmH / 3.6, 1)} m/s`}
            />
            <StatCard
              label={t("stats.cards.maxEarthDist")}
              value={fmtNum(stats.maxEarthDistKm)}
              unit="km"
              color="#00ff88"
              subtext={`${fmtNum(stats.maxEarthDistKm * 0.621371)} ${t("stats.cards.miles")}`}
            />
            <StatCard
              label={t("stats.cards.closestMoon")}
              value={fmtNum(stats.minMoonDistKm)}
              unit="km"
              color="#b388ff"
              subtext={
                stats.minMoonDistKm > 0
                  ? `${fmtNum(stats.minMoonDistKm * 0.621371)} ${t("stats.cards.miles")}`
                  : t("stats.cards.awaitingFlyby")
              }
            />
            <StatCard
              label={t("stats.cards.totalDistance")}
              value={fmtNum(stats.totalDistanceKm)}
              unit="km"
              color="#ffaa00"
              subtext={`${fmtNum(stats.totalDistanceKm * 0.621371)} ${t("stats.cards.miles")}`}
            />
            <StatCard
              label={t("stats.cards.peakGForce")}
              value={stats.maxGForce > 0 ? stats.maxGForce.toFixed(2) : "\u2014"}
              unit="G"
              color="#ff6688"
              subtext={stats.maxGForce > 0 ? `${(stats.maxGForce * 9.81).toFixed(1)} m/s\u00b2` : t("stats.cards.noDataYet")}
            />
          </div>

          {/* Speed Ranking */}
          <SectionHeading>{t("stats.sections.speedRecords")}</SectionHeading>
          <div
            style={{
              background: "#0d1117",
              border: "1px solid rgba(0,229,255,0.1)",
              borderRadius: 8,
              padding: "20px 24px",
              marginBottom: 28,
            }}
          >
            {getSpeedRanking(stats.maxSpeedKmH).map((entry, idx) => {
              const isArtemis = entry.mission === "Artemis II";
              const maxSpeed = Math.max(
                ...getSpeedRanking(stats.maxSpeedKmH).map((e) => e.speedKmH)
              );
              const barWidth =
                maxSpeed > 0 ? (entry.speedKmH / maxSpeed) * 100 : 0;
              return (
                <div
                  key={entry.mission}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "8px 0",
                    borderBottom:
                      idx <
                      getSpeedRanking(stats.maxSpeedKmH).length - 1
                        ? "1px solid #1a2332"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      flex: "0 0 24px",
                      fontSize: 14,
                      fontWeight: 700,
                      color: idx === 0 ? "#ffaa00" : "#5a7a8a",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div
                    style={{
                      flex: "0 0 100px",
                      fontSize: 13,
                      color: isArtemis ? "#00e5ff" : "#8a9aaa",
                      fontWeight: isArtemis ? 700 : 400,
                    }}
                  >
                    {entry.mission}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        background: "#1a2332",
                        borderRadius: 4,
                        height: 8,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${barWidth}%`,
                          height: "100%",
                          background: isArtemis ? "#00e5ff" : "#3a4a5a",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      flex: "0 0 120px",
                      textAlign: "right",
                      fontSize: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: isArtemis ? "#00e5ff" : "#5a7a8a",
                    }}
                  >
                    {fmtNum(entry.speedKmH)} km/h
                  </div>
                </div>
              );
            })}
          </div>

          {/* Communications */}
          <SectionHeading>{t("stats.sections.communications")}</SectionHeading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard
              label={t("stats.cards.dsnUptime")}
              value={
                stats.dsnSignalUptime >= 0
                  ? `${stats.dsnSignalUptime.toFixed(1)}%`
                  : "\u2014"
              }
              color={
                stats.dsnSignalUptime >= 99
                  ? "#00ff88"
                  : stats.dsnSignalUptime >= 95
                    ? "#ffaa00"
                    : stats.dsnSignalUptime >= 0
                      ? "#ff4455"
                      : "#5a7a8a"
              }
              subtext={t("stats.cards.dsnUptimeSubtext")}
            />
            <StatCard
              label={t("stats.cards.longestBlackout")}
              value={
                stats.longestBlackoutSec > 0
                  ? stats.longestBlackoutSec >= 60
                    ? `${Math.floor(stats.longestBlackoutSec / 60)}m ${stats.longestBlackoutSec % 60}s`
                    : `${stats.longestBlackoutSec}s`
                  : "\u2014"
              }
              color="#ffaa00"
              subtext={
                stats.longestBlackoutSec > 0
                  ? `${fmtNum(stats.longestBlackoutSec)} ${t("stats.cards.secondsTotal")}`
                  : t("stats.cards.noBlackouts")
              }
            />
          </div>

          {/* Space weather */}
          <SectionHeading>{t("stats.sections.spaceWeather")}</SectionHeading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard
              label={t("stats.cards.peakKp")}
              value={stats.maxKpIndex.toFixed(1)}
              color={
                stats.maxKpIndex >= 5
                  ? "#ff4455"
                  : stats.maxKpIndex >= 4
                    ? "#ffaa00"
                    : "#00ff88"
              }
              subtext={
                stats.maxKpIndex >= 5
                  ? t("stats.cards.stormConditions")
                  : stats.maxKpIndex >= 4
                    ? t("stats.cards.unsettled")
                    : t("stats.cards.quiet")
              }
            />
            <StatCard
              label={t("stats.cards.geoEvents")}
              value={fmtNum(stats.solarEventCount)}
              unit={t("stats.cards.events")}
              color="#ffaa00"
              subtext={t("stats.cards.kpObservations")}
            />
          </div>

          {/* Data collection */}
          <SectionHeading>{t("stats.sections.dataCollection")}</SectionHeading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <StatCard
              label={t("stats.cards.orbitalFixes")}
              value={fmtNum(stats.stateVectorSamples)}
              color="#00e5ff"
              subtext={t("stats.cards.orbitalFixesSubtext")}
            />
            <StatCard
              label={t("stats.cards.dsnObs")}
              value={fmtNum(stats.dsnSamples)}
              color="#00ff88"
              subtext={t("stats.cards.dsnObsSubtext")}
            />
            <StatCard
              label={t("stats.cards.weatherReadings")}
              value={fmtNum(stats.solarSamples)}
              color="#ffaa00"
              subtext={t("stats.cards.weatherReadingsSubtext")}
            />
            <StatCard
              label={t("stats.cards.arowSamples")}
              value={fmtNum(stats.arowSamples)}
              color="#b388ff"
              subtext={t("stats.cards.arowSamplesSubtext")}
            />
            <StatCard
              label={t("stats.cards.trackingSince")}
              value={fmtDate(stats.firstSampleTs)}
              color="#5a7a8a"
              subtext={`${t("stats.cards.latest")} ${fmtDate(stats.latestSampleTs)}`}
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
            {t("stats.footer")}
          </div>
        </div>
      )}
    </main>
  );
}
