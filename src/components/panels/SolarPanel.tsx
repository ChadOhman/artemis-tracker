"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import type { SolarActivity } from "@/lib/types";
import { estimateRadiation } from "@/lib/radiation";
import { LAUNCH_TIME_MS } from "@/lib/constants";

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

  return (
    <PanelFrame
      title="Space Weather"
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
      <Section label="Geomagnetic" />
      <Row
        label="Kp Index"
        value={s ? `${s.kpIndex.toFixed(1)} — ${s.kpLabel}` : "—"}
        color={s && s.kpIndex >= 5 ? "var(--accent-orange)" : undefined}
      />

      <Section label="Solar X-Ray" />
      <Row
        label="Flux"
        value={s ? formatFlux(s.xrayFlux) + " W/m²" : "—"}
      />
      <Row
        label="Flare Class"
        value={s?.xrayClass ?? "—"}
        color={s && (s.xrayClass === "M" || s.xrayClass === "X") ? "var(--accent-red)" : undefined}
      />

      <Section label="Proton Flux" />
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

      <Section label="Radiation Dose (Est.)" />
      <Row
        label="Daily Rate"
        value={radiation ? `${radiation.dailyRate} mSv/day` : "—"}
      />
      <Row
        label="Mission Total"
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
        label="GCR"
        value={radiation ? `${radiation.missionDoseGcr} mSv` : "—"}
      />
      <Row
        label="Belt Transit"
        value={radiation ? `${radiation.missionDoseBelt} mSv` : "—"}
      />
      <Row
        label="Solar Events"
        value={radiation ? `${radiation.missionDoseSep} mSv` : "—"}
      />
      {radiation && (
        <div style={{ paddingTop: 4, paddingBottom: 2 }}>
          <div className="telem-row">
            <span className="telem-label">Annual Limit</span>
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
        label="Status"
        value={radiation ? radiation.riskDescription : "—"}
        color={radiation ? RADIATION_RISK_COLORS[radiation.riskLevel] : undefined}
      />
    </PanelFrame>
  );
}
