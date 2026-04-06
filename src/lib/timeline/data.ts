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
    metMs: Math.round(102.05 * 3600 * 1000), // metHours=102.05 → ~4d 06h 03m
  },
  {
    name: "Flyby Coverage Begins",
    description: "NASA begins live coverage of the lunar flyby",
    metMs: Math.round(114.41 * 3600 * 1000), // metHours=114.41 → ~4d 18h 25m
  },
  {
    name: "Far-Side Blackout",
    description: "Loss of signal — Orion passes behind the Moon",
    metMs: Math.round(120.20 * 3600 * 1000), // metHours=120.20 → ~5d 00h 12m
  },
  {
    name: "Lunar Close Approach",
    description: "Closest approach — ~4,066 miles (~6,543 km) above the lunar surface",
    metMs: Math.round(120.45 * 3600 * 1000), // metHours=120.45 → ~5d 00h 27m
  },
  {
    name: "Max Earth Distance",
    description: "Maximum distance from Earth — 252,757 miles, surpassing Apollo 13 record",
    metMs: Math.round(120.50 * 3600 * 1000), // metHours=120.50 → ~5d 00h 30m
  },
  {
    name: "Signal Reacquired",
    description: "Communications restored after far-side blackout",
    metMs: Math.round(120.86 * 3600 * 1000), // metHours=120.86 → ~5d 00h 52m
  },
  {
    name: "Solar Eclipse",
    description: "Orion observes a solar eclipse from behind the Moon",
    metMs: Math.round(123 * 3600 * 1000), // metHours=123 → ~5d 03h 00m
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
    endMetMs: met(5, 18, 53, 0),
  },
  {
    phase: "Trans-Earth",
    startMetMs: met(5, 18, 53, 0),
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

// Activities sourced from jakobrosin/artemis-data crewSchedule (82 entries).
// startMET/endMET are decimal hours; converted to d/h/m via Math.floor.
const ACTIVITIES: TimelineActivity[] = [
  // ── Day 1: Launch Day ───────────────────────────────────────────────────
  act("Launch & ascent", "maneuver", 0, 0, 0, 0, 0, 9, "SLS liftoff, main-engine cutoff ~8 min after launch."),
  act("Orbital insertion burns", "maneuver", 0, 0, 9, 0, 1, 0, "ICPS perigee-raise burn (~49 min), then high-Earth orbit insertion (~1 hr)."),
  act("Post-insertion checks", "config", 0, 1, 0, 0, 3, 0, "Remove launch suits, reconfigure cabin for living and work."),
  act("Proximity operations demo", "science", 0, 3, 0, 0, 5, 0, "ICPS becomes docking target; crew practices manual flying toward and around it."),
  act("Orion systems checkout", "config", 0, 5, 0, 0, 8, 0, "Test potable water dispenser, toilet, CO2 removal system."),
  act("Crew meal", "meal", 0, 7, 0, 0, 7, 30, "First meal in orbit — test food rehydration system."),
  act("Sleep period", "sleep", 0, 7, 30, 0, 12, 30, "Brief rest period (~4 hours) after first day in space."),
  act("Orbital manoeuvre & DSN checkout", "config", 0, 12, 30, 0, 14, 0, "Engine firing for correct TLI orbital geometry; emergency comms test on Deep Space Network."),
  act("Sleep period", "sleep", 0, 13, 0, 0, 20, 0, "After perigee raise burn, crew returns to sleep for ~4.5 hours before first full day in space."),

  // ── Day 2: TLI Day ──────────────────────────────────────────────────────
  act("Wake & meal", "meal", 0, 20, 0, 0, 21, 0, "Morning routine and breakfast."),
  act("TLI burn conference — GO for TLI", "config", 0, 21, 0, 0, 22, 0, "Mission management team gave go for translunar injection."),
  act("Crew exercise", "exercise", 0, 22, 0, 0, 23, 30, "Flywheel resistive exercise. Crew rotates on the single device."),
  act("TLI burn preparation", "config", 0, 23, 30, 1, 0, 30, "Final systems checkout, crew dons pressure suits."),
  act("Translunar injection burn", "maneuver", 1, 0, 30, 1, 1, 30, "ESM main engine fires for ~6 minutes. Commits Orion to the Moon."),
  act("Post-TLI checks", "config", 1, 1, 30, 1, 3, 0, "Systems verification. Earth shadow transit."),
  act("Video downlink & crew meal", "pao", 1, 3, 0, 1, 5, 0, "First video call home after TLI."),
  act("Personal time", "off-duty", 1, 5, 0, 1, 8, 0, "Off-duty after a historic day."),
  act("Crew meal & pre-sleep", "meal", 1, 8, 0, 1, 10, 0, "Evening meal before transit sleep."),
  act("Sleep period", "sleep", 1, 10, 0, 1, 18, 0, "Full rest period after TLI day."),

  // ── Day 3: Outbound Cruise 1 ─────────────────────────────────────────────
  act("Wake & meal", "meal", 1, 18, 0, 1, 20, 0, "Morning routine and breakfast."),
  act("Trajectory correction burn #1 prep", "config", 1, 20, 0, 1, 22, 0, "Hansen prepares for first of three outbound course-correction burns."),
  act("Outbound trajectory correction burn #1", "maneuver", 1, 22, 0, 1, 22, 12, "First mid-course correction ensures Orion stays on target for the Moon."),
  act("CPR & medical kit demo", "science", 1, 22, 12, 2, 2, 0, "Glover, Koch, and Hansen demonstrate CPR procedures in microgravity; medical kit checkout."),
  act("DSN emergency comms test", "science", 2, 2, 0, 2, 4, 0, "Koch tests Orion's emergency communications system on the Deep Space Network."),
  act("Lunar flyby rehearsal", "science", 2, 4, 0, 2, 7, 0, "Entire crew rehearses choreography for Day 6 lunar flyby scientific observations."),
  act("Exercise & personal time", "exercise", 2, 7, 0, 2, 9, 0, "Crew exercise and downtime."),
  act("Video downlink", "pao", 2, 9, 0, 2, 10, 0, "Scheduled space-to-ground video session."),
  act("Sleep period", "sleep", 2, 10, 0, 2, 18, 0, "Full rest period."),

  // ── Day 4: Outbound Cruise 2 ─────────────────────────────────────────────
  act("Wake & meal", "meal", 2, 18, 0, 2, 20, 0, "Morning routine and breakfast."),
  act("Trajectory correction burn #2 prep", "config", 2, 20, 0, 2, 22, 0, "Preparation for second outbound course correction."),
  act("Outbound trajectory correction burn #2", "maneuver", 2, 22, 0, 2, 22, 12, "Second mid-course correction refines lunar approach path."),
  act("Lunar target study", "science", 2, 22, 12, 3, 2, 0, "Each astronaut reviews geographic targets for Day 6 imagery."),
  act("Celestial photography", "science", 3, 2, 0, 3, 4, 0, "Crew photographs celestial bodies from Orion's windows."),
  act("Exercise", "exercise", 3, 4, 0, 3, 6, 0, "Flywheel workout session."),
  act("Video downlink & personal time", "pao", 3, 6, 0, 3, 8, 0, "Video call with ground and free time."),
  act("Crew meal", "meal", 3, 8, 0, 3, 10, 0, "Evening meal."),
  act("Sleep period", "sleep", 3, 10, 0, 3, 18, 0, "Full rest period."),

  // ── Day 5: Lunar Approach ────────────────────────────────────────────────
  act("Wake & meal", "meal", 3, 18, 0, 3, 20, 0, "Morning routine and breakfast."),
  act("Spacesuit pressure testing", "science", 3, 20, 0, 4, 1, 0, "Test donning suits quickly, pressurizing them, installing seats, eating/drinking through helmet port."),
  act("Crew meal & rest", "meal", 4, 1, 0, 4, 3, 0, "Midday break."),
  act("Trajectory correction burn #3 prep", "config", 4, 3, 0, 4, 4, 0, "Preparation for final outbound course correction before lunar flyby."),
  act("Outbound trajectory correction burn #3", "maneuver", 4, 4, 0, 4, 4, 12, "Final outbound mid-course correction. Orion enters the lunar sphere of influence today."),
  act("Exercise", "exercise", 4, 4, 12, 4, 6, 0, "Flywheel workout session."),
  act("Video downlink & personal time", "pao", 4, 6, 0, 4, 8, 0, "Video call with ground and free time."),
  act("Crew meal", "meal", 4, 8, 0, 4, 10, 0, "Evening meal."),
  act("Sleep period", "sleep", 4, 10, 0, 4, 18, 0, "Full rest period before lunar flyby day."),

  // ── Day 6: Lunar Flyby Day ───────────────────────────────────────────────
  act("Wake early — lunar flyby day", "other", 4, 18, 0, 4, 20, 0, "Early wake-up for the historic lunar flyby."),
  act("Crew meal & flyby prep", "meal", 4, 20, 0, 4, 22, 0, "Breakfast and final preparation for close lunar approach."),
  act("Lunar flyby — photography & observations", "science", 4, 22, 0, 5, 4, 0, "Closest approach ~8,900 km above lunar surface. Crew photographs and observes the Moon up close."),
  act("Solar eclipse observation", "science", 5, 3, 0, 5, 4, 0, "Sun hidden behind Moon. Crew observes corona, meteoroid flashes, lunar dust."),
  act("Far-side transit — loss of signal", "other", 5, 4, 0, 5, 5, 0, "Orion passes behind the Moon. Communications blackout lasting 30-50 minutes."),
  act("Post-flyby science & observation", "science", 5, 5, 0, 5, 10, 0, "Continued photography and recordings after reacquiring signal."),
  act("Exercise & crew meal", "exercise", 5, 10, 0, 5, 12, 0, "Post-flyby meal and exercise."),
  act("Video downlink", "pao", 5, 12, 0, 5, 14, 0, "Share lunar flyby experience with Mission Control and the world."),
  act("Sleep period", "sleep", 5, 14, 0, 5, 22, 0, "Rest period after the historic flyby."),

  // ── Day 7: Return Cruise 1 ───────────────────────────────────────────────
  act("Wake & meal", "meal", 5, 22, 0, 6, 0, 0, "Morning routine. Orion exits the lunar sphere of influence today."),
  act("Crew lunar debrief", "science", 6, 0, 0, 6, 3, 0, "Ground scientists speak with crew while the lunar flyby experience is fresh."),
  act("Return trajectory correction burn #1", "maneuver", 6, 3, 0, 6, 4, 0, "First of three return course corrections to adjust path home."),
  act("Exercise", "exercise", 6, 4, 0, 6, 6, 0, "Flywheel workout session."),
  act("Off-duty time", "off-duty", 6, 6, 0, 6, 10, 0, "Largely off-duty day for rest before final return phase tasks."),
  act("Crew meal", "meal", 6, 10, 0, 6, 12, 0, "Evening meal."),
  act("Sleep period", "sleep", 6, 12, 0, 6, 22, 0, "Extended rest period."),

  // ── Day 8: Return Cruise 2 ───────────────────────────────────────────────
  act("Wake & meal", "meal", 6, 22, 0, 7, 0, 0, "Morning routine and breakfast."),
  act("Radiation shelter demonstration", "science", 7, 0, 0, 7, 4, 0, "Crew builds a protective shelter using Orion supplies — demonstrating shielding from solar particle events."),
  act("Manual piloting demonstration", "science", 7, 4, 0, 7, 8, 0, "Test Orion manual control: target centering, tail-to-Sun attitude, 6-DOF vs 3-DOF manoeuvres."),
  act("Exercise", "exercise", 7, 8, 0, 7, 10, 0, "Flywheel workout session."),
  act("Video downlink & crew meal", "pao", 7, 10, 0, 7, 12, 0, "Video call with ground and evening meal."),
  act("Sleep period", "sleep", 7, 12, 0, 7, 22, 0, "Full rest period."),

  // ── Day 9: Pre-Entry Day ─────────────────────────────────────────────────
  act("Wake & meal", "meal", 7, 22, 0, 8, 0, 0, "Morning routine and breakfast."),
  act("Re-entry & splashdown procedure review", "config", 8, 0, 0, 8, 3, 0, "Crew studies re-entry procedures and talks with flight control team."),
  act("Return trajectory correction burn #2", "maneuver", 8, 3, 0, 8, 4, 0, "Course correction to keep Orion on target for splashdown zone."),
  act("Waste system & garment testing", "science", 8, 4, 0, 8, 6, 0, "Test backup waste collection systems; fit-check orthostatic intolerance compression garments."),
  act("Exercise & personal time", "exercise", 8, 6, 0, 8, 8, 0, "Final workout session and personal time."),
  act("Crew meal", "meal", 8, 8, 0, 8, 10, 0, "Evening meal — last full evening in space."),
  act("Sleep period", "sleep", 8, 10, 0, 8, 14, 0, "Final rest period before re-entry day."),

  // ── Day 10: Entry & Recovery Day ─────────────────────────────────────────
  act("Wake early — re-entry day", "other", 8, 18, 0, 8, 22, 0, "Early wake-up for the final day of the mission."),
  act("Final stow & cabin prep", "config", 8, 22, 0, 9, 2, 0, "Return cabin to launch configuration: stow equipment, install seats."),
  act("Don spacesuits for re-entry", "config", 9, 2, 0, 9, 6, 0, "Crew dons OCSS pressure suits, closes visors, and straps in for atmospheric entry."),
  act("Service module separation", "maneuver", 9, 6, 0, 9, 9, 0, "Crew module separates from European Service Module prior to atmospheric entry."),
  act("Atmospheric re-entry", "maneuver", 9, 9, 0, 9, 10, 0, "Heat shield faces ~2,760 C during re-entry at ~40,000 km/h."),
  act("Parachute descent", "maneuver", 9, 10, 0, 9, 10, 30, "Drogue chutes slow to ~494 km/h, then three main chutes deploy for final descent at ~27 km/h."),
  act("Splashdown & recovery", "maneuver", 9, 10, 30, 9, 12, 0, "Splashdown in the Pacific Ocean. NASA and U.S. Navy recovery teams retrieve crew and capsule."),
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
