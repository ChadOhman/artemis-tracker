"use client";

import { useState, useEffect, useCallback } from "react";

interface StatusData {
  db?: {
    sizeMB?: number;
    rows?: {
      stateVectors?: number;
      arowTelemetry?: number;
      dsnContacts?: number;
      solarActivity?: number;
    };
  };
  uptime?: {
    hours?: number;
    since?: string;
  };
  arow?: {
    status?: "healthy" | "partial" | "no_data";
    lastTimestamp?: string;
  };
  visitorCount?: number;
}

interface WakeupSong {
  flightDay: number;
  title: string;
  artist: string;
  notes?: string;
}

const BURNS = [
  "PRM",
  "ARB",
  "TLI",
  "OTC-1",
  "OTC-2",
  "OTC-3",
  "RTC-1",
  "RTC-2",
  "CM Raise",
] as const;

const cardStyle: React.CSSProperties = {
  background: "#0d1117",
  border: "1px solid rgba(0,229,255,0.15)",
  borderRadius: 8,
  padding: "24px",
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.14em",
  color: "#5a7a8a",
  textTransform: "uppercase",
  marginBottom: 12,
};

const monoStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "#1a2332",
  border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: 4,
  color: "#e0e8f0",
  fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace",
  boxSizing: "border-box" as const,
  marginBottom: 8,
};

const btnStyle: React.CSSProperties = {
  padding: "10px 16px",
  background: "#1a2332",
  border: "2px solid rgba(0,229,255,0.3)",
  borderRadius: 6,
  color: "#00e5ff",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "'JetBrains Mono', monospace",
  width: "100%",
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [toiletStatus, setToiletStatus] = useState<"GO" | "INOP">("GO");
  const [message, setMessage] = useState("");

  // Status data
  const [status, setStatus] = useState<StatusData | null>(null);

  // Wake-up song form
  const [songDay, setSongDay] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songNotes, setSongNotes] = useState("");
  const [songs, setSongs] = useState<WakeupSong[]>([]);

  // Burn statuses — initialized from current hardcoded values
  const [burnStatuses, setBurnStatuses] = useState<Record<string, string>>(() => ({
    "PRM": "executed",
    "ARB": "executed",
    "TLI": "executed",
    "OTC-1": "cancelled",
    "OTC-2": "cancelled",
    "OTC-3": "executed",
    "RTC-1": "planned",
    "RTC-2": "planned",
    "CM Raise": "planned",
  }));
  const [burnDeltaVs, setBurnDeltaVs] = useState<Record<string, string>>(() => ({
    "PRM": "2.6",
    "ARB": "140",
    "TLI": "3180",
    "OTC-1": "0",
    "OTC-2": "0",
    "OTC-3": "3",
    "RTC-1": "10",
    "RTC-2": "2",
    "CM Raise": "5",
  }));

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/status?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.songs) setSongs(data.songs);
        if (data.burns) {
          const statuses: Record<string, string> = {};
          const dvs: Record<string, string> = {};
          for (const b of data.burns) {
            statuses[b.name] = b.status || "planned";
            dvs[b.name] = b.deltaV || "";
          }
          setBurnStatuses((prev) => ({ ...prev, ...statuses }));
          setBurnDeltaVs((prev) => ({ ...prev, ...dvs }));
        }
      }
    } catch {
      // silent
    }
  }, [token]);

  // Viewer count via SSE
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  useEffect(() => {
    if (!authed) return;
    const es = new EventSource("/api/telemetry/stream");
    es.addEventListener("visitors", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setViewerCount(data.count);
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, [authed]);

  // Check current status on auth
  useEffect(() => {
    if (!authed) return;
    fetch(`/api/admin/toilet?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setToiletStatus(d.status))
      .catch(() => {});
    fetchStatus();
  }, [authed, token, fetchStatus]);

  async function handleLogin() {
    try {
      const res = await fetch(`/api/admin/toilet?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        setAuthed(true);
        setMessage("");
      } else {
        setMessage("Invalid token.");
      }
    } catch {
      setMessage("Connection error.");
    }
  }

  async function setToilet(s: "GO" | "INOP") {
    try {
      const res = await fetch(`/api/admin/toilet?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      });
      if (res.ok) {
        const data = await res.json();
        setToiletStatus(data.status);
        setMessage(`Toilet set to ${data.status}`);
      } else {
        setMessage("Failed — check token.");
      }
    } catch {
      setMessage("Connection error.");
    }
  }

  async function handleAddSong() {
    if (!songDay || !songTitle || !songArtist) {
      setMessage("Flight day, title, and artist are required.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/wakeup-song?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightDay: Number(songDay),
          title: songTitle,
          artist: songArtist,
          notes: songNotes || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(`Added wake-up song for Flight Day ${songDay}`);
        setSongDay("");
        setSongTitle("");
        setSongArtist("");
        setSongNotes("");
        if (data.songs) setSongs(data.songs);
        else fetchStatus();
      } else {
        setMessage("Failed to add song — check token.");
      }
    } catch {
      setMessage("Connection error.");
    }
  }

  async function handleForcePoll() {
    try {
      setMessage("Forcing JPL poll...");
      const res = await fetch(`/api/admin/force-poll?token=${encodeURIComponent(token)}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const ts = data.orionTimestamp || data.timestamp || "unknown";
        const dist = data.earthDist ?? data.earth_dist ?? "unknown";
        setMessage(`JPL poll complete — Orion timestamp: ${ts}, Earth dist: ${dist} km`);
      } else {
        setMessage("Force poll failed — check token.");
      }
    } catch {
      setMessage("Connection error.");
    }
  }

  async function handleBurnUpdate(burnName: string) {
    try {
      const res = await fetch(`/api/admin/burns?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: burnName,
          status: burnStatuses[burnName],
          deltaV: burnDeltaVs[burnName] || undefined,
        }),
      });
      if (res.ok) {
        setMessage(`Burn ${burnName} updated to ${burnStatuses[burnName]}`);
      } else {
        setMessage(`Failed to update burn ${burnName}.`);
      }
    } catch {
      setMessage("Connection error.");
    }
  }

  function arowColor(s?: string) {
    if (s === "healthy") return "#00ff88";
    if (s === "partial") return "#ffaa00";
    return "#ff4455";
  }

  if (!authed) {
    return (
      <main style={{
        minHeight: "100vh",
        background: "#060a10",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          background: "#0d1117",
          border: "1px solid rgba(0,229,255,0.15)",
          borderRadius: 8,
          padding: "32px 40px",
          maxWidth: 360,
          width: "100%",
        }}>
          <h1 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.16em", color: "#e0e8f0", textTransform: "uppercase", margin: "0 0 20px" }}>
            Mission Control
          </h1>
          <input
            type="password"
            placeholder="Admin token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "#1a2332",
              border: "1px solid rgba(0,229,255,0.2)",
              borderRadius: 4,
              color: "#e0e8f0",
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 12,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "10px",
              background: "var(--accent-cyan, #00e5ff)",
              border: "none",
              borderRadius: 4,
              color: "#001a20",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Authenticate
          </button>
          {message && <p style={{ color: "#ff4455", fontSize: 12, marginTop: 8 }}>{message}</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#060a10",
      fontFamily: "system-ui, sans-serif",
      padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <a href="/" style={{ fontSize: 11, color: "#5a7a8a", textDecoration: "none" }}>&larr; Dashboard</a>
          <div style={{ width: 3, height: 22, background: "#00e5ff", borderRadius: 2 }} />
          <h1 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.16em", color: "#e0e8f0", textTransform: "uppercase", margin: 0 }}>
            Mission Control
          </h1>
        </div>

        {/* Toilet Status */}
        <div style={cardStyle}>
          <div style={labelStyle}>Toilet Status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: toiletStatus === "GO" ? "#00ff88" : "#ff4455",
              display: "inline-block",
              boxShadow: `0 0 8px ${toiletStatus === "GO" ? "#00ff88" : "#ff4455"}`,
            }} />
            <span style={{
              fontSize: 24,
              fontWeight: 700,
              color: toiletStatus === "GO" ? "#00ff88" : "#ff4455",
              ...monoStyle,
            }}>
              {toiletStatus}
            </span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setToilet("GO")}
              disabled={toiletStatus === "GO"}
              style={{
                flex: 1,
                padding: "12px",
                background: toiletStatus === "GO" ? "rgba(0,255,136,0.15)" : "#1a2332",
                border: `2px solid ${toiletStatus === "GO" ? "#00ff88" : "rgba(0,255,136,0.3)"}`,
                borderRadius: 6,
                color: "#00ff88",
                fontWeight: 700,
                fontSize: 14,
                cursor: toiletStatus === "GO" ? "default" : "pointer",
                opacity: toiletStatus === "GO" ? 0.5 : 1,
                ...monoStyle,
              }}
            >
              ✓ GO
            </button>
            <button
              onClick={() => setToilet("INOP")}
              disabled={toiletStatus === "INOP"}
              style={{
                flex: 1,
                padding: "12px",
                background: toiletStatus === "INOP" ? "rgba(255,68,85,0.15)" : "#1a2332",
                border: `2px solid ${toiletStatus === "INOP" ? "#ff4455" : "rgba(255,68,85,0.3)"}`,
                borderRadius: 6,
                color: "#ff4455",
                fontWeight: 700,
                fontSize: 14,
                cursor: toiletStatus === "INOP" ? "default" : "pointer",
                opacity: toiletStatus === "INOP" ? 0.5 : 1,
                ...monoStyle,
              }}
            >
              ✕ INOP
            </button>
          </div>
        </div>

        {/* Database Backup */}
        <div style={cardStyle}>
          <div style={labelStyle}>Database Backup</div>
          <div style={{ fontSize: 11, color: "#5a7a8a", lineHeight: 1.5, marginBottom: 12 }}>
            Download the full SQLite mission database. Contains all archived
            telemetry: state vectors, AROW samples (with raw JSON), DSN contacts,
            and solar activity. Retention: 14 days AROW/DSN/Solar, 28 days state vectors.
          </div>
          <button
            onClick={() => {
              window.location.href = `/api/admin/backup?token=${encodeURIComponent(token)}`;
              setMessage("Downloading database backup...");
            }}
            style={btnStyle}
          >
            ⬇ Download artemis.db
          </button>
        </div>

        {/* Wake-up Song Entry */}
        <div style={cardStyle}>
          <div style={labelStyle}>Wake-Up Song Entry</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              placeholder="Flight Day"
              value={songDay}
              onChange={(e) => setSongDay(e.target.value)}
              style={inputStyle}
              min={1}
            />
            <input
              type="text"
              placeholder="Artist"
              value={songArtist}
              onChange={(e) => setSongArtist(e.target.value)}
              style={inputStyle}
            />
          </div>
          <input
            type="text"
            placeholder="Song Title"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={songNotes}
            onChange={(e) => setSongNotes(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleAddSong} style={btnStyle}>
            + Add Wake-Up Song
          </button>
          {songs.length > 0 && (
            <div style={{ marginTop: 12, borderTop: "1px solid rgba(0,229,255,0.1)", paddingTop: 12 }}>
              <div style={{ fontSize: 10, color: "#5a7a8a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Current Songs
              </div>
              {songs.map((s, i) => (
                <div key={i} style={{
                  padding: "6px 0",
                  borderBottom: i < songs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                  fontSize: 12,
                  color: "#c0cad0",
                  ...monoStyle,
                }}>
                  <span style={{ color: "#00e5ff" }}>FD{s.flightDay}</span>
                  {" — "}
                  <span style={{ color: "#e0e8f0" }}>{s.title}</span>
                  {" by "}
                  <span style={{ color: "#aab8c0" }}>{s.artist}</span>
                  {s.notes && <span style={{ color: "#5a7a8a" }}> ({s.notes})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Force JPL Poll */}
        <div style={cardStyle}>
          <div style={labelStyle}>Force JPL Poll</div>
          <button onClick={handleForcePoll} style={btnStyle}>
            ⚡ Force JPL Poll Now
          </button>
        </div>

        {/* DB Stats */}
        <div style={cardStyle}>
          <div style={labelStyle}>Database Stats</div>
          {status ? (
            <div style={{ fontSize: 12, color: "#c0cad0", lineHeight: 2, ...monoStyle }}>
              <div>
                <span style={{ color: "#5a7a8a" }}>DB Size:</span>{" "}
                <span style={{ color: "#e0e8f0" }}>{status.db?.sizeMB != null ? `${status.db.sizeMB} MB` : "—"}</span>
              </div>
              <div>
                <span style={{ color: "#5a7a8a" }}>State Vectors:</span>{" "}
                <span style={{ color: "#e0e8f0" }}>{status.db?.rows?.stateVectors?.toLocaleString() ?? "—"}</span>
              </div>
              <div>
                <span style={{ color: "#5a7a8a" }}>AROW Telemetry:</span>{" "}
                <span style={{ color: "#e0e8f0" }}>{status.db?.rows?.arowTelemetry?.toLocaleString() ?? "—"}</span>
              </div>
              <div>
                <span style={{ color: "#5a7a8a" }}>DSN Contacts:</span>{" "}
                <span style={{ color: "#e0e8f0" }}>{status.db?.rows?.dsnContacts?.toLocaleString() ?? "—"}</span>
              </div>
              <div>
                <span style={{ color: "#5a7a8a" }}>Solar Activity:</span>{" "}
                <span style={{ color: "#e0e8f0" }}>{status.db?.rows?.solarActivity?.toLocaleString() ?? "—"}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#5a7a8a", ...monoStyle }}>Loading...</div>
          )}
        </div>

        {/* AROW Status */}
        <div style={cardStyle}>
          <div style={labelStyle}>AROW Status</div>
          {status?.arow ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: arowColor(status.arow.status),
                display: "inline-block",
                boxShadow: `0 0 8px ${arowColor(status.arow.status)}`,
              }} />
              <div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: arowColor(status.arow.status),
                  textTransform: "uppercase",
                  ...monoStyle,
                }}>
                  {status.arow.status ?? "unknown"}
                </div>
                {status.arow.lastTimestamp && (
                  <div style={{ fontSize: 11, color: "#5a7a8a", marginTop: 2, ...monoStyle }}>
                    Last: {status.arow.lastTimestamp}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#5a7a8a", ...monoStyle }}>Loading...</div>
          )}
        </div>

        {/* Server Uptime */}
        <div style={cardStyle}>
          <div style={labelStyle}>Server Uptime</div>
          {status?.uptime ? (
            <div style={{ fontSize: 12, color: "#c0cad0", lineHeight: 2, ...monoStyle }}>
              <div>
                <span style={{ color: "#00e5ff", fontSize: 20, fontWeight: 700 }}>
                  {status.uptime.hours != null ? `${status.uptime.hours}h` : "—"}
                </span>
              </div>
              {status.uptime.since && (
                <div style={{ color: "#5a7a8a", fontSize: 11 }}>
                  Since {status.uptime.since}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#5a7a8a", ...monoStyle }}>Loading...</div>
          )}
        </div>

        {/* Viewer Count */}
        <div style={cardStyle}>
          <div style={labelStyle}>Viewer Count</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#00e5ff", ...monoStyle }}>
            {viewerCount != null ? (
              <>{viewerCount.toLocaleString()} <span style={{ fontSize: 12, color: "#5a7a8a", fontWeight: 400 }}>connected via SSE</span></>
            ) : (
              <span style={{ fontSize: 12, color: "#5a7a8a", fontWeight: 400 }}>Connecting to SSE stream...</span>
            )}
          </div>
        </div>

        {/* Burn Status Updater */}
        <div style={cardStyle}>
          <div style={labelStyle}>Burn Status Updater</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {BURNS.map((burn) => (
              <div key={burn} style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 80px auto",
                gap: 8,
                alignItems: "center",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e0e8f0", ...monoStyle }}>
                  {burn}
                </span>
                <select
                  value={burnStatuses[burn]}
                  onChange={(e) => setBurnStatuses((prev) => ({ ...prev, [burn]: e.target.value }))}
                  style={{
                    padding: "6px 8px",
                    background: "#1a2332",
                    border: "1px solid rgba(0,229,255,0.2)",
                    borderRadius: 4,
                    color:
                      burnStatuses[burn] === "executed"
                        ? "#00ff88"
                        : burnStatuses[burn] === "cancelled"
                        ? "#ff4455"
                        : "#ffaa00",
                    fontSize: 11,
                    ...monoStyle,
                  }}
                >
                  <option value="planned">planned</option>
                  <option value="executed">executed</option>
                  <option value="cancelled">cancelled</option>
                </select>
                <input
                  type="text"
                  placeholder="Δv"
                  value={burnDeltaVs[burn]}
                  onChange={(e) => setBurnDeltaVs((prev) => ({ ...prev, [burn]: e.target.value }))}
                  style={{
                    ...inputStyle,
                    marginBottom: 0,
                    fontSize: 11,
                    padding: "6px 8px",
                  }}
                />
                <button
                  onClick={() => handleBurnUpdate(burn)}
                  style={{
                    padding: "6px 10px",
                    background: "#1a2332",
                    border: "1px solid rgba(0,229,255,0.25)",
                    borderRadius: 4,
                    color: "#00e5ff",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    ...monoStyle,
                  }}
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div style={{
            padding: "10px 14px",
            background: "rgba(0,229,255,0.08)",
            border: "1px solid rgba(0,229,255,0.2)",
            borderRadius: 4,
            fontSize: 12,
            color: "#00e5ff",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
