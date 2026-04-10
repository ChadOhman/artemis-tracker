// src/lib/state-c.ts
// Internal override state — disk-persisted flag for a contingency UI mode.
// Only toggled via the admin panel with explicit typed confirmation.

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const STATE_PATH = path.join(process.cwd(), "data", "state-c.json");

interface OverrideState {
  active: boolean;
  triggeredAt: string | null;
}

let state: OverrideState = { active: false, triggeredAt: null };

try {
  if (existsSync(STATE_PATH)) {
    const data = JSON.parse(readFileSync(STATE_PATH, "utf-8"));
    if (typeof data?.active === "boolean") {
      state = {
        active: data.active,
        triggeredAt: data.triggeredAt ?? null,
      };
    }
  }
} catch {
  // Corrupt or missing file — default to inactive
}

export function getStateC(): OverrideState {
  return { ...state };
}

export function setStateC(active: boolean): OverrideState {
  state = {
    active,
    triggeredAt: active ? new Date().toISOString() : null,
  };
  writeFileSync(STATE_PATH, JSON.stringify(state), "utf-8");
  return { ...state };
}
