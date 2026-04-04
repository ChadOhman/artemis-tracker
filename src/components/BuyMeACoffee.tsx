"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "bmac-dismissed";

export function BuyMeACoffee() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      role="complementary"
      aria-label="Support this project"
      style={{
        position: "fixed",
        bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        right: "max(1rem, env(safe-area-inset-right, 0px))",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0.75rem 0.5rem 0.7rem",
        background: "rgba(10, 14, 20, 0.92)",
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
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          color: var(--text-dim);
          text-decoration: none;
          transition: color 0.15s;
          white-space: nowrap;
        }
        .bmac-link:hover, .bmac-link:focus-visible { color: var(--accent-cyan); }
        .bmac-link:focus-visible { outline: 2px solid var(--accent-cyan); outline-offset: 2px; border-radius: 4px; }
        .bmac-dismiss {
          background: none;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          font-size: 1rem;
          line-height: 1;
          color: var(--text-dim);
          opacity: 0.7;
          transition: opacity 0.15s;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin: -0.25rem -0.25rem -0.25rem 0;
        }
        .bmac-dismiss:hover, .bmac-dismiss:focus-visible { opacity: 1; }
        .bmac-dismiss:focus-visible { outline: 2px solid var(--accent-cyan); outline-offset: 2px; }
        @media (max-width: 480px) {
          .bmac-container { bottom: max(4.5rem, env(safe-area-inset-bottom, 4.5rem)) !important; }
        }
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
        type="button"
        aria-label="Dismiss support banner"
      >
        ×
      </button>
    </aside>
  );
}
