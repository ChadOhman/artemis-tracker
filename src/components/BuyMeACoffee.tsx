"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "bmac-dismissed";

export function BuyMeACoffee() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.75rem 0.4rem 0.6rem",
        background: "rgba(10, 14, 20, 0.9)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid var(--border-panel)",
        borderRadius: "999px",
        zIndex: 9999,
        animation: "bmac-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      <style>{`
        @keyframes bmac-slide-in {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .bmac-link {
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          color: var(--text-dim);
          text-decoration: none;
          transition: color 0.15s;
          white-space: nowrap;
        }
        .bmac-link:hover { color: var(--accent-cyan); }
        .bmac-dismiss {
          background: none;
          border: none;
          padding: 0 0 0 0.25rem;
          cursor: pointer;
          font-size: 0.75rem;
          line-height: 1;
          color: var(--text-dim);
          opacity: 0.7;
          transition: opacity 0.15s;
        }
        .bmac-dismiss:hover { opacity: 1; }
      `}</style>
      <a
        href="https://buymeacoffee.com/chadohman"
        target="_blank"
        rel="noopener noreferrer"
        className="bmac-link"
      >
        ☕ Support this project
      </a>
      <button
        className="bmac-dismiss"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
