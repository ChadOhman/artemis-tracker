"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { DsnStatus, DsnDish, StateVector } from "@/lib/types";
import { predictVisibility, azToCardinal, formatLocalTime } from "@/lib/visibility";
import { computeTopocentric } from "@/lib/topocentric";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DSN_STATIONS = [
  {
    id: "gdscc",
    name: "🇺🇸 Goldstone",
    location: "California, USA",
    lat: 35.426,
    lon: -116.89,
    color: "#00e5ff",
  },
  {
    id: "mdscc",
    name: "🇪🇸 Madrid",
    location: "Spain",
    lat: 40.431,
    lon: -3.95,
    color: "#00ff88",
  },
  {
    id: "cdscc",
    name: "🇦🇺 Canberra",
    location: "Australia",
    lat: -35.402,
    lon: 148.98,
    color: "#ffaa00",
  },
] as const;

const STATION_COLORS: Record<string, string> = {
  gdscc: "#00e5ff",
  mdscc: "#00ff88",
  cdscc: "#ffaa00",
};

// ---------------------------------------------------------------------------
// Types for history data
// ---------------------------------------------------------------------------

interface HistoryPoint {
  ts: number;
  downKbps: number;
  upKbps: number;
  stations: string[];
  dishes: { dish: string; station: string; downKbps: number; upKbps: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function latLonToVec3(
  lat: number,
  lon: number,
  radius: number
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function formatUtcTime(date: Date): string {
  return (
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }) + " UTC"
  );
}

function formatDataRate(rate: number): string {
  if (rate <= 0) return "\u2014";
  if (rate >= 1_000_000) return (rate / 1_000_000).toFixed(2) + " Mbps";
  if (rate >= 1_000) return (rate / 1_000).toFixed(1) + " kbps";
  return rate.toFixed(0) + " bps";
}

function formatRtlt(seconds: number): string {
  if (seconds <= 0) return "\u2014";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtKbps(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${Math.round(kbps).toLocaleString()} kbps`;
}

// ---------------------------------------------------------------------------
// Feature 5: Dish Azimuth/Elevation Polar Plot (SVG)
// ---------------------------------------------------------------------------

function AzElPolarPlot({ azimuth, elevation }: { azimuth: number; elevation: number }) {
  const size = 80;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = (size / 2) - 8;

  // elevation: 90 at center, 0 at edge
  const r = maxR * (1 - elevation / 90);
  const azRad = (azimuth - 90) * (Math.PI / 180); // rotate so 0=North is up
  const px = cx + r * Math.cos(azRad);
  const py = cy + r * Math.sin(azRad);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {/* Concentric rings at 0, 30, 60, 90 deg elevation */}
      {[0, 30, 60].map((el) => {
        const ringR = maxR * (1 - el / 90);
        return (
          <circle
            key={el}
            cx={cx}
            cy={cy}
            r={ringR}
            fill="none"
            stroke="rgba(0,229,255,0.12)"
            strokeWidth={0.5}
          />
        );
      })}
      {/* Cross-hairs N/S/E/W */}
      <line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke="rgba(0,229,255,0.08)" strokeWidth={0.5} />
      <line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="rgba(0,229,255,0.08)" strokeWidth={0.5} />
      {/* Cardinal labels */}
      <text x={cx} y={6} textAnchor="middle" fill="rgba(0,229,255,0.4)" fontSize={6} fontWeight={700}>N</text>
      <text x={cx} y={size - 1} textAnchor="middle" fill="rgba(0,229,255,0.4)" fontSize={6} fontWeight={700}>S</text>
      <text x={4} y={cy + 2} textAnchor="middle" fill="rgba(0,229,255,0.4)" fontSize={6} fontWeight={700}>W</text>
      <text x={size - 4} y={cy + 2} textAnchor="middle" fill="rgba(0,229,255,0.4)" fontSize={6} fontWeight={700}>E</text>
      {/* Pointing dot */}
      <circle cx={px} cy={py} r={3} fill="#00ff88" opacity={0.9} />
      <circle cx={px} cy={py} r={6} fill="#00ff88" opacity={0.2} />
      {/* Label */}
      <text x={cx} y={size - 1} textAnchor="middle" fill="rgba(255,255,255,0)" fontSize={0}>
        {/* invisible for accessibility */}
        Az: {azimuth.toFixed(1)}, El: {elevation.toFixed(1)}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Feature 1: Signal Timeline Canvas (24h)
// ---------------------------------------------------------------------------

function SignalTimeline({ history }: { history: HistoryPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.offsetWidth;
    const cssH = canvas.offsetHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    const W = cssW;
    const H = cssH;
    const PAD_L = 72;
    const PAD_R = 12;
    const PAD_T = 8;
    const PAD_B = 22;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const rowH = chartH / 3;

    ctx.clearRect(0, 0, W, H);

    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    const tMin = now - windowMs;
    const tMax = now;

    const toX = (ts: number) => PAD_L + ((ts - tMin) / (tMax - tMin)) * chartW;

    const stationIds = ["gdscc", "mdscc", "cdscc"];
    const stationNames = ["Goldstone", "Madrid", "Canberra"];
    const stationColors = ["#00e5ff", "#00ff88", "#ffaa00"];

    // Draw station labels and rows
    for (let row = 0; row < 3; row++) {
      const rowTop = PAD_T + row * rowH;

      // Station label
      ctx.fillStyle = stationColors[row];
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(stationNames[row], PAD_L - 8, rowTop + rowH / 2);

      // Row background
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(PAD_L, rowTop + 2, chartW, rowH - 4);

      // Draw active segments
      if (history.length >= 2) {
        ctx.fillStyle = stationColors[row] + "88";
        for (let i = 0; i < history.length - 1; i++) {
          const p = history[i];
          const pNext = history[i + 1];
          if (p.stations.includes(stationIds[row])) {
            const x1 = toX(p.ts);
            const x2 = toX(pNext.ts);
            ctx.fillRect(x1, rowTop + 4, Math.max(x2 - x1, 1), rowH - 8);
          }
        }
      }

      // Row separator
      if (row < 2) {
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD_L, rowTop + rowH);
        ctx.lineTo(PAD_L + chartW, rowTop + rowH);
        ctx.stroke();
      }
    }

    // X-axis time labels
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const xLabelY = PAD_T + chartH + 4;
    for (let h = 0; h <= 24; h += 6) {
      const t = now - (24 - h) * 3600_000;
      const x = toX(t);
      const label = h === 24 ? "now" : `-${24 - h}h`;
      ctx.fillText(label, x, xLabelY);
    }

    // Vertical grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let h = 6; h < 24; h += 6) {
      const t = now - (24 - h) * 3600_000;
      const x = toX(t);
      ctx.beginPath();
      ctx.moveTo(x, PAD_T);
      ctx.lineTo(x, PAD_T + chartH);
      ctx.stroke();
    }
  }, [history]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: 120, display: "block" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Feature 2: Bigger Bandwidth Chart (60min, per-dish breakdown)
// ---------------------------------------------------------------------------

function BandwidthChart({ history, dsn }: { history: HistoryPoint[]; dsn: DsnStatus | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Append live data to history
  const [liveHistory, setLiveHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    setLiveHistory(history);
  }, [history]);

  useEffect(() => {
    if (!dsn) return;
    const dishes = dsn.dishes.filter((d) => d.downlinkActive || d.uplinkActive);
    const stations = [...new Set(dishes.map((d) => d.station))];
    const dishDetails = dishes.map((d) => ({
      dish: d.dish,
      station: d.station,
      downKbps: d.downlinkActive ? d.downlinkRate / 1000 : 0,
      upKbps: d.uplinkActive ? d.uplinkRate / 1000 : 0,
    }));
    const activeDl = dsn.dishes.find((d) => d.downlinkActive);
    const activeUl = dsn.dishes.find((d) => d.uplinkActive);
    const newPoint: HistoryPoint = {
      ts: Date.now(),
      downKbps: activeDl ? activeDl.downlinkRate / 1000 : 0,
      upKbps: activeUl ? activeUl.uplinkRate / 1000 : 0,
      stations,
      dishes: dishDetails,
    };
    setLiveHistory((prev) => {
      const lastTs = prev[prev.length - 1]?.ts ?? 0;
      const next = newPoint.ts > lastTs + 500 ? [...prev, newPoint] : prev;
      const cutoff = Date.now() - 60 * 60 * 1000;
      return next.filter((p) => p.ts > cutoff);
    });
  }, [dsn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.offsetWidth;
    const cssH = canvas.offsetHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    const W = cssW;
    const H = cssH;
    const PAD_L = 56;
    const PAD_R = 12;
    const PAD_T = 8;
    const PAD_B = 22;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    ctx.clearRect(0, 0, W, H);

    if (liveHistory.length < 2) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText("Collecting data\u2026", W / 2, H / 2);
      return;
    }

    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const tMin = now - windowMs;
    const tMax = now;

    const maxVal = Math.max(
      ...liveHistory.map((p) => Math.max(p.downKbps, p.upKbps)),
      1
    );

    const toX = (ts: number) => PAD_L + ((ts - tMin) / (tMax - tMin)) * chartW;
    const toY = (val: number) => PAD_T + chartH - (val / maxVal) * chartH;

    // Grid lines (horizontal)
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD_T + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(PAD_L + chartW, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const val = maxVal * (1 - i / 4);
      const y = PAD_T + (chartH / 4) * i;
      ctx.fillText(fmtKbps(val), PAD_L - 6, y);
    }

    // Grid lines (vertical - every 10 min)
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let m = 10; m < 60; m += 10) {
      const x = toX(now - m * 60 * 1000);
      ctx.beginPath();
      ctx.moveTo(x, PAD_T);
      ctx.lineTo(x, PAD_T + chartH);
      ctx.stroke();
    }

    // Per-dish colored fill areas
    const dishNames = new Set<string>();
    for (const p of liveHistory) {
      for (const d of p.dishes) dishNames.add(d.dish + "|" + d.station);
    }
    const dishArray = [...dishNames];

    for (const key of dishArray) {
      const [, station] = key.split("|");
      const color = STATION_COLORS[station] || "#00e5ff";

      ctx.beginPath();
      ctx.fillStyle = color + "18";
      let started = false;
      const pts: { x: number; y: number }[] = [];
      for (const p of liveHistory) {
        const dishData = p.dishes.find((d) => d.dish + "|" + d.station === key);
        const val = dishData ? dishData.downKbps : 0;
        const x = toX(p.ts);
        const y = toY(val);
        pts.push({ x, y });
        if (!started) {
          ctx.moveTo(x, PAD_T + chartH);
          ctx.lineTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (pts.length > 0) {
        ctx.lineTo(pts[pts.length - 1].x, PAD_T + chartH);
        ctx.closePath();
        ctx.fill();
      }

      // Line on top
      ctx.beginPath();
      ctx.strokeStyle = color + "aa";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
        else ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }

    // Total downlink line (bright cyan)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,229,255,0.9)";
    ctx.lineWidth = 2;
    for (let i = 0; i < liveHistory.length; i++) {
      const x = toX(liveHistory[i].ts);
      const y = toY(liveHistory[i].downKbps);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Uplink line (dim)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,180,200,0.4)";
    ctx.lineWidth = 1;
    for (let i = 0; i < liveHistory.length; i++) {
      const x = toX(liveHistory[i].ts);
      const y = toY(liveHistory[i].upKbps);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "8px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const xLabelY = PAD_T + chartH + 6;
    for (let m = 0; m <= 60; m += 10) {
      const t = now - (60 - m) * 60 * 1000;
      const x = toX(t);
      const label = m === 60 ? "now" : `\u2212${60 - m}m`;
      ctx.fillText(label, x, xLabelY);
    }
  }, [liveHistory]);

  const latest = liveHistory[liveHistory.length - 1];

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: 180, display: "block" }}
      />
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 8,
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#8a9aaa",
        }}
      >
        <span>
          <span style={{ color: "#00e5ff" }}>{"\u2193"}</span>{" "}
          {latest ? fmtKbps(latest.downKbps) : "\u2014"}
        </span>
        <span style={{ opacity: 0.6 }}>
          <span style={{ color: "#00b4c8" }}>{"\u2191"}</span>{" "}
          {latest ? fmtKbps(latest.upKbps) : "\u2014"}
        </span>
        {latest && latest.dishes.length > 0 && (
          <span style={{ opacity: 0.5, fontSize: 10 }}>
            via {latest.dishes.map((d) => d.dish).join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Three.js Globe (with Features 4 + 8: signal pulse + Orion dot)
// ---------------------------------------------------------------------------

interface GlobeProps {
  activeDishes: DsnDish[];
  orionPosition: { x: number; y: number; z: number } | null;
}

function GlobeCanvas({ activeDishes, orionPosition }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Ref so the animation loop always sees current props
  const activeDishesRef = useRef(activeDishes);
  activeDishesRef.current = activeDishes;
  const stateRef = useRef<{
    renderer: import("three").WebGLRenderer | null;
    scene: import("three").Scene | null;
    camera: import("three").PerspectiveCamera | null;
    globe: import("three").Mesh | null;
    beamLines: import("three").Line[];
    signalDots: import("three").Mesh[];
    orionDot: import("three").Mesh | null;
    orionGlow: import("three").Mesh | null;
    labelPositions: { id: string; vec: [number, number, number] }[];
    rafId: number;
    three: typeof import("three") | null;
    stationDots: import("three").Mesh[];
    beamData: { start: import("three").Vector3; end: import("three").Vector3; rtlt: number; _stationIdx?: number }[];
    _camAngle?: number;
  }>({
    renderer: null,
    scene: null,
    camera: null,
    globe: null,
    beamLines: [],
    signalDots: [],
    orionDot: null,
    orionGlow: null,
    labelPositions: [],
    rafId: 0,
    three: null,
    stationDots: [],
    beamData: [],
  });

  // Label state - positions in screen space
  const [labels, setLabels] = useState<
    { id: string; name: string; x: number; y: number }[]
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let destroyed = false;

    import("three").then((THREE) => {
      if (destroyed || !canvas) return;
      const s = stateRef.current;
      s.three = THREE;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      s.renderer = renderer;

      // Scene
      const scene = new THREE.Scene();
      s.scene = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(
        45,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        100
      );
      camera.position.set(0, 1.2, 5.0);
      camera.lookAt(0, 0, 0);
      s.camera = camera;

      // Lighting — dim ambient so the dark side stays dark and city
      // lights are visible; directional light simulates the sun.
      scene.add(new THREE.AmbientLight(0x111122, 0.8));
      const dirLight = new THREE.DirectionalLight(0xffeedd, 2.5);
      scene.add(dirLight);
      // We'll update dirLight position each frame to match the sun.

      // Globe — day/night with NASA Black Marble city lights.
      // Sun-lit side shows a dark blue ocean/land tint from the directional
      // light; night side glows with city lights via emissiveMap.
      const globeGeo = new THREE.SphereGeometry(1, 48, 48);
      const nightTexture = new THREE.TextureLoader().load("/earth-night.jpg");
      nightTexture.colorSpace = THREE.SRGBColorSpace;
      const solidMat = new THREE.MeshStandardMaterial({
        color: 0x1a3050,        // subtle blue tint on the day side
        emissive: 0xffffff,     // full-color emission
        emissiveMap: nightTexture, // city lights glow on the dark side
        emissiveIntensity: 1.2,
        roughness: 1,
        metalness: 0,
      });
      const solidMesh = new THREE.Mesh(globeGeo, solidMat);
      scene.add(solidMesh);
      s.globe = solidMesh;

      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x1a3a5a,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      });
      const wireMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.002, 24, 24),
        wireMat
      );
      scene.add(wireMesh);
      solidMesh.add(wireMesh);

      // Station marker dots — children of the globe so they rotate with Earth
      s.stationDots = [];
      s.labelPositions = [];
      for (const station of DSN_STATIONS) {
        const [sx, sy, sz] = latLonToVec3(station.lat, station.lon, 1.01);
        const dotGeo = new THREE.SphereGeometry(0.022, 8, 8);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(sx, sy, sz);
        solidMesh.add(dot); // child of globe mesh
        s.stationDots.push(dot);
        s.labelPositions.push({ id: station.id, vec: [sx, sy, sz] });
      }

      // Glow sprite for each station — also children of globe
      for (const station of DSN_STATIONS) {
        const [sx, sy, sz] = latLonToVec3(station.lat, station.lon, 1.01);
        const glowGeo = new THREE.SphereGeometry(0.035, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0x00e5ff,
          transparent: true,
          opacity: 0.2,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(sx, sy, sz);
        solidMesh.add(glow); // child of globe mesh
      }

      // Animation loop
      function animate() {
        s.rafId = requestAnimationFrame(animate);

        const now = Date.now();

        // Proper GMST (Greenwich Mean Sidereal Time) so the texture
        // aligns with real Earth — Greenwich faces the right direction.
        const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
        const daysSinceJ2000 = (now - J2000) / 86400000;
        const gmstDeg = (280.46061837 + 360.98564736629 * daysSinceJ2000) % 360;
        const gmstRad = gmstDeg * (Math.PI / 180);

        // When a station is actively tracking, freeze globe rotation so
        // the station stays put and the camera can center on it cleanly.
        const currentDishes = activeDishesRef.current;
        const hasActiveStation = currentDishes.length > 0 &&
          DSN_STATIONS.some((st) => st.id === currentDishes[0]?.station);
        if (!hasActiveStation) {
          // Idle: real-time sidereal rotation
          if (s.globe) s.globe.rotation.y = gmstRad;
        }
        // When active, globe.rotation.y stays at whatever it was when
        // tracking started — effectively frozen.
        const rotY = s.globe?.rotation.y ?? gmstRad;

        // Sun position — simplified solar ephemeris. Ecliptic longitude
        // converted to equatorial direction vector for the directional light.
        const meanAnomaly = (357.5291 + 0.98560028 * daysSinceJ2000) * Math.PI / 180;
        const eclLon = (280.4600 + 0.98564736 * daysSinceJ2000 + 1.9148 * Math.sin(meanAnomaly)) * Math.PI / 180;
        const obliquity = 23.44 * Math.PI / 180;
        // Sun direction in equatorial coords (scene Y = north pole)
        const sunX = Math.cos(eclLon);
        const sunY = Math.sin(eclLon) * Math.sin(obliquity);
        const sunZ = -Math.sin(eclLon) * Math.cos(obliquity);
        dirLight.position.set(sunX * 5, sunY * 5, sunZ * 5);

        // Camera faces the active DSN station so the signal beam is always
        // visible. Falls back to a slow orbit when no station is tracking.
        // Station dots are in fixed scene coordinates (not children of the
        // rotating globe mesh), so the camera angle is derived directly
        // from the station dot's XZ position in world space.
        // Helper: rotate a station's local XZ by the globe's current Y rotation
        function stationWorldXZ(idx: number): [number, number] {
          const [lx, , lz] = s.labelPositions[idx]?.vec ?? [0, 0, 0];
          const wx = lx * Math.cos(rotY) + lz * Math.sin(rotY);
          const wz = -lx * Math.sin(rotY) + lz * Math.cos(rotY);
          return [wx, wz];
        }

        const camRadius = 5.0;
        let targetCamAngle: number;
        const activeStationIdx = currentDishes.length > 0
          ? DSN_STATIONS.findIndex((st) => st.id === currentDishes[0].station)
          : -1;
        if (activeStationIdx >= 0 && s.labelPositions[activeStationIdx]) {
          const [wx, wz] = stationWorldXZ(activeStationIdx);
          targetCamAngle = Math.atan2(wx, wz);
        } else {
          targetCamAngle = (now / 1000 / 60) * 0.3; // slow idle orbit
        }
        // Smooth interpolation — faster easing since globe is frozen during tracking
        if (s._camAngle === undefined) s._camAngle = targetCamAngle;
        const diff = Math.atan2(Math.sin(targetCamAngle - s._camAngle), Math.cos(targetCamAngle - s._camAngle));
        s._camAngle += diff * 0.15;
        camera.position.x = Math.sin(s._camAngle) * camRadius;
        camera.position.z = Math.cos(s._camAngle) * camRadius;
        // Tilt camera Y toward the active station's latitude
        const targetY = activeStationIdx >= 0
          ? (s.labelPositions[activeStationIdx]?.vec[1] ?? 0) * 0.8
          : 1.0;
        camera.position.y += (targetY - camera.position.y) * 0.1;
        camera.lookAt(0, 0, 0);

        // Update beam line start positions from rotating station dots
        for (let i = 0; i < s.beamLines.length; i++) {
          const beam = s.beamData[i];
          const line = s.beamLines[i];
          if (!beam || !line) continue;
          if (beam._stationIdx != null && s.labelPositions[beam._stationIdx]) {
            const [lx, ly, lz] = s.labelPositions[beam._stationIdx].vec;
            beam.start.set(
              lx * Math.cos(rotY) + lz * Math.sin(rotY),
              ly,
              -lx * Math.sin(rotY) + lz * Math.cos(rotY),
            );
            const positions = line.geometry.attributes.position;
            if (positions) {
              (positions as any).setXYZ(0, beam.start.x, beam.start.y, beam.start.z);
              positions.needsUpdate = true;
            }
          }
        }

        // Animate signal pulse dots along beams
        for (let i = 0; i < s.signalDots.length; i++) {
          const dot = s.signalDots[i];
          const beam = s.beamData[i];
          if (!dot || !beam) continue;
          const rtltHalf = Math.max(beam.rtlt / 2, 1);
          const t = ((now / 1000) % rtltHalf) / rtltHalf;
          dot.position.lerpVectors(beam.start, beam.end, t);
          (dot.material as import("three").MeshBasicMaterial).opacity = 0.4 + 0.6 * Math.sin(t * Math.PI);
        }

        // Feature 8: Pulse Orion dot glow
        if (s.orionGlow) {
          const pulse = 0.15 + 0.1 * Math.sin(now / 500);
          (s.orionGlow.material as import("three").MeshBasicMaterial).opacity = pulse;
        }

        renderer.render(scene, camera);

        // Project station positions to screen for CSS labels
        if (canvas) {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          const newLabels = DSN_STATIONS.map((station, i) => {
            const [lx, ly, lz] = s.labelPositions[i]?.vec ?? [0, 0, 0];
            // Rotate by globe's current Y rotation
            const rx = lx * Math.cos(rotY) + lz * Math.sin(rotY);
            const ry = ly;
            const rz = -lx * Math.sin(rotY) + lz * Math.cos(rotY);
            const worldPos = new THREE.Vector3(rx, ry, rz);
            // Check if on the camera-facing side
            const toCamera = new THREE.Vector3().subVectors(camera.position, worldPos).normalize();
            const surfaceNormal = worldPos.clone().normalize();
            const facing = toCamera.dot(surfaceNormal) > 0;
            // Project to screen
            const projected = worldPos.clone().project(camera);
            const x = ((projected.x + 1) / 2) * w;
            const y = ((-projected.y + 1) / 2) * h;
            return { id: station.id, name: station.name, x, y, visible: facing };
          });
          setLabels(newLabels.filter((l) => l.visible));
        }
      }

      animate();
    });

    // Resize handler
    function handleResize() {
      const s = stateRef.current;
      if (!canvas || !s.renderer || !s.camera) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      s.renderer.setSize(w, h);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", handleResize);

    return () => {
      destroyed = true;
      window.removeEventListener("resize", handleResize);
      const s = stateRef.current;
      cancelAnimationFrame(s.rafId);
      s.renderer?.dispose();
      s.renderer = null;
      s.scene = null;
      s.camera = null;
      s.globe = null;
      s.three = null;
    };
  }, []);

  // Update beam lines, signal dots, and Orion dot whenever activeDishes or orionPosition changes
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene || !s.three) return;
    const THREE = s.three;

    // Remove old beams
    for (const line of s.beamLines) s.scene.remove(line);
    s.beamLines = [];

    // Remove old signal dots
    for (const dot of s.signalDots) s.scene.remove(dot);
    s.signalDots = [];
    s.beamData = [];

    // Remove old Orion dot
    if (s.orionDot) { s.scene.remove(s.orionDot); s.orionDot = null; }
    if (s.orionGlow) { s.scene.remove(s.orionGlow); s.orionGlow = null; }

    // Compute Orion direction in the globe's coordinate frame.
    // JPL state vector is J2000 equatorial (EME2000) — REF_PLANE='FRAME'.
    // Convert to RA/Dec, then use latLonToVec3(dec, ra) to match the globe.
    let orionDir: [number, number, number] | null = null;
    if (orionPosition) {
      const mag = Math.sqrt(
        orionPosition.x ** 2 + orionPosition.y ** 2 + orionPosition.z ** 2
      );
      if (mag > 0) {
        // Position is already equatorial — no obliquity rotation needed
        const ra = Math.atan2(orionPosition.y, orionPosition.x) * (180 / Math.PI);
        const dec = Math.asin(orionPosition.z / mag) * (180 / Math.PI);
        const [ox, oy, oz] = latLonToVec3(dec, ra, 1);
        orionDir = [ox, oy, oz];
      }
    }

    // Feature 8: Orion dot at beam endpoint
    const endScale = 3.5; // far enough from globe to always be visible
    if (orionDir) {
      const orionPos = new THREE.Vector3(
        orionDir[0] * endScale,
        orionDir[1] * endScale,
        orionDir[2] * endScale
      );

      const dotGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, depthTest: false });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.renderOrder = 1;
      dot.position.copy(orionPos);
      s.scene.add(dot);
      s.orionDot = dot;

      // Glow around Orion dot
      const glowGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.2,
        depthTest: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.renderOrder = 1;
      glow.position.copy(orionPos);
      s.scene.add(glow);
      s.orionGlow = glow;
    }

    for (const dish of activeDishes) {
      const stationIdx = DSN_STATIONS.findIndex((st) => st.id === dish.station);
      if (stationIdx < 0) continue;

      // Station start position — use direct rotation math from local coords
      const [lx, ly, lz] = s.labelPositions[stationIdx]?.vec ?? [0, 0, 0];
      const currentRotY = s.globe?.rotation.y ?? 0;
      const startVec = new THREE.Vector3(
        lx * Math.cos(currentRotY) + lz * Math.sin(currentRotY),
        ly,
        -lx * Math.sin(currentRotY) + lz * Math.cos(currentRotY),
      );

      const endVec = orionDir
        ? new THREE.Vector3(orionDir[0] * endScale, orionDir[1] * endScale, orionDir[2] * endScale)
        : startVec.clone().multiplyScalar(endScale / startVec.length());

      const points = [startVec.clone(), endVec.clone()];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.8,
        linewidth: 2,
        depthTest: false,
      });
      const line = new THREE.Line(geo, mat);
      s.scene.add(line);
      s.beamLines.push(line);

      // Feature 4: Signal pulse dot
      const pulseDotGeo = new THREE.SphereGeometry(0.02, 8, 8);
      const pulseDotMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.8,
        depthTest: false,
      });
      const pulseDot = new THREE.Mesh(pulseDotGeo, pulseDotMat);
      pulseDot.position.copy(startVec);
      s.scene.add(pulseDot);
      s.signalDots.push(pulseDot);
      s.beamData.push({
        start: startVec.clone(),
        end: endVec.clone(),
        rtlt: dish.rtltSeconds > 0 ? dish.rtltSeconds : 2,
        _stationIdx: stationIdx,
      });
    }
  }, [activeDishes, orionPosition]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {labels.map((label) => (
        <div
          key={label.id}
          style={{
            position: "absolute",
            left: label.x + 6,
            top: label.y - 8,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#00e5ff",
            textTransform: "uppercase",
            pointerEvents: "none",
            textShadow: "0 0 6px rgba(0,229,255,0.8)",
            whiteSpace: "nowrap",
          }}
        >
          {label.name}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature 3: Station card with ALL active dishes + Feature 5: Polar plot
// ---------------------------------------------------------------------------

interface StationCardProps {
  stationId: string;
  stationName: string;
  location: string;
  dishes: DsnDish[];
}

function StationCard({ stationId, stationName, location, dishes }: StationCardProps) {
  const trackingDishes = dishes.filter((d) => d.station === stationId);
  const active = trackingDishes.length > 0;

  return (
    <div
      style={{
        background: "#0d1117",
        border: `1px solid ${active ? "rgba(0,229,255,0.25)" : "rgba(0,229,255,0.08)"}`,
        borderRadius: 8,
        padding: "16px 18px",
        transition: "border-color 0.3s",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#e0e8f0",
              letterSpacing: "0.06em",
            }}
          >
            {stationName}
          </div>
          <div style={{ fontSize: 10, color: "#5a7a8a", marginTop: 2 }}>
            {location}
          </div>
        </div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            padding: "3px 8px",
            borderRadius: 4,
            background: active ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.04)",
            color: active ? "#00ff88" : "#3a4a5a",
            border: `1px solid ${active ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.06)"}`,
          }}
        >
          {active ? `TRACKING (${trackingDishes.length})` : "IDLE"}
        </div>
      </div>

      {/* Feature 3: ALL active dishes rendered */}
      {trackingDishes.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {trackingDishes.map((dish, idx) => (
            <div key={dish.dish + idx}>
              {trackingDishes.length > 1 && idx > 0 && (
                <div style={{ borderTop: "1px solid rgba(0,229,255,0.06)", marginBottom: 8 }} />
              )}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* Feature 5: Polar plot */}
                <div style={{ flexShrink: 0 }}>
                  <AzElPolarPlot azimuth={dish.azimuth} elevation={dish.elevation} />
                  <div style={{ fontSize: 8, color: "#4a5a6a", textAlign: "center", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                    Az {dish.azimuth.toFixed(1)}{"\u00b0"} El {dish.elevation.toFixed(1)}{"\u00b0"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <DataRow label="Dish" value={dish.dish} />
                  <DataRow
                    label="Downlink"
                    value={
                      dish.downlinkActive
                        ? `${dish.downlinkBand || "\u2014"} \u00b7 ${formatDataRate(dish.downlinkRate)}`
                        : "Inactive"
                    }
                    dim={!dish.downlinkActive}
                  />
                  <DataRow
                    label="Uplink"
                    value={dish.uplinkActive ? (dish.uplinkBand || "Active") : "Inactive"}
                    dim={!dish.uplinkActive}
                  />
                  <DataRow
                    label="Range"
                    value={
                      dish.rangeKm > 0
                        ? dish.rangeKm.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          }) + " km"
                        : "\u2014"
                    }
                  />
                  <DataRow label="RTLT" value={formatRtlt(dish.rtltSeconds)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            fontSize: 11,
            color: "#3a4a5a",
            fontFamily: "'JetBrains Mono', monospace",
            paddingTop: 4,
          }}
        >
          No active contact
        </div>
      )}
    </div>
  );
}

function DataRow({
  label,
  value,
  dim = false,
}: {
  label: string;
  value: string;
  dim?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#4a5a6a",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          color: dim ? "#3a4a5a" : "#a0b0c0",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature 6: Station Visibility / Schedule
// ---------------------------------------------------------------------------

interface VisWindow {
  station: string;
  stationName: string;
  color: string;
  startUtc: string;
  endUtc: string;
  durationMin: number;
  maxElevation: number;
  maxElevationAz: number;
  startAz: number;
  endAz: number;
}

function VisibilitySchedule({ stateVector }: { stateVector: StateVector | null }) {
  const [windows, setWindows] = useState<VisWindow[]>([]);

  useEffect(() => {
    if (!stateVector) return;

    const allWindows: VisWindow[] = [];
    for (const station of DSN_STATIONS) {
      const observer = { lat: station.lat, lon: station.lon, alt: 0 };
      const wins = predictVisibility(
        stateVector.position,
        stateVector.velocity,
        observer,
        12
      );
      for (const w of wins) {
        allWindows.push({
          station: station.id,
          stationName: station.name,
          color: STATION_COLORS[station.id] || "#00e5ff",
          ...w,
        });
      }
    }

    // Sort by start time
    allWindows.sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());
    setWindows(allWindows);
  }, [stateVector]);

  // Also compute current elevations
  const elevations = useMemo(() => {
    if (!stateVector) return DSN_STATIONS.map((s) => ({ id: s.id, name: s.name, elevation: 0 }));
    const utcMs = new Date(stateVector.timestamp).getTime();
    return DSN_STATIONS.map((s) => {
      const result = computeTopocentric(stateVector.position, { lat: s.lat, lon: s.lon, alt: 0 }, utcMs);
      return { id: s.id, name: s.name, elevation: result.elevation };
    });
  }, [stateVector]);

  if (!stateVector) {
    return (
      <div style={{ fontSize: 11, color: "#3a4a5a", textAlign: "center", padding: "16px 0" }}>
        Awaiting telemetry for visibility prediction...
      </div>
    );
  }

  return (
    <div>
      {/* Current elevations */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {elevations.map((e) => {
          const color = STATION_COLORS[e.id] || "#00e5ff";
          const isVisible = e.elevation > 0;
          return (
            <div
              key={e.id}
              style={{
                background: isVisible ? `${color}10` : "rgba(255,255,255,0.02)",
                border: `1px solid ${isVisible ? `${color}30` : "rgba(255,255,255,0.04)"}`,
                borderRadius: 6,
                padding: "8px 12px",
                flex: "1 1 120px",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.08em" }}>
                {e.name}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: isVisible ? "#e0e8f0" : "#3a4a5a",
                  marginTop: 2,
                }}
              >
                {e.elevation.toFixed(1)}{"\u00b0"}
              </div>
              <div style={{ fontSize: 9, color: isVisible ? color : "#3a4a5a" }}>
                {isVisible ? "ABOVE HORIZON" : "BELOW HORIZON"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming visibility windows */}
      {windows.length === 0 ? (
        <div style={{ fontSize: 11, color: "#5a7a8a", fontFamily: "'JetBrains Mono', monospace" }}>
          No dark-sky visibility windows in next 12 hours
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {windows.slice(0, 8).map((w, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 6,
                border: `1px solid ${w.color}15`,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 32,
                  borderRadius: 2,
                  background: w.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: w.color }}>
                    {w.stationName}
                  </span>
                  <span style={{ fontSize: 10, color: "#5a7a8a", fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatLocalTime(w.startUtc)} {"\u2013"} {formatLocalTime(w.endUtc)}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: "#5a7a8a", fontFamily: "'JetBrains Mono', monospace" }}>
                  {w.durationMin}min {"\u00b7"} max el {w.maxElevation}{"\u00b0"} {azToCardinal(w.maxElevationAz)} {"\u00b7"} rise {azToCardinal(w.startAz)} set {azToCardinal(w.endAz)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DsnPage() {
  const [dsnStatus, setDsnStatus] = useState<DsnStatus | null>(null);
  const [stateVector, setStateVector] = useState<StateVector | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sseError, setSseError] = useState<string | null>(null);
  const [history24h, setHistory24h] = useState<HistoryPoint[]>([]);
  const [history60m, setHistory60m] = useState<HistoryPoint[]>([]);

  // SSE connection
  useEffect(() => {
    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/telemetry/stream");

      es.addEventListener("dsn", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as DsnStatus;
          setDsnStatus(data);
          setLastUpdate(new Date());
          setSseError(null);
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("telemetry", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as { stateVector: StateVector; dsn: DsnStatus };
          setStateVector(data.stateVector);
          if (data.dsn) {
            setDsnStatus(data.dsn);
            setLastUpdate(new Date());
          }
          setSseError(null);
        } catch {
          /* ignore */
        }
      });

      es.onerror = () => {
        setSseError("Stream disconnected \u2014 reconnecting\u2026");
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

  // Fetch 24h history for signal timeline
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dsn/history?minutes=1440")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data?.history)) return;
        setHistory24h(data.history as HistoryPoint[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Fetch 60m history for bandwidth chart
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dsn/history?minutes=60")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data?.history)) return;
        const cutoff = Date.now() - 60 * 60 * 1000;
        setHistory60m((data.history as HistoryPoint[]).filter((p) => p.ts > cutoff));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const activeDishes = dsnStatus?.dishes ?? [];

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
          flexWrap: "wrap",
          gap: 8,
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
            Deep Space Network
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
            <span style={{ color: "#5a7a8a" }}>Connecting{"\u2026"}</span>
          )}
        </div>
      </div>

      {/* Globe */}
      <div
        style={{
          width: "100%",
          height: 700,
          position: "relative",
          borderBottom: "1px solid rgba(0,229,255,0.06)",
        }}
      >
        <GlobeCanvas
          activeDishes={activeDishes}
          orionPosition={stateVector?.position ?? null}
        />

        {/* Legend overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 20,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            color: "#5a7a8a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#00e5ff",
                boxShadow: "0 0 6px #00e5ff",
              }}
            />
            DSN Station
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 20,
                height: 2,
                background: "#00ff88",
                opacity: 0.8,
              }}
            />
            Signal Beam
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#00ff88",
                boxShadow: "0 0 6px #00ff88",
              }}
            />
            Orion
          </div>
        </div>

        {/* Signal active badge */}
        {dsnStatus?.signalActive && (
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 20,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#00ff88",
              background: "rgba(0,255,136,0.08)",
              border: "1px solid rgba(0,255,136,0.25)",
              borderRadius: 6,
              padding: "4px 10px",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#00ff88",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            SIGNAL ACTIVE
          </div>
        )}
      </div>

      {/* Feature 7: Responsive Station Cards */}
      <div style={{ padding: "28px 24px 0" }}>
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
          Station Status
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {DSN_STATIONS.map((station) => (
            <StationCard
              key={station.id}
              stationId={station.id}
              stationName={station.name}
              location={station.location}
              dishes={activeDishes}
            />
          ))}
        </div>
      </div>

      {/* Feature 1: Signal Timeline (24h) */}
      <div style={{ padding: "28px 24px 0" }}>
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
          Signal Timeline (24h)
        </h2>
        <div
          style={{
            background: "#0d1117",
            border: "1px solid rgba(0,229,255,0.08)",
            borderRadius: 8,
            padding: "12px 16px",
          }}
        >
          {history24h.length > 0 ? (
            <SignalTimeline history={history24h} />
          ) : (
            <div style={{ fontSize: 11, color: "#3a4a5a", textAlign: "center", padding: "24px 0", fontFamily: "'JetBrains Mono', monospace" }}>
              Loading signal history{"\u2026"}
            </div>
          )}
        </div>
      </div>

      {/* Feature 2: Bigger Bandwidth Chart (60min) */}
      <div style={{ padding: "28px 24px 0" }}>
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
          Bandwidth (60min)
        </h2>
        <div
          style={{
            background: "#0d1117",
            border: "1px solid rgba(0,229,255,0.08)",
            borderRadius: 8,
            padding: "12px 16px",
          }}
        >
          <BandwidthChart history={history60m} dsn={dsnStatus} />
        </div>
      </div>

      {/* Feature 6: Station Visibility / Schedule */}
      <div style={{ padding: "28px 24px 0" }}>
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
          Visibility Forecast (12h)
        </h2>
        <div
          style={{
            background: "#0d1117",
            border: "1px solid rgba(0,229,255,0.08)",
            borderRadius: 8,
            padding: "16px 18px",
          }}
        >
          <VisibilitySchedule stateVector={stateVector} />
        </div>
      </div>

      {/* Pulse keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </main>
  );
}
