"use client";
import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface SplashdownModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  metMs: number;
}

// Splashdown is MET 217.53h; recovery stages are offsets from that moment.
const SPLASHDOWN_MET_MS = 217.53 * 3600 * 1000;

interface RecoveryStage {
  label: string;
  detail: string;
  startMin: number; // minutes after splashdown
}

const RECOVERY_STAGES: RecoveryStage[] = [
  { label: "Capsule spotted",     detail: "Recovery helicopter visual contact", startMin: 0 },
  { label: "Divers deployed",     detail: "Navy divers jump from helicopter",    startMin: 5 },
  { label: "Flotation collar",    detail: "Stabilizing collar attached to capsule", startMin: 15 },
  { label: "Crew egress",         detail: "Astronauts exit into the life raft",  startMin: 30 },
  { label: "On deck USS Murtha",  detail: "Crew aboard the recovery ship",        startMin: 60 },
];

export default function SplashdownModal({ isOpen, onDismiss, metMs }: SplashdownModalProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const confettiFired = useRef(false);

  // Animate in
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      confettiFired.current = false;
    }
  }, [isOpen]);

  // Compute minutes since splashdown and current active stage
  const minutesSinceSplashdown = Math.max(0, (metMs - SPLASHDOWN_MET_MS) / 60000);
  const activeStageIndex = (() => {
    let idx = -1;
    for (let i = 0; i < RECOVERY_STAGES.length; i++) {
      if (minutesSinceSplashdown >= RECOVERY_STAGES[i].startMin) idx = i;
    }
    return idx;
  })();

  // Fire confetti burst when modal becomes visible
  useEffect(() => {
    if (!visible || confettiFired.current) return;
    confettiFired.current = true;

    const colors = ["#00e5ff", "#00ff88", "#ffffff", "#ffaa00", "#ff4455"];
    const defaults = { colors, zIndex: 10000, ticks: 300 };
    // Big opening salvo from both sides
    confetti({ ...defaults, particleCount: 300, spread: 80, origin: { x: 0.15, y: 0.6 }, angle: 60 });
    confetti({ ...defaults, particleCount: 300, spread: 80, origin: { x: 0.85, y: 0.6 }, angle: 120 });
    // Center burst
    setTimeout(() => {
      confetti({ ...defaults, particleCount: 200, spread: 100, origin: { x: 0.5, y: 0.35 } });
    }, 250);
    // Second wave — wider spread
    setTimeout(() => {
      confetti({ ...defaults, particleCount: 160, spread: 120, origin: { x: 0.3, y: 0.5 }, angle: 70 });
      confetti({ ...defaults, particleCount: 160, spread: 120, origin: { x: 0.7, y: 0.5 }, angle: 110 });
    }, 600);
    // Third wave — big finale
    setTimeout(() => {
      confetti({ ...defaults, particleCount: 240, spread: 140, origin: { x: 0.5, y: 0.5 }, startVelocity: 45 });
      confetti({ ...defaults, particleCount: 120, spread: 60, origin: { x: 0.1, y: 0.7 }, angle: 45 });
      confetti({ ...defaults, particleCount: 120, spread: 60, origin: { x: 0.9, y: 0.7 }, angle: 135 });
    }, 1000);
    // Lingering sparkle
    setTimeout(() => {
      confetti({ ...defaults, particleCount: 100, spread: 160, origin: { x: 0.5, y: 0.3 }, startVelocity: 30, gravity: 0.6 });
    }, 1500);
  }, [visible]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease-out",
        overflowY: "auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          background: "linear-gradient(180deg, #0a1628 0%, #060a10 100%)",
          border: "1px solid rgba(0, 229, 255, 0.2)",
          borderRadius: 16,
          padding: "48px 36px",
          textAlign: "center",
          transform: visible ? "scale(1)" : "scale(0.95)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.6s ease-out, opacity 0.6s ease-out",
        }}
      >
        {/* Headline */}
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "0.04em",
            margin: "0 0 8px 0",
            lineHeight: 1.2,
          }}
        >
          Welcome Home Integrity!
        </h1>

        {/* Crew acknowledgment */}
        <div
          style={{
            fontSize: 14,
            color: "#c0cad0",
            lineHeight: 1.8,
            margin: "20px 0",
          }}
        >
          <div style={{ fontWeight: 600, color: "#e0e8f0", marginBottom: 4 }}>Artemis II Crew</div>
          <div>Commander Reid Wiseman</div>
          <div>Pilot Victor Glover</div>
          <div>Mission Specialist Christina Koch</div>
          <div>Mission Specialist Jeremy Hansen</div>
        </div>

        {/* Partner acknowledgment */}
        <div
          style={{
            fontSize: 13,
            color: "#8a9aaa",
            margin: "16px 0 24px 0",
            lineHeight: 2.2,
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: "0.15em", marginBottom: 6 }}>
            🇺🇸 🇨🇦 🇪🇺 🇩🇪 🇮🇹 🇳🇱 🇪🇸 🇫🇷
          </div>
          NASA &bull; CSA &bull; ESA &bull; DLR &bull; ASI &bull; Airbus NL &bull; INTA &bull; CNES
        </div>

        {/* Thank you */}
        <p
          style={{
            fontSize: 16,
            color: "#e0e8f0",
            margin: "0 0 24px 0",
            fontStyle: "italic",
          }}
        >
          Thank you for following along with us for this historic mission around the Moon.
        </p>

        {/* Recovery sequence */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(0, 229, 255, 0.15)",
            borderRadius: 8,
            padding: "14px 18px",
            margin: "0 0 24px 0",
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#5a7a8a",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            Recovery Sequence
          </div>
          {RECOVERY_STAGES.map((stage, i) => {
            const isDone = i < activeStageIndex;
            const isActive = i === activeStageIndex;
            const isFuture = i > activeStageIndex;
            const nextStart = RECOVERY_STAGES[i + 1]?.startMin;
            const inRange = nextStart == null || minutesSinceSplashdown < nextStart;
            return (
              <div
                key={stage.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "6px 0",
                  opacity: isFuture ? 0.4 : 1,
                  transition: "opacity 0.4s",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: isDone
                      ? "#00ff88"
                      : isActive
                      ? "rgba(0, 229, 255, 0.25)"
                      : "transparent",
                    border: `2px solid ${
                      isDone ? "#00ff88" : isActive ? "#00e5ff" : "rgba(255,255,255,0.2)"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#001a20",
                    fontWeight: 800,
                    flexShrink: 0,
                    animation: isActive && inRange ? "recovery-stage-pulse 2s infinite" : "none",
                  }}
                >
                  {isDone ? "✓" : ""}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isDone || isActive ? "#e0e8f0" : "#8a9aaa",
                    }}
                  >
                    {stage.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#5a7a8a" }}>{stage.detail}</div>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#5a7a8a",
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  T+{String(stage.startMin).padStart(2, "0")}:00
                </div>
              </div>
            );
          })}
          {activeStageIndex >= 0 && activeStageIndex < RECOVERY_STAGES.length && (
            <div
              style={{
                textAlign: "center",
                fontSize: 10,
                color: "#5a7a8a",
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              T+{Math.floor(minutesSinceSplashdown)}:{String(Math.floor((minutesSinceSplashdown % 1) * 60)).padStart(2, "0")} since splashdown
            </div>
          )}
        </div>

        {/* Email signup */}
        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                fontSize: 13,
                color: "#8a9aaa",
                marginBottom: 12,
              }}
            >
              Get notified about future mission trackers and about the historical archiving of this mission.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  maxWidth: 280,
                  padding: "10px 14px",
                  background: "#1a2332",
                  border: "1px solid rgba(0, 229, 255, 0.25)",
                  borderRadius: 6,
                  color: "#e0e8f0",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "10px 20px",
                  background: "rgba(0, 229, 255, 0.15)",
                  border: "1px solid rgba(0, 229, 255, 0.4)",
                  borderRadius: 6,
                  color: "#00e5ff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "..." : "Sign Up"}
              </button>
            </div>
            {error && (
              <div style={{ color: "#ff4455", fontSize: 12, marginTop: 8 }}>{error}</div>
            )}
            <div style={{ fontSize: 11, color: "#5a7a8a", marginTop: 8 }}>
              Max two emails in 2026, unsubscribe anytime.
            </div>
          </form>
        ) : (
          <div
            style={{
              fontSize: 16,
              color: "#00ff88",
              fontWeight: 600,
              padding: "12px 0",
            }}
          >
            You're in — we'll be in touch.
          </div>
        )}

        {/* ISS Tracker promo */}
        <a
          href="https://iss.cdnspace.ca"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            marginTop: 24,
            padding: "10px 24px",
            background: "rgba(0, 229, 255, 0.1)",
            border: "1px solid rgba(0, 229, 255, 0.35)",
            borderRadius: 6,
            color: "#00e5ff",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          🛰 Track the ISS next →
        </a>

        {/* Support link */}
        <a
          href="https://buymeacoffee.com/chadohman"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            marginTop: 24,
            padding: "10px 24px",
            background: "rgba(255, 200, 0, 0.12)",
            border: "1px solid rgba(255, 200, 0, 0.35)",
            borderRadius: 6,
            color: "#ffcc00",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          ☕ Support more projects like this!
        </a>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          style={{
            marginTop: 32,
            padding: "8px 24px",
            background: "transparent",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: 6,
            color: "#5a7a8a",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Return to Tracker
        </button>
      </div>
    </div>
  );
}
