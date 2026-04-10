"use client";
// Contingency display — only rendered when the admin toggles the state.
// Loaded via dynamic import so the main bundle never contains this content.

import { useEffect, useState } from "react";

interface StateCModalProps {
  isOpen: boolean;
  triggeredAt: string | null;
  onDismiss: () => void;
}

// PLACEHOLDER — edit this statement in the moment, if it ever comes to it.
// Keep it short, factual, and human.
const STATEMENT = `We grieve with the families, friends, and colleagues of the Artemis II crew, and with our partners at NASA, CSA, ESA, and every engineer, scientist, and worker who made this mission possible.

They ventured to the Moon in the spirit of exploration that has always defined us. We will remember them. We will learn from them. We will carry them forward.`;

const CREW = [
  { role: "Commander",         name: "Reid Wiseman",    agency: "NASA" },
  { role: "Pilot",             name: "Victor Glover",   agency: "NASA" },
  { role: "Mission Specialist",name: "Christina Koch",  agency: "NASA" },
  { role: "Mission Specialist",name: "Jeremy Hansen",   agency: "CSA"  },
];

export default function StateCModal({ isOpen, triggeredAt, onDismiss }: StateCModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.92)",
        backdropFilter: "blur(10px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 1.2s ease-out",
        overflowY: "auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: 540,
          width: "100%",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          background: "#0a0e14",
          border: "1px solid rgba(200, 200, 210, 0.15)",
          borderRadius: 2,
          padding: "56px 44px",
          textAlign: "center",
          transform: visible ? "scale(1)" : "scale(0.98)",
          opacity: visible ? 1 : 0,
          transition: "transform 1.2s ease-out, opacity 1.2s ease-out",
          color: "#c8ccd0",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: "0.5em",
            color: "#6a7480",
            marginBottom: 24,
          }}
          aria-hidden
        >
          ✦
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 300,
            color: "#e8ebee",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            margin: "0 0 8px 0",
          }}
        >
          In Memoriam
        </h1>

        <div
          style={{
            fontSize: 11,
            color: "#6a7480",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          Artemis II &middot; 2026
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            margin: "0 auto 36px auto",
            maxWidth: 360,
          }}
        >
          {CREW.map((c) => (
            <div
              key={c.name}
              style={{
                padding: "12px 0",
                borderTop: "1px solid rgba(200, 200, 210, 0.08)",
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 400,
                  color: "#e8ebee",
                  letterSpacing: "0.02em",
                  marginBottom: 2,
                }}
              >
                {c.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#6a7480",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {c.role} &middot; {c.agency}
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(200, 200, 210, 0.08)" }} />
        </div>

        <p
          style={{
            fontSize: 14,
            color: "#aab0b8",
            lineHeight: 1.8,
            margin: "0 0 32px 0",
            whiteSpace: "pre-line",
            fontStyle: "italic",
            textAlign: "left",
          }}
        >
          {STATEMENT}
        </p>

        <div
          style={{
            fontSize: 10,
            color: "#6a7480",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 28,
            lineHeight: 1.8,
          }}
        >
          NASA &middot; CSA &middot; ESA &middot; DLR &middot; ASI
          <br />
          Airbus NL &middot; INTA &middot; CNES
        </div>

        {triggeredAt && (
          <div
            style={{
              fontSize: 9,
              color: "#4a5460",
              letterSpacing: "0.1em",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 20,
            }}
          >
            {new Date(triggeredAt).toUTCString()}
          </div>
        )}

        <button
          onClick={onDismiss}
          style={{
            marginTop: 12,
            padding: "10px 32px",
            background: "transparent",
            border: "1px solid rgba(200, 200, 210, 0.2)",
            borderRadius: 2,
            color: "#8a9098",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Continue to Tracker
        </button>
      </div>
    </div>
  );
}
