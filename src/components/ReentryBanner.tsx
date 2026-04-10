"use client";
// Full-width banner that appears below the TopBar during re-entry mode.
// Shows a big countdown to the next critical EDL event.

interface ReentryBannerProps {
  metMs: number;
}

interface EdlEvent {
  id: string;
  label: string;
  metHours: number;
}

const EDL_EVENTS: EdlEvent[] = [
  { id: "smsep",    label: "SERVICE MODULE SEPARATION", metHours: 216.5 },
  { id: "entry",    label: "ENTRY INTERFACE",           metHours: 217.0 },
  { id: "blackout", label: "PLASMA BLACKOUT",           metHours: 217.1 },
  { id: "drogue",   label: "DROGUE DEPLOY",             metHours: 217.3 },
  { id: "mains",    label: "MAIN CHUTES",               metHours: 217.4 },
  { id: "splash",   label: "SPLASHDOWN",                metHours: 217.53 },
  { id: "recovery", label: "CREW RECOVERY",             metHours: 218.0 },
];

function fmtCountdown(ms: number): string {
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function ReentryBanner({ metMs }: ReentryBannerProps) {
  // Find the next upcoming EDL event
  const next = EDL_EVENTS.find((e) => e.metHours * 3600 * 1000 > metMs);

  if (!next) {
    return (
      <div
        style={{
          background: "linear-gradient(180deg, rgba(255,102,68,0.18) 0%, rgba(255,102,68,0.04) 100%)",
          borderBottom: "1px solid rgba(255,102,68,0.3)",
          padding: "6px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#00ff88",
            letterSpacing: "0.12em",
          }}
        >
          ★ CREW SAFELY ON USS JOHN P. MURTHA
        </span>
      </div>
    );
  }

  const delta = next.metHours * 3600 * 1000 - metMs;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(255,102,68,0.18) 0%, rgba(255,102,68,0.04) 100%)",
        borderBottom: "1px solid rgba(255,102,68,0.3)",
        padding: "6px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#ff8866",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
        }}
      >
        ◉ NEXT EVENT
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {next.label}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "var(--text-dim)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
        }}
      >
        IN
      </span>
      <span
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "#ffaa00",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
          textShadow: "0 0 12px rgba(255,170,0,0.4)",
        }}
      >
        {fmtCountdown(delta)}
      </span>
    </div>
  );
}
