"use client";
import { Modal } from "@/components/shared/Modal";

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function Source({
  name,
  url,
  description,
}: {
  name: string;
  url: string;
  description: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "var(--accent-cyan)",
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {name}
      </a>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
  );
}

export function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  return (
    <Modal title="Data Sources & Credits" isOpen={isOpen} onClose={onClose} maxWidth="540px">
      <div style={{ padding: "16px 20px 20px" }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          This tracker aggregates publicly available data from NASA and JPL.
          It is not affiliated with or endorsed by NASA, JPL, or the Canadian Space Agency.
        </div>

        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            paddingBottom: 4,
            borderBottom: "1px solid var(--border-panel)",
            marginBottom: 12,
          }}
        >
          Orbital Data
        </div>

        <Source
          name="JPL Horizons System"
          url="https://ssd.jpl.nasa.gov/horizons/"
          description="Spacecraft ephemeris (position, velocity) for Orion and the Moon. Polled every 5 minutes. Operated by NASA's Jet Propulsion Laboratory."
        />

        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            paddingBottom: 4,
            borderBottom: "1px solid var(--border-panel)",
            marginBottom: 12,
          }}
        >
          Spacecraft Telemetry
        </div>

        <Source
          name="NASA AROW (Artemis Real-time Orbit Website)"
          url="https://www.nasa.gov/missions/artemis-ii/arow/"
          description="Real-time attitude (quaternion, Euler angles, angular rates), solar array wing angles, antenna gimbal angles, ICPS upper stage tracking, and spacecraft mode. Polled every 1 second from AROW ground control telemetry. Parameter mappings confirmed via IL2CPP metadata reverse-engineering."
        />

        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            paddingBottom: 4,
            borderBottom: "1px solid var(--border-panel)",
            marginBottom: 12,
          }}
        >
          Communications
        </div>

        <Source
          name="DSN Now"
          url="https://eyes.nasa.gov/dsn/data/dsn.xml"
          description="Deep Space Network dish status — active contacts, signal bands, data rates, range, and round-trip light time. Polled every 10 seconds."
        />

        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            paddingBottom: 4,
            borderBottom: "1px solid var(--border-panel)",
            marginBottom: 12,
          }}
        >
          Mission Timeline
        </div>

        <Source
          name="NASA Artemis II Press Kit & Flight Plan"
          url="https://www.nasa.gov/artemis-ii-press-kit/"
          description="Crew activities, mission phases, milestones, and sleep schedule derived from the official Artemis II flight plan PDF."
        />

        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            paddingBottom: 4,
            borderBottom: "1px solid var(--border-panel)",
            marginBottom: 12,
          }}
        >
          Built With
        </div>

        <Source
          name="Next.js, Three.js, TypeScript"
          url="https://github.com/ChadOhman/artemis-tracker"
          description="Open source. Built by Canadian Space (cdnspace.ca)."
        />
        <Source
          name="Public API"
          url="/api-docs"
          description="All telemetry data is available via free REST and SSE endpoints. See the API documentation for details."
        />
      </div>
    </Modal>
  );
}
