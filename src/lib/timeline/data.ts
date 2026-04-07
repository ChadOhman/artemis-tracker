// src/lib/timeline/data.ts
import type {
  TimelineData,
  Milestone,
  PhaseBlock,
  TimelineActivity,
  AttitudeBlock,
} from "../types";

/** Convert days/hours/minutes/seconds to milliseconds (MET) */
function met(days: number, hours: number, minutes: number, seconds: number): number {
  return ((days * 24 * 3600) + (hours * 3600) + (minutes * 60) + seconds) * 1000;
}

// ---------------------------------------------------------------------------
// Milestones — key events from jakobrosin/artemis-data schedule.json
// metMs values derived from events[].metHours * 3600 * 1000
// Sorted by metMs ascending
// ---------------------------------------------------------------------------
const RAW_MILESTONES: Milestone[] = [
  {
    name: "Launch",
    description: "Artemis II lifts off from LC-39B at Kennedy Space Center",
    metMs: 0, // metHours=0
  },
  {
    name: "ICPS Perigee Raise 1",
    description: "ICPS perigee raise burn 1 raises the low point of the parking orbit",
    metMs: Math.round(0.82 * 3600 * 1000), // metHours=0.82 → ~0d 00h 49m
  },
  {
    name: "ICPS Perigee Raise 2",
    description: "ICPS perigee raise burn 2 inserts Orion into high-Earth orbit",
    metMs: Math.round(1.82 * 3600 * 1000), // metHours=1.82 → ~0d 01h 49m
  },
  {
    name: "Proximity Operations Demo",
    description: "ICPS becomes docking target; crew practices manual flying",
    metMs: Math.round(3.405 * 3600 * 1000), // metHours=3.405 → ~0d 03h 24m
  },
  {
    name: "Orion Upper Stage Separation",
    description: "Orion upper stage separation burn",
    metMs: Math.round(4.833 * 3600 * 1000), // metHours=4.833 → ~0d 04h 50m
  },
  {
    name: "Orbit Geometry Burn",
    description: "Engine firing to correct orbital geometry for TLI",
    metMs: Math.round(12.5 * 3600 * 1000), // metHours=12.5 → ~0d 12h 30m
  },
  {
    name: "Trans-Lunar Injection",
    description: "TLI burn sends Orion toward the Moon at ~40,000 km/h",
    metMs: Math.round(25.23 * 3600 * 1000), // metHours=25.23 → ~1d 01h 14m
  },
  {
    name: "OTC-1",
    description: "Outbound trajectory correction burn 1 (cancelled — trajectory was nominal)",
    metMs: Math.round(48.23 * 3600 * 1000), // metHours=48.23 → ~2d 00h 14m
  },
  {
    name: "OTC-2",
    description: "Outbound trajectory correction burn 2 (cancelled — trajectory was nominal)",
    metMs: Math.round(73.13 * 3600 * 1000), // metHours=73.13 → ~3d 01h 08m
  },
  {
    name: "OTC-3",
    description: "Final outbound mid-course correction — 9.9 ft/s, 17.5 second burn",
    metMs: Math.round(100.48 * 3600 * 1000), // metHours=100.48 → ~4d 04h 29m
  },
  {
    name: "Lunar SOI Entry",
    description: "Orion enters the lunar sphere of influence",
    metMs: Math.round(102.10 * 3600 * 1000), // updated from upstream
  },
  {
    name: "Distance Record",
    description: "Artemis II surpasses Apollo 13 distance record",
    metMs: Math.round(115.40 * 3600 * 1000),
  },
  {
    name: "Flyby Coverage Begins",
    description: "NASA begins live coverage of the lunar flyby",
    metMs: Math.round(114.41 * 3600 * 1000),
  },
  {
    name: "Far-Side Blackout",
    description: "Loss of signal — Orion behind the Moon",
    metMs: Math.round(120.13 * 3600 * 1000), // refined from 120.20
  },
  {
    name: "Lunar Close Approach",
    description: "Closest approach — 6,545 km (4,067 mi) above the lunar surface",
    metMs: Math.round(120.426 * 3600 * 1000), // refined from 120.45
  },
  {
    name: "Max Earth Distance",
    description: "Maximum distance from Earth — 406,770 km (252,756 mi)",
    metMs: Math.round(120.461 * 3600 * 1000), // refined from 120.50
  },
  {
    name: "Signal Reacquired",
    description: "Signal reacquired — Earthrise",
    metMs: Math.round(120.797 * 3600 * 1000), // refined from 120.86
  },
  {
    name: "Solar Eclipse",
    description: "Orion observes a solar eclipse from behind the Moon",
    metMs: Math.round(122 * 3600 * 1000),
  },
  {
    name: "Lunar SOI Exit",
    description: "Orion exits the lunar sphere of influence on return trajectory",
    metMs: Math.round(138.87 * 3600 * 1000), // metHours=138.87 → ~5d 18h 52m
  },
  {
    name: "RTC-1",
    description: "First return trajectory correction burn",
    metMs: Math.round(145.48 * 3600 * 1000), // metHours=145.48 → ~6d 01h 29m
  },
  {
    name: "RTC-2",
    description: "Second return trajectory correction burn",
    metMs: Math.round(196.48 * 3600 * 1000), // metHours=196.48 → ~8d 04h 29m
  },
  {
    name: "CM/SM Separation",
    description: "Service module jettisoned before atmospheric entry",
    metMs: Math.round(216.5 * 3600 * 1000), // metHours=216.5 → ~9d 00h 30m
  },
  {
    name: "Entry Interface",
    description: "Orion hits Earth's atmosphere at ~40,000 km/h",
    metMs: Math.round(217 * 3600 * 1000), // metHours=217 → ~9d 01h 00m
  },
  {
    name: "Drogue Chutes",
    description: "Drogue parachutes deploy to stabilize the crew module",
    metMs: Math.round(217.30 * 3600 * 1000), // metHours=217.30 → ~9d 01h 18m
  },
  {
    name: "Main Chutes",
    description: "Three main parachutes deploy — slowing Orion to ~20 mph",
    metMs: Math.round(217.40 * 3600 * 1000), // metHours=217.40 → ~9d 01h 24m
  },
  {
    name: "Splashdown",
    description: "Orion crew module splashes down in the Pacific Ocean",
    metMs: Math.round(217.51 * 3600 * 1000), // metHours=217.51 → ~9d 01h 31m
  },
  {
    name: "Recovery",
    description: "Crew recovery by USS Portland",
    metMs: Math.round(218 * 3600 * 1000), // metHours=218 → ~9d 02h 00m
  },
];

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------
const PHASES: PhaseBlock[] = [
  {
    phase: "Prelaunch",
    startMetMs: -3600 * 1000, // T-1h
    endMetMs: met(0, 0, 0, 0),
  },
  {
    phase: "LEO",
    startMetMs: met(0, 0, 0, 0),
    endMetMs: met(0, 0, 50, 0),
  },
  {
    phase: "High Earth Orbit",
    startMetMs: met(0, 0, 50, 0),
    endMetMs: met(1, 1, 8, 42),
  },
  {
    phase: "Trans-Lunar",
    startMetMs: met(1, 1, 8, 42),
    endMetMs: Math.round(102.05 * 3600 * 1000), // Lunar SOI entry
  },
  {
    phase: "Lunar Flyby",
    startMetMs: Math.round(102.05 * 3600 * 1000), // SOI entry
    endMetMs: Math.round(138.87 * 3600 * 1000),   // SOI exit
  },
  {
    phase: "Trans-Earth",
    startMetMs: Math.round(138.87 * 3600 * 1000),
    endMetMs: met(9, 1, 9, 0),
  },
  {
    phase: "EDL",
    startMetMs: met(9, 1, 9, 0),
    endMetMs: met(9, 1, 42, 48),
  },
  {
    phase: "Recovery",
    startMetMs: met(9, 1, 42, 48),
    endMetMs: met(9, 3, 0, 0),
  },
];

// ---------------------------------------------------------------------------
// Attitudes — comprehensive attitude timeline from NASA flight plan PDF
// ---------------------------------------------------------------------------
const ATTITUDES: AttitudeBlock[] = [
  // ── FD01 ────────────────────────────────────────────────────────────────
  { mode: "Ascent",          startMetMs: met(0, 0, 0, 0),   endMetMs: met(0, 0, 8, 0) },
  { mode: "Bias -XSI",      startMetMs: met(0, 0, 8, 0),   endMetMs: met(0, 0, 50, 0) },
  { mode: "Burn Attitude",   startMetMs: met(0, 0, 50, 0),  endMetMs: met(0, 0, 55, 0) },   // PRM
  { mode: "Bias -XSI",      startMetMs: met(0, 0, 55, 0),  endMetMs: met(0, 1, 45, 0) },
  { mode: "Burn Attitude",   startMetMs: met(0, 1, 45, 0),  endMetMs: met(0, 1, 55, 0) },   // ARB
  { mode: "Bias -XSI",      startMetMs: met(0, 1, 55, 0),  endMetMs: met(0, 3, 20, 0) },
  { mode: "Sep Attitude",    startMetMs: met(0, 3, 20, 0),  endMetMs: met(0, 3, 30, 0) },   // ICPS separation
  { mode: "Bias -XSI",      startMetMs: met(0, 3, 30, 0),  endMetMs: met(0, 5, 0, 0) },
  { mode: "POD Attitude",    startMetMs: met(0, 5, 0, 0),   endMetMs: met(0, 5, 30, 0) },
  { mode: "Bias -XSI",      startMetMs: met(0, 5, 30, 0),  endMetMs: met(0, 10, 0, 0) },
  { mode: "OpComm",          startMetMs: met(0, 10, 0, 0),  endMetMs: met(0, 12, 0, 0) },   // OpComm Initial Activation
  { mode: "Bias -XSI",      startMetMs: met(0, 12, 0, 0),  endMetMs: met(0, 13, 20, 0) },
  { mode: "PRB Attitude",    startMetMs: met(0, 13, 20, 0), endMetMs: met(0, 13, 40, 0) },  // Perigee Raise Burn
  { mode: "Bias -XSI",      startMetMs: met(0, 13, 40, 0), endMetMs: met(0, 14, 0, 0) },
  { mode: "O Nav",           startMetMs: met(0, 14, 0, 0),  endMetMs: met(0, 14, 30, 0) },  // OpNav checkout
  { mode: "Bias -XSI",      startMetMs: met(0, 14, 30, 0), endMetMs: met(1, 1, 0, 0) },

  // ── FD02 ────────────────────────────────────────────────────────────────
  { mode: "TLI Burn",        startMetMs: met(1, 1, 0, 0),   endMetMs: met(1, 1, 20, 0) },   // Trans-Lunar Injection (~20 min)
  { mode: "Bias -XSI",      startMetMs: met(1, 1, 20, 0),  endMetMs: met(1, 14, 0, 0) },
  { mode: "Survey",          startMetMs: met(1, 14, 0, 0),  endMetMs: met(1, 14, 30, 0) },  // CM/SM Survey
  { mode: "Bias -XSI",      startMetMs: met(1, 14, 30, 0), endMetMs: met(2, 0, 30, 0) },

  // ── FD03 ────────────────────────────────────────────────────────────────
  { mode: "O Nav",           startMetMs: met(2, 0, 30, 0),  endMetMs: met(2, 1, 0, 0) },
  { mode: "Bias -XSI",      startMetMs: met(2, 1, 0, 0),   endMetMs: met(2, 1, 5, 0) },
  { mode: "OTC Burn",        startMetMs: met(2, 1, 5, 0),   endMetMs: met(2, 1, 15, 0) },   // OTC-1
  { mode: "Bias -XSI",      startMetMs: met(2, 1, 15, 0),  endMetMs: met(2, 6, 0, 0) },
  { mode: "SAT Mode",        startMetMs: met(2, 6, 0, 0),   endMetMs: met(2, 7, 30, 0) },   // DFTO-EM2-23
  { mode: "Bias -XSI",      startMetMs: met(2, 7, 30, 0),  endMetMs: met(2, 8, 0, 0) },
  { mode: "DFTO",            startMetMs: met(2, 8, 0, 0),   endMetMs: met(2, 9, 0, 0) },    // DSN Emergency Comm
  { mode: "Bias -XSI",      startMetMs: met(2, 9, 0, 0),   endMetMs: met(3, 0, 30, 0) },

  // ── FD04 ────────────────────────────────────────────────────────────────
  { mode: "O Nav",           startMetMs: met(3, 0, 30, 0),  endMetMs: met(3, 1, 0, 0) },
  { mode: "Bias -XSI",      startMetMs: met(3, 1, 0, 0),   endMetMs: met(3, 1, 5, 0) },
  { mode: "OTC Burn",        startMetMs: met(3, 1, 5, 0),   endMetMs: met(3, 1, 15, 0) },   // OTC-2
  { mode: "Bias -XSI",      startMetMs: met(3, 1, 15, 0),  endMetMs: met(3, 6, 0, 0) },
  { mode: "Img",             startMetMs: met(3, 6, 0, 0),   endMetMs: met(3, 7, 0, 0) },    // Lunar Imaging
  { mode: "Bias -XSI",      startMetMs: met(3, 7, 0, 0),   endMetMs: met(3, 8, 0, 0) },
  { mode: "DFTO",            startMetMs: met(3, 8, 0, 0),   endMetMs: met(3, 9, 0, 0) },
  { mode: "Bias -XSI",      startMetMs: met(3, 9, 0, 0),   endMetMs: met(4, 0, 0, 0) },

  // ── FD05 ────────────────────────────────────────────────────────────────
  { mode: "O Nav",           startMetMs: met(4, 0, 0, 0),   endMetMs: met(4, 0, 30, 0) },
  { mode: "Vent",            startMetMs: met(4, 0, 30, 0),  endMetMs: met(4, 2, 0, 0) },    // Cabin vent to 10.2 psi
  { mode: "Bias -XSI",      startMetMs: met(4, 2, 0, 0),   endMetMs: met(4, 4, 25, 0) },
  { mode: "OTC Burn",        startMetMs: met(4, 4, 25, 0),  endMetMs: met(4, 4, 35, 0) },   // OTC-3
  { mode: "Bias -XSI",      startMetMs: met(4, 4, 35, 0),  endMetMs: met(4, 8, 0, 0) },
  { mode: "DFTO",            startMetMs: met(4, 8, 0, 0),   endMetMs: met(4, 8, 45, 0) },
  { mode: "Bias -XSI",      startMetMs: met(4, 8, 45, 0),  endMetMs: met(4, 22, 0, 0) },

  // ── FD06 ────────────────────────────────────────────────────────────────
  { mode: "Observation",     startMetMs: met(4, 22, 0, 0),  endMetMs: met(5, 4, 0, 0) },    // Lunar observation / close approach
  { mode: "Bias -XSI",      startMetMs: met(5, 4, 0, 0),   endMetMs: met(5, 12, 0, 0) },
  { mode: "Survey",          startMetMs: met(5, 12, 0, 0),  endMetMs: met(5, 13, 0, 0) },   // CM/SM Survey
  { mode: "Bias -XSI",      startMetMs: met(5, 13, 0, 0),  endMetMs: met(5, 22, 0, 0) },

  // ── FD07 ────────────────────────────────────────────────────────────────
  { mode: "O Nav",           startMetMs: met(5, 22, 0, 0),  endMetMs: met(5, 22, 30, 0) },
  { mode: "Bias -XSI",      startMetMs: met(5, 22, 30, 0), endMetMs: met(6, 1, 25, 0) },
  { mode: "RTC Burn",        startMetMs: met(6, 1, 25, 0),  endMetMs: met(6, 1, 35, 0) },   // RTC-1
  { mode: "Bias -XSI",      startMetMs: met(6, 1, 35, 0),  endMetMs: met(6, 4, 0, 0) },
  { mode: "FTO",             startMetMs: met(6, 4, 0, 0),   endMetMs: met(6, 5, 0, 0) },    // Dock Cam WW View
  { mode: "Bias -XSI",      startMetMs: met(6, 5, 0, 0),   endMetMs: met(6, 6, 0, 0) },
  { mode: "DFTO",            startMetMs: met(6, 6, 0, 0),   endMetMs: met(6, 7, 0, 0) },
  { mode: "Bias -XSI",      startMetMs: met(6, 7, 0, 0),   endMetMs: met(7, 0, 0, 0) },

  // ── FD08 ────────────────────────────────────────────────────────────────
  { mode: "DFTO",            startMetMs: met(7, 0, 0, 0),   endMetMs: met(7, 1, 0, 0) },    // Rad Shelter Demo
  { mode: "Bias -XSI",      startMetMs: met(7, 1, 0, 0),   endMetMs: met(7, 2, 0, 0) },
  { mode: "DFTO",            startMetMs: met(7, 2, 0, 0),   endMetMs: met(7, 3, 0, 0) },    // Manual Piloting
  { mode: "Bias -XSI",      startMetMs: met(7, 3, 0, 0),   endMetMs: met(7, 4, 0, 0) },
  { mode: "DFTO",            startMetMs: met(7, 4, 0, 0),   endMetMs: met(7, 5, 0, 0) },
  { mode: "Bias -XSI",      startMetMs: met(7, 5, 0, 0),   endMetMs: met(7, 8, 0, 0) },
  { mode: "Bias -XSI Mitigate X", startMetMs: met(7, 8, 0, 0), endMetMs: met(7, 16, 30, 0) },

  // ── FD09 ────────────────────────────────────────────────────────────────
  { mode: "DFTO",            startMetMs: met(7, 16, 30, 0), endMetMs: met(7, 17, 0, 0) },
  { mode: "Bias -XSI Mitigate X", startMetMs: met(7, 17, 0, 0), endMetMs: met(8, 0, 0, 0) },
  { mode: "O Nav",           startMetMs: met(8, 0, 0, 0),   endMetMs: met(8, 0, 30, 0) },
  { mode: "Bias -XSI",      startMetMs: met(8, 0, 30, 0),  endMetMs: met(8, 4, 25, 0) },
  { mode: "RTC Burn",        startMetMs: met(8, 4, 25, 0),  endMetMs: met(8, 4, 35, 0) },   // RTC-2
  { mode: "Bias -XSI Mitigate X", startMetMs: met(8, 4, 35, 0), endMetMs: met(8, 20, 25, 0) },

  // ── FD10 ────────────────────────────────────────────────────────────────
  { mode: "RTC Burn",        startMetMs: met(8, 20, 25, 0), endMetMs: met(8, 20, 35, 0) },  // RTC-3
  { mode: "Bias -XSI Mitigate X", startMetMs: met(8, 20, 35, 0), endMetMs: met(9, 1, 5, 0) },
  { mode: "Sep Attitude",    startMetMs: met(9, 1, 5, 0),   endMetMs: met(9, 1, 12, 0) },   // CM/SM Separation
  { mode: "EDL",             startMetMs: met(9, 1, 12, 0),  endMetMs: met(9, 1, 42, 48) },
];

// ---------------------------------------------------------------------------
// Activities — crew timeline covering all 10 flight days (FD1–FD10)
// FD1 = launch day (MET 0), FD10 = recovery day (MET ~9d)
// ---------------------------------------------------------------------------

/** Helper: activity shorthand */
function act(
  name: string,
  type: TimelineActivity["type"],
  startD: number, startH: number, startM: number,
  endD: number, endH: number, endM: number,
  notes?: string
): TimelineActivity {
  return {
    name,
    type,
    startMetMs: met(startD, startH, startM, 0),
    endMetMs: met(endD, endH, endM, 0),
    ...(notes ? { notes } : {}),
  };
}

// Activities rebuilt from jakobrosin/artemis-data schedule.json (2026-04-06T22:43).
// All times directly from upstream metHours. This is the SINGLE SOURCE OF TRUTH.
const ACTIVITIES: TimelineActivity[] = [
  // ── FD01: Launch Day ────────────────────────────────────────────────────
  act("Launch & ascent", "maneuver", 0, 0, 0, 0, 0, 9),
  act("Orbital insertion & ICPS burns", "maneuver", 0, 0, 9, 0, 2, 0),
  act("Orion systems checkout", "config", 0, 2, 0, 0, 3, 24),
  act("Proximity operations demo", "science", 0, 3, 24, 0, 5, 0),
  act("ICPS disposal & CubeSat deploy", "config", 0, 5, 0, 0, 7, 0),
  act("Sleep period", "sleep", 0, 7, 0, 0, 12, 30),
  act("Orbit geometry burn & DSN checkout", "config", 0, 12, 30, 0, 13, 0),
  act("Sleep period", "sleep", 0, 13, 0, 0, 22, 0),
  act("Crew exercise", "exercise", 0, 22, 0, 0, 23, 30),
  // ── FD02: TLI Day ───────────────────────────────────────────────────────
  act("TLI burn preparation", "config", 0, 23, 30, 1, 1, 14),
  act("Trans-lunar injection burn", "maneuver", 1, 1, 14, 1, 2, 0),
  act("AVATAR science payload checkout", "science", 1, 2, 0, 1, 3, 0),
  act("Post-TLI crew acclimation", "config", 1, 3, 0, 1, 4, 0),
  // ── FD03: Outbound Cruise 1 ─────────────────────────────────────────────
  act("Wake & meal — Day 3", "meal", 1, 18, 24, 1, 20, 0),
  act("Video comm & morning conference", "pao", 1, 20, 0, 2, 0, 14),
  act("OTC-1 — CANCELLED", "maneuver", 2, 0, 14, 2, 0, 20),
  act("CPR demonstration", "science", 2, 2, 0, 2, 2, 8),
  act("Crew downlink — Day 3", "pao", 2, 2, 8, 2, 4, 0),
  act("Medical kit checkout", "science", 2, 4, 0, 2, 5, 25),
  act("DSN emergency comms test", "science", 2, 5, 25, 2, 6, 23),
  act("CSA downlink — Day 3", "pao", 2, 6, 23, 2, 7, 0),
  act("Emergency procedure practice", "config", 2, 7, 0, 2, 8, 0),
  act("Outbound science experiments", "science", 2, 8, 0, 2, 9, 0),
  act("Lunar observation rehearsal", "science", 2, 9, 0, 2, 9, 24),
  act("Sleep period — Day 3", "sleep", 2, 9, 24, 2, 18, 0),
  // ── FD04: Outbound Cruise 2 ─────────────────────────────────────────────
  act("Wake & meal — Day 4", "meal", 2, 18, 0, 2, 21, 59),
  act("Crew downlink — Day 4", "pao", 2, 21, 59, 2, 22, 30),
  act("Emergency procedure practice", "config", 2, 22, 30, 3, 0, 0),
  act("Lunar imaging target review", "science", 3, 0, 0, 3, 1, 0),
  act("Thermal attitude manoeuvre", "config", 3, 1, 0, 3, 1, 8),
  act("OTC-2 — CANCELLED", "maneuver", 3, 1, 8, 3, 1, 15),
  act("Manual piloting demonstration", "science", 3, 2, 34, 3, 5, 38),
  act("CSA downlink — Day 4", "pao", 3, 5, 38, 3, 6, 0),
  act("Celestial photography session", "science", 3, 6, 0, 3, 8, 40),
  act("Sleep period — Day 4", "sleep", 3, 8, 40, 3, 17, 25),
  // ── FD05: Lunar Approach ────────────────────────────────────────────────
  act("Wake & meal — Day 5", "meal", 3, 17, 25, 4, 2, 0),
  act("Spacesuit pressure tests", "science", 4, 2, 0, 4, 4, 0),
  act("Suit eat/drink port test", "science", 4, 4, 0, 4, 4, 28),
  act("OTC-3 burn", "maneuver", 4, 4, 28, 4, 4, 40),
  act("Enter lunar sphere of influence", "other", 4, 6, 6, 4, 6, 10),
  act("Sleep period — Day 5", "sleep", 4, 7, 45, 4, 16, 15),
  // ── FD06: Lunar Flyby Day ───────────────────────────────────────────────
  act("Wake & meal — Day 6", "meal", 4, 16, 15, 4, 18, 25),
  act("Flyby coverage begins", "pao", 4, 18, 25, 4, 18, 55),
  act("Flyby science briefing", "science", 4, 18, 55, 4, 19, 24),
  act("Distance record surpassed", "other", 4, 19, 24, 4, 19, 28),
  act("Crew remarks — distance record", "pao", 4, 19, 28, 4, 19, 40),
  act("Cabin config for flyby", "config", 4, 19, 40, 4, 20, 10),
  act("Lunar flyby observation window", "science", 4, 20, 10, 5, 0, 8),
  act("Far-side transit — loss of signal", "other", 5, 0, 8, 5, 0, 48),
  act("Lunar surface observation & photography", "science", 5, 0, 48, 5, 2, 0),
  act("Solar eclipse from lunar orbit", "science", 5, 2, 0, 5, 2, 30),
  act("Far-side photography session", "science", 5, 2, 30, 5, 2, 45),
  act("Flyby observation period ends", "other", 5, 2, 45, 5, 4, 4),
  act("Crew downlink — post-flyby", "pao", 5, 4, 4, 5, 8, 0),
  act("Sleep period — Day 6", "sleep", 5, 8, 0, 5, 18, 0),
  // ── FD07: Return Cruise 1 ───────────────────────────────────────────────
  act("Wake & meal — Day 7", "meal", 5, 18, 0, 5, 18, 52),
  act("Exit lunar sphere of influence", "other", 5, 18, 52, 5, 19, 0),
  act("ISS crew call", "pao", 5, 19, 53, 5, 20, 30),
  act("Off-duty time", "off-duty", 5, 22, 0, 6, 1, 29),
  act("Return trajectory correction burn #1", "maneuver", 6, 1, 29, 6, 2, 0),
  act("Sleep period — Day 7", "sleep", 6, 8, 0, 6, 18, 0),
  // ── FD08: Return Cruise 2 ───────────────────────────────────────────────
  act("Wake & meal — Day 8", "meal", 6, 18, 0, 6, 22, 0),
  act("Radiation shelter construction demo", "science", 6, 22, 0, 7, 0, 34),
  act("CSA downlink — Day 8", "pao", 7, 0, 34, 7, 6, 0),
  act("Sleep period — Day 8", "sleep", 7, 6, 0, 7, 18, 0),
  // ── FD09: Pre-Entry Day ─────────────────────────────────────────────────
  act("Wake & meal — Day 9", "meal", 7, 18, 0, 7, 23, 23),
  act("Crew news conference", "pao", 7, 23, 23, 8, 1, 19),
  act("Crew downlink — final full day", "pao", 8, 1, 19, 8, 2, 0),
  act("Orthostatic garment fit check", "science", 8, 2, 0, 8, 4, 29),
  act("Return trajectory correction burn #2", "maneuver", 8, 4, 29, 8, 5, 0),
  act("Sleep period — Day 9", "sleep", 8, 6, 0, 8, 8, 0),
  act("Equipment stow begins", "config", 8, 8, 0, 8, 14, 0),
  // ── FD10: Entry & Recovery Day ──────────────────────────────────────────
  act("Wake — landing day", "other", 8, 14, 0, 8, 17, 50),
  act("Final stow & cabin prep", "config", 8, 17, 50, 8, 20, 0),
  act("Crew dons spacesuits", "config", 8, 20, 0, 8, 22, 0),
  act("Re-entry coverage begins", "pao", 8, 22, 0, 9, 0, 30),
  act("Service module separation", "maneuver", 9, 0, 30, 9, 1, 0),
  act("Entry interface", "maneuver", 9, 1, 0, 9, 1, 6),
  act("Re-entry communications blackout", "other", 9, 1, 6, 9, 1, 18),
  act("Drogue parachute deploy", "maneuver", 9, 1, 18, 9, 1, 24),
  act("Main parachute deploy", "maneuver", 9, 1, 24, 9, 1, 31),
  act("Splashdown", "maneuver", 9, 1, 31, 9, 2, 0),
];

// ---------------------------------------------------------------------------
// Cache & export
// ---------------------------------------------------------------------------
let cache: TimelineData | null = null;

export function getTimelineData(): TimelineData {
  if (cache) return cache;

  const milestones = [...RAW_MILESTONES].sort((a, b) => a.metMs - b.metMs);

  cache = {
    milestones,
    phases: PHASES,
    activities: ACTIVITIES,
    attitudes: ATTITUDES,
  };

  return cache;
}
