"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { getApollo8Context, formatApollo8Met } from "@/lib/apollo8";

interface Apollo8PanelProps {
  metMs: number;
}

export function Apollo8Panel({ metMs }: Apollo8PanelProps) {
  const { current, next, hoursElapsed } = getApollo8Context(metMs);

  return (
    <PanelFrame
      title="Apollo 8 · 1968"
      icon="📜"
      accentColor="var(--accent-yellow)"
      headerRight={
        <span style={{
          fontSize: 9,
          color: "var(--text-dim)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontVariantNumeric: "tabular-nums",
        }}>
          MET {formatApollo8Met(hoursElapsed)}
        </span>
      }
    >
      <div style={{ padding: "6px 4px" }}>
        <div style={{
          fontSize: 10,
          color: "var(--text-dim)",
          marginBottom: 8,
          lineHeight: 1.5,
          fontStyle: "italic",
        }}>
          57 years ago, Borman, Lovell, and Anders were on the first crewed mission to the Moon.
          At this point in their mission...
        </div>

        {current ? (
          <div style={{
            padding: "10px 12px",
            background: "rgba(255,214,0,0.05)",
            border: "1px solid rgba(255,214,0,0.15)",
            borderRadius: 6,
            marginBottom: 8,
          }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--accent-yellow)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}>
              Last Event · MET {formatApollo8Met(current.metHours)}
            </div>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}>
              {current.name}
            </div>
            <div style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}>
              {current.description}
            </div>
          </div>
        ) : (
          <div style={{
            padding: "10px 12px",
            color: "var(--text-dim)",
            fontSize: 11,
          }}>
            Pre-launch phase. Apollo 8 has not yet launched at this mission elapsed time.
          </div>
        )}

        {next && (
          <div style={{
            padding: "8px 12px",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-panel)",
            borderRadius: 6,
          }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}>
              Next · MET {formatApollo8Met(next.metHours)} · in {(next.metHours - hoursElapsed).toFixed(1)}h
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}>
              {next.name}
            </div>
          </div>
        )}

        <div style={{
          fontSize: 9,
          color: "var(--text-dim)",
          marginTop: 10,
          paddingTop: 6,
          borderTop: "1px solid var(--border-panel)",
          lineHeight: 1.4,
        }}>
          Apollo 8 launched December 21, 1968 — first crewed mission to orbit the Moon.
          Artemis II is the first crewed lunar flyby since Apollo 17 in 1972.
        </div>
      </div>
    </PanelFrame>
  );
}
