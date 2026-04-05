"use client";
import { PanelFrame } from "@/components/shared/PanelFrame";
import { useLocale } from "@/context/LocaleContext";

interface DeltaVPanelProps {
  metMs: number;
}

const BURNS = [
  { name: "PRM", metHours: 0.82, dv: 2.6, status: "executed" },
  { name: "ARB", metHours: 1.79, dv: 140, status: "executed" },
  { name: "TLI", metHours: 25.23, dv: 3180, status: "executed" },
  { name: "OTC-1", metHours: 49, dv: 0, status: "cancelled" },
  { name: "OTC-2", metHours: 73, dv: 0, status: "cancelled" },
  { name: "OTC-3", metHours: 100, dv: 2, status: "planned" },
  { name: "RTC-1", metHours: 147, dv: 10, status: "planned" },
  { name: "RTC-2", metHours: 196, dv: 2, status: "planned" },
  { name: "CM Raise", metHours: 217, dv: 5, status: "planned" },
] as const;

// TLI is provided by ICPS — Orion's own delta-v budget is for post-TLI maneuvers only
const TOTAL_BUDGET = 1230; // m/s — Orion ESM total usable delta-v

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

  // Cumulative Δ-v since PRM — includes ICPS burns (PRM, ARB, TLI) for context
  const totalUsed = BURNS.filter(
    (b) => b.status === "executed" && metMs >= b.metHours * 3600000
  ).reduce((sum, b) => sum + b.dv, 0);

  // Orion ESM budget only applies to post-TLI maneuvers
  const esmUsed = BURNS.filter(
    (b) =>
      b.metHours > 25.3 &&
      b.status === "executed" &&
      metMs >= b.metHours * 3600000
  ).reduce((sum, b) => sum + b.dv, 0);

  const remaining = TOTAL_BUDGET - esmUsed;
  const usedPercent = Math.min(100, Math.max(0, (esmUsed / TOTAL_BUDGET) * 100));
  const isOverBudget = remaining < 0;

  return (
    <PanelFrame title={t("deltaV.title")} icon="🚀" accentColor="var(--accent-cyan)">
      {/* Big numbers */}
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
            {t("deltaV.used")} (since PRM)
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
            {totalUsed.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-secondary)" }}>m/s</span>
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
          <span>ESM BUDGET</span>
          <span>{usedPercent.toFixed(1)}% used</span>
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
          <span>{TOTAL_BUDGET} m/s</span>
        </div>
      </div>

      {/* Burns table */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {BURNS.map((burn) => {
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
