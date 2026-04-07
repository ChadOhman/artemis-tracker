"use client";
import { useState, useEffect } from "react";

const CONSENT_KEY = "cookie-consent";
const GA_ID = "G-0LJP2B1KHG";

function loadGA() {
  // Don't load twice
  if (document.querySelector(`script[src*="googletagmanager"]`)) return;

  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  gtag("js", new Date());
  gtag("config", GA_ID);
}

function removeGA() {
  // Remove GA scripts
  document.querySelectorAll(`script[src*="googletagmanager"]`).forEach((s) => s.remove());
  document.querySelectorAll(`script[id="gtag-init"]`).forEach((s) => s.remove());
  // Clear GA cookies
  document.cookie.split(";").forEach((c) => {
    const name = c.trim().split("=")[0];
    if (name.startsWith("_ga") || name.startsWith("_gid")) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  });
  window.dataLayer = [];
}

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === "accepted") {
      loadGA();
    } else if (consent !== "declined") {
      // No decision yet — show banner
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
    loadGA();
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
    removeGA();
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: "rgba(6,10,16,0.97)",
        borderTop: "1px solid rgba(0,229,255,0.15)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        flexWrap: "wrap",
        backdropFilter: "blur(8px)",
      }}
      role="dialog"
      aria-label="Cookie consent"
    >
      <p style={{
        fontSize: 12,
        color: "var(--text-secondary, #a0b0c0)",
        margin: 0,
        lineHeight: 1.5,
        maxWidth: 600,
      }}>
        This site uses Google Analytics to understand traffic patterns and anticipate server loading.
        If you accept, Google will process your IP address and usage data.{" "}
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent-cyan, #00e5ff)", textDecoration: "underline" }}
        >
          Learn more
        </a>
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={decline}
          style={{
            padding: "6px 16px",
            background: "none",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 4,
            color: "var(--text-dim, #5a7a8a)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          style={{
            padding: "6px 16px",
            background: "var(--accent-cyan, #00e5ff)",
            border: "none",
            borderRadius: 4,
            color: "#001a20",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
