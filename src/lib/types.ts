// src/lib/types.ts

export interface StateVector {
  timestamp: string;
  metMs: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

export interface Telemetry {
  metMs: number;
  speedKmS: number;
  speedKmH: number;
  altitudeKm: number;
  earthDistKm: number;
  moonDistKm: number;
  periapsisKm: number;
  apoapsisKm: number;
  gForce: number;
}

export interface DsnDish {
  dish: string;
  station: string;
  stationName: string;
  azimuth: number;
  elevation: number;
  downlinkActive: boolean;
  downlinkRate: number;
  downlinkBand: string;
  uplinkActive: boolean;
  uplinkRate: number;
  uplinkBand: string;
  rangeKm: number;
  rtltSeconds: number;
}

export interface DsnStatus {
  timestamp: string;
  dishes: DsnDish[];
  signalActive: boolean;
}

export interface NsnStatus {
  type: "DTE" | "SR";
  inWindow: boolean;
  estimated: true;
}

export type CommStatus =
  | { source: "DSN"; data: DsnStatus }
  | { source: "NSN"; data: NsnStatus };

export interface SsePayload {
  telemetry: Telemetry;
  stateVector: StateVector;
  moonPosition: { x: number; y: number; z: number };
  dsn: DsnStatus;
  arow?: ArowTelemetry;
}

export interface ArowTelemetry {
  timestamp: string;
  quaternion: { w: number; x: number; y: number; z: number } | null;
  eulerDeg: { roll: number; pitch: number; yaw: number } | null;
  rollRate: number | null;
  pitchRate: number | null;
  yawRate: number | null;
  antennaGimbal: { az1: number; el1: number; az2: number; el2: number } | null;
  sawAngles: { saw1: number; saw2: number; saw3: number; saw4: number } | null;
  icps: {
    quaternion: { w: number; x: number; y: number; z: number };
    active: boolean;
  };
  spacecraftMode: string;
}

export type MissionPhase =
  | "Prelaunch"
  | "LEO"
  | "High Earth Orbit"
  | "Trans-Lunar"
  | "Trans-Earth"
  | "EDL"
  | "Recovery";

export type ActivityType =
  | "sleep"
  | "pao"
  | "science"
  | "maneuver"
  | "config"
  | "exercise"
  | "meal"
  | "off-duty"
  | "other";

export interface TimelineActivity {
  name: string;
  type: ActivityType;
  startMetMs: number;
  endMetMs: number;
  notes?: string;
}

export interface AttitudeBlock {
  mode: string;
  startMetMs: number;
  endMetMs: number;
}

export interface PhaseBlock {
  phase: MissionPhase;
  startMetMs: number;
  endMetMs: number;
}

export interface Milestone {
  name: string;
  description: string;
  metMs: number;
}

export interface TimelineData {
  activities: TimelineActivity[];
  attitudes: AttitudeBlock[];
  phases: PhaseBlock[];
  milestones: Milestone[];
}
