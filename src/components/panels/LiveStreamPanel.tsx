"use client";
import { useState } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { useLocale } from "@/context/LocaleContext";

const STREAMS = [
  { id: "official", labelKey: "liveStream.officialBroadcast", videoId: "m3kR2KK8TEs" },
  { id: "orion", labelKey: "liveStream.orionViews", videoId: "6RwfNBtepa4" },
] as const;

type StreamId = (typeof STREAMS)[number]["id"];

export function LiveStreamPanel() {
  const { t } = useLocale();
  const [activeStream, setActiveStream] = useState<StreamId>("official");

  const stream = STREAMS.find((s) => s.id === activeStream) ?? STREAMS[0];

  const streamToggle = (
    <div style={{ display: "flex", gap: 4 }}>
      {STREAMS.map((s) => (
        <button
          key={s.id}
          onClick={() => setActiveStream(s.id)}
          aria-label={`Switch to ${t(s.labelKey)} stream`}
          aria-pressed={activeStream === s.id}
          style={{
            padding: "2px 8px",
            borderRadius: 3,
            border: `1px solid ${activeStream === s.id ? "var(--accent-red)" : "var(--border-panel)"}`,
            background:
              activeStream === s.id ? "rgba(255,61,61,0.15)" : "transparent",
            color:
              activeStream === s.id ? "var(--accent-red)" : "var(--text-dim)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.08em",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s ease",
          }}
        >
          {t(s.labelKey)}
        </button>
      ))}
    </div>
  );

  return (
    <PanelFrame
      title={t("liveStream.title")}
      icon="📺"
      accentColor="var(--accent-red)"
      collapsible
      defaultCollapsed={false}
      headerRight={streamToggle}
      bodyClassName=""
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "56.25%",
          background: "#000",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <iframe
          key={stream.videoId}
          src={`https://www.youtube.com/embed/${stream.videoId}?autoplay=0&rel=0&modestbranding=1`}
          title={`NASA Artemis II Live Stream — ${t(stream.labelKey)}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </div>
    </PanelFrame>
  );
}
