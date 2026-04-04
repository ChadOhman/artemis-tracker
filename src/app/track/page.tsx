"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  computeTopocentric,
  computeSubPoint,
  computeHeading,
  computeSunlight,
  formatRA,
  formatDec,
  formatHeading,
  type ObserverLocation,
  type Vec3,
} from "@/lib/topocentric";
import {
  connectTelescope,
  disconnectTelescope,
  slewToCoordinates,
  setTracking,
  abortSlew,
  getTelescopeState,
  type AlpacaState,
} from "@/lib/alpaca";
import type { SsePayload } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLatLon(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
  return `${latStr} · ${lonStr}`;
}

function azToCardinal(az: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(az / 45) % 8];
}

function deriveFlightState(earthDistKm: number, moonDistKm: number): string {
  if (earthDistKm < 2000) return "LEO";
  if (moonDistKm < 15000) return "Lunar Flyby";
  // Use current MET to determine outbound vs inbound
  // Closest approach is at MET 5/01:23 = ~5d 1.4h after launch
  const launchMs = Date.UTC(2026, 3, 1, 22, 35, 0);
  const closestApproachMs = launchMs + (5 * 24 + 1) * 3600000 + 23 * 60000;
  if (Date.now() < closestApproachMs) return "Outbound from Earth";
  return "Inbound to Earth";
}

function formatUtcTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }) + " UTC";
}

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------

function Card({
  label,
  children,
  subtitle,
}: {
  label: string;
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        background: "#0d1117",
        border: "1px solid rgba(0,229,255,0.1)",
        borderRadius: 8,
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: "#5a7a8a",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "#e0e8f0",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {children}
      </div>
      {subtitle && (
        <div style={{ fontSize: 10, color: "#4a5a6a", marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ground map (Leaflet — dynamically imported)
// ---------------------------------------------------------------------------

const MAX_TRACK_POINTS = 200;

interface MapHandle {
  updateOrion: (lat: number, lon: number) => void;
  updateObserver: (lat: number, lon: number) => void;
  addTrackPoint: (lat: number, lon: number) => void;
}

function useLeafletMap(
  containerRef: React.RefObject<HTMLDivElement | null>
): React.MutableRefObject<MapHandle | null> {
  const handleRef = useRef<MapHandle | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Inject Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    let map: import("leaflet").Map;
    let orionMarker: import("leaflet").CircleMarker;
    let observerMarker: import("leaflet").CircleMarker;
    let trackPolyline: import("leaflet").Polyline;
    const trackPoints: [number, number][] = [];

    import("leaflet").then((L) => {
      if (!containerRef.current) return;

      map = L.map(containerRef.current, {
        center: [0, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      orionMarker = L.circleMarker([0, 0], {
        radius: 8,
        color: "#00ff88",
        fillColor: "#00ff88",
        fillOpacity: 0.9,
        weight: 2,
      })
        .addTo(map)
        .bindTooltip("Orion Sub-Point", { permanent: false });

      observerMarker = L.circleMarker([0, 0], {
        radius: 7,
        color: "#4488ff",
        fillColor: "#4488ff",
        fillOpacity: 0.9,
        weight: 2,
      })
        .addTo(map)
        .bindTooltip("Your Location", { permanent: false });

      trackPolyline = L.polyline([], {
        color: "#ff8800",
        weight: 2,
        opacity: 0.7,
        dashArray: "6, 6",
      }).addTo(map);

      handleRef.current = {
        updateOrion(lat: number, lon: number) {
          orionMarker.setLatLng([lat, lon]);
        },
        updateObserver(lat: number, lon: number) {
          observerMarker.setLatLng([lat, lon]);
          map.setView([lat, lon], map.getZoom(), { animate: false });
        },
        addTrackPoint(lat: number, lon: number) {
          trackPoints.push([lat, lon]);
          if (trackPoints.length > MAX_TRACK_POINTS) trackPoints.shift();
          trackPolyline.setLatLngs(trackPoints);
        },
      };
    });

    return () => {
      link.remove();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (map) (map as any).remove();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return handleRef;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TrackPage() {
  // SSE state
  const [payload, setPayload] = useState<SsePayload | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sseError, setSseError] = useState<string | null>(null);

  // Geolocation
  const [observer, setObserver] = useState<ObserverLocation | null>(null);
  const [geoStatus, setGeoStatus] = useState<"requesting" | "ok" | "denied">("requesting");

  // Telescope control
  const [telescopeHost, setTelescopeHost] = useState("192.168.1.100:11111");
  const [alpacaState, setAlpacaState] = useState<AlpacaState | null>(null);
  const [telescopeStatus, setTelescopeStatus] = useState<"disconnected" | "connecting" | "connected" | "slewing">(
    "disconnected"
  );
  const [telescopeError, setTelescopeError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Map
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapHandle = useLeafletMap(mapContainerRef);

  // ---------------------------------------------------------------------------
  // SSE connection
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/telemetry/stream");

      es.addEventListener("telemetry", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as SsePayload;
          setPayload(data);
          setLastUpdate(new Date());
          setSseError(null);
        } catch {
          /* ignore parse errors */
        }
      });

      es.onerror = () => {
        setSseError("Stream disconnected — reconnecting…");
        es.close();
        reconnectTimer = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Geolocation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObserver({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: (pos.coords.altitude ?? 0) / 1000, // m → km
        });
        setGeoStatus("ok");
      },
      () => {
        setGeoStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 15000 }
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Load telescope host from localStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const stored = localStorage.getItem("alpaca_host");
    if (stored) setTelescopeHost(stored);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived computations
  // ---------------------------------------------------------------------------
  const scPos: Vec3 | null = payload?.stateVector?.position ?? null;
  const scVel: Vec3 | null = payload?.stateVector?.velocity ?? null;
  const utcMs = payload?.stateVector?.timestamp
    ? new Date(payload.stateVector.timestamp).getTime()
    : Date.now();

  const topo = scPos && observer
    ? computeTopocentric(scPos, observer, utcMs)
    : null;

  const subPoint = scPos ? computeSubPoint(scPos, utcMs) : null;
  const heading = scPos && scVel ? computeHeading(scPos, scVel, utcMs) : null;
  const sunlight = scPos ? computeSunlight(scPos, utcMs) : null;

  // ---------------------------------------------------------------------------
  // Update map when sub-point or observer changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!subPoint) return;
    const h = mapHandle.current;
    if (!h) return;
    h.updateOrion(subPoint.lat, subPoint.lon);
    h.addTrackPoint(subPoint.lat, subPoint.lon);
  }, [subPoint?.lat, subPoint?.lon, mapHandle]);

  useEffect(() => {
    if (!observer) return;
    const h = mapHandle.current;
    if (!h) return;
    h.updateObserver(observer.lat, observer.lon);
  }, [observer, mapHandle]);

  // ---------------------------------------------------------------------------
  // Telescope actions
  // ---------------------------------------------------------------------------
  const handleConnect = useCallback(async () => {
    setTelescopeStatus("connecting");
    setTelescopeError(null);
    localStorage.setItem("alpaca_host", telescopeHost);
    try {
      await connectTelescope(telescopeHost);
      const state = await getTelescopeState(telescopeHost);
      setAlpacaState(state);
      setIsTracking(state.tracking);
      setTelescopeStatus("connected");
    } catch (err) {
      setTelescopeError(err instanceof Error ? err.message : "Connect failed");
      setTelescopeStatus("disconnected");
    }
  }, [telescopeHost]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectTelescope(telescopeHost);
    } catch {
      /* ignore */
    }
    setAlpacaState(null);
    setTelescopeStatus("disconnected");
    setIsTracking(false);
  }, [telescopeHost]);

  const handleGoto = useCallback(async () => {
    if (!topo) return;
    setTelescopeStatus("slewing");
    setTelescopeError(null);
    try {
      await slewToCoordinates(telescopeHost, topo.ra, topo.dec);
      setTelescopeStatus("connected");
    } catch (err) {
      setTelescopeError(err instanceof Error ? err.message : "Slew failed");
      setTelescopeStatus("connected");
    }
  }, [telescopeHost, topo]);

  const handleTrackToggle = useCallback(async () => {
    const next = !isTracking;
    try {
      await setTracking(telescopeHost, next);
      setIsTracking(next);
    } catch (err) {
      setTelescopeError(err instanceof Error ? err.message : "Tracking error");
    }
  }, [telescopeHost, isTracking]);

  const handleAbort = useCallback(async () => {
    try {
      await abortSlew(telescopeHost);
      setTelescopeStatus("connected");
    } catch (err) {
      setTelescopeError(err instanceof Error ? err.message : "Abort failed");
    }
  }, [telescopeHost]);

  // ---------------------------------------------------------------------------
  // Sunlight badge helper
  // ---------------------------------------------------------------------------
  function sunlightBadge() {
    if (!sunlight) return <span style={{ color: "#aa9900" }}>Unknown</span>;
    if (sunlight.state === "sunlit") return <span style={{ color: "#00ff88" }}>Sunlit</span>;
    if (sunlight.state === "shadow") return <span style={{ color: "#5a7a8a" }}>In Shadow</span>;
    return <span style={{ color: "#aa9900" }}>Unknown</span>;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "#060a10",
        color: "#c0c8d4",
        fontFamily: "system-ui, sans-serif",
        padding: "0 0 40px",
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
              marginRight: 4,
            }}
          >
            &larr; Dashboard
          </a>
          <div
            style={{ width: 3, height: 22, background: "#00ff88", borderRadius: 2 }}
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
            Live Tracking
          </h1>
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            color: "#5a7a8a",
          }}
        >
          {lastUpdate ? (
            <>
              <span style={{ color: "#4a6a5a" }}>UPDATED </span>
              {formatUtcTime(lastUpdate)}
            </>
          ) : sseError ? (
            <span style={{ color: "#ff4444" }}>{sseError}</span>
          ) : (
            <span style={{ color: "#5a7a8a" }}>Connecting…</span>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          padding: "24px 24px 0",
        }}
      >
        {/* Left column: Mission Geometry */}
        <div>
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "#00e5ff",
              textTransform: "uppercase",
              margin: "0 0 14px",
            }}
          >
            Mission Geometry
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Card label="Telemetry Source">JPL Horizons</Card>

            <Card label="Sunlight">{sunlightBadge()}</Card>

            <Card label="Flight State">
              {payload
                ? deriveFlightState(
                    payload.telemetry.earthDistKm,
                    payload.telemetry.moonDistKm
                  )
                : "—"}
            </Card>

            <Card label="Direction of Travel">
              {heading !== null ? formatHeading(heading) : "—"}
            </Card>

            <Card
              label="Sub-Point"
              subtitle="Point on Earth directly beneath Orion"
            >
              {subPoint
                ? formatLatLon(subPoint.lat, subPoint.lon)
                : "—"}
            </Card>

            <Card label="Distance · Earth">
              {payload
                ? payload.telemetry.earthDistKm.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  }) + " km"
                : "—"}
            </Card>

            <Card label="Distance · Moon">
              {payload
                ? payload.telemetry.moonDistKm.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  }) + " km"
                : "—"}
            </Card>
          </div>
        </div>

        {/* Right column: Your Sky + Telescope Control */}
        <div>
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "#00e5ff",
              textTransform: "uppercase",
              margin: "0 0 14px",
            }}
          >
            Your Sky
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Card label="Visibility">
              {geoStatus === "requesting" ? (
                <span style={{ color: "#5a7a8a", fontSize: 13 }}>Requesting location…</span>
              ) : geoStatus === "denied" ? (
                <span style={{ color: "#ff4444", fontSize: 13 }}>Location unavailable</span>
              ) : topo ? (
                topo.visible ? (
                  <span style={{ color: "#00ff88" }}>Above your horizon</span>
                ) : (
                  <span style={{ color: "#ff4444" }}>Below your horizon</span>
                )
              ) : (
                "—"
              )}
            </Card>

            <Card
              label="Telescope Pointing"
              subtitle="Azimuth · elevation"
            >
              {topo
                ? `${topo.azimuth.toFixed(1)}° ${azToCardinal(topo.azimuth)} · ${topo.elevation.toFixed(1)}°`
                : "—"}
            </Card>

            <Card label="RA / Dec" subtitle="J2000 topocentric">
              {topo ? `${formatRA(topo.ra)}  ${formatDec(topo.dec)}` : "—"}
            </Card>

            <Card label="Range from You">
              {topo
                ? topo.range.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  }) + " km"
                : "—"}
            </Card>

            <Card
              label="Observer"
              subtitle="Browser geolocation"
            >
              {geoStatus === "requesting" ? (
                <span style={{ color: "#5a7a8a", fontSize: 13 }}>Requesting…</span>
              ) : geoStatus === "denied" ? (
                <span style={{ color: "#5a7a8a", fontSize: 13 }}>Unavailable</span>
              ) : observer ? (
                formatLatLon(observer.lat, observer.lon)
              ) : (
                "—"
              )}
            </Card>
          </div>

          {/* Telescope Control */}
          <div style={{ marginTop: 20 }}>
            <h2
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.16em",
                color: "#00e5ff",
                textTransform: "uppercase",
                margin: "0 0 14px",
              }}
            >
              Telescope Control
            </h2>
            <div
              style={{
                background: "#0d1117",
                border: "1px solid rgba(0,229,255,0.1)",
                borderRadius: 8,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Host input + connect/disconnect */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="telescope-host" className="sr-only">
                  Telescope host address
                </label>
                <input
                  id="telescope-host"
                  type="text"
                  value={telescopeHost}
                  onChange={(e) => setTelescopeHost(e.target.value)}
                  placeholder="host:port"
                  style={{
                    flex: 1,
                    background: "#060a10",
                    border: "1px solid rgba(0,229,255,0.15)",
                    borderRadius: 6,
                    padding: "6px 10px",
                    color: "#c0c8d4",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                {telescopeStatus === "disconnected" ? (
                  <button
                    onClick={handleConnect}
                    style={btnStyle("#00e5ff", "#001a20")}
                  >
                    Connect
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    style={btnStyle("#ff4444", "#200000")}
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {/* Status indicator */}
              <div
                aria-label={`Telescope status: ${telescopeStatus}${alpacaState?.slewing ? ", slewing" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background:
                      telescopeStatus === "connected"
                        ? "#00ff88"
                        : telescopeStatus === "slewing"
                        ? "#00e5ff"
                        : telescopeStatus === "connecting"
                        ? "#ffaa00"
                        : "#444",
                  }}
                />
                <span style={{ color: "#8a9aaa", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 10 }}>
                  {telescopeStatus}
                </span>
                {alpacaState?.slewing && (
                  <span style={{ color: "#00e5ff", fontSize: 10 }}>· SLEWING</span>
                )}
              </div>

              {telescopeError && (
                <div style={{ fontSize: 11, color: "#ff4444", fontFamily: "'JetBrains Mono', monospace" }}>
                  {telescopeError}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={handleGoto}
                  disabled={telescopeStatus !== "connected" || !topo}
                  style={btnStyle(
                    "#00ff88",
                    "#001a0d",
                    telescopeStatus !== "connected" || !topo
                  )}
                >
                  Goto Orion
                </button>

                <button
                  onClick={handleTrackToggle}
                  disabled={telescopeStatus !== "connected"}
                  style={btnStyle(
                    isTracking ? "#ffaa00" : "#00e5ff",
                    isTracking ? "#1a0e00" : "#001a20",
                    telescopeStatus !== "connected"
                  )}
                >
                  {isTracking ? "Stop Track" : "Track"}
                </button>

                <button
                  onClick={handleAbort}
                  disabled={telescopeStatus === "disconnected"}
                  style={btnStyle(
                    "#ff6644",
                    "#1a0800",
                    telescopeStatus === "disconnected"
                  )}
                >
                  Abort
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width ground map */}
      <div style={{ padding: "24px 24px 0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "#00e5ff",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Live Ground Map
          </h2>
          <span style={{ color: "#5a7a8a", fontSize: 9 }}>
            <span style={{ color: "#00ff88" }}>●</span> Orion Sub-Point
            {"  "}
            <span style={{ color: "#4488ff" }}>●</span> Your Location
          </span>
        </div>
        <div
          ref={mapContainerRef}
          aria-label="Live ground map showing Orion sub-satellite point and observer location"
          role="img"
          style={{
            height: 400,
            borderRadius: 8,
            border: "1px solid rgba(0,229,255,0.1)",
            overflow: "hidden",
            background: "#0d1117",
          }}
        />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Button style helper
// ---------------------------------------------------------------------------

function btnStyle(
  color: string,
  bg: string,
  disabled = false
): React.CSSProperties {
  return {
    padding: "6px 14px",
    background: disabled ? "#111820" : bg,
    border: `1px solid ${disabled ? "rgba(255,255,255,0.06)" : color + "55"}`,
    borderRadius: 6,
    color: disabled ? "#3a4a5a" : color,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: "0.06em",
    transition: "opacity 0.15s",
    opacity: disabled ? 0.5 : 1,
  };
}
