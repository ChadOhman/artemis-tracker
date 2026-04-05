"use client";
import { useEffect, useState } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { computeTopocentric } from "@/lib/topocentric";
import type { StateVector } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface StationSchedulePanelProps {
  stateVector: StateVector | null;
}

const STATIONS = [
  { id: "gdscc", name: "Goldstone", lat: 35.426, lon: -116.890, color: "#00e5ff" },
  { id: "mdscc", name: "Madrid", lat: 40.431, lon: -4.248, color: "#00ff88" },
  { id: "cdscc", name: "Canberra", lat: -35.402, lon: 148.982, color: "#ffaa00" },
] as const;

interface StationElevation {
  id: string;
  name: string;
  elevation: number;
  color: string;
  prime: boolean;
}

function computeElevations(stateVector: StateVector | null): StationElevation[] {
  if (!stateVector) {
    return STATIONS.map((s) => ({ ...s, elevation: 0, prime: false }));
  }

  const utcMs = new Date(stateVector.timestamp).getTime();
  const scPos = stateVector.position;

  const elevations = STATIONS.map((s) => {
    const result = computeTopocentric(scPos, { lat: s.lat, lon: s.lon, alt: 0 }, utcMs);
    return { id: s.id, name: s.name, elevation: result.elevation, color: s.color };
  });

  // Determine prime station (highest elevation)
  const maxElev = Math.max(...elevations.map((e) => e.elevation));
  const primeIdx = elevations.findIndex((e) => e.elevation === maxElev);

  return elevations.map((e, i) => ({ ...e, prime: i === primeIdx && e.elevation > 0 }));
}

export function StationSchedulePanel({ stateVector }: StationSchedulePanelProps) {
  const { t } = useLocale();
  const [stations, setStations] = useState<StationElevation[]>(() =>
    computeElevations(stateVector)
  );

  useEffect(() => {
    // Immediately compute on stateVector change
    setStations(computeElevations(stateVector));

    // Also update every 30 seconds since elevation changes over time even with the same stateVector
    const id = setInterval(() => {
      setStations(computeElevations(stateVector));
    }, 30000);

    return () => clearInterval(id);
  }, [stateVector]);

  const primeStation = stations.find((s) => s.prime);

  return (
    <PanelFrame
      title={t("stationSchedule.title")}
      icon="📡"
      accentColor="var(--accent-cyan)"
      headerRight={
        primeStation ? (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: primeStation.color,
            }}
          >
            {primeStation.name}
          </span>
        ) : null
      }
    >
      {stateVector === null && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            textAlign: "center",
            padding: "12px 0",
            letterSpacing: "0.06em",
          }}
        >
          Awaiting telemetry…
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stations.map((station) => {
          const elevDeg = station.elevation;
          const barPercent = Math.min(100, Math.max(0, (elevDeg / 90) * 100));
          const isVisible = elevDeg > 0;
          const displayColor = station.prime ? station.color : isVisible ? station.color : "var(--text-dim)";
          const opacity = station.prime ? 1 : isVisible ? 0.7 : 0.4;

          return (
            <div key={station.id} style={{ opacity }}>
              {/* Station header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: displayColor,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.04em",
                    flex: 1,
                  }}
                >
                  {station.name}
                </span>
                {station.prime && (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: station.color,
                      background: `${station.color}22`,
                      padding: "1px 5px",
                      borderRadius: 2,
                      textTransform: "uppercase",
                    }}
                  >
                    {t("stationSchedule.prime")}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isVisible ? displayColor : "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                    minWidth: 52,
                    textAlign: "right",
                  }}
                >
                  {isVisible ? `${elevDeg.toFixed(1)}°` : t("stationSchedule.belowHorizon")}
                </span>
              </div>

              {/* Elevation bar */}
              <div
                style={{
                  background: "#1a2332",
                  borderRadius: 3,
                  height: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${barPercent}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: isVisible ? station.color : "transparent",
                    transition: "width 0.4s ease",
                    boxShadow: station.prime ? `0 0 6px ${station.color}88` : "none",
                  }}
                />
              </div>

              {/* Scale labels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 2,
                  fontSize: 8,
                  color: "var(--text-dim)",
                }}
              >
                <span>0°</span>
                <span>45°</span>
                <span>90°</span>
              </div>
            </div>
          );
        })}
      </div>
    </PanelFrame>
  );
}
