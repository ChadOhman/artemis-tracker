import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Artemis II Mission Tracker — Live telemetry from NASA's crewed lunar flyby";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #060a10 0%, #0d1a2d 50%, #060a10 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Stars background effect */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 2,
                height: 2,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.4)",
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
              }}
            />
          ))}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#00e5ff",
            letterSpacing: "0.08em",
            marginBottom: 8,
            display: "flex",
          }}
        >
          ARTEMIS II
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#a0b8c8",
            letterSpacing: "0.12em",
            marginBottom: 40,
            display: "flex",
          }}
        >
          LIVE MISSION TRACKER
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
          {["TELEMETRY", "DSN COMMS", "ORBIT MAP", "CREW TIMELINE"].map((label) => (
            <div
              key={label}
              style={{
                padding: "8px 20px",
                border: "1px solid rgba(0,229,255,0.3)",
                borderRadius: 6,
                color: "#00e5ff",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.14em",
                display: "flex",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            fontSize: 20,
            color: "#5a7a8a",
            letterSpacing: "0.06em",
            display: "flex",
          }}
        >
          artemis.cdnspace.ca
        </div>

        {/* Created by */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 32,
            fontSize: 14,
            color: "#3a5a6a",
            display: "flex",
          }}
        >
          Canadian Space · cdnspace.ca
        </div>

        {/* Live indicator */}
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ff3333",
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#ff3333", letterSpacing: "0.1em" }}>
            LIVE
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
