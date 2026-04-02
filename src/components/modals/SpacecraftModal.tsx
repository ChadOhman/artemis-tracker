"use client";
import { Modal } from "@/components/shared/Modal";

interface Spec {
  label: string;
  value: string;
  sub: string;
}

const SLS_SPECS: Spec[] = [
  { label: "HEIGHT", value: "322 ft", sub: "98 meters" },
  { label: "THRUST", value: "8.8M lbs", sub: "At liftoff" },
  { label: "ENGINES", value: "4x RS-25", sub: "+ 2x SRBs" },
  { label: "PAYLOAD", value: "LEO 77t", sub: "Metric tons" },
  { label: "LIFTOFF WT", value: "5.75M lbs", sub: "2,608 metric tons" },
  { label: "TYPE", value: "Super Heavy", sub: "Most powerful ever flown" },
];

const ORION_SPECS: Spec[] = [
  { label: "CREW", value: "4", sub: "Astronauts" },
  { label: "DURATION", value: "21 days", sub: "Maximum capability" },
  { label: "SVC MODULE", value: "ESM", sub: "European Space Agency" },
  { label: "HEAT SHIELD", value: "16.5 ft", sub: "AVCOAT ablative" },
  { label: "RE-ENTRY", value: "40,000", sub: "km/h (~25,000 mph)" },
  { label: "SOLAR ARRAYS", value: "~62 ft", sub: "Wingspan span" },
];

function SpecGrid({ specs }: { specs: Spec[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
        marginTop: 12,
      }}
    >
      {specs.map((spec) => (
        <div
          key={spec.label}
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 5,
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "var(--text-dim)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {spec.label}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            {spec.value}
          </div>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              marginTop: 2,
            }}
          >
            {spec.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SpacecraftModal({ isOpen, onClose }: Props) {
  return (
    <Modal title="SLS & Orion Spacecraft" isOpen={isOpen} onClose={onClose} maxWidth="900px">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          padding: 20,
        }}
      >
        {/* SLS column */}
        <div
          style={{
            paddingRight: 16,
            borderRight: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--accent-orange)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              ROCKET
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "0.08em",
              }}
            >
              SLS BLOCK 1
            </span>
          </div>
          <p
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Space Launch System — NASA&apos;s most powerful rocket, designed to
            send Orion and crew beyond low Earth orbit.
          </p>
          <SpecGrid specs={SLS_SPECS} />
        </div>

        {/* Orion column */}
        <div style={{ paddingLeft: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--accent-cyan)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              SPACECRAFT
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "0.08em",
              }}
            >
              ORION &quot;INTEGRITY&quot;
            </span>
          </div>
          <p
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            NASA&apos;s crew vehicle built for deep-space missions, featuring
            the largest heat shield ever built for a crewed spacecraft.
          </p>
          <SpecGrid specs={ORION_SPECS} />
        </div>
      </div>
    </Modal>
  );
}
