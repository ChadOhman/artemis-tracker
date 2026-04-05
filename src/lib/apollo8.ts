// src/lib/apollo8.ts
// Apollo 8 mission data for historical comparison with Artemis II.

export interface Apollo8Event {
  metHours: number;  // mission elapsed time in hours from launch
  name: string;
  description: string;
}

export const APOLLO8_LAUNCH_UTC = "1968-12-21T12:51:00Z";

export const APOLLO8_EVENTS: Apollo8Event[] = [
  { metHours: 0, name: "Launch", description: "Saturn V lifts off from LC-39A, Kennedy Space Center." },
  { metHours: 0.19, name: "Earth Orbit Insertion", description: "S-IVB places Apollo 8 in parking orbit, 190 km altitude." },
  { metHours: 2.83, name: "Translunar Injection", description: "S-IVB restarts for 5m 18s burn — first humans to leave Earth orbit." },
  { metHours: 3.37, name: "CSM/S-IVB Separation", description: "Command/Service Module separates from the spent S-IVB stage." },
  { metHours: 10.9, name: "Mid-Course Correction 1", description: "First trajectory refinement burn, 2.4 seconds." },
  { metHours: 30.7, name: "Crossed Halfway Point", description: "Apollo 8 crosses the midpoint of the Earth-Moon trajectory." },
  { metHours: 55.6, name: "Entered Lunar SOI", description: "Apollo 8 enters the Moon's sphere of influence." },
  { metHours: 68.97, name: "Lunar Orbit Insertion", description: "SPS burn of 4m 7s places Apollo 8 in lunar orbit — first humans to orbit the Moon." },
  { metHours: 69.15, name: "Loss of Signal", description: "First occultation behind the Moon begins." },
  { metHours: 75.82, name: "Earthrise Photograph", description: "Bill Anders captures the iconic 'Earthrise' photo." },
  { metHours: 85.8, name: "Christmas Eve Broadcast", description: "Crew reads Genesis on live TV to the largest audience in history at that time." },
  { metHours: 89.33, name: "Trans-Earth Injection", description: "SPS burn 3m 24s sends Apollo 8 home — 'Please be informed, there is a Santa Claus.'" },
  { metHours: 104, name: "Mid-Course Correction 5", description: "Final trajectory correction before Earth entry." },
  { metHours: 146.75, name: "CM/SM Separation", description: "Service module jettisoned before atmospheric entry." },
  { metHours: 146.95, name: "Entry Interface", description: "Apollo 8 enters Earth's atmosphere at 36,221 ft/s — fastest re-entry by humans at the time." },
  { metHours: 147.0, name: "Splashdown", description: "Pacific Ocean, 1,000 miles southwest of Hawaii. Recovered by USS Yorktown." },
];

/**
 * Find the Apollo 8 event(s) most relevant to the current MET.
 * Returns the last completed event and the next upcoming event.
 */
export function getApollo8Context(currentMetMs: number): {
  current: Apollo8Event | null;
  next: Apollo8Event | null;
  hoursElapsed: number;
} {
  const currentHours = currentMetMs / 3600000;
  let current: Apollo8Event | null = null;
  let next: Apollo8Event | null = null;

  for (const evt of APOLLO8_EVENTS) {
    if (evt.metHours <= currentHours) {
      current = evt;
    } else if (!next) {
      next = evt;
      break;
    }
  }

  return { current, next, hoursElapsed: currentHours };
}

/**
 * Format MET hours as "DD:HH:MM".
 */
export function formatApollo8Met(hours: number): string {
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  const m = Math.floor((hours % 1) * 60);
  return `${String(d).padStart(2, "0")}:${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
