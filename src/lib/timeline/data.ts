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
    name: "Perigee Raise Maneuver",
    description: "ICPS perigee raise burn raises low point of orbit",
    metMs: met(0, 0, 50, 0),
  },
  {
    name: "Apogee Raise Burn",
    description: "ICPS apogee raise burn puts Orion into high elliptical orbit",
    metMs: met(0, 1, 47, 0),
  },
  {
    name: "Orion/ICPS Separation",
    description: "Orion spacecraft separates from the ICPS upper stage",
    metMs: met(0, 3, 23, 0),
  },
  {
    name: "Orion USS",
    description: "Orion upper stage separation complete",
    metMs: met(0, 4, 51, 0),
  },
  {
    name: "Solar Panel Deploy",
    description: "Orion solar array wings deployed",
    metMs: met(0, 5, 27, 0),
  },
  {
    name: "OpComm Activation",
    description: "Operational communications system activated",
    metMs: met(0, 10, 6, 0),
  },
  {
    name: "Perigee Raise Burn",
    description: "Orion performs perigee raise burn to adjust orbit before TLI",
    metMs: met(0, 13, 30, 0),
  },
  {
    name: "Trans-Lunar Injection",
    description: "TLI burn sends Orion toward the Moon at ~39,000 km/h",
    metMs: met(1, 1, 37, 0),
  },
  {
    name: "OTC-1",
    description: "Outbound trajectory correction maneuver 1",
    metMs: met(2, 0, 7, 0),
  },
  {
    name: "OTC-2",
    description: "Outbound trajectory correction maneuver 2",
    metMs: met(3, 0, 12, 0),
  },
  {
    name: "OTC-3",
    description: "Outbound trajectory correction maneuver 3",
    metMs: met(4, 5, 23, 0),
  },
  {
    name: "Lunar SOI Entry",
    description: "Orion enters the lunar sphere of influence",
    metMs: met(4, 6, 59, 0),
  },
  {
    name: "Lunar Close Approach",
    description: "Closest approach to the lunar surface (~6,513 km)",
    metMs: met(5, 1, 23, 0),
  },
  {
    name: "Max Earth Distance",
    description: "Maximum distance from Earth (~380,000 km)",
    metMs: met(5, 1, 26, 0),
  },
  {
    name: "Lunar SOI Exit",
    description: "Orion exits the lunar sphere of influence on return trajectory",
    metMs: met(5, 19, 47, 0),
  },
  {
    name: "RTC-1",
    description: "Return trajectory correction maneuver 1",
    metMs: met(6, 4, 23, 0),
  },
  {
    name: "RTC-2",
    description: "Return trajectory correction maneuver 2",
    metMs: met(8, 4, 33, 0),
  },
  {
    name: "RTC-3",
    description: "Return trajectory correction maneuver 3",
    metMs: met(8, 20, 33, 0),
  },
  {
    name: "CM/SM Separation",
    description: "Command Module separates from Service Module before re-entry",
    metMs: met(9, 1, 13, 0),
  },
  {
    name: "Entry Interface",
    description: "Orion enters Earth's atmosphere at 400,000 ft",
    metMs: met(9, 1, 33, 0),
  },
  {
    name: "Splashdown",
    description: "Orion crew module splashes down in the Pacific Ocean",
    metMs: met(9, 1, 46, 0),
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

const ACTIVITIES: TimelineActivity[] = [
  // ── FD01: Launch Day (MET 0/00:00 to ~0/19:30) ──────────────────────────
  // Anchors: PRM 0/00:50, ARB 0/01:47, ICPS Sep 0/03:23, USS 0/04:51,
  //          SPL Deploys 0/05:27, OpComm 0/10:06, PRB 0/13:30, OpNav C/O 0/14:15
  //          Sleep1: 0/08:30–0/12:30 (4 hrs), Sleep2: 0/15:00–0/19:30 (4.5 hrs)
  act("Launch / Ascent", "maneuver", 0, 0, 0, 0, 0, 8, "Liftoff from LC-39B"),
  act("Pre-ARB Checkouts", "config", 0, 0, 8, 0, 0, 50),
  act("PRM Burn", "maneuver", 0, 0, 50, 0, 0, 55, "Perigee Raise Maneuver TIG 0/00:50"),
  act("T-Roll Maneuvers", "maneuver", 0, 0, 55, 0, 1, 47),
  act("ARB", "maneuver", 0, 1, 47, 0, 2, 0, "Apogee Raise Burn TIG 0/01:47"),
  act("Doff OCSS", "config", 0, 2, 0, 0, 2, 30, "Remove Orion Crew Survival System suits"),
  act("DCAM Ops", "science", 0, 2, 30, 0, 3, 23, "Dock camera operations"),
  act("Orion/ICPS Separation", "maneuver", 0, 3, 23, 0, 3, 30, "Spring separation at 0/03:23"),
  act("Proximity Ops Demo", "science", 0, 3, 30, 0, 4, 51),
  act("Orion USS", "maneuver", 0, 4, 51, 0, 5, 0, "Upper stage separation 0/04:51"),
  act("Solar Panel Deploy / Cab Config", "config", 0, 5, 0, 0, 5, 30, "SPL deploys ~0/05:27"),
  act("Cabin Configuration", "config", 0, 5, 30, 0, 6, 0),
  act("4K Encoder Setup", "config", 0, 6, 0, 0, 6, 30),
  act("N2/O2 Operations", "config", 0, 6, 30, 0, 7, 0),
  act("PAO Event", "pao", 0, 7, 0, 0, 8, 0),
  act("PMC", "config", 0, 8, 0, 0, 8, 15, "Private Medical Conference"),
  act("FD Conference", "config", 0, 8, 15, 0, 8, 30),

  act("Sleep Period 1", "sleep", 0, 8, 30, 0, 12, 30, "4-hour rest period"),

  act("Perigee Raise Burn", "maneuver", 0, 13, 15, 0, 13, 45, "Orion PRB TIG ~0/13:30"),
  act("DSN Ops", "config", 0, 13, 45, 0, 14, 15, "DSN comm checkout"),
  act("OpNav Checkout", "science", 0, 14, 15, 0, 14, 45, "Optical Navigation C/O ~0/14:15"),
  act("PMC", "config", 0, 14, 45, 0, 15, 0, "Private Medical Conference"),

  act("Sleep Period 2", "sleep", 0, 15, 0, 0, 19, 30, "4.5-hour rest period"),

  // ── FD02: TLI Day (MET ~0/19:30 to ~1/16:45) ───────────────────────────
  // Anchors: TLI 1/01:08:42, Sleep: 1/08:15–1/16:45 (8.5 hrs)
  act("DPC", "config", 0, 19, 30, 0, 20, 0, "Daily Planning Conference"),
  act("Meal", "meal", 0, 20, 0, 0, 20, 30),
  act("Exercise Test M-42 EXT", "exercise", 0, 20, 30, 0, 22, 0, "M-42 EXT exercise test"),
  act("NatGeo Setup", "science", 0, 22, 0, 0, 22, 30, "National Geographic equipment setup"),
  act("ECLSS CO2 Monitor DFTO", "science", 0, 22, 30, 0, 23, 30),
  act("TLI Conference", "config", 0, 23, 30, 1, 1, 0, "Pre-burn briefing"),
  act("TLI Burn", "maneuver", 1, 1, 37, 1, 1, 57, "Trans-Lunar Injection TIG 01/01:37"),
  act("Meal", "meal", 1, 1, 30, 1, 2, 0),
  act("Pulse Oximetry", "science", 1, 2, 30, 1, 3, 0),
  act("PAO Event", "pao", 1, 3, 30, 1, 4, 30),
  act("Window Inspection", "science", 1, 4, 30, 1, 5, 0),
  act("Dock Cam Config Transit", "config", 1, 5, 0, 1, 5, 30),
  act("PMC", "config", 1, 6, 30, 1, 7, 0, "Private Medical Conference"),
  act("FD Conference", "config", 1, 7, 0, 1, 7, 30),
  act("TLI Confirmation", "config", 1, 7, 30, 1, 8, 15),

  act("Sleep", "sleep", 1, 8, 15, 1, 16, 45, "8.5-hour rest period"),

  // ── FD03: Outbound Cruise 1 (MET ~1/16:45 to ~2/09:30) ────────────────
  // Anchors: Toilet Noise at 1/22:15 (user confirmed), OTC-1 ~2/01:08:42,
  //          Sleep: 2/09:30–2/18:00 (8.5 hrs)
  act("DPC", "config", 1, 16, 45, 1, 17, 15, "Daily Planning Conference"),
  act("Meal", "meal", 1, 17, 15, 1, 17, 45),
  act("CM/SM Survey", "science", 1, 17, 45, 1, 18, 15, "Camera survey of Service Module at ~01/14:00 annotation"),
  act("Pulse Oximetry", "science", 1, 18, 15, 1, 18, 45),
  act("PFC", "other", 1, 18, 45, 1, 19, 15, "Private Family Conference"),
  act("NatGeo", "science", 1, 19, 15, 1, 20, 15),
  act("Exercise", "exercise", 1, 20, 0, 1, 21, 0),
  act("Off Duty", "off-duty", 1, 21, 0, 1, 22, 15),
  act("Toilet Noise Measurement", "science", 1, 22, 15, 1, 22, 45, "Acoustic measurement"),
  act("Dual Cam Bracket Uninstall", "config", 1, 22, 45, 1, 23, 15),
  act("PAO Event", "pao", 1, 23, 15, 2, 0, 15),
  act("OTC-1 Burn", "maneuver", 2, 0, 7, 2, 0, 17, "Outbound trajectory correction 1 TIG 02/00:07"),
  act("Meal", "meal", 2, 1, 30, 2, 2, 0),
  act("CPR Demo", "science", 2, 2, 0, 2, 3, 0, "Medical procedure demonstration"),
  act("SAT Mode Test", "science", 2, 4, 30, 2, 6, 0, "DFTO-EM2-23"),
  act("Med Kit Inventory", "config", 2, 6, 0, 2, 6, 30),
  act("D5 Cam Window", "science", 2, 6, 30, 2, 7, 0),
  act("DSN Emergency Comm Test", "config", 2, 7, 0, 2, 8, 0, "DFTO-EM2-22"),
  act("CSA PAO", "pao", 2, 8, 0, 2, 8, 30, "Canadian Space Agency event"),
  act("PMC", "config", 2, 8, 30, 2, 9, 0, "Private Medical Conference"),
  act("FD Conference", "config", 2, 9, 0, 2, 9, 30),

  act("Sleep", "sleep", 2, 9, 30, 2, 18, 0, "8.5-hour rest period"),

  // ── FD04: Outbound Cruise 2 (MET ~2/18:00 to ~3/18:15) ─────────────────
  // Anchors: OTC-2 ~3/01:08:42, Sleep: 3/09:45–3/18:15 (8.5 hrs, 45 min shift earlier)
  act("DPC", "config", 2, 18, 0, 2, 18, 30, "Daily Planning Conference"),
  act("Meal", "meal", 2, 18, 30, 2, 19, 0),
  act("Pulse Oximetry", "science", 2, 19, 0, 2, 19, 30),
  act("PWD Operations", "config", 2, 19, 30, 2, 20, 0, "Portable Water Dispenser"),
  act("NatGeo", "science", 2, 20, 0, 2, 21, 0),
  act("P/TV Photo", "science", 2, 21, 0, 2, 21, 30),
  act("PAO Event", "pao", 2, 21, 30, 2, 22, 30),
  act("ESA Event", "pao", 2, 22, 30, 2, 23, 0, "European Space Agency"),
  act("Off Duty", "off-duty", 2, 23, 0, 3, 1, 0),
  act("OTC-2 Burn", "maneuver", 3, 0, 12, 3, 0, 22, "Outbound trajectory correction 2 TIG 03/00:12"),
  act("Meal", "meal", 3, 1, 15, 3, 1, 45),
  act("Manual Piloting Demo", "science", 3, 2, 0, 3, 3, 0, "Crew flies Orion manually"),
  act("Cognitive Assessment", "science", 3, 3, 0, 3, 4, 0, "COGN"),
  act("Lunar Imaging Review", "science", 3, 4, 0, 3, 5, 0),
  act("Flywheel Experiment", "science", 3, 5, 0, 3, 6, 0),
  act("NatGeo", "science", 3, 6, 0, 3, 6, 30),
  act("CSA VIP Event", "pao", 3, 6, 30, 3, 7, 0),
  act("Imaging", "science", 3, 7, 0, 3, 8, 0),
  act("PAO Event", "pao", 3, 8, 0, 3, 8, 30),
  act("PMC", "config", 3, 8, 30, 3, 9, 0, "Private Medical Conference"),
  act("FD Conference", "config", 3, 9, 0, 3, 9, 45),

  act("Sleep", "sleep", 3, 9, 45, 3, 18, 15, "8.5-hour rest period, 45 min shift earlier"),

  // ── FD05: Lunar Approach (MET ~3/18:15 to ~4/17:15) ─────────────────────
  // Anchors: OTC-3 4/04:29:52, Lunar SOI 4/06:38, Sleep: 4/08:45–4/17:15 (8.5 hrs, 1 hr shift earlier)
  act("DPC", "config", 3, 18, 15, 3, 18, 45, "Daily Planning Conference"),
  act("Meal", "meal", 3, 18, 45, 3, 19, 15),
  act("Pulse Oximetry", "science", 3, 19, 15, 3, 19, 45),
  act("OCSS DFTO Ops", "science", 3, 19, 45, 3, 20, 45, "Crew survival system test"),
  act("Cabin Depress Ops", "config", 3, 20, 45, 3, 21, 45, "Start cabin depress ~0/00:30 relative"),
  act("NatGeo", "science", 3, 21, 45, 3, 22, 15),
  act("ECLSS Wall Test", "science", 3, 22, 15, 3, 22, 45),
  act("Off Duty", "off-duty", 3, 22, 45, 4, 0, 0),
  act("OpNav", "science", 4, 0, 0, 4, 0, 30),
  act("PAO Event", "pao", 4, 0, 30, 4, 1, 30),
  act("Lunar Imaging Prep", "science", 4, 1, 30, 4, 2, 30),
  act("Meal", "meal", 4, 2, 30, 4, 3, 0),
  act("OTC-3 Burn", "maneuver", 4, 5, 23, 4, 5, 33, "Outbound trajectory correction 3 TIG 04/05:23"),
  act("SAW Camera", "science", 4, 4, 45, 4, 5, 30),
  act("Lunar SOI Entry Ops", "config", 4, 6, 30, 4, 7, 0, "Lunar SOI Entry ~4/06:38"),
  act("PMC", "config", 4, 7, 0, 4, 7, 30, "Private Medical Conference"),
  act("FD Conference", "config", 4, 7, 30, 4, 8, 0),
  act("PFC", "other", 4, 8, 0, 4, 8, 30, "Private Family Conference"),
  act("Pre-Flyby Prep", "config", 4, 8, 30, 4, 8, 45),

  act("Sleep", "sleep", 4, 8, 45, 4, 17, 15, "8.5-hour rest period, 1 hr shift earlier"),

  // ── FD06: Lunar Flyby Day (MET ~4/17:15 to ~5/19:30) ───────────────────
  // Anchors: Lunar Close Approach 5/00:29:59, Max Earth Distance 5/00:35,
  //          CM/SM Survey 5/12:30, Sleep: 5/10:00–5/19:30 (9.5 hrs, 1 hr shift later)
  act("DPC", "config", 4, 17, 15, 4, 17, 45, "Daily Planning Conference"),
  act("Meal", "meal", 4, 17, 45, 4, 18, 15),
  act("Pulse Oximetry", "science", 4, 18, 15, 4, 18, 30),
  act("Lunar Observation Prep", "science", 4, 18, 30, 4, 19, 30),
  act("PAO Event", "pao", 4, 19, 30, 4, 20, 30),
  act("Lunar Conference", "config", 4, 20, 30, 4, 21, 0, "Pre-flyby briefing"),
  act("Lunar Configuration", "config", 4, 21, 0, 4, 22, 0),
  act("NatGeo", "science", 4, 22, 0, 4, 22, 30),
  act("Meal", "meal", 4, 22, 30, 4, 23, 0),
  act("Lunar Observation 1", "science", 4, 23, 0, 5, 0, 0, "Approaching Moon"),
  act("Lunar Close Approach Ops", "science", 5, 0, 0, 5, 2, 0, "Closest approach 5/01:23, Max Earth distance 5/01:26"),
  act("Meal", "meal", 5, 1, 30, 5, 2, 0),
  act("Lunar Observation 2", "science", 5, 2, 0, 5, 4, 0, "Departing Moon views"),
  act("Apollo Distance Record", "science", 5, 4, 0, 5, 5, 0, "Exceeding Apollo 13 Earth distance record"),
  act("PAO Event", "pao", 5, 5, 0, 5, 6, 0),
  act("PMC", "config", 5, 6, 0, 5, 6, 30, "Private Medical Conference"),
  act("FD Conference", "config", 5, 6, 30, 5, 7, 0),
  act("Lunar Documentation & Transfer", "science", 5, 7, 0, 5, 8, 0),
  act("Pre-Sleep", "config", 5, 8, 0, 5, 10, 0),

  act("Sleep", "sleep", 5, 10, 0, 5, 19, 30, "9.5-hour rest period, 1 hr shift later"),

  // ── FD07: Return Cruise 1 (MET ~5/19:30 to ~6/16:30) ───────────────────
  // Anchors: Lunar SOI Exit 5/18:53, RTC-1 6/01:29:52, Sleep: 6/08:00–6/16:30 (8.5 hrs)
  act("CM/SM Survey", "science", 5, 12, 30, 5, 13, 0, "Post-flyby Service Module survey (PDF annotation 05/12:30)"),
  act("DPC", "config", 5, 19, 30, 5, 20, 0, "Daily Planning Conference"),
  act("Meal", "meal", 5, 20, 0, 5, 20, 30),
  act("Pulse Oximetry", "science", 5, 20, 30, 5, 21, 0),
  act("Post-Lunar Debrief", "science", 5, 21, 0, 5, 22, 0),
  act("Crew-to-Crew Call", "pao", 5, 22, 0, 5, 22, 30, "C2C"),
  act("Off Duty", "off-duty", 5, 22, 30, 5, 23, 30),
  act("Meal", "meal", 5, 23, 30, 6, 0, 0),
  act("RTC-1 Burn", "maneuver", 6, 4, 23, 6, 4, 33, "Return trajectory correction 1 TIG 06/04:23"),
  act("PFC", "other", 6, 1, 45, 6, 2, 15, "Private Family Conference"),
  act("P/TV Exercise", "exercise", 6, 2, 15, 6, 3, 15),
  act("Off Duty", "off-duty", 6, 3, 15, 6, 5, 0),
  act("PAO Event", "pao", 6, 5, 0, 6, 6, 0),
  act("PMC", "config", 6, 6, 0, 6, 6, 30, "Private Medical Conference"),
  act("FD Conference", "config", 6, 6, 30, 6, 7, 0),
  act("Pre-Sleep", "config", 6, 7, 0, 6, 8, 0),

  act("Sleep", "sleep", 6, 8, 0, 6, 16, 30, "8.5-hour rest period"),

  // ── FD08: Return Cruise 2 (MET ~6/16:30 to ~7/16:30) ───────────────────
  // Anchors: Manual Piloting DFTO 7/01:00–7/02:00, Sleep: 7/08:00–7/16:30 (8.5 hrs)
  act("DPC", "config", 6, 16, 30, 6, 17, 0, "Daily Planning Conference"),
  act("Meal", "meal", 6, 17, 0, 6, 17, 30),
  act("CCU", "config", 6, 17, 30, 6, 18, 0, "Crew Configuration Update"),
  act("P/TV Exercise", "exercise", 6, 18, 0, 6, 19, 0),
  act("RHC Questionnaire", "science", 6, 19, 0, 6, 19, 30, "Rotational Hand Controller"),
  act("NatGeo", "science", 6, 19, 30, 6, 20, 0),
  act("CSA PAO", "pao", 6, 20, 0, 6, 21, 0, "Canadian Space Agency event"),
  act("Cognitive Assessment", "science", 6, 21, 0, 6, 22, 0, "COGN"),
  act("Cabin Repress", "config", 6, 22, 0, 6, 22, 30, "Repress to 14.7 psi"),
  act("Meal", "meal", 6, 22, 30, 6, 23, 30),
  act("Radiation Shelter Demo", "science", 6, 23, 30, 7, 0, 30),
  act("Dock Cam Ops", "science", 7, 0, 30, 7, 1, 0),
  act("Manual Piloting DFTO", "science", 7, 1, 0, 7, 2, 0, "DFTO manual piloting"),
  act("PAO Event", "pao", 7, 2, 0, 7, 3, 0),
  act("PMC", "config", 7, 3, 0, 7, 3, 30, "Private Medical Conference"),
  act("FD Conference", "config", 7, 3, 30, 7, 4, 0),
  act("Pre-Sleep", "config", 7, 4, 0, 7, 8, 0),

  act("Sleep", "sleep", 7, 8, 0, 7, 16, 30, "8.5-hour rest period"),

  // ── FD09: Pre-Entry Day (MET ~7/16:30 to ~8/16:30) ─────────────────────
  // Anchors: RTC-2 8/04:29:10, Sleep: 8/08:00–8/16:30 (8.5 hrs)
  act("DPC", "config", 7, 16, 30, 7, 17, 0, "Daily Planning Conference"),
  act("Meal", "meal", 7, 17, 0, 7, 17, 30),
  act("Pulse Oximetry", "science", 7, 17, 30, 7, 18, 0),
  act("OIG Donning DFTO", "config", 7, 18, 0, 7, 19, 0, "Suit donning operations"),
  act("Entry Study", "config", 7, 19, 0, 7, 20, 0, "Review entry procedures"),
  act("Entry Conference", "config", 7, 20, 0, 7, 21, 0, "Entry briefing"),
  act("PAO Event", "pao", 7, 21, 0, 7, 22, 0),
  act("NatGeo", "science", 7, 22, 0, 7, 22, 30),
  act("Meal", "meal", 7, 22, 30, 7, 23, 30),
  act("PAO Event", "pao", 7, 23, 30, 8, 0, 0),
  act("OIG Donning DFTO", "config", 8, 0, 0, 8, 1, 0, "Suit donning second ops"),
  act("Entry Stow", "config", 8, 1, 0, 8, 3, 0, "Stowing loose items"),
  act("RTC-2 Burn", "maneuver", 8, 4, 33, 8, 4, 43, "Return trajectory correction 2 TIG 08/04:33"),
  act("ONWM System Checkout", "config", 8, 4, 45, 8, 5, 30),
  act("Entry Stow", "config", 8, 5, 30, 8, 7, 0),
  act("PMC", "config", 8, 7, 0, 8, 7, 30, "Private Medical Conference"),
  act("FD Conference", "config", 8, 7, 30, 8, 8, 0),

  act("Sleep", "sleep", 8, 8, 0, 8, 16, 30, "8.5-hour rest period"),

  // ── FD10: Entry & Recovery Day (MET ~8/16:30 to 9/03:00) ───────────────
  // Anchors: RTC-3 8/20:29:10, CM/SM Sep 9/01:09, Entry Interface 9/01:29, Splashdown 9/01:42:48
  act("DPC", "config", 8, 16, 30, 8, 17, 0, "Daily Planning Conference"),
  act("Meal", "meal", 8, 17, 0, 8, 17, 30),
  act("OpNav", "science", 8, 17, 30, 8, 18, 0),
  act("PMC", "config", 8, 18, 0, 8, 18, 30, "Private Medical Conference"),
  act("Cabin Configuration", "config", 8, 18, 30, 8, 20, 0),
  act("RTC-3 Burn", "maneuver", 8, 20, 33, 8, 20, 43, "Return trajectory correction 3 TIG 08/20:33"),
  act("Entry Checklist", "config", 8, 20, 45, 8, 23, 0),
  act("Meal", "meal", 8, 23, 0, 8, 23, 30),
  act("Entry Stow Final", "config", 8, 23, 30, 9, 0, 30),
  act("Entry Prep", "config", 9, 0, 30, 9, 1, 5),
  act("CM/SM Separation", "maneuver", 9, 1, 13, 9, 1, 16, "Service Module jettisoned at 9/01:13"),
  act("Entry Interface", "maneuver", 9, 1, 29, 9, 1, 42, "Skip re-entry at 122 km altitude"),
  act("Splashdown", "maneuver", 9, 1, 46, 9, 1, 47, "Pacific Ocean splashdown 09/01:46"),
  act("Recovery Ops", "other", 9, 1, 43, 9, 3, 0, "Crew recovery operations"),
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
