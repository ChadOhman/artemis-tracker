import {
  PANEL_DEFINITIONS,
  defaultPanelColumns,
  defaultPanelVisibility,
  type PanelColumn,
  type PanelId,
} from "@/lib/panel-visibility";
import {
  TOPBAR_ITEM_DEFINITIONS,
  defaultTopBarVisibility,
  type TopBarItemId,
} from "@/lib/topbar-visibility";

export const STORAGE_KEY = "artemis-dashboard-layout-presets";
export const SCHEMA_VERSION = 1;
export const DEFAULT_PRESET_ID = "default";

const COLUMN_SET = new Set<PanelColumn>(["left", "center", "right"]);

export type DashboardLayoutSnapshot = {
  panelVisibility: Record<PanelId, boolean>;
  panelColumns: Record<PanelId, PanelColumn>;
  topBarVisibility: Record<TopBarItemId, boolean>;
};

export type CustomPresetEntry = {
  name: string;
  snapshot: DashboardLayoutSnapshot;
};

export type StoredPresetsState = {
  v: number;
  activePresetId: string;
  custom: Record<string, CustomPresetEntry>;
};

export function getDefaultSnapshot(): DashboardLayoutSnapshot {
  return {
    panelVisibility: { ...defaultPanelVisibility() },
    panelColumns: { ...defaultPanelColumns() },
    topBarVisibility: { ...defaultTopBarVisibility() },
  };
}

function isPanelColumn(v: unknown): v is PanelColumn {
  return typeof v === "string" && COLUMN_SET.has(v as PanelColumn);
}

/** Merge partial/legacy JSON into a full snapshot; unknown keys dropped. */
export function normalizeSnapshot(raw: unknown): DashboardLayoutSnapshot {
  const defaults = getDefaultSnapshot();
  if (!raw || typeof raw !== "object") return defaults;

  const o = raw as Record<string, unknown>;
  const pvIn = o.panelVisibility;
  const pcIn = o.panelColumns;
  const tbIn = o.topBarVisibility;

  const panelVisibility = { ...defaults.panelVisibility };
  if (pvIn && typeof pvIn === "object") {
    for (const { id } of PANEL_DEFINITIONS) {
      const v = (pvIn as Record<string, unknown>)[id];
      if (typeof v === "boolean") panelVisibility[id] = v;
    }
  }

  const panelColumns = { ...defaults.panelColumns };
  if (pcIn && typeof pcIn === "object") {
    for (const { id } of PANEL_DEFINITIONS) {
      const v = (pcIn as Record<string, unknown>)[id];
      if (isPanelColumn(v)) panelColumns[id] = v;
    }
  }

  const topBarVisibility = { ...defaults.topBarVisibility };
  if (tbIn && typeof tbIn === "object") {
    for (const { id } of TOPBAR_ITEM_DEFINITIONS) {
      const v = (tbIn as Record<string, unknown>)[id];
      if (typeof v === "boolean") topBarVisibility[id] = v;
    }
  }

  return { panelVisibility, panelColumns, topBarVisibility };
}

export function emptyStoredPresetsState(): StoredPresetsState {
  return {
    v: SCHEMA_VERSION,
    activePresetId: DEFAULT_PRESET_ID,
    custom: {},
  };
}

export function parseStoredPresetsState(json: string | null): StoredPresetsState {
  if (!json) return emptyStoredPresetsState();
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== "object") return emptyStoredPresetsState();
    const o = raw as Record<string, unknown>;
    const v = o.v;
    if (v !== SCHEMA_VERSION) return emptyStoredPresetsState();

    const activePresetId =
      typeof o.activePresetId === "string" && o.activePresetId.length > 0
        ? o.activePresetId
        : DEFAULT_PRESET_ID;

    const custom: Record<string, CustomPresetEntry> = {};
    const c = o.custom;
    if (c && typeof c === "object") {
      for (const [id, entry] of Object.entries(c as Record<string, unknown>)) {
        if (!entry || typeof entry !== "object") continue;
        const e = entry as Record<string, unknown>;
        const name = typeof e.name === "string" ? e.name.trim().slice(0, 120) : "";
        if (!name) continue;
        custom[id] = {
          name,
          snapshot: normalizeSnapshot(e.snapshot),
        };
      }
    }

    let out: StoredPresetsState = { v: SCHEMA_VERSION, activePresetId, custom };
    if (out.activePresetId !== DEFAULT_PRESET_ID && !out.custom[out.activePresetId]) {
      out = { ...out, activePresetId: DEFAULT_PRESET_ID };
    }
    return out;
  } catch {
    return emptyStoredPresetsState();
  }
}

export function writeStoredPresetsState(state: StoredPresetsState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode
  }
}

export function readStoredPresetsState(): StoredPresetsState {
  if (typeof window === "undefined") return emptyStoredPresetsState();
  return parseStoredPresetsState(localStorage.getItem(STORAGE_KEY));
}

export type PresetListItem = {
  id: string;
  /** Display name; built-in preset uses empty — UI should use i18n for DEFAULT_PRESET_ID */
  name: string;
  isBuiltIn: boolean;
};

export function listPresetOptions(state: StoredPresetsState): PresetListItem[] {
  const customList = Object.entries(state.custom).map(([id, { name }]) => ({
    id,
    name,
    isBuiltIn: false as const,
  }));
  customList.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return [{ id: DEFAULT_PRESET_ID, name: "", isBuiltIn: true }, ...customList];
}

export function getSnapshotForPresetId(
  presetId: string,
  state: StoredPresetsState,
): DashboardLayoutSnapshot {
  if (presetId === DEFAULT_PRESET_ID) return getDefaultSnapshot();
  const entry = state.custom[presetId];
  if (!entry) return getDefaultSnapshot();
  return normalizeSnapshot(entry.snapshot);
}

export function setActivePresetId(presetId: string, state: StoredPresetsState): StoredPresetsState {
  if (presetId === DEFAULT_PRESET_ID || state.custom[presetId]) {
    return { ...state, activePresetId: presetId };
  }
  return { ...state, activePresetId: DEFAULT_PRESET_ID };
}

export function saveNewPreset(
  name: string,
  snapshot: DashboardLayoutSnapshot,
  state: StoredPresetsState,
): { state: StoredPresetsState; newId: string } | null {
  const trimmed = name.trim().slice(0, 120);
  if (!trimmed) return null;
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const normalized = normalizeSnapshot(snapshot);
  const next: StoredPresetsState = {
    ...state,
    activePresetId: id,
    custom: { ...state.custom, [id]: { name: trimmed, snapshot: normalized } },
  };
  return { state: next, newId: id };
}

export function deletePreset(
  presetId: string,
  state: StoredPresetsState,
): StoredPresetsState {
  if (presetId === DEFAULT_PRESET_ID || !state.custom[presetId]) return state;
  const { [presetId]: _, ...rest } = state.custom;
  let activePresetId = state.activePresetId;
  if (activePresetId === presetId) activePresetId = DEFAULT_PRESET_ID;
  return { ...state, custom: rest, activePresetId };
}
