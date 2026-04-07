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
import { useLocale } from "@/context/LocaleContext";
import type { SsePayload } from "@/lib/types";
import {
  predictVisibility,
  azToCardinal,
  formatLocalTime,
  formatLocalDate,
  type VisibilityWindow,
} from "@/lib/visibility";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLatLon(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
  return `${latStr} · ${lonStr}`;
}

function deriveFlightStateKey(earthDistKm: number, moonDistKm: number): string {
  if (earthDistKm < 2000) return "flightStates.leo";
  if (moonDistKm < 15000) return "flightStates.lunarFlyby";
  // Use current MET to determine outbound vs inbound
  // Closest approach is at MET 5/01:23 = ~5d 1.4h after launch
  const launchMs = Date.UTC(2026, 3, 1, 22, 35, 0);
  const closestApproachMs = launchMs + (5 * 24 + 1) * 3600000 + 23 * 60000;
  if (Date.now() < closestApproachMs) return "flightStates.outboundFromEarth";
  return "flightStates.inboundToEarth";
}

/**
 * Estimate visual magnitude of Orion spacecraft.
 * Based on a simplified model: apparent magnitude depends on distance,
 * spacecraft cross-section (~25 m²), albedo (~0.3), and solar illumination.
 * At lunar distance (~400,000 km) Orion is roughly mag 15-17.
 */
function estimateMagnitude(earthDistKm: number, sunlit: boolean): number | null {
  if (!sunlit) return null; // not visible if in Earth's shadow
  // Reference: ISS at ~400 km is mag ~-3 with ~4000 m² area
  // Orion has ~25 m² cross-section, albedo ~0.3
  // Mag = refMag + 5*log10(dist/refDist) - 2.5*log10(area/refArea)
  const refMag = -3;
  const refDistKm = 400;
  const refAreaM2 = 4000;
  const orionAreaM2 = 25;
  const mag = refMag
    + 5 * Math.log10(earthDistKm / refDistKm)
    - 2.5 * Math.log10(orionAreaM2 / refAreaM2);
  return Math.round(mag * 10) / 10;
}

/**
 * Compute angular separation between Orion and the Moon as seen from an observer.
 * Both positions are geocentric — for an observer on Earth the parallax is negligible
 * at lunar distances.
 */
function moonAngularSeparation(
  scPos: { x: number; y: number; z: number },
  moonPos: { x: number; y: number; z: number },
): { degrees: number; direction: string } {
  const scMag = Math.sqrt(scPos.x ** 2 + scPos.y ** 2 + scPos.z ** 2);
  const moonMag = Math.sqrt(moonPos.x ** 2 + moonPos.y ** 2 + moonPos.z ** 2);
  if (scMag === 0 || moonMag === 0) return { degrees: 0, direction: "" };

  // Angular separation
  const dot = (scPos.x * moonPos.x + scPos.y * moonPos.y + scPos.z * moonPos.z) / (scMag * moonMag);
  const degrees = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);

  // Position angle: compute RA/Dec for both, then find direction from Moon to Orion
  // RA = atan2(y, x), Dec = asin(z / r)  (equatorial frame)
  const scRA = Math.atan2(scPos.y, scPos.x);
  const scDec = Math.asin(scPos.z / scMag);
  const moonRA = Math.atan2(moonPos.y, moonPos.x);
  const moonDec = Math.asin(moonPos.z / moonMag);

  const dRA = scRA - moonRA; // positive = Orion is east of Moon
  const dDec = scDec - moonDec; // positive = Orion is north of Moon

  // Determine dominant direction
  let direction = "";
  if (degrees < 0.1) {
    direction = "overlapping";
  } else {
    const absDRA = Math.abs(dRA) * Math.cos((scDec + moonDec) / 2); // correct for dec
    const absDDec = Math.abs(dDec);
    if (absDDec > absDRA * 2) {
      direction = dDec > 0 ? "above" : "below";
    } else if (absDRA > absDDec * 2) {
      direction = dRA > 0 ? "to the left of" : "to the right of";
    } else {
      const vert = dDec > 0 ? "above" : "below";
      const horiz = dRA > 0 ? "left of" : "right of";
      direction = `${vert} and to the ${horiz}`;
    }
  }

  return { degrees, direction };
}

/**
 * Generate a simple two-line element set for Orion.
 * NOTE: TLEs are designed for Earth-orbiting objects and cannot accurately
 * represent a lunar trajectory. This is an approximation for use in
 * planetarium software — it will drift significantly within hours.
 */
function generateApproxTLE(
  pos: { x: number; y: number; z: number },
  vel: { x: number; y: number; z: number },
  utcDate: Date,
): string {
  const MU = 398600.4418; // Earth GM km³/s²
  const r = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
  const v = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);

  // Specific orbital energy
  const energy = (v * v) / 2 - MU / r;
  // Semi-major axis (may be negative for hyperbolic)
  const sma = -MU / (2 * energy);

  // Angular momentum vector
  const hx = pos.y * vel.z - pos.z * vel.y;
  const hy = pos.z * vel.x - pos.x * vel.z;
  const hz = pos.x * vel.y - pos.y * vel.x;
  const h = Math.sqrt(hx * hx + hy * hy + hz * hz);

  // Inclination
  const inc = Math.acos(hz / h) * (180 / Math.PI);

  // Eccentricity
  const eSq = 1 - (h * h) / (sma * MU);
  const ecc = Math.sqrt(Math.max(0, eSq));

  // RAAN (right ascension of ascending node)
  const nx = -hy;
  const ny = hx;
  const nMag = Math.sqrt(nx * nx + ny * ny);
  let raan = nMag > 0 ? Math.acos(nx / nMag) * (180 / Math.PI) : 0;
  if (ny < 0) raan = 360 - raan;

  // Mean motion (rev/day)
  const absA = Math.abs(sma);
  const period = 2 * Math.PI * Math.sqrt((absA ** 3) / MU); // seconds
  const meanMotion = 86400 / period;

  // Epoch
  const year = utcDate.getUTCFullYear() % 100;
  const startOfYear = Date.UTC(utcDate.getUTCFullYear(), 0, 1);
  const dayOfYear = (utcDate.getTime() - startOfYear) / 86400000 + 1;

  // Format TLE (simplified — many fields are approximated)
  const line1 = `1 99999U 26000A   ${String(year).padStart(2, "0")}${dayOfYear.toFixed(8).padStart(12, "0")}  .00000000  00000-0  00000-0 0  9999`;
  const line2 = `2 99999 ${inc.toFixed(4).padStart(8)} ${raan.toFixed(4).padStart(8)} ${ecc.toFixed(7).slice(2).padStart(7, "0")} 000.0000 000.0000 ${meanMotion.toFixed(8).padStart(11)}00001`;

  return `ORION (ARTEMIS II)\n${line1}\n${line2}`;
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
  const { t } = useLocale();

  // SSE state
  const [payload, setPayload] = useState<SsePayload | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sseError, setSseError] = useState<string | null>(null);

  // Geolocation + manual override
  const [observer, setObserver] = useState<ObserverLocation | null>(null);
  const [geoStatus, setGeoStatus] = useState<"requesting" | "ok" | "denied">("requesting");
  const [manualLocation, setManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [manualAlt, setManualAlt] = useState("");

  // Telescope control
  const [telescopeHost, setTelescopeHost] = useState("192.168.1.100:11111");
  const [alpacaState, setAlpacaState] = useState<AlpacaState | null>(null);
  const [telescopeStatus, setTelescopeStatus] = useState<"disconnected" | "connecting" | "connected" | "slewing">(
    "disconnected"
  );
  const [telescopeError, setTelescopeError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Visibility forecast
  const [forecast, setForecast] = useState<VisibilityWindow[]>([]);
  const lastForecastRef = useRef(0);

  // Recompute forecast every 5 minutes when we have data + location
  useEffect(() => {
    if (!payload || geoStatus !== "ok" || !observer) return;
    const now = Date.now();
    if (now - lastForecastRef.current < 300_000) return; // throttle to 5 min
    lastForecastRef.current = now;
    const sv = payload.stateVector;
    const windows = predictVisibility(
      sv.position,
      sv.velocity,
      observer,
      48
    );
    setForecast(windows);
  }, [payload, geoStatus, observer]);

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
        setSseError("stream_disconnected");
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
    if (!sunlight) return <span style={{ color: "#aa9900" }}>{t("common.unknown")}</span>;
    if (sunlight.state === "sunlit") return <span style={{ color: "#00ff88" }}>{t("track.sunlit")}</span>;
    if (sunlight.state === "shadow") return <span style={{ color: "#5a7a8a" }}>{t("track.inShadow")}</span>;
    return <span style={{ color: "#aa9900" }}>{t("common.unknown")}</span>;
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
            &larr; {t("track.dashboard")}
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
            {t("track.liveTracking")}
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
              <span style={{ color: "#4a6a5a" }}>{t("trackPage.updated")} </span>
              {formatUtcTime(lastUpdate)}
            </>
          ) : sseError ? (
            <span style={{ color: "#ff4444" }}>{sseError === "stream_disconnected" ? t("trackPage.streamDisconnected") : sseError}</span>
          ) : (
            <span style={{ color: "#5a7a8a" }}>{t("trackPage.connecting")}</span>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          padding: "24px 24px 24px",
          alignItems: "start",
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
            {t("track.missionGeometry")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Card label={t("track.telemetrySource")}>JPL Horizons</Card>

            <Card label={t("track.sunlight")}>{sunlightBadge()}</Card>

            <Card label={t("track.flightState")}>
              {payload
                ? t(deriveFlightStateKey(
                    payload.telemetry.earthDistKm,
                    payload.telemetry.moonDistKm
                  ))
                : "—"}
            </Card>

            <Card label={t("track.directionOfTravel")}>
              {heading !== null ? formatHeading(heading) : "—"}
            </Card>

            <Card
              label={t("track.subPoint")}
              subtitle={t("trackPage.subPointSubtitle")}
            >
              {subPoint
                ? formatLatLon(subPoint.lat, subPoint.lon)
                : "—"}
            </Card>

            <Card label={t("track.distanceEarth")}>
              {payload
                ? payload.telemetry.earthDistKm.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  }) + " km"
                : "—"}
            </Card>

            <Card label={t("track.distanceMoon")}>
              {payload
                ? payload.telemetry.moonDistKm.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  }) + " km"
                : "—"}
            </Card>

            <Card label={t("trackPage.speed")}>
              {payload
                ? payload.telemetry.speedKmH.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " km/h"
                : "—"}
            </Card>

            {/* Signal delay from observer */}
            <Card label={t("trackPage.signalDelay")} subtitle={t("trackPage.signalDelaySubtitle")}>
              {topo
                ? `${(topo.range / 299792).toFixed(2)}s`
                : payload
                ? `${(payload.telemetry.earthDistKm / 299792).toFixed(2)}s (${t("trackPage.geocentric")})`
                : "—"}
            </Card>

            {/* Closest ground point distance */}
            {observer && subPoint && (
              <Card label={t("trackPage.groundDistance")} subtitle={t("trackPage.groundDistanceSubtitle")}>
                {(() => {
                  const R = 6371;
                  const dLat = (subPoint.lat - observer.lat) * Math.PI / 180;
                  const dLon = (subPoint.lon - observer.lon) * Math.PI / 180;
                  const a = Math.sin(dLat / 2) ** 2 + Math.cos(observer.lat * Math.PI / 180) * Math.cos(subPoint.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  return dist.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " km";
                })()}
              </Card>
            )}

            {/* Sun-Earth-Orion angle (phase angle) */}
            {payload && (() => {
              const sv = payload.stateVector.position;
              const r = Math.sqrt(sv.x ** 2 + sv.y ** 2 + sv.z ** 2);
              if (r === 0) return null;
              // Sun direction (simplified): opposite of Earth's position around the Sun
              const dJ2000 = (Date.now() - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;
              const meanAnom = (357.5291 + 0.98560028 * dJ2000) * Math.PI / 180;
              const eclLon = (280.4600 + 0.98564736 * dJ2000 + 1.9148 * Math.sin(meanAnom)) * Math.PI / 180;
              const sunX = Math.cos(eclLon);
              const sunY = Math.sin(eclLon);
              // Phase angle: angle at Orion between Sun and Earth
              // Sun→Orion direction = sunDir - orionDir (approx)
              // Earth→Orion direction = orion position (geocentric)
              const orionUnit = { x: sv.x / r, y: sv.y / r, z: sv.z / r };
              // Sun-Earth-Orion elongation (angle at Earth between Sun and Orion)
              const dotSO = sunX * orionUnit.x + sunY * orionUnit.y;
              const elongation = Math.acos(Math.max(-1, Math.min(1, dotSO))) * (180 / Math.PI);
              return (
                <Card label={t("trackPage.solarElongation")} subtitle={t("trackPage.solarElongationSubtitle")}>
                  <span>{elongation.toFixed(1)}°</span>
                  <span style={{ fontSize: 10, color: "#5a7a8a", marginLeft: 8 }}>
                    {elongation > 90 ? t("trackPage.goodViewing") : elongation > 30 ? t("trackPage.moderateViewing") : t("trackPage.poorViewing")}
                  </span>
                </Card>
              );
            })()}

            {/* Constellation */}
            {topo && (() => {
              // Determine constellation from RA/Dec using rough boundaries
              const raH = ((topo.ra % 24) + 24) % 24;
              const dec = topo.dec;
              // Simplified constellation lookup
              let constellation = "unknown";
              if (dec > 60) constellation = raH > 12 ? "Draco" : "Ursa Major";
              else if (dec > 30) {
                if (raH < 3) constellation = "Andromeda";
                else if (raH < 6) constellation = "Perseus";
                else if (raH < 9) constellation = "Lynx";
                else if (raH < 12) constellation = "Leo Minor";
                else if (raH < 15) constellation = "Boötes";
                else if (raH < 18) constellation = "Hercules";
                else if (raH < 21) constellation = "Cygnus";
                else constellation = "Pegasus";
              } else if (dec > 0) {
                if (raH < 2) constellation = "Pisces";
                else if (raH < 4) constellation = "Aries";
                else if (raH < 6) constellation = "Taurus";
                else if (raH < 8) constellation = "Gemini";
                else if (raH < 10) constellation = "Cancer";
                else if (raH < 12) constellation = "Leo";
                else if (raH < 14) constellation = "Virgo";
                else if (raH < 16) constellation = "Libra";
                else if (raH < 17) constellation = "Serpens";
                else if (raH < 19) constellation = "Ophiuchus";
                else if (raH < 20) constellation = "Sagittarius";
                else if (raH < 22) constellation = "Aquarius";
                else constellation = "Pisces";
              } else if (dec > -30) {
                if (raH < 2) constellation = "Cetus";
                else if (raH < 4) constellation = "Eridanus";
                else if (raH < 6) constellation = "Orion";
                else if (raH < 8) constellation = "Monoceros";
                else if (raH < 10) constellation = "Hydra";
                else if (raH < 12) constellation = "Corvus";
                else if (raH < 14) constellation = "Virgo";
                else if (raH < 16) constellation = "Libra";
                else if (raH < 18) constellation = "Scorpius";
                else if (raH < 20) constellation = "Sagittarius";
                else if (raH < 22) constellation = "Capricornus";
                else constellation = "Aquarius";
              } else {
                if (raH < 4) constellation = "Eridanus";
                else if (raH < 8) constellation = "Canis Major";
                else if (raH < 12) constellation = "Hydra";
                else if (raH < 16) constellation = "Centaurus";
                else if (raH < 20) constellation = "Sagittarius";
                else constellation = "Piscis Austrinus";
              }
              return (
                <Card label={t("trackPage.constellation")} subtitle={t("trackPage.constellationSubtitle")}>
                  {constellation}
                </Card>
              );
            })()}

            {/* Earth-Moon-Orion geometry diagram */}
            {payload && payload.moonPosition && (
              <Card label={t("trackPage.geometry")} subtitle={t("trackPage.geometrySubtitle")}>
                <svg viewBox="0 0 200 80" style={{ width: "100%", maxWidth: 300 }}>
                  {/* Earth */}
                  <circle cx="20" cy="40" r="10" fill="rgba(80,140,255,0.15)" stroke="rgba(80,140,255,0.4)" strokeWidth="0.5" />
                  <text x="20" y="60" textAnchor="middle" fontSize="7" fill="rgba(80,140,255,0.7)" fontFamily="monospace">{t("trackPage.earth")}</text>

                  {/* Moon */}
                  <circle cx="160" cy="40" r="5" fill="rgba(200,200,210,0.15)" stroke="rgba(200,200,210,0.4)" strokeWidth="0.5" />
                  <text x="160" y="55" textAnchor="middle" fontSize="7" fill="rgba(200,200,210,0.7)" fontFamily="monospace">{t("trackPage.moon")}</text>

                  {/* Earth-Moon line */}
                  <line x1="30" y1="40" x2="155" y2="40" stroke="rgba(100,100,120,0.2)" strokeWidth="0.5" strokeDasharray="3,3" />

                  {/* Orion position — project onto the line between Earth and Moon */}
                  {(() => {
                    const ed = payload.telemetry.earthDistKm;
                    const md = payload.telemetry.moonDistKm;
                    const totalDist = 384400;
                    // X position: fraction along Earth-Moon line
                    const frac = Math.min(1.1, ed / totalDist);
                    const ox = 20 + frac * 140;
                    // Y offset based on whether Orion is above/below the line
                    const moonMag = Math.sqrt(payload.moonPosition.x ** 2 + payload.moonPosition.y ** 2 + payload.moonPosition.z ** 2);
                    const orionMag = Math.sqrt(payload.stateVector.position.x ** 2 + payload.stateVector.position.y ** 2 + payload.stateVector.position.z ** 2);
                    // Cross product Z component gives above/below
                    const cross = payload.stateVector.position.x * payload.moonPosition.y - payload.stateVector.position.y * payload.moonPosition.x;
                    const oy = 40 + (cross > 0 ? -12 : 12) * Math.min(1, md / 50000);
                    return (
                      <>
                        {/* Line from Earth to Orion */}
                        <line x1="20" y1="40" x2={ox} y2={oy} stroke="rgba(0,255,136,0.3)" strokeWidth="0.5" />
                        {/* Orion dot */}
                        <circle cx={ox} cy={oy} r="3" fill="#00ff88" />
                        <text x={ox} y={oy - 6} textAnchor="middle" fontSize="6" fill="#00ff88" fontFamily="monospace">Orion</text>
                        {/* Distance labels */}
                        <text x={(20 + ox) / 2} y={oy > 40 ? 25 : 55} textAnchor="middle" fontSize="5" fill="rgba(100,160,255,0.5)" fontFamily="monospace">
                          {(ed / 1000).toFixed(0)}k km
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </Card>
            )}
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
            {t("track.yourSky")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* VISIBLE NOW banner */}
            {topo && topo.visible && (
              <div style={{
                background: "rgba(0,255,136,0.08)",
                border: "2px solid rgba(0,255,136,0.4)",
                borderRadius: 8,
                padding: "12px 16px",
                textAlign: "center",
                animation: "pulse 2s ease-in-out infinite",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#00ff88", letterSpacing: "0.12em" }}>
                  {t("trackPage.visibleNow")}
                </div>
                <div style={{ fontSize: 12, color: "#a0b0c0", marginTop: 4 }}>
                  {t("trackPage.lookDirection").replace("{dir}", azToCardinal(topo.azimuth)).replace("{el}", topo.elevation.toFixed(0))}
                </div>
              </div>
            )}

            <Card label={t("track.visibility")}>
              {geoStatus === "requesting" ? (
                <span style={{ color: "#5a7a8a", fontSize: 13 }}>{t("track.requestingLocation")}</span>
              ) : geoStatus === "denied" ? (
                <span style={{ color: "#ff4444", fontSize: 13 }}>{t("track.locationUnavailable")}</span>
              ) : topo ? (
                topo.visible ? (
                  <span style={{ color: "#00ff88" }}>{t("track.aboveHorizon")} ({topo.elevation.toFixed(1)}°)</span>
                ) : (
                  <span style={{ color: "#ff4444" }}>{t("track.belowHorizon")} ({topo.elevation.toFixed(1)}°)</span>
                )
              ) : (
                "—"
              )}
            </Card>

            {/* Compass direction — plain language */}
            {topo && topo.visible && (
              <Card label={t("trackPage.whereToLook")} subtitle={t("trackPage.whereToLookSubtitle")}>
                <span style={{ color: "#00ff88", fontSize: 14 }}>
                  {t("trackPage.lookDirectionDetailed").replace("{dir}", azToCardinal(topo.azimuth)).replace("{az}", topo.azimuth.toFixed(0)).replace("{el}", topo.elevation.toFixed(0))}
                </span>
              </Card>
            )}

            <Card
              label={t("track.telescopePointing")}
              subtitle={t("trackPage.azimuthElevation")}
            >
              {topo
                ? `${topo.azimuth.toFixed(1)}° ${azToCardinal(topo.azimuth)} · ${topo.elevation.toFixed(1)}°`
                : "—"}
            </Card>

            <Card label={t("track.raDec")} subtitle={t("trackPage.j2000Topocentric")}>
              {topo ? `${formatRA(topo.ra)}  ${formatDec(topo.dec)}` : "—"}
            </Card>

            {/* Estimated magnitude */}
            <Card label={t("trackPage.estMagnitude")} subtitle={t("trackPage.estMagnitudeSubtitle")}>
              {payload ? (() => {
                const sunInfo = computeSunlight(payload.stateVector.position, Date.now());
                const mag = estimateMagnitude(payload.telemetry.earthDistKm, sunInfo.state === "sunlit");
                if (mag === null) return <span style={{ color: "#5a7a8a" }}>{t("trackPage.inEarthShadow")}</span>;
                return (
                  <div>
                    <span style={{ color: mag < 10 ? "#ffaa00" : "#5a7a8a" }}>mag {mag.toFixed(1)}</span>
                    <span style={{ fontSize: 10, color: "#5a7a8a", marginLeft: 8 }}>
                      {mag < 6 ? t("trackPage.nakedEye") : mag < 10 ? t("trackPage.binoculars") : mag < 14 ? t("trackPage.smallTelescope") : t("trackPage.largeTelescope")}
                    </span>
                  </div>
                );
              })() : "—"}
            </Card>

            {/* Moon proximity */}
            {payload && payload.moonPosition && (
              <Card label={t("trackPage.moonProximity")} subtitle={t("trackPage.moonProximitySubtitle")}>
                {(() => {
                  const { degrees: sep, direction } = moonAngularSeparation(payload.stateVector.position, payload.moonPosition);
                  return (
                    <div>
                      <span style={{ color: sep < 5 ? "#ffaa00" : "#a0b0c0" }}>{sep.toFixed(1)}°</span>
                      <span style={{ fontSize: 10, color: "#5a7a8a", marginLeft: 8 }}>
                        {sep < 0.5 ? t("trackPage.veryCloseToMoon") : sep < 2 ? `${t("trackPage.nearTheMoon")} — ${direction}` : sep < 10 ? `${direction}` : t("trackPage.farFromMoon")}
                      </span>
                    </div>
                  );
                })()}
              </Card>
            )}

            <Card label={t("track.rangeFromYou")}>
              {topo
                ? topo.range.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  }) + " km"
                : "—"}
            </Card>

            {/* TLE Export */}
            {payload && (
              <Card label={t("trackPage.exportTle")} subtitle={t("trackPage.exportTleSubtitle")}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 9, color: "#5a7a8a", lineHeight: 1.4 }}>
                    {t("trackPage.tleDescription")}
                  </div>
                  <button
                    onClick={() => {
                      const tle = generateApproxTLE(
                        payload.stateVector.position,
                        payload.stateVector.velocity,
                        new Date(),
                      );
                      navigator.clipboard.writeText(tle).then(() => {
                        alert(t("trackPage.tleCopiedAlert"));
                      }).catch(() => {
                        // Fallback: show in a prompt
                        prompt(t("trackPage.copyTlePrompt"), tle);
                      });
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "#1a2332",
                      border: "1px solid rgba(0,229,255,0.2)",
                      borderRadius: 4,
                      color: "#00e5ff",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {t("trackPage.copyTleToClipboard")}
                  </button>
                </div>
              </Card>
            )}

            <Card
              label={t("track.observer")}
              subtitle={manualLocation ? t("trackPage.manualCoordinates") : t("trackPage.browserGeolocation")}
            >
              {observer ? (
                <div>
                  <span>{formatLatLon(observer.lat, observer.lon)}</span>
                  {observer.alt > 0 && <span style={{ color: "#5a7a8a", fontSize: 10, marginLeft: 6 }}>{(observer.alt * 1000).toFixed(0)}m</span>}
                </div>
              ) : geoStatus === "requesting" ? (
                <span style={{ color: "#5a7a8a", fontSize: 13 }}>{t("trackPage.requesting")}</span>
              ) : (
                <span style={{ color: "#5a7a8a", fontSize: 13 }}>{t("trackPage.unavailable")}</span>
              )}
              <button
                onClick={() => setManualLocation((v) => !v)}
                style={{
                  marginTop: 6,
                  background: "none",
                  border: "1px solid rgba(0,229,255,0.2)",
                  borderRadius: 3,
                  color: "#5a7a8a",
                  fontSize: 9,
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {manualLocation ? t("trackPage.useGps") : t("trackPage.setManually")}
              </button>
              {manualLocation && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="number"
                      step="0.001"
                      placeholder={t("trackPage.latPlaceholder")}
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "4px 6px",
                        background: "#1a2332",
                        border: "1px solid rgba(0,229,255,0.15)",
                        borderRadius: 3,
                        color: "#e0e8f0",
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    />
                    <input
                      type="number"
                      step="0.001"
                      placeholder={t("trackPage.lonPlaceholder")}
                      value={manualLon}
                      onChange={(e) => setManualLon(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "4px 6px",
                        background: "#1a2332",
                        border: "1px solid rgba(0,229,255,0.15)",
                        borderRadius: 3,
                        color: "#e0e8f0",
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="number"
                      step="1"
                      placeholder={t("trackPage.elevationPlaceholder")}
                      value={manualAlt}
                      onChange={(e) => setManualAlt(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "4px 6px",
                        background: "#1a2332",
                        border: "1px solid rgba(0,229,255,0.15)",
                        borderRadius: 3,
                        color: "#e0e8f0",
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    />
                    <button
                      onClick={() => {
                        const lat = parseFloat(manualLat);
                        const lon = parseFloat(manualLon);
                        const alt = parseFloat(manualAlt) || 0;
                        if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                          setObserver({ lat, lon, alt: alt / 1000 });
                          setGeoStatus("ok");
                        }
                      }}
                      style={{
                        padding: "4px 12px",
                        background: "var(--accent-cyan, #00e5ff)",
                        border: "none",
                        borderRadius: 3,
                        color: "#001a20",
                        fontWeight: 700,
                        fontSize: 10,
                        cursor: "pointer",
                      }}
                    >
                      {t("trackPage.set")}
                    </button>
                  </div>
                </div>
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
              {t("track.telescopeControl")}
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
              <div style={{ fontSize: 11, color: "#5a7a8a", lineHeight: 1.5, marginBottom: 4 }}>
                {t("trackPage.telescopeDescription")}
              </div>
              {/* Host input + connect/disconnect */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label htmlFor="telescope-host" className="sr-only">
                  {t("trackPage.telescopeHostLabel")}
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
                    {t("trackPage.connect")}
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    style={btnStyle("#ff4444", "#200000")}
                  >
                    {t("trackPage.disconnect")}
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
                  {t(`trackPage.telescopeStatus.${telescopeStatus}`)}
                </span>
                {alpacaState?.slewing && (
                  <span style={{ color: "#00e5ff", fontSize: 10 }}>· {t("trackPage.slewing")}</span>
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
                  {t("trackPage.gotoOrion")}
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
                  {isTracking ? t("trackPage.stopTrack") : t("trackPage.trackBtn")}
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
                  {t("trackPage.abort")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visibility Forecast */}
      <div style={{ padding: "24px 24px 0" }}>
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
          {t("track.visibilityForecast")}
        </h2>
        {geoStatus !== "ok" ? (
          <div style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 8, padding: 16, color: "#5a7a8a", fontSize: 13 }}>
            {geoStatus === "requesting" ? t("trackPage.forecastRequestingLocation") : t("trackPage.forecastLocationRequired")}
          </div>
        ) : forecast.length === 0 ? (
          <div style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 8, padding: 16, color: "#5a7a8a", fontSize: 13 }}>
            {payload ? t("trackPage.forecastNoPassesDetailed") : t("trackPage.forecastWaitingTelemetry")}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                background: "#0d1117",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,229,255,0.15)", color: "#5a7a8a", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("track.date")}</th>
                  <th style={{ padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("track.start")}</th>
                  <th style={{ padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("track.end")}</th>
                  <th style={{ padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("track.duration")}</th>
                  <th style={{ padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("track.maxElevation")}</th>
                  <th style={{ padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("track.direction")}</th>
                  <th style={{ padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("track.raDec")}</th>
                  {telescopeStatus === "connected" && (
                    <th style={{ padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("trackPage.slew")}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {forecast.map((w, i) => {
                  const isBest = w.maxElevation >= 20;
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        color: isBest ? "#e0e8f0" : "#8a9db0",
                      }}
                    >
                      <td style={{ padding: "8px 12px" }}>{formatLocalDate(w.startUtc)}</td>
                      <td style={{ padding: "8px 12px" }}>{formatLocalTime(w.startUtc)}</td>
                      <td style={{ padding: "8px 12px" }}>{formatLocalTime(w.endUtc)}</td>
                      <td style={{ padding: "8px 12px" }}>{w.durationMin} {t("trackPage.min")}</td>
                      <td style={{ padding: "8px 12px", color: isBest ? "#00ff88" : undefined }}>
                        {w.maxElevation}° {azToCardinal(w.maxElevationAz)}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: 11 }}>
                        {azToCardinal(w.startAz)} → {azToCardinal(w.endAz)}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: 11 }}>
                        {formatRA(w.ra)}<br />
                        {formatDec(w.dec)}
                      </td>
                      {telescopeStatus === "connected" && (
                        <td style={{ padding: "8px 12px" }}>
                          <button
                            onClick={() => slewToCoordinates(telescopeHost, w.ra, w.dec)}
                            style={{
                              padding: "3px 10px",
                              background: "rgba(0,229,255,0.1)",
                              border: "1px solid rgba(0,229,255,0.3)",
                              borderRadius: 4,
                              color: "#00e5ff",
                              fontSize: 10,
                              cursor: "pointer",
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {t("trackPage.goto")}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: "#4a5a6a", marginTop: 8, lineHeight: 1.6 }}>
              {t("trackPage.forecastFooter")}
              {telescopeStatus === "connected" && t("trackPage.forecastFooterTelescope")}
            </div>
          </div>
        )}
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
            {t("track.liveGroundMap")}
          </h2>
          <span style={{ color: "#5a7a8a", fontSize: 9 }}>
            <span style={{ color: "#00ff88" }}>●</span> {t("trackPage.orionSubPoint")}
            {"  "}
            <span style={{ color: "#4488ff" }}>●</span> {t("trackPage.yourLocation")}
          </span>
        </div>
        <div
          ref={mapContainerRef}
          aria-label={t("trackPage.mapAriaLabel")}
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
