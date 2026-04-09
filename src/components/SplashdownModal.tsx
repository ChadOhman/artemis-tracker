"use client";
import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface SplashdownModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export default function SplashdownModal({ isOpen, onDismiss }: SplashdownModalProps) {
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
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "90%",
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
            margin: "0 0 32px 0",
            fontStyle: "italic",
          }}
        >
          Thank you for following along with us for this historic mission around the Moon.
        </p>

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
