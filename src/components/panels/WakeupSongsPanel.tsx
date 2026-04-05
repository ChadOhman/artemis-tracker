"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { WAKEUP_SONGS } from "@/lib/wakeup-songs";
import { useLocale } from "@/context/LocaleContext";

export function WakeupSongsPanel() {
  const { locale } = useLocale();
  const title = locale === "fr" ? "Chansons de réveil" : "Wake-Up Songs";
  const subtitle =
    locale === "fr"
      ? "Tradition depuis Apollo — musique pour réveiller l'équipage"
      : "A tradition since Apollo — music to wake the crew";
  const fdLabel = locale === "fr" ? "JV" : "FD";

  // Show most recent first
  const sorted = [...WAKEUP_SONGS].sort((a, b) => b.flightDay - a.flightDay);

  return (
    <PanelFrame title={title} icon="🎵" accentColor="var(--accent-purple)">
      <div style={{ padding: "4px 2px" }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-dim)",
            marginBottom: 10,
            fontStyle: "italic",
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </div>

        {sorted.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", padding: "12px 0" }}>
            {locale === "fr" ? "Aucune chanson encore" : "No songs yet"}
          </div>
        )}

        {sorted.map((song, i) => {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
            `${song.title} ${song.artist} song`
          )}`;
          return (
            <div
              key={i}
              style={{
                padding: "8px 10px",
                background: "var(--bg-panel)",
                border: "1px solid var(--border-panel)",
                borderLeft: "2px solid var(--accent-purple)",
                borderRadius: 4,
                marginBottom: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <a
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    textDecoration: "none",
                    flex: 1,
                  }}
                  title={locale === "fr" ? "Rechercher cette chanson" : "Search for this song"}
                >
                  {song.title}
                </a>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "var(--accent-purple)",
                    background: "rgba(179,136,255,0.1)",
                    padding: "2px 6px",
                    borderRadius: 3,
                    border: "1px solid rgba(179,136,255,0.25)",
                    flexShrink: 0,
                  }}
                >
                  {fdLabel}
                  {String(song.flightDay).padStart(2, "0")}
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                {song.artist}
                {song.year && ` · ${song.year}`}
              </div>
              {song.notes && (
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    marginTop: 4,
                    lineHeight: 1.4,
                    fontStyle: "italic",
                  }}
                >
                  {song.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PanelFrame>
  );
}
