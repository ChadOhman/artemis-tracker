export const PANEL_DEFINITIONS = [
  { group: "left", id: "orbitMap", labelKey: "orbitMap.title" },
  { group: "left", id: "telemetry", labelKey: "panels.telemetry" },
  { group: "left", id: "rcsThrusters", labelKey: "panels.rcsThrusters" },
  { group: "left", id: "dsn", labelKey: "dsnPanel.title" },
  { group: "left", id: "stationSchedule", labelKey: "stationSchedule.title" },
  { group: "left", id: "dsnBandwidth", labelKey: "dsnBandwidth.title" },
  { group: "left", id: "solar", labelKey: "panels.spaceWeather" },
  { group: "left", id: "deltaV", labelKey: "deltaV.title" },
  { group: "timeline", id: "timeline", labelKey: "timeline.title" },
  { group: "center", id: "activityDetail", labelKey: "activityDetail.title" },
  { group: "center", id: "nextMilestone", labelKey: "nextMilestone.title" },
  { group: "center", id: "liveStream", labelKey: "liveStream.title" },
  { group: "center", id: "apollo8", labelKey: "apollo8.title" },
  { group: "center", id: "wakeupSongs", labelKey: "wakeupSongs.title" },
  { group: "right", id: "currentActivities", labelKey: "currentActivities.title" },
  { group: "right", id: "upcoming", labelKey: "upcoming.title" },
  { group: "right", id: "milestones", labelKey: "milestones.title" },
] as const;

export type PanelId = (typeof PANEL_DEFINITIONS)[number]["id"];

export type PanelColumn = "left" | "center" | "right";

export function isColumnAssignable(id: PanelId): boolean {
  const row = PANEL_DEFINITIONS.find((r) => r.id === id);
  return row !== undefined && row.group !== "timeline";
}

/** Default column per panel. `timeline` maps to `"center"` but layout ignores it (full-width row). */
export function defaultPanelColumns(): Record<PanelId, PanelColumn> {
  const o = {} as Record<PanelId, PanelColumn>;
  for (const row of PANEL_DEFINITIONS) {
    if (row.group === "left" || row.group === "center" || row.group === "right") {
      o[row.id] = row.group;
    } else {
      o[row.id] = "center";
    }
  }
  return o;
}

export function defaultPanelVisibility(): Record<PanelId, boolean> {
  const o = {} as Record<PanelId, boolean>;
  for (const { id } of PANEL_DEFINITIONS) {
    o[id] = true;
  }
  return o;
}

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (el.closest('[role="textbox"]')) return true;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type?.toLowerCase() ?? "text";
    if (type === "checkbox" || type === "radio" || type === "button" || type === "submit" || type === "reset")
      return false;
    return true;
  }
  return false;
}
