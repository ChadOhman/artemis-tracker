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

export function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const { locale, t } = useLocale();

  useEffect(() => {
    if (!BUILD_ID) return;
    const lastSeen = localStorage.getItem(STORAGE_KEY);

    // First-time visitor — just record the current build, don't show modal
    if (!lastSeen) {
      localStorage.setItem(STORAGE_KEY, BUILD_ID);
      return;
    }

    // Same build — nothing new
    if (lastSeen === BUILD_ID) return;

    // New build since last visit — show all entries added since lastSeen
    const all = parseChangelog();
    const lastSeenIdx = all.findIndex((e) => e.hash === lastSeen);
    // If lastSeen isn't in the log (too old), show top 10
    const newEntries = lastSeenIdx === -1 ? all.slice(0, 10) : all.slice(0, lastSeenIdx);

    if (newEntries.length > 0) {
      setEntries(newEntries);
      setIsOpen(true);
    } else {
      // No feat: commits between builds, just update silently
      localStorage.setItem(STORAGE_KEY, BUILD_ID);
    }
  }, []);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, BUILD_ID);
    setIsOpen(false);
  }

  const title = locale === "fr" ? "Nouveautés" : "What's New";
  const intro =
    locale === "fr"
      ? "Voici ce qui a changé depuis votre dernière visite :"
      : "Here's what's changed since your last visit:";
  const closeLabel = locale === "fr" ? "Compris" : "Got it";

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
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
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
