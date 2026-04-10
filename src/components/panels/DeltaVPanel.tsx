"use client";
import { useState, useEffect } from "react";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { useLocale } from "@/context/LocaleContext";

interface DeltaVPanelProps {
  metMs: number;
}

interface Burn {
  name: string;
  metHours: number;
  dv: number;
  status: string;
}

const DEFAULT_BURNS: Burn[] = [
  { name: "PRM", metHours: 0.82, dv: 2.6, status: "executed" },
  { name: "ARB", metHours: 1.79, dv: 140, status: "executed" },
  { name: "TLI", metHours: 25.23, dv: 3180, status: "executed" },
  { name: "OTC-1", metHours: 49, dv: 0, status: "cancelled" },
  { name: "OTC-2", metHours: 73, dv: 0, status: "cancelled" },
  { name: "OTC-3", metHours: 100, dv: 3, status: "executed" },
  { name: "RTC-1", metHours: 147, dv: 0.4, status: "executed" },
  { name: "RTC-2", metHours: 196.3, dv: 1.6, status: "executed" },
  { name: "CM Raise", metHours: 217, dv: 5, status: "planned" },
];

// TLI is provided by ICPS — Orion's own delta-v budget is for post-TLI maneuvers only

// ── ESM Propellant & Δv from Tsiolkovsky ──────────────────────────────────
// Source: NASA press conference post-RTC-1 (2026-04-08)
const PROPELLANT_TOTAL_LBS = 7248;     // lbs loaded for Artemis II
const PROPELLANT_CONSUMED_LBS = 2964;  // lbs consumed (all burns + RCS station-keeping)
const PROPELLANT_REMAINING_LBS = 4284; // lbs remaining

// Tsiolkovsky: Δv = Isp × g₀ × ln(m_wet / m_dry)
const LBS_TO_KG = 0.453592;
const ESM_ISP = 316;                   // seconds — OMS-E main engine
const G0 = 9.80665;                    // m/s²
// Orion dry mass (public estimates): CM ~10,400 kg + ESM structure ~6,185 kg + crew/consumables ~350 kg
const DRY_MASS_KG = 16935;

const propellantTotalKg = PROPELLANT_TOTAL_LBS * LBS_TO_KG;
const propellantRemainingKg = PROPELLANT_REMAINING_LBS * LBS_TO_KG;
const MISSION_BUDGET_DV = ESM_ISP * G0 * Math.log((DRY_MASS_KG + propellantTotalKg) / DRY_MASS_KG);
const REMAINING_DV = ESM_ISP * G0 * Math.log((DRY_MASS_KG + propellantRemainingKg) / DRY_MASS_KG);
const USED_DV = MISSION_BUDGET_DV - REMAINING_DV;

const STATUS_COLORS: Record<string, string> = {
  executed: "var(--accent-cyan)",
  cancelled: "var(--text-dim)",
  planned: "var(--accent-yellow)",
};

const STATUS_BG: Record<string, string> = {
  executed: "rgba(0, 229, 255, 0.12)",
  cancelled: "rgba(255,255,255,0.05)",
  planned: "rgba(255, 200, 0, 0.12)",
};

export function DeltaVPanel({ metMs }: DeltaVPanelProps) {
  const { t } = useLocale();

  // Fetch runtime overrides from admin API and merge with defaults
  const [burns, setBurns] = useState<Burn[]>(DEFAULT_BURNS);
  useEffect(() => {
    fetch("/api/admin/burns")
      .then((r) => r.json())
      .then((data) => {
        if (!data.overrides || data.overrides.length === 0) return;
        setBurns(DEFAULT_BURNS.map((b) => {
          const override = data.overrides.find((o: { name: string }) => o.name === b.name);
          if (!override) return b;
          return {
            ...b,
            status: override.status ?? b.status,
            dv: override.dv != null ? override.dv : b.dv,
          };
        }));
      })
      .catch(() => { /* use defaults */ });
  }, []);

  // Cumulative Δ-v since PRM — includes ICPS burns (PRM, ARB, TLI) for context
  const totalUsed = burns.filter(
    (b) => b.status === "executed" && metMs >= b.metHours * 3600000
  ).reduce((sum, b) => sum + b.dv, 0);

  // ESM budget from Tsiolkovsky + NASA propellant data (includes RCS station-keeping)
  const esmUsed = USED_DV;
  const remaining = REMAINING_DV;
  const usedPercent = Math.min(100, Math.max(0, (esmUsed / MISSION_BUDGET_DV) * 100));
  const isOverBudget = remaining < 0;
  const fuelPercent = (PROPELLANT_CONSUMED_LBS / PROPELLANT_TOTAL_LBS) * 100;

  return (
    <PanelFrame title={t("deltaV.title")} icon="🚀" accentColor="var(--accent-cyan)">
      {/* Big numbers — ESM-only so they tell the same story as the bar below */}
      <div
        style={{
          display: "flex",
          gap: 16,
          paddingBottom: 8,
          borderBottom: "1px solid var(--border-panel)",
          marginBottom: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            {t("deltaV.used")} (ESM)
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--accent-cyan)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "-0.01em",
            }}
          >
            {esmUsed.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-secondary)" }}>m/s</span>
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            {t("deltaV.remaining")} (ESM)
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: isOverBudget ? "var(--accent-red)" : "var(--accent-green)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "-0.01em",
            }}
          >
            {remaining.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-secondary)" }}>m/s</span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-dim)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            {t("deltaV.propellant")}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {PROPELLANT_REMAINING_LBS.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-dim)" }}>lbs</span>
          </div>
          <div style={{ fontSize: 8, color: "var(--text-dim)", marginTop: 1 }}>{fuelPercent.toFixed(1)}% {t("deltaV.consumed")}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 3,
            fontSize: 9,
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
          }}
        >
          <span>{t("deltaV.esmBudget")}</span>
          <span>{usedPercent.toFixed(1)}{t("deltaV.percentUsed")}</span>
        </div>
        <div
          style={{
            background: "#1a2332",
            borderRadius: 3,
            height: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${usedPercent}%`,
              height: "100%",
              borderRadius: 3,
              background: isOverBudget ? "var(--accent-red)" : "var(--accent-cyan)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 2,
            fontSize: 8,
            color: "var(--text-dim)",
          }}
        >
          <span>0</span>
          <span>{Math.round(MISSION_BUDGET_DV)} m/s</span>
        </div>
      </div>

      {/* Burns table */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {burns.map((burn) => {
          const isPast = metMs >= burn.metHours * 3600000;
          const isPostTli = burn.metHours > 25.3;
          const statusColor = STATUS_COLORS[burn.status] ?? "var(--text-dim)";
          const statusBg = STATUS_BG[burn.status] ?? "transparent";

          return (
            <div
              key={burn.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 5px",
                borderRadius: 3,
                background: isPast && isPostTli && burn.status === "executed"
                  ? "rgba(0, 229, 255, 0.06)"
                  : "transparent",
                opacity: burn.status === "cancelled" ? 0.5 : 1,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: statusColor,
                  fontFamily: "var(--font-mono)",
                  minWidth: 56,
                }}
              >
                {burn.name}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "var(--text-dim)",
                  flex: 1,
                }}
              >
                T+{burn.metHours.toFixed(2)}h
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  minWidth: 52,
                  textAlign: "right",
                }}
              >
                {burn.dv > 0 ? `${burn.dv} m/s` : "—"}
              </span>
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: statusColor,
                  background: statusBg,
                  padding: "1px 4px",
                  borderRadius: 2,
                  minWidth: 52,
                  textAlign: "center",
                }}
              >
                {t(`deltaV.${burn.status}`)}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 8,
          color: "var(--text-dim)",
          fontStyle: "italic",
          letterSpacing: "0.04em",
        }}
      >
        {t("deltaV.note")}
      </div>
    </PanelFrame>
  );
}
