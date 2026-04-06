"use client";
import { Modal } from "@/components/shared/Modal";

interface CrewMember {
  name: string;
  flag: string;
  role: string;
  agency: "NASA" | "CSA";
  bio: string;
  firsts: string[];
}

const CREW: CrewMember[] = [
  {
    name: "Reid Wiseman",
    flag: "🇺🇸",
    role: "Commander",
    agency: "NASA",
    bio: "Navy Captain and test pilot with experience in the F-35 and F/A-18. Flew to ISS on Expedition 40/41 in 2014. Former Chief of the NASA Astronaut Office.",
    firsts: ["Oldest human to travel beyond low Earth orbit"],
  },
  {
    name: "Victor Glover",
    flag: "🇺🇸",
    role: "Pilot",
    agency: "NASA",
    bio: "Naval aviator and test pilot. Flew on SpaceX Crew-1 to the ISS, completing 4 spacewalks during his mission.",
    firsts: ["FIRST person of color beyond low Earth orbit"],
  },
  {
    name: "Christina Koch",
    flag: "🇺🇸",
    role: "Mission Specialist 1",
    agency: "NASA",
    bio: "Electrical engineer who spent 328 days aboard the ISS — a women's record at the time. Participated in the first all-female spacewalks.",
    firsts: ["FIRST woman beyond low Earth orbit"],
  },
  {
    name: "Jeremy Hansen",
    flag: "🇨🇦",
    role: "Mission Specialist 2",
    agency: "CSA",
    bio: "CF-18 fighter pilot representing the Canadian Space Agency. This is his first spaceflight.",
    firsts: ["FIRST Canadian & non-U.S. citizen beyond LEO"],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CrewModal({ isOpen, onClose }: Props) {
  return (
    <Modal title="Artemis II Crew" isOpen={isOpen} onClose={onClose} maxWidth="860px">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          padding: 20,
        }}
      >
        {CREW.map((member) => {
          const isNasa = member.agency === "NASA";
          const borderColor = isNasa ? "var(--accent-cyan)" : "var(--accent-red)";
          return (
            <div
              key={member.name}
              style={{
                background: "var(--bg-panel)",
                border: "1px solid var(--border-subtle)",
                borderLeft: `3px solid ${borderColor}`,
                borderRadius: 6,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Name + flag */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22 }}>{member.flag}</span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--accent-yellow)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {member.name}
                </span>
              </div>

              {/* Role + agency */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {member.role}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: isNasa ? "var(--accent-cyan)" : "var(--accent-red)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    background: isNasa
                      ? "rgba(0,229,255,0.1)"
                      : "rgba(255,61,61,0.12)",
                    padding: "1px 6px",
                    borderRadius: 3,
                    border: `1px solid ${isNasa ? "rgba(0,229,255,0.25)" : "rgba(255,61,61,0.3)"}`,
                  }}
                >
                  {member.agency}
                </span>
              </div>

              {/* Bio */}
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {member.bio}
              </p>

              {/* FIRST achievements */}
              {member.firsts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {member.firsts.map((first) => (
                    <span
                      key={first}
                      style={{
                        display: "inline-block",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--bg-primary)",
                        background: "var(--accent-cyan)",
                        padding: "3px 8px",
                        borderRadius: 3,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        alignSelf: "flex-start",
                      }}
                    >
                      {first}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
