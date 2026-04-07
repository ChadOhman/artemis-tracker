"use client";

import { useState, useEffect } from "react";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [toiletStatus, setToiletStatus] = useState<"GO" | "INOP">("GO");
  const [message, setMessage] = useState("");

  // Check current status on auth
  useEffect(() => {
    if (!authed) return;
    fetch("/api/admin/toilet")
      .then((r) => r.json())
      .then((d) => setToiletStatus(d.status))
      .catch(() => {});
  }, [authed]);

  async function handleLogin() {
    // Verify token by trying a GET with it (we'll add token check to GET too)
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

  async function setStatus(status: "GO" | "INOP") {
    try {
      const res = await fetch(`/api/admin/toilet?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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
        <div style={{
          background: "#0d1117",
          border: "1px solid rgba(0,229,255,0.15)",
          borderRadius: 8,
          padding: "24px",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#5a7a8a", textTransform: "uppercase", marginBottom: 12 }}>
            Toilet Status
          </div>
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
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {toiletStatus}
            </span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setStatus("GO")}
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
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ✓ GO
            </button>
            <button
              onClick={() => setStatus("INOP")}
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
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ✕ INOP
            </button>
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
