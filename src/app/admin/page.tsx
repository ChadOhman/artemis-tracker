"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminAction } from "@/components/AdminConfirmDialog";

interface StatusData {
  db?: {
    sizeMB?: number;
    rows?: {
      stateVectors?: number;
      arowTelemetry?: number;
      dsnContacts?: number;
      solarActivity?: number;
      subscribers?: number;
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
  "RTC-3",
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
    "RTC-1": "executed",
    "RTC-2": "executed",
    "RTC-3": "executed",
    "CM Raise": "planned",
  }));
  const [burnDeltaVs, setBurnDeltaVs] = useState<Record<string, string>>(() => ({
    "PRM": "2.6",
    "ARB": "140",
    "TLI": "3180",
    "OTC-1": "0",
    "OTC-2": "0",
    "OTC-3": "3",
    "RTC-1": "0.4",
    "RTC-2": "1.6",
    "RTC-3": "1.3",
    "CM Raise": "5",
  }));

  const { confirm, showSuccess, showError, ConfirmDialog, FeedbackBanner } = useAdminAction();
  const [splashdownTriggered, setSplashdownTriggered] = useState(false);
  const [overrideActive, setOverrideActive] = useState(false);
  const [overrideConfirm, setOverrideConfirm] = useState("");

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
  const [totalPageViews, setTotalPageViews] = useState<number | null>(null);
  useEffect(() => {
    if (!authed) return;
    const es = new EventSource("/api/telemetry/stream");
    es.addEventListener("visitors", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setViewerCount(data.count);
        if (data.totalPageViews != null) setTotalPageViews(data.totalPageViews);
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, [authed]);

  // Load all songs (static from codebase + runtime overrides)
  const fetchSongs = useCallback(async () => {
    try {
      // Static songs from the codebase
      const { WAKEUP_SONGS } = await import("@/lib/wakeup-songs");
      const staticSongs: WakeupSong[] = WAKEUP_SONGS.map((s) => ({
        flightDay: s.flightDay,
        title: s.title,
        artist: s.artist,
        notes: s.notes,
      }));

      // Runtime overrides from admin API
      const res = await fetch("/api/admin/wakeup-song");
      const runtimeSongs: WakeupSong[] = res.ok ? ((await res.json()).songs ?? []) : [];

      // Merge: runtime overrides static by flight day
      const merged = [...staticSongs];
      for (const rs of runtimeSongs) {
        const idx = merged.findIndex((s) => s.flightDay === rs.flightDay);
        if (idx >= 0) merged[idx] = { ...merged[idx], ...rs };
        else merged.push(rs);
      }
      merged.sort((a, b) => a.flightDay - b.flightDay);
      setSongs(merged);
    } catch { /* silent */ }
  }, []);

  // Check current status on auth
  useEffect(() => {
    if (!authed) return;
    fetch(`/api/admin/toilet?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setToiletStatus(d.status))
      .catch(() => {});
    fetchStatus();
    fetchSongs();
    // Also fetch splashdown state
    fetch(`/api/admin/splashdown?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setSplashdownTriggered(d.triggered === true))
      .catch(() => {});
    // Override flag
    fetch(`/api/admin/state-c?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setOverrideActive(d.active === true))
      .catch(() => {});
  }, [authed, token, fetchStatus, fetchSongs]);

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

  async function handleSplashdown(trigger: boolean) {
    confirm(
      trigger
        ? "Are you sure? This will show the celebration modal to all connected viewers."
        : "Are you sure? This will dismiss the celebration modal for all viewers.",
      async () => {
        try {
          const res = await fetch(`/api/admin/splashdown?token=${encodeURIComponent(token)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ triggered: trigger }),
          });
          if (res.ok) {
            setSplashdownTriggered(trigger);
            showSuccess(trigger ? "Splashdown celebration sent!" : "Celebration dismissed.");
          } else {
            showError("Failed to update splashdown state.");
          }
        } catch {
          showError("Connection error.");
        }
      }
    );
  }

  async function handleOverride(activate: boolean) {
    const expectedPhrase = activate ? "ACTIVATE MEMORIAL" : "RETRACT MEMORIAL";
    if (overrideConfirm !== expectedPhrase) {
      showError(`Type "${expectedPhrase}" in the confirmation field to proceed.`);
      return;
    }
    confirm(
      activate
        ? "Activate the contingency override? Every viewer will see the override modal and the dashboard will enter override mode. Proceed?"
        : "Retract the override? The dashboard will return to normal.",
      async () => {
        try {
          const res = await fetch(`/api/admin/state-c?token=${encodeURIComponent(token)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: activate, confirm: overrideConfirm }),
          });
          const data = await res.json();
          if (res.ok) {
            setOverrideActive(activate);
            setOverrideConfirm("");
            showSuccess(activate ? "Override activated." : "Override retracted.");
          } else {
            showError(data.error ?? "Failed to update override state.");
          }
        } catch {
          showError("Connection error.");
        }
      }
    );
  }

  async function setToilet(s: "GO" | "INOP") {
    confirm(`Set toilet status to ${s}?`, async () => {
      try {
        const res = await fetch(`/api/admin/toilet?token=${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: s }),
        });
        if (res.ok) {
          const data = await res.json();
          setToiletStatus(data.status);
          showSuccess(`Toilet set to ${data.status}`);
        } else {
          showError("Failed — check token.");
        }
      } catch {
        showError("Connection error.");
      }
    });
  }

  async function handleAddSong() {
    if (!songDay || !songTitle || !songArtist) {
      showError("Flight day, title, and artist are required.");
      return;
    }
    confirm(`Add wake-up song for Flight Day ${songDay}?`, async () => {
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
          showSuccess(`Added wake-up song for Flight Day ${songDay}`);
          setSongDay("");
          setSongTitle("");
          setSongArtist("");
          setSongNotes("");
          if (data.songs) setSongs(data.songs);
          else fetchStatus();
        } else {
          showError("Failed to add song — check token.");
        }
      } catch {
        showError("Connection error.");
      }
    });
  }

  async function handleForcePoll() {
    confirm("Force a JPL Horizons poll now?", async () => {
      try {
        const res = await fetch(`/api/admin/force-poll?token=${encodeURIComponent(token)}`, {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          const ts = data.orionTimestamp || data.timestamp || "unknown";
          const dist = data.earthDist ?? data.earth_dist ?? "unknown";
          showSuccess(`JPL poll complete — Orion timestamp: ${ts}, Earth dist: ${dist} km`);
        } else {
          showError("Force poll failed — check token.");
        }
      } catch {
        showError("Connection error.");
      }
    });
  }

  async function handleBurnUpdate(burnName: string) {
    confirm(`Update burn status for ${burnName}?`, async () => {
      try {
        const res = await fetch(`/api/admin/burns?token=${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: burnName,
            status: burnStatuses[burnName],
            dv: burnDeltaVs[burnName] || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showSuccess(`Burn ${burnName} updated to ${burnStatuses[burnName]}`);
        } else {
          showError(`Failed to update burn ${burnName}: ${data.error ?? res.status}`);
        }
      } catch {
        showError("Connection error.");
      }
    });
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
            and solar activity. Full mission archive — no data pruning.
          </div>
          <button
            onClick={() => {
              confirm("Download the full SQLite mission database?", async () => {
                window.location.href = `/api/admin/backup?token=${encodeURIComponent(token)}`;
                showSuccess("Downloading database backup...");
              });
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
                All Songs (click Edit to modify)
              </div>
              {songs.length === 0 && (
                <div style={{ fontSize: 11, color: "#5a7a8a", ...monoStyle }}>Loading...</div>
              )}
              {songs.map((s, i) => (
                <div key={i} style={{
                  padding: "6px 0",
                  borderBottom: i < songs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                  fontSize: 12,
                  color: "#c0cad0",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  ...monoStyle,
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "#00e5ff" }}>FD{String(s.flightDay).padStart(2, "0")}</span>
                    {" — "}
                    <span style={{ color: "#e0e8f0" }}>{s.title}</span>
                    {" by "}
                    <span style={{ color: "#aab8c0" }}>{s.artist}</span>
                    {s.notes && <div style={{ color: "#5a7a8a", fontSize: 10, marginTop: 2 }}>{s.notes}</div>}
                  </div>
                  <button
                    onClick={() => {
                      setSongDay(String(s.flightDay));
                      setSongTitle(s.title);
                      setSongArtist(s.artist);
                      setSongNotes(s.notes ?? "");
                    }}
                    style={{
                      padding: "2px 8px",
                      background: "none",
                      border: "1px solid rgba(0,229,255,0.2)",
                      borderRadius: 3,
                      color: "#5a7a8a",
                      fontSize: 9,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      flexShrink: 0,
                    }}
                  >
                    Edit
                  </button>
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
              <div>
                <span style={{ color: "#5a7a8a" }}>Email Subscribers:</span>{" "}
                <span style={{ color: "#00ff88", fontWeight: 700 }}>{(status.db?.rows as any)?.subscribers?.toLocaleString() ?? "—"}</span>
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
          <div style={labelStyle}>Viewers &amp; Page Views</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#00e5ff", ...monoStyle }}>
            {viewerCount != null ? (
              <>{viewerCount.toLocaleString()} <span style={{ fontSize: 12, color: "#5a7a8a", fontWeight: 400 }}>connected via SSE</span></>
            ) : (
              <span style={{ fontSize: 12, color: "#5a7a8a", fontWeight: 400 }}>Connecting to SSE stream...</span>
            )}
          </div>
          {totalPageViews != null && (
            <div style={{ fontSize: 20, fontWeight: 700, color: "#00ff88", marginTop: 8, ...monoStyle }}>
              {totalPageViews.toLocaleString()} <span style={{ fontSize: 12, color: "#5a7a8a", fontWeight: 400 }}>total page views</span>
            </div>
          )}
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

        {/* Splashdown Celebration */}
        <div style={cardStyle}>
          <div style={labelStyle}>Splashdown Celebration</div>
          <div style={{ fontSize: 11, color: "#5a7a8a", lineHeight: 1.5, marginBottom: 12 }}>
            {splashdownTriggered
              ? "The celebration modal is currently ACTIVE for all viewers."
              : "Trigger the celebration modal for all connected viewers."}
          </div>
          {!splashdownTriggered ? (
            <button
              onClick={() => handleSplashdown(true)}
              style={{
                ...btnStyle,
                background: "rgba(0, 255, 136, 0.1)",
                border: "2px solid rgba(0, 255, 136, 0.4)",
                color: "#00ff88",
              }}
            >
              Trigger Splashdown Celebration
            </button>
          ) : (
            <button
              onClick={() => handleSplashdown(false)}
              style={{
                ...btnStyle,
                background: "rgba(255, 68, 85, 0.1)",
                border: "2px solid rgba(255, 68, 85, 0.4)",
                color: "#ff4455",
              }}
            >
              Cancel Splashdown
            </button>
          )}
        </div>

        {/* Contingency Override — do not use casually */}
        <div
          style={{
            ...cardStyle,
            borderColor: overrideActive ? "rgba(200, 200, 210, 0.4)" : "rgba(200, 200, 210, 0.2)",
          }}
        >
          <div style={{ ...labelStyle, color: overrideActive ? "#c8ccd0" : "#5a7a8a" }}>
            ✦ Contingency Override
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#5a7a8a",
              lineHeight: 1.6,
              marginBottom: 14,
            }}
          >
            {overrideActive
              ? "Override is ACTIVE. Dashboard is in override mode for all viewers."
              : "Reserved for contingency. Applies override mode to the dashboard, suppresses the splashdown celebration, and shows the override modal to every viewer. Requires typing the exact confirmation phrase below to proceed."}
          </div>

          <input
            type="text"
            placeholder={overrideActive ? "Type: RETRACT MEMORIAL" : "Type: ACTIVATE MEMORIAL"}
            value={overrideConfirm}
            onChange={(e) => setOverrideConfirm(e.target.value)}
            style={{
              ...inputStyle,
              borderColor: "rgba(200, 200, 210, 0.3)",
              marginBottom: 10,
              letterSpacing: "0.1em",
            }}
          />

          {!overrideActive ? (
            <button
              onClick={() => handleOverride(true)}
              disabled={overrideConfirm !== "ACTIVATE MEMORIAL"}
              style={{
                ...btnStyle,
                background: "rgba(200, 200, 210, 0.05)",
                border: "1px solid rgba(200, 200, 210, 0.3)",
                color: "#c8ccd0",
                opacity: overrideConfirm === "ACTIVATE MEMORIAL" ? 1 : 0.35,
                cursor:
                  overrideConfirm === "ACTIVATE MEMORIAL" ? "pointer" : "not-allowed",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontSize: 11,
              }}
            >
              Activate Override
            </button>
          ) : (
            <button
              onClick={() => handleOverride(false)}
              disabled={overrideConfirm !== "RETRACT MEMORIAL"}
              style={{
                ...btnStyle,
                background: "rgba(0, 229, 255, 0.08)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                color: "#00e5ff",
                opacity: overrideConfirm === "RETRACT MEMORIAL" ? 1 : 0.35,
                cursor: overrideConfirm === "RETRACT MEMORIAL" ? "pointer" : "not-allowed",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontSize: 11,
              }}
            >
              Retract Override
            </button>
          )}
        </div>

        <FeedbackBanner />
        <ConfirmDialog />
      </div>
    </main>
  );
}
