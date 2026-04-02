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
// Milestones — 20 key events from the Artemis II flight plan
// Sorted by metMs (OTC-3 occurs before Lunar SOI Entry)
// ---------------------------------------------------------------------------
const RAW_MILESTONES: Milestone[] = [
  {
    name: "Launch",
    description: "Artemis II lifts off from LC-39B at Kennedy Space Center",
    metMs: met(0, 0, 0, 0),
  },
  {
    name: "ICPS PRM",
    description: "Interim Cryogenic Propulsion Stage perigee-raise maneuver",
    metMs: met(0, 0, 50, 0),
  },
  {
    name: "ARB TIG",
    description: "Apogee-raise burn time of ignition",
    metMs: met(0, 1, 47, 0),
  },
  {
    name: "Orion/ICPS Separation",
    description: "Orion spacecraft separates from the Interim Cryogenic Propulsion Stage",
    metMs: met(0, 3, 23, 0),
  },
  {
    name: "Orion USS",
    description: "Orion upper stage separation",
    metMs: met(0, 4, 51, 0),
  },
  {
    name: "Solar Panel Deploy",
    description: "Orion solar array wings deployed",
    metMs: met(0, 5, 27, 0),
  },
  {
    name: "Trans-Lunar Injection",
    description: "OMS-E burn propels Orion toward the Moon",
    metMs: met(1, 1, 8, 42),
  },
  {
    name: "OTC-1",
    description: "Outbound trajectory correction maneuver 1",
    metMs: met(2, 1, 8, 42),
  },
  {
    name: "OTC-2",
    description: "Outbound trajectory correction maneuver 2",
    metMs: met(3, 1, 8, 42),
  },
  {
    name: "OTC-3",
    description: "Outbound trajectory correction maneuver 3",
    metMs: met(4, 4, 29, 52),
  },
  {
    name: "Lunar SOI Entry",
    description: "Orion enters the lunar sphere of influence",
    metMs: met(4, 6, 38, 0),
  },
  {
    name: "Lunar Close Approach",
    description: "Closest approach to the lunar surface (~8,900 km)",
    metMs: met(5, 0, 29, 59),
  },
  {
    name: "Max Earth Distance",
    description: "Maximum distance from Earth (~370,000 km)",
    metMs: met(5, 0, 35, 0),
  },
  {
    name: "Lunar SOI Exit",
    description: "Orion exits the lunar sphere of influence on return trajectory",
    metMs: met(5, 18, 53, 0),
  },
  {
    name: "RTC-1",
    description: "Return trajectory correction maneuver 1",
    metMs: met(6, 1, 29, 52),
  },
  {
    name: "RTC-2",
    description: "Return trajectory correction maneuver 2",
    metMs: met(8, 4, 29, 10),
  },
  {
    name: "RTC-3",
    description: "Return trajectory correction maneuver 3",
    metMs: met(8, 20, 29, 10),
  },
  {
    name: "CM/SM Separation",
    description: "Command Module separates from Service Module before re-entry",
    metMs: met(9, 1, 9, 0),
  },
  {
    name: "Entry Interface",
    description: "Orion enters Earth's atmosphere at 122 km altitude",
    metMs: met(9, 1, 29, 0),
  },
  {
    name: "Splashdown",
    description: "Orion crew module splashes down in the Pacific Ocean",
    metMs: met(9, 1, 42, 48),
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
// Attitudes
// ---------------------------------------------------------------------------
const ATTITUDES: AttitudeBlock[] = [
  {
    mode: "Ascent",
    startMetMs: met(0, 0, 0, 0),
    endMetMs: met(0, 0, 50, 0),
  },
  {
    mode: "Bias -XSI",
    startMetMs: met(0, 0, 50, 0),
    endMetMs: met(0, 5, 27, 0),
  },
  {
    mode: "TLI",
    startMetMs: met(0, 5, 27, 0),
    endMetMs: met(1, 1, 8, 42),
  },
  {
    mode: "OTC",
    startMetMs: met(1, 1, 8, 42),
    endMetMs: met(2, 1, 8, 42),
  },
  {
    mode: "Observation",
    startMetMs: met(2, 1, 8, 42),
    endMetMs: met(4, 4, 29, 52),
  },
  {
    mode: "Survey",
    startMetMs: met(4, 4, 29, 52),
    endMetMs: met(5, 18, 53, 0),
  },
  {
    mode: "RTC",
    startMetMs: met(5, 18, 53, 0),
    endMetMs: met(8, 20, 29, 10),
  },
  {
    mode: "Bias -XSI Mitigate X",
    startMetMs: met(8, 20, 29, 10),
    endMetMs: met(9, 1, 9, 0),
  },
  {
    mode: "EDL",
    startMetMs: met(9, 1, 9, 0),
    endMetMs: met(9, 1, 42, 48),
  },
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

const ACTIVITIES: TimelineActivity[] = [
  // ── FD1: Launch Day ──────────────────────────────────────────────────────
  act("Launch", "maneuver", 0, 0, 0, 0, 0, 30, "Liftoff from LC-39B"),
  act("Post-launch system config", "config", 0, 0, 30, 0, 3, 30, "Post-separation configuration"),
  act("Orion activation & checkout", "config", 0, 3, 30, 0, 8, 0),
  act("Crew meal — FD1", "meal", 0, 8, 0, 0, 9, 0),
  act("Crew rest / sleep — FD1", "sleep", 0, 9, 0, 0, 18, 0),
  act("Post-sleep procedures — FD1", "config", 0, 18, 0, 0, 19, 0),

  // ── FD2: TLI Day ─────────────────────────────────────────────────────────
  act("Crew meal — FD2 morning", "meal", 1, 0, 0, 1, 1, 0),
  act("Trans-Lunar Injection burn", "maneuver", 1, 1, 8, 1, 1, 22, "OMS-E TLI burn ~14 min"),
  act("Post-TLI systems check", "config", 1, 1, 22, 1, 3, 0),
  act("PAO event — TLI day", "pao", 1, 3, 0, 1, 4, 0, "Live crew video/commentary"),
  act("Science observation — Earth view", "science", 1, 4, 0, 1, 6, 0),
  act("Exercise — FD2", "exercise", 1, 6, 0, 1, 7, 0),
  act("Crew meal — FD2 evening", "meal", 1, 7, 0, 1, 8, 0),
  act("Crew rest / sleep — FD2", "sleep", 1, 9, 0, 1, 18, 0),
  act("Post-sleep procedures — FD2", "config", 1, 18, 0, 1, 19, 0),

  // ── FD3: Outbound Cruise 1 ───────────────────────────────────────────────
  act("OTC-1 maneuver", "maneuver", 2, 1, 8, 2, 1, 15, "Outbound trajectory correction 1"),
  act("Crew meal — FD3 morning", "meal", 2, 1, 30, 2, 2, 30),
  act("Science data collection", "science", 2, 2, 30, 2, 4, 30),
  act("PAO event — outbound cruise", "pao", 2, 4, 30, 2, 5, 30),
  act("Onboard maintenance", "config", 2, 5, 30, 2, 7, 0),
  act("Exercise — FD3", "exercise", 2, 7, 0, 2, 8, 0),
  act("Crew meal — FD3 evening", "meal", 2, 8, 0, 2, 9, 0),
  act("Crew rest / sleep — FD3", "sleep", 2, 9, 0, 2, 18, 0),
  act("Post-sleep procedures — FD3", "config", 2, 18, 0, 2, 19, 0),

  // ── FD4: Outbound Cruise 2 ───────────────────────────────────────────────
  act("OTC-2 maneuver", "maneuver", 3, 1, 8, 3, 1, 15, "Outbound trajectory correction 2"),
  act("Crew meal — FD4 morning", "meal", 3, 1, 30, 3, 2, 30),
  act("Radiation monitoring", "science", 3, 2, 30, 3, 4, 30),
  act("Systems health check", "config", 3, 4, 30, 3, 6, 0),
  act("Exercise — FD4", "exercise", 3, 6, 0, 3, 7, 0),
  act("PAO event — FD4", "pao", 3, 7, 0, 3, 8, 0),
  act("Crew meal — FD4 evening", "meal", 3, 8, 0, 3, 9, 0),
  act("Crew rest / sleep — FD4", "sleep", 3, 9, 0, 3, 18, 0),
  act("Post-sleep procedures — FD4", "config", 3, 18, 0, 3, 19, 0),

  // ── FD5: Lunar Approach ──────────────────────────────────────────────────
  act("OTC-3 maneuver", "maneuver", 4, 4, 29, 4, 4, 40, "Outbound trajectory correction 3"),
  act("Crew meal — FD5 morning", "meal", 4, 5, 0, 4, 6, 0),
  act("Lunar approach observation", "science", 4, 6, 0, 4, 9, 0, "Crew photograph approach"),
  act("Crew rest / sleep — FD5", "sleep", 4, 9, 0, 4, 18, 0),
  act("Post-sleep procedures — FD5", "config", 4, 18, 0, 4, 19, 0),
  act("Pre-close-approach prep", "config", 4, 19, 0, 4, 23, 0),

  // ── FD6: Lunar Close Approach / Max Distance ─────────────────────────────
  act("Lunar close approach operations", "maneuver", 5, 0, 0, 5, 1, 30, "~8,900 km from lunar surface"),
  act("Crew meal — FD6 morning", "meal", 5, 1, 30, 5, 2, 30),
  act("PAO event — lunar flyby", "pao", 5, 2, 30, 5, 3, 30, "Live Earth-Moon-Orion views"),
  act("Lunar surface observation", "science", 5, 3, 30, 5, 6, 30),
  act("Exercise — FD6", "exercise", 5, 6, 30, 5, 7, 30),
  act("Crew meal — FD6 evening", "meal", 5, 7, 30, 5, 8, 30),
  act("Crew rest / sleep — FD6", "sleep", 5, 9, 0, 5, 18, 0),
  act("Post-sleep procedures — FD6", "config", 5, 18, 0, 5, 19, 0),

  // ── FD7: Return Cruise 1 ─────────────────────────────────────────────────
  act("RTC-1 maneuver", "maneuver", 6, 1, 29, 6, 1, 40, "Return trajectory correction 1"),
  act("Crew meal — FD7 morning", "meal", 6, 2, 0, 6, 3, 0),
  act("Earth observation science", "science", 6, 3, 0, 6, 5, 0),
  act("Off-duty recreation — FD7", "off-duty", 6, 5, 0, 6, 7, 0),
  act("Exercise — FD7", "exercise", 6, 7, 0, 6, 8, 0),
  act("Crew meal — FD7 evening", "meal", 6, 8, 0, 6, 9, 0),
  act("Crew rest / sleep — FD7", "sleep", 6, 9, 0, 6, 18, 0),
  act("Post-sleep procedures — FD7", "config", 6, 18, 0, 6, 19, 0),

  // ── FD8: Return Cruise 2 ─────────────────────────────────────────────────
  act("Crew meal — FD8 morning", "meal", 7, 1, 0, 7, 2, 0),
  act("Radiation science collection", "science", 7, 2, 0, 7, 4, 0),
  act("PAO event — return cruise", "pao", 7, 4, 0, 7, 5, 0),
  act("Systems reconfiguration", "config", 7, 5, 0, 7, 7, 0),
  act("Exercise — FD8", "exercise", 7, 7, 0, 7, 8, 0),
  act("Crew meal — FD8 evening", "meal", 7, 8, 0, 7, 9, 0),
  act("Crew rest / sleep — FD8", "sleep", 7, 9, 0, 7, 18, 0),
  act("Post-sleep procedures — FD8", "config", 7, 18, 0, 7, 19, 0),

  // ── FD9: Pre-Entry Day ───────────────────────────────────────────────────
  act("RTC-2 maneuver", "maneuver", 8, 4, 29, 8, 4, 40, "Return trajectory correction 2"),
  act("Crew meal — FD9 morning", "meal", 8, 5, 0, 8, 6, 0),
  act("Suit donning & checkout", "config", 8, 6, 0, 8, 8, 0, "Pressure suit checkout for entry"),
  act("RTC-3 maneuver", "maneuver", 8, 20, 29, 8, 20, 40, "Return trajectory correction 3"),
  act("Entry prep systems check", "config", 8, 21, 0, 8, 23, 30),
  act("Crew meal — FD9 evening", "meal", 8, 23, 30, 9, 0, 30),
  act("Pre-entry crew rest", "sleep", 9, 0, 30, 9, 1, 0),

  // ── FD10: Entry & Recovery Day ───────────────────────────────────────────
  act("CM/SM Separation", "maneuver", 9, 1, 9, 9, 1, 10, "Service Module jettisoned"),
  act("Entry Interface & re-entry", "maneuver", 9, 1, 29, 9, 1, 42, "Skip re-entry through atmosphere"),
  act("Splashdown & crew egress", "other", 9, 1, 42, 9, 2, 30, "Pacific Ocean recovery"),
  act("Crew medical evaluation", "other", 9, 2, 30, 9, 3, 0, "Post-flight medical checks"),
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
