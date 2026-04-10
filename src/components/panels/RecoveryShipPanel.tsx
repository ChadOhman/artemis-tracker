"use client";
// Small panel showing the recovery ship's current position.
// Polls /api/recovery-ship every 30 seconds. Shows "AIS Dark" when
// US Navy warships have their AIS transponder disabled for operations.

import { useEffect, useRef, useState } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";

// Splashdown target (from ais-recovery-ship.ts)
const SPLASHDOWN_LAT = 31.0;
const SPLASHDOWN_LON = -117.5;

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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapHandleRef = useRef<{
    updateShip: (lat: number, lon: number, isLive: boolean) => void;
    destroy: () => void;
  } | null>(null);

  // Poll position
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

  // Initialize Leaflet map (once)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Load Leaflet CSS on demand
    const existing = document.querySelector('link[href*="leaflet.css"]');
    if (!existing) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    let map: import("leaflet").Map | null = null;
    let shipMarker: import("leaflet").CircleMarker | null = null;
    let splashdownMarker: import("leaflet").CircleMarker | null = null;

    import("leaflet").then((L) => {
      if (!mapContainerRef.current) return;

      map = L.map(mapContainerRef.current, {
        center: [SPLASHDOWN_LAT, SPLASHDOWN_LON],
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 10,
        }
      ).addTo(map);

      // Splashdown target crosshair
      splashdownMarker = L.circleMarker([SPLASHDOWN_LAT, SPLASHDOWN_LON], {
        radius: 6,
        color: "#ff6644",
        fillColor: "#ff6644",
        fillOpacity: 0.5,
        weight: 2,
      })
        .addTo(map)
        .bindTooltip("Splashdown Target", { permanent: false });

      // Inner dot for splashdown
      L.circleMarker([SPLASHDOWN_LAT, SPLASHDOWN_LON], {
        radius: 1.5,
        color: "#ff6644",
        fillColor: "#ff6644",
        fillOpacity: 1,
        weight: 1,
      }).addTo(map);

      shipMarker = L.circleMarker([SPLASHDOWN_LAT, SPLASHDOWN_LON], {
        radius: 7,
        color: "#00d4e8",
        fillColor: "#00d4e8",
        fillOpacity: 0.9,
        weight: 2,
      })
        .addTo(map)
        .bindTooltip("USS John P. Murtha", { permanent: false });

      mapHandleRef.current = {
        updateShip(lat: number, lon: number, isLive: boolean) {
          if (!shipMarker || !map) return;
          shipMarker.setLatLng([lat, lon]);
          shipMarker.setStyle({
            color: isLive ? "#00ff88" : "#ffaa00",
            fillColor: isLive ? "#00ff88" : "#ffaa00",
          });
          // Fit to show both ship and target
          const bounds = L.latLngBounds([
            [lat, lon],
            [SPLASHDOWN_LAT, SPLASHDOWN_LON],
          ]);
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 8, animate: false });
        },
        destroy() {
          if (map) {
            map.remove();
            map = null;
          }
          shipMarker = null;
          splashdownMarker = null;
        },
      };
    });

    return () => {
      mapHandleRef.current?.destroy();
      mapHandleRef.current = null;
    };
  }, []);

  // Update marker when data changes
  useEffect(() => {
    if (!data || !mapHandleRef.current) return;
    mapHandleRef.current.updateShip(data.lat, data.lon, data.isLive);
  }, [data]);

  const statusColor = data?.isLive ? "#00ff88" : "#ffaa00";
  const statusLabel = data?.isLive ? "AIS LIVE" : data ? "AIS DARK" : "LOADING";

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
        {/* Map */}
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: 160,
            borderRadius: 4,
            border: "1px solid var(--border-panel)",
            background: "#0a1020",
          }}
        />

        {data && <>
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
        </>}
      </div>
    </PanelFrame>
  );
}
