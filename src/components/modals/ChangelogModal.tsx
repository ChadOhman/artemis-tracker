"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { useLocale } from "@/context/LocaleContext";

interface ChangelogEntry {
  hash: string;
  date: string;
  subject: string;
}

const STORAGE_KEY = "lastSeenBuild";
const DISMISS_KEY = "changelogDismissed";
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const CHANGELOG_RAW = process.env.NEXT_PUBLIC_CHANGELOG ?? "[]";

function parseChangelog(): ChangelogEntry[] {
  try {
    return JSON.parse(CHANGELOG_RAW);
  } catch {
    return [];
  }
}

function formatDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ChangelogModal({ manualOpen, onManualClose }: { manualOpen?: boolean; onManualClose?: () => void } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const { locale, t } = useLocale();

  // Auto-show on new builds (unless user opted out with "never show again")
  useEffect(() => {
    if (!BUILD_ID) return;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "true";
    const lastSeen = localStorage.getItem(STORAGE_KEY);

    if (!lastSeen) {
      localStorage.setItem(STORAGE_KEY, BUILD_ID);
      return;
    }
    if (lastSeen === BUILD_ID) return;
    if (dismissed) {
      localStorage.setItem(STORAGE_KEY, BUILD_ID);
      return;
    }

    const all = parseChangelog();
    const lastSeenIdx = all.findIndex((e) => e.hash === lastSeen);
    const newEntries = lastSeenIdx === -1 ? all.slice(0, 10) : all.slice(0, lastSeenIdx);

    if (newEntries.length > 0) {
      setEntries(newEntries);
      setIsOpen(true);
    } else {
      localStorage.setItem(STORAGE_KEY, BUILD_ID);
    }
  }, []);

  // Manual open from footer
  useEffect(() => {
    if (manualOpen) {
      setEntries(parseChangelog().slice(0, 20));
      setIsOpen(true);
    }
  }, [manualOpen]);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, BUILD_ID);
    setIsOpen(false);
    onManualClose?.();
  }

  function handleNeverShow() {
    localStorage.setItem(DISMISS_KEY, "true");
    localStorage.setItem(STORAGE_KEY, BUILD_ID);
    setIsOpen(false);
    onManualClose?.();
  }

  const title = locale === "fr" ? "Nouveautés" : "What's New";
  const intro =
    locale === "fr"
      ? "Voici ce qui a changé depuis votre dernière visite :"
      : "Here's what's changed since your last visit:";
  const closeLabel = locale === "fr" ? "Compris" : "Got it";
  const neverLabel = locale === "fr" ? "Ne plus afficher" : "Never show again";

  return (
    <Modal title={title} isOpen={isOpen} onClose={handleClose} maxWidth="580px">
      <div style={{ padding: "16px 20px 20px" }}>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            marginTop: 0,
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          {intro}
        </p>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {entries.map((entry) => (
            <li
              key={entry.hash}
              style={{
                padding: "10px 12px",
                background: "var(--bg-panel)",
                border: "1px solid var(--border-panel)",
                borderLeft: "3px solid var(--accent-cyan)",
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.5,
                  marginBottom: 4,
                }}
              >
                {entry.subject}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.02em",
                }}
              >
                {formatDate(entry.date, locale)} · {entry.hash}
              </div>
            </li>
          ))}
        </ul>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <button
            onClick={handleNeverShow}
            style={{
              padding: "6px 12px",
              background: "none",
              color: "var(--text-dim)",
              border: "1px solid var(--border-panel)",
              borderRadius: 4,
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {neverLabel}
          </button>
          <button
            onClick={handleClose}
            style={{
              padding: "8px 20px",
              background: "var(--accent-cyan)",
              color: "#001a20",
              border: "none",
              borderRadius: 4,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
