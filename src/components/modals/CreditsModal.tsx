"use client";
import { Modal } from "@/components/shared/Modal";
import { useLocale } from "@/context/LocaleContext";

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
        target={url.startsWith("/") ? undefined : "_blank"}
        rel={url.startsWith("/") ? undefined : "noopener noreferrer"}
        style={{
          color: "var(--accent-cyan)",
          textDecoration: "underline",
          textDecorationColor: "rgba(0, 229, 255, 0.3)",
          textUnderlineOffset: 3,
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

function SectionHeader({ label }: { label: string }) {
  return (
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
      {label}
    </div>
  );
}

export function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  const { t } = useLocale();

  return (
    <Modal title={t("credits.title")} isOpen={isOpen} onClose={onClose} maxWidth="540px">
      <div style={{ padding: "16px 20px 20px" }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          {t("credits.intro")}
        </div>

        <SectionHeader label={t("credits.orbitalData")} />

        <Source
          name="JPL Horizons System"
          url="https://ssd.jpl.nasa.gov/horizons/"
          description="Spacecraft ephemeris (position, velocity) for Orion and the Moon. Polled every 5 minutes. Operated by NASA's Jet Propulsion Laboratory."
        />

        <SectionHeader label={t("credits.spacecraftTelemetry")} />

        <Source
          name="NASA AROW (Artemis Real-time Orbit Website)"
          url="https://www.nasa.gov/missions/artemis-ii/arow/"
          description="Real-time attitude (quaternion, Euler angles, angular rates), solar array wing angles, antenna gimbal angles, ICPS upper stage tracking, and spacecraft mode. Polled every 1 second from AROW ground control telemetry. Parameter mappings confirmed via IL2CPP metadata reverse-engineering."
        />

        <SectionHeader label={t("credits.communications")} />

        <Source
          name="DSN Now"
          url="https://eyes.nasa.gov/dsn/data/dsn.xml"
          description="Deep Space Network dish status — active contacts, signal bands, data rates, range, and round-trip light time. Polled every 10 seconds."
        />

        <SectionHeader label={t("credits.spaceWeather")} />

        <Source
          name="NOAA Space Weather Prediction Center"
          url="https://www.swpc.noaa.gov/"
          description="Planetary K-index (geomagnetic activity), GOES X-ray flux (solar flare class), and proton flux at 1/10/100 MeV (radiation risk to crew). Polled from services.swpc.noaa.gov every 60 seconds. Operated by NOAA, a U.S. agency."
        />

        <SectionHeader label={t("credits.groundTrack")} />

        <Source
          name="OpenStreetMap contributors"
          url="https://www.openstreetmap.org/copyright"
          description="Underlying map data for the Earth ground track visualization. © OpenStreetMap contributors, available under the Open Database License."
        />

        <Source
          name="CARTO"
          url="https://carto.com/attributions"
          description="Dark basemap tile styling served via CARTO's free basemap CDN."
        />

        <SectionHeader label={t("credits.missionTimeline")} />

        <Source
          name="NASA Artemis II Press Kit & Flight Plan"
          url="https://www.nasa.gov/artemis-ii-press-kit/"
          description="Crew activities, mission phases, milestones, and sleep schedule derived from the official Artemis II flight plan PDF."
        />

        <Source
          name="jakobrosin/artemis-data"
          url="https://github.com/jakobrosin/artemis-data"
          description="Community-maintained Artemis II mission timeline data — provides the crew schedule and milestone MET times used throughout this tracker. Huge thanks to Jakob Rosin for maintaining this open dataset."
        />

        <SectionHeader label={t("credits.historicalContext")} />

        <Source
          name="NASA Apollo 8 Mission Report & Press Kit"
          url="https://www.nasa.gov/mission/apollo-8/"
          description="Mission elapsed times, burn durations, and event descriptions for the Apollo 8 historical comparison panel."
        />

        <Source
          name="Apollo Flight Journal — Apollo 8"
          url="https://history.nasa.gov/afj/ap08fj/"
          description="Detailed annotated flight transcripts maintained by David Woods and the NASA History Division. Primary source for Apollo 8 event timing and descriptions."
        />

        <SectionHeader label={t("credits.communityContributions")} />

        <Source
          name="Brian Brown — Real Ephemeris Trajectory"
          url="https://github.com/briangbrown"
          description="Replaced the synthetic figure-8 orbit map with a real reference trajectory built from JPL Horizons ephemeris data and the NASA/JSC Artemis II OEM, with Douglas-Peucker simplification and proper EME2000 frame projection."
        />

        <Source
          name="agmccar — Panel Visibility & Layout Presets"
          url="https://github.com/agmccar"
          description="Dashboard layout customization system with panel visibility toggles, column placement, top bar item control, and saved preset support with localStorage persistence."
        />

        <SectionHeader label={t("credits.builtWith")} />

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

        <SectionHeader label={t("credits.landAcknowledgement")} />
        <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 8 }}>
          {t("credits.landAcknowledgementText")}
        </div>
      </div>
    </Modal>
  );
}
