"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { SolarActivity } from "@/lib/types";
import { estimateRadiation } from "@/lib/radiation";
import { LAUNCH_TIME_MS } from "@/lib/constants";
import { useLocale } from "@/context/LocaleContext";

interface SolarPanelProps {
  solar: SolarActivity | null;
}

const RISK_COLORS: Record<string, string> = {
  low: "var(--accent-green)",
  moderate: "var(--accent-yellow)",
  high: "var(--accent-orange)",
  severe: "var(--accent-red)",
};

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="telem-row">
      <span className="telem-label">{label}</span>
      <span className="telem-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

function Section({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.14em",
        color: "var(--text-dim)",
        textTransform: "uppercase",
        paddingTop: 6,
        paddingBottom: 2,
        borderBottom: "1px solid var(--border-panel)",
        marginBottom: 2,
      }}
    >
      {label}
    </div>
  );
}

function formatFlux(flux: number): string {
  if (flux === 0) return "—";
  return flux.toExponential(1);
}

const RADIATION_RISK_COLORS: Record<string, string> = {
  nominal: "var(--accent-green)",
  elevated: "var(--accent-yellow)",
  high: "var(--accent-red)",
};

export function SolarPanel({ solar }: SolarPanelProps) {
  const s = solar;
  const risk = s?.radiationRisk ?? "low";
  const riskColor = RISK_COLORS[risk] ?? "var(--text-dim)";

  const metMs = Date.now() - LAUNCH_TIME_MS;
  const radiation = s ? estimateRadiation(metMs, s.protonFlux10MeV) : null;
  const { t } = useLocale();

  return (
    <PanelFrame
      title={t("panels.spaceWeather")}
      icon="☀️"
      accentColor="var(--accent-orange)"
      headerRight={
        s ? (
          <span
            style={{
              fontSize: 9,
              color: riskColor,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {risk} risk
          </span>
        ) : null
      }
    >
      <Section label={t("solar.geomagnetic")} />
      <Row
        label={t("solar.kpIndex")}
        value={s ? `${s.kpIndex.toFixed(1)} — ${s.kpLabel}` : "—"}
        color={s && s.kpIndex >= 5 ? "var(--accent-orange)" : undefined}
      />

      <Section label={t("solar.solarXray")} />
      <Row
        label={t("solar.flux")}
        value={s ? formatFlux(s.xrayFlux) + " W/m²" : "—"}
      />
      <Row
        label={t("solar.flareClass")}
        value={s?.xrayClass ?? "—"}
        color={s && (s.xrayClass === "M" || s.xrayClass === "X") ? "var(--accent-red)" : undefined}
      />

      <Section label={t("solar.protonFlux")} />
      <Row
        label="≥1 MeV"
        value={s ? `${s.protonFlux1MeV.toFixed(1)} pfu` : "—"}
      />
      <Row
        label="≥10 MeV"
        value={s ? `${s.protonFlux10MeV.toFixed(1)} pfu` : "—"}
        color={s && s.protonFlux10MeV >= 10 ? "var(--accent-orange)" : undefined}
      />
      <Row
        label="≥100 MeV"
        value={s ? `${s.protonFlux100MeV.toFixed(2)} pfu` : "—"}
        color={s && s.protonFlux100MeV >= 1 ? "var(--accent-red)" : undefined}
      />

      <Section label={t("solar.radiationDose")} />
      <Row
        label={t("solar.dailyRate")}
        value={radiation ? `${radiation.dailyRate} mSv/day` : "—"}
      />
      <Row
        label={t("solar.missionTotal")}
        value={radiation ? `${radiation.totalDose} mSv` : "—"}
        color={
          radiation && radiation.totalDose > 50
            ? "var(--accent-red)"
            : radiation && radiation.totalDose > 10
            ? "var(--accent-yellow)"
            : undefined
        }
      />
      <Row
        label={t("solar.gcr")}
        value={radiation ? `${radiation.missionDoseGcr} mSv` : "—"}
      />
      <Row
        label={t("solar.beltTransit")}
        value={radiation ? `${radiation.missionDoseBelt} mSv` : "—"}
      />
      <Row
        label={t("solar.solarEvents")}
        value={radiation ? `${radiation.missionDoseSep} mSv` : "—"}
      />
      {radiation && (
        <div style={{ paddingTop: 4, paddingBottom: 2 }}>
          <div className="telem-row">
            <span className="telem-label">{t("solar.annualLimit")}</span>
            <span className="telem-value">{radiation.annualLimitPercent}% of 500 mSv</span>
          </div>
          <div style={{ background: "#1a2332", borderRadius: 3, height: 6, marginTop: 4 }}>
            <div
              style={{
                width: `${Math.min(100, radiation.annualLimitPercent)}%`,
                height: "100%",
                borderRadius: 3,
                background:
                  radiation.annualLimitPercent > 50
                    ? "var(--accent-red)"
                    : radiation.annualLimitPercent > 20
                    ? "var(--accent-orange)"
                    : "var(--accent-green)",
              }}
            />
          </div>
        </div>
      )}
      <Row
        label={t("telemetry.status")}
        value={radiation ? radiation.riskDescription : "—"}
        color={radiation ? RADIATION_RISK_COLORS[radiation.riskLevel] : undefined}
      />
    </PanelFrame>
  );
}
