"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { getApollo8Context, formatApollo8Met } from "@/lib/apollo8";
import { useLocale } from "@/context/LocaleContext";

interface Apollo8PanelProps {
  metMs: number;
}

export function Apollo8Panel({ metMs }: Apollo8PanelProps) {
  const { current, next, hoursElapsed } = getApollo8Context(metMs);
  const { t } = useLocale();

  return (
    <PanelFrame
      title={t("apollo8.title")}
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
          {t("apollo8.subtitle")}
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
              {t("apollo8.lastEvent")} · MET {formatApollo8Met(current.metHours)}
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
            {t("apollo8.prelaunch")}
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
              {t("apollo8.next")} · MET {formatApollo8Met(next.metHours)} · in {(next.metHours - hoursElapsed).toFixed(1)}h
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
          {t("apollo8.footer")}
        </div>
      </div>
    </PanelFrame>
  );
}
