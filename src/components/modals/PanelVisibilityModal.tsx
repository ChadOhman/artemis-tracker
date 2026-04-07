"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { useLocale } from "@/context/LocaleContext";
import {
  DEFAULT_PRESET_ID,
  type PresetListItem,
} from "@/lib/dashboard-layout-presets";
import {
  PANEL_DEFINITIONS,
  isColumnAssignable,
  type PanelColumn,
  type PanelId,
} from "@/lib/panel-visibility";
import { TOPBAR_ITEM_DEFINITIONS, type TopBarItemId } from "@/lib/topbar-visibility";

const COLUMN_ORDER: PanelColumn[] = ["left", "center", "right"];

interface PanelVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePresetId: string;
  presetOptions: PresetListItem[];
  onPresetChange: (presetId: string) => void;
  onSavePreset: (name: string) => boolean;
  onDeletePreset: () => void;
  topBarVisibility: Record<TopBarItemId, boolean>;
  onTopBarToggle: (id: TopBarItemId, visible: boolean) => void;
  visibility: Record<PanelId, boolean>;
  onToggle: (id: PanelId, visible: boolean) => void;
  columns: Record<PanelId, PanelColumn>;
  onColumnChange: (id: PanelId, col: PanelColumn) => void;
}

const COLUMN_LABEL_KEY: Record<PanelColumn, string> = {
  left: "menu.columnLeft",
  center: "menu.columnCenter",
  right: "menu.columnRight",
};

export function PanelVisibilityModal({
  isOpen,
  onClose,
  activePresetId,
  presetOptions,
  onPresetChange,
  onSavePreset,
  onDeletePreset,
  topBarVisibility,
  onTopBarToggle,
  visibility,
  onToggle,
  columns,
  onColumnChange,
}: PanelVisibilityModalProps) {
  const { t } = useLocale();
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState("");

  const sectionLabelStyle = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "var(--text-dim)",
    textTransform: "uppercase" as const,
    marginBottom: 8,
  };

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => {
        setSaveName("");
        setSaveError("");
      });
    }
  }, [isOpen]);

  const handleSavePresetClick = () => {
    const trimmed = saveName.trim();
    if (!trimmed) {
      setSaveError(t("menu.presets.nameRequired"));
      return;
    }
    if (!onSavePreset(trimmed)) {
      setSaveError(t("menu.presets.nameRequired"));
      return;
    }
    setSaveName("");
    setSaveError("");
  };

  return (
    <Modal title={t("menu.panelVisibility")} isOpen={isOpen} onClose={onClose} maxWidth="520px">
      <div style={{ padding: "16px 20px" }}>
        <div style={sectionLabelStyle}>{t("menu.presets.section")}</div>
        <label
          htmlFor="layout-preset-select"
          style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}
        >
          {t("menu.presets.layoutPreset")}
        </label>
        <select
          id="layout-preset-select"
          value={activePresetId}
          onChange={(e) => onPresetChange(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            padding: "8px 10px",
            fontSize: 13,
            color: "var(--text-primary)",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-panel)",
            borderRadius: 6,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          {presetOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.isBuiltIn ? t("menu.presets.defaultName") : opt.name}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>
          {t("menu.presets.saveAs")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            type="text"
            value={saveName}
            onChange={(e) => {
              setSaveName(e.target.value);
              if (saveError) setSaveError("");
            }}
            placeholder={t("menu.presets.saveAsPlaceholder")}
            aria-invalid={!!saveError}
            style={{
              flex: "1 1 160px",
              minWidth: 0,
              padding: "8px 10px",
              fontSize: 13,
              color: "var(--text-primary)",
              background: "var(--bg-panel)",
              border: `1px solid ${saveError ? "var(--accent-warn, #c96)" : "var(--border-panel)"}`,
              borderRadius: 6,
            }}
          />
          <button
            type="button"
            onClick={handleSavePresetClick}
            style={{
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-panel)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {t("menu.presets.save")}
          </button>
          <button
            type="button"
            disabled={activePresetId === DEFAULT_PRESET_ID}
            onClick={onDeletePreset}
            style={{
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              color:
                activePresetId === DEFAULT_PRESET_ID ? "var(--text-dim)" : "var(--text-primary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-panel)",
              borderRadius: 6,
              cursor: activePresetId === DEFAULT_PRESET_ID ? "not-allowed" : "pointer",
              opacity: activePresetId === DEFAULT_PRESET_ID ? 0.5 : 1,
            }}
          >
            {t("menu.presets.delete")}
          </button>
        </div>
        {saveError ? (
          <div style={{ fontSize: 11, color: "var(--accent-warn, #c96)", marginBottom: 10 }}>{saveError}</div>
        ) : null}
        <div
          style={{
            borderTop: "1px solid var(--border-panel)",
            marginTop: 4,
            paddingTop: 16,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {t("menu.topBarSection")}
        </div>
        {TOPBAR_ITEM_DEFINITIONS.map((item) => {
          const tid = `topbar-vis-${item.id}`;
          return (
            <label
              key={item.id}
              htmlFor={tid}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                fontSize: 13,
                color: "var(--text-primary)",
                padding: "6px 0",
              }}
            >
              <input
                id={tid}
                type="checkbox"
                checked={topBarVisibility[item.id]}
                onChange={(e) => onTopBarToggle(item.id, e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
              />
              <span>{t(item.labelKey)}</span>
            </label>
          );
        })}
        <div
          style={{
            borderTop: "1px solid var(--border-panel)",
            marginTop: 12,
            paddingTop: 16,
            marginBottom: 4,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--text-dim)",
            textTransform: "uppercase",
          }}
        >
          {t("menu.dashboardPanelsSection")}
        </div>
        {PANEL_DEFINITIONS.map((row, index) => {
          const prevGroup = index > 0 ? PANEL_DEFINITIONS[index - 1].group : null;
          const gapTop = prevGroup !== null && row.group !== prevGroup ? 16 : 0;
          const inputId = `panel-vis-${row.id}`;
          const assignable = isColumnAssignable(row.id);

          return (
            <div
              key={row.id}
              style={{
                marginTop: gapTop,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "6px 0",
              }}
            >
              <label
                htmlFor={inputId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={visibility[row.id]}
                  onChange={(e) => onToggle(row.id, e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
                />
                <span>{t(row.labelKey)}</span>
              </label>
              {assignable ? (
                <div
                  role="radiogroup"
                  aria-label={t("menu.panelColumnGroup")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  {COLUMN_ORDER.map((col) => {
                    const rid = `panel-col-${row.id}-${col}`;
                    return (
                      <label
                        key={col}
                        htmlFor={rid}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <input
                          id={rid}
                          type="radio"
                          name={`panel-col-${row.id}`}
                          checked={columns[row.id] === col}
                          onChange={() => onColumnChange(row.id, col)}
                          style={{ width: 14, height: 14, cursor: "pointer", flexShrink: 0 }}
                        />
                        {t(COLUMN_LABEL_KEY[col])}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    flexShrink: 0,
                    maxWidth: 100,
                    textAlign: "right",
                  }}
                >
                  {t("menu.timelineFullWidth")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
