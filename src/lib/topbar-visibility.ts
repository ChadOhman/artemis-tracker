/** Top bar (header) items — toggled from the panel menu; no column placement. */
export const TOPBAR_ITEM_DEFINITIONS = [
  { id: "artemisLive", labelKey: "menu.topBar.artemisLive" },
  { id: "met", labelKey: "menu.topBar.met" },
  { id: "phase", labelKey: "menu.topBar.phase" },
  { id: "flightDay", labelKey: "menu.topBar.flightDay" },
  { id: "dsn", labelKey: "menu.topBar.dsn" },
  { id: "crew", labelKey: "menu.topBar.crew" },
  { id: "toilet", labelKey: "menu.topBar.toilet" },
  { id: "visitors", labelKey: "menu.topBar.visitors" },
  { id: "los", labelKey: "menu.topBar.los" },
  { id: "velAlt", labelKey: "menu.topBar.velAlt" },
  { id: "sleep", labelKey: "menu.topBar.sleep" },
  { id: "moon", labelKey: "menu.topBar.moon" },
  { id: "delay", labelKey: "menu.topBar.delay" },
  { id: "vehicle", labelKey: "menu.topBar.vehicle" },
  { id: "nextEvent", labelKey: "menu.topBar.nextEvent" },
] as const;

export type TopBarItemId = (typeof TOPBAR_ITEM_DEFINITIONS)[number]["id"];

export function defaultTopBarVisibility(): Record<TopBarItemId, boolean> {
  const o = {} as Record<TopBarItemId, boolean>;
  for (const { id } of TOPBAR_ITEM_DEFINITIONS) {
    o[id] = true;
  }
  return o;
}
