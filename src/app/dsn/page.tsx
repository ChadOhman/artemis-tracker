"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import type { DsnStatus, DsnDish, StateVector } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DSN_STATIONS = [
  {
    id: "gdscc",
    name: "Goldstone",
    location: "California, USA",
    lat: 35.43,
    lon: -116.89,
    color: "#00e5ff",
  },
  {
    id: "mdscc",
    name: "Madrid",
    location: "Spain",
    lat: 40.43,
    lon: -3.95,
    color: "#00e5ff",
  },
  {
    id: "cdscc",
    name: "Canberra",
    location: "Australia",
    lat: -35.4,
    lon: 148.98,
    color: "#00e5ff",
  },
] as const;

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
  if (rate <= 0) return "—";
  if (rate >= 1_000_000) return (rate / 1_000_000).toFixed(2) + " Mbps";
  if (rate >= 1_000) return (rate / 1_000).toFixed(1) + " kbps";
  return rate.toFixed(0) + " bps";
}

function formatRtlt(seconds: number): string {
  if (seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ---------------------------------------------------------------------------
// Three.js Globe (rendered in a canvas, managed via effect)
// ---------------------------------------------------------------------------

interface GlobeProps {
  activeDishes: DsnDish[];
  orionPosition: { x: number; y: number; z: number } | null;
}

function GlobeCanvas({ activeDishes, orionPosition }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    renderer: import("three").WebGLRenderer | null;
    scene: import("three").Scene | null;
    camera: import("three").PerspectiveCamera | null;
    globe: import("three").Mesh | null;
    beamLines: import("three").Line[];
    labelPositions: { id: string; vec: [number, number, number] }[];
    rafId: number;
    three: typeof import("three") | null;
    stationDots: import("three").Mesh[];
  }>({
    renderer: null,
    scene: null,
    camera: null,
    globe: null,
    beamLines: [],
    labelPositions: [],
    rafId: 0,
    three: null,
    stationDots: [],
  });

  // Label state — positions in screen space
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
      camera.position.set(0, 1.2, 3.5);
      camera.lookAt(0, 0, 0);
      s.camera = camera;

      // Ambient light
      scene.add(new THREE.AmbientLight(0x334455, 2));
      const dirLight = new THREE.DirectionalLight(0x8899bb, 1.5);
      dirLight.position.set(5, 3, 5);
      scene.add(dirLight);

      // Globe — solid dark sphere + wireframe overlay
      const globeGeo = new THREE.SphereGeometry(1, 24, 24);
      const solidMat = new THREE.MeshPhongMaterial({
        color: 0x050d1a,
        transparent: true,
        opacity: 0.85,
      });
      const solidMesh = new THREE.Mesh(globeGeo, solidMat);
      scene.add(solidMesh);
      s.globe = solidMesh;

      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x1a3a5a,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const wireMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.001, 24, 24),
        wireMat
      );
      scene.add(wireMesh);
      // Keep wireframe as child so it rotates with globe pivot
      solidMesh.add(wireMesh);

      // Station marker dots
      s.stationDots = [];
      s.labelPositions = [];
      for (const station of DSN_STATIONS) {
        const [sx, sy, sz] = latLonToVec3(station.lat, station.lon, 1.01);
        const dotGeo = new THREE.SphereGeometry(0.022, 8, 8);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(sx, sy, sz);
        scene.add(dot);
        s.stationDots.push(dot);
        s.labelPositions.push({ id: station.id, vec: [sx, sy, sz] });
      }

      // Glow sprite for each station
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
        scene.add(glow);
      }

      // Animation loop
      function animate() {
        s.rafId = requestAnimationFrame(animate);

        // Rotate globe to match Earth's current orientation (GMT sidereal angle)
        const now = Date.now();
        // Earth rotates 360° in ~86164s (sidereal day); offset so 0° is at midnight
        const rotY = ((now / 1000 / 86164) * 2 * Math.PI) % (2 * Math.PI);
        if (s.globe) s.globe.rotation.y = rotY;

        // Slow auto camera orbit
        const camAngle = (now / 1000 / 60) * 0.3; // ~full orbit in ~20 min
        const camRadius = 3.5;
        camera.position.x = Math.sin(camAngle) * camRadius;
        camera.position.z = Math.cos(camAngle) * camRadius;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);

        // Project station positions to screen for CSS labels
        if (canvas) {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          const newLabels = DSN_STATIONS.map((station, i) => {
            const [bx, by, bz] = s.labelPositions[i]?.vec ?? [0, 0, 0];
            // Rotate by current globe rotation
            const rx =
              bx * Math.cos(rotY) + bz * Math.sin(rotY);
            const ry = by;
            const rz =
              -bx * Math.sin(rotY) + bz * Math.cos(rotY);

            const vec = new THREE.Vector3(rx, ry, rz);
            vec.project(camera);
            const x = ((vec.x + 1) / 2) * w;
            const y = ((-vec.y + 1) / 2) * h;
            // Only show if on front face (positive z in camera space)
            const camSpaceZ = rz * camera.position.z > 0 ? 1 : -1;
            return { id: station.id, name: station.name, x, y, visible: camSpaceZ > 0 };
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

  // Update beam lines whenever activeDishes or orionPosition changes
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene || !s.three) return;
    const THREE = s.three;

    // Remove old beams
    for (const line of s.beamLines) {
      s.scene.remove(line);
    }
    s.beamLines = [];

    // Compute Orion direction in ECI-ish normalized coords
    let orionDir: [number, number, number] | null = null;
    if (orionPosition) {
      const mag = Math.sqrt(
        orionPosition.x ** 2 + orionPosition.y ** 2 + orionPosition.z ** 2
      );
      if (mag > 0) {
        orionDir = [
          orionPosition.x / mag,
          orionPosition.z / mag, // swap z/y for Three.js Y-up convention
          -orionPosition.y / mag,
        ];
      }
    }

    for (const dish of activeDishes) {
      const station = DSN_STATIONS.find((st) => st.id === dish.station);
      if (!station) continue;

      const [sx, sy, sz] = latLonToVec3(station.lat, station.lon, 1.01);

      // Beam endpoint: toward Orion if we have position, else outward along station normal
      const endScale = 2.2;
      const [ex, ey, ez] = orionDir
        ? [orionDir[0] * endScale, orionDir[1] * endScale, orionDir[2] * endScale]
        : [sx * endScale, sy * endScale, sz * endScale];

      const points = [
        new THREE.Vector3(sx, sy, sz),
        new THREE.Vector3(ex, ey, ez),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.8,
        linewidth: 2,
      });
      const line = new THREE.Line(geo, mat);
      s.scene.add(line);
      s.beamLines.push(line);
    }
  }, [activeDishes, orionPosition]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {/* CSS labels overlaid on the canvas */}
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
// Station status card
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
  const primary = trackingDishes[0] ?? null;

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
          {active ? "TRACKING" : "IDLE"}
        </div>
      </div>

      {/* Dish details */}
      {primary ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <DataRow label="Dish" value={primary.dish} />
          <DataRow
            label="Downlink"
            value={
              primary.downlinkActive
                ? `${primary.downlinkBand || "—"} · ${formatDataRate(primary.downlinkRate)}`
                : "Inactive"
            }
            dim={!primary.downlinkActive}
          />
          <DataRow
            label="Uplink"
            value={primary.uplinkActive ? (primary.uplinkBand || "Active") : "Inactive"}
            dim={!primary.uplinkActive}
          />
          <DataRow
            label="Range"
            value={
              primary.rangeKm > 0
                ? primary.rangeKm.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  }) + " km"
                : "—"
            }
          />
          <DataRow label="RTLT" value={formatRtlt(primary.rtltSeconds)} />
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
// Main page
// ---------------------------------------------------------------------------

export default function DsnPage() {
  const [dsnStatus, setDsnStatus] = useState<DsnStatus | null>(null);
  const [stateVector, setStateVector] = useState<StateVector | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sseError, setSseError] = useState<string | null>(null);

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
          // SsePayload has stateVector at the top level
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

  // Derive active dishes (those tracking EM2 / Artemis II)
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
            <span style={{ color: "#5a7a8a" }}>Connecting…</span>
          )}
        </div>
      </div>

      {/* Globe */}
      <div
        style={{
          width: "100%",
          height: 500,
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

      {/* Station cards */}
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
            gridTemplateColumns: "repeat(3, 1fr)",
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
