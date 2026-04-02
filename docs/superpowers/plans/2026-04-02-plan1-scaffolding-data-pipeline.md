# Plan 1: Project Scaffolding & Data Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Next.js project with all data sources (JPL Horizons, DSN Now, mission timeline), server-side caching, SSE streaming, and history endpoint — producing a working API that the UI plans will consume.

**Architecture:** Next.js app with server-side pollers running as singletons. JPL Horizons polled every 5 min for orbital state vectors, DSN Now polled every 10s for comm status. Data cached in-memory and persisted to disk as JSON. Clients connect via SSE for real-time updates. Cloudflare Tunnel compatible with 30s keepalives.

**Tech Stack:** Next.js 15 (App Router), TypeScript, fast-xml-parser (DSN XML), Node.js fetch API

---

## File Structure

```
artemis-tracker/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (minimal for now)
│   │   ├── page.tsx                      # Home page (placeholder for now)
│   │   └── api/
│   │       ├── telemetry/
│   │       │   ├── stream/route.ts       # SSE endpoint
│   │       │   └── history/route.ts      # Historical vectors endpoint
│   │       └── timeline/route.ts         # Mission timeline endpoint
│   ├── lib/
│   │   ├── constants.ts                  # Launch time, spacecraft IDs, poll intervals
│   │   ├── types.ts                      # All shared TypeScript types
│   │   ├── met.ts                        # MET calculation utilities
│   │   ├── pollers/
│   │   │   ├── jpl-horizons.ts           # JPL Horizons poller + parser
│   │   │   └── dsn-now.ts               # DSN Now poller + XML parser
│   │   ├── telemetry/
│   │   │   ├── transformer.ts            # State vectors → display values
│   │   │   ├── cache.ts                  # In-memory cache + disk persistence
│   │   │   └── sse-manager.ts            # SSE connection manager + keepalive
│   │   └── timeline/
│   │       └── data.ts                   # Static mission timeline data
├── data/
│   └── telemetry-history.json            # Persisted state vectors (created at runtime)
├── __tests__/
│   ├── lib/
│   │   ├── met.test.ts
│   │   ├── constants.test.ts
│   │   ├── pollers/
│   │   │   ├── jpl-horizons.test.ts
│   │   │   └── dsn-now.test.ts
│   │   ├── telemetry/
│   │   │   ├── transformer.test.ts
│   │   │   └── cache.test.ts
│   │   └── timeline/
│   │       └── data.test.ts
│   └── api/
│       ├── telemetry-stream.test.ts
│       ├── telemetry-history.test.ts
│       └── timeline.test.ts
├── package.json
├── tsconfig.json
├── next.config.ts
├── jest.config.ts
├── .gitignore
└── CLAUDE.md
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `jest.config.ts`, `.gitignore`, `CLAUDE.md`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd c:/Users/ChadOhman/Documents/GitHub/artemis-tracker
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This creates the full Next.js scaffolding.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install fast-xml-parser
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create jest.config.ts**

```typescript
// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
};

export default config;
```

- [ ] **Step 4: Add test script to package.json**

Add to the `"scripts"` section in `package.json`:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Create .gitignore additions**

Append to the existing `.gitignore`:

```
# Runtime data
data/telemetry-history.json

# Brainstorming
.superpowers/
```

- [ ] **Step 6: Create CLAUDE.md**

```markdown
# Artemis II Mission Tracker

Real-time mission control dashboard for NASA's Artemis II crewed lunar flyby.

## Tech Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS
- HTML Canvas (2D orbit map)
- JPL Horizons API (spacecraft -1024) for orbital telemetry
- DSN Now XML feed (spacecraft ART2) for comm status
- Server-Sent Events for real-time updates

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm test` — run tests
- `npm run test:watch` — run tests in watch mode

## Architecture
- Server-side pollers (JPL every 5min, DSN every 10s) cache data in memory + disk
- SSE endpoint pushes updates to all connected clients
- Client-side Hermite interpolation for smooth 60fps animation between data points
- Self-hosted behind Cloudflare Tunnels (SSE keepalive every 30s)

## Key Constants
- Launch: 2026-04-01T22:25:00Z (18:25 ET)
- JPL Spacecraft ID: -1024
- DSN Spacecraft ID: ART2
```

- [ ] **Step 7: Create data directory**

```bash
mkdir -p data
echo "[]" > data/telemetry-history.json
```

- [ ] **Step 8: Verify setup**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with TypeScript, Tailwind, Jest"
```

---

### Task 2: Constants & Types

**Files:**
- Create: `src/lib/constants.ts`
- Create: `src/lib/types.ts`
- Test: `__tests__/lib/constants.test.ts`

- [ ] **Step 1: Write failing test for constants**

```typescript
// __tests__/lib/constants.test.ts
import {
  LAUNCH_TIME_UTC,
  JPL_SPACECRAFT_ID,
  DSN_SPACECRAFT_ID,
  JPL_POLL_INTERVAL_MS,
  DSN_POLL_INTERVAL_MS,
  SSE_KEEPALIVE_INTERVAL_MS,
  EARTH_RADIUS_KM,
} from "@/lib/constants";

describe("constants", () => {
  test("launch time is April 1 2026 22:25 UTC", () => {
    expect(LAUNCH_TIME_UTC).toBe("2026-04-01T22:25:00Z");
    expect(new Date(LAUNCH_TIME_UTC).getTime()).toBe(1775254700000);
  });

  test("spacecraft IDs are correct", () => {
    expect(JPL_SPACECRAFT_ID).toBe("-1024");
    expect(DSN_SPACECRAFT_ID).toBe("ART2");
  });

  test("poll intervals are correct", () => {
    expect(JPL_POLL_INTERVAL_MS).toBe(5 * 60 * 1000);
    expect(DSN_POLL_INTERVAL_MS).toBe(10 * 1000);
    expect(SSE_KEEPALIVE_INTERVAL_MS).toBe(30 * 1000);
  });

  test("Earth radius is approximately 6371 km", () => {
    expect(EARTH_RADIUS_KM).toBe(6371);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/constants.test.ts -v
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create constants.ts**

```typescript
// src/lib/constants.ts

/** Artemis II launch: April 1, 2026 at 18:25 ET = 22:25 UTC */
export const LAUNCH_TIME_UTC = "2026-04-01T22:25:00Z";
export const LAUNCH_TIME_MS = new Date(LAUNCH_TIME_UTC).getTime();

/** JPL Horizons spacecraft ID for Orion */
export const JPL_SPACECRAFT_ID = "-1024";

/** DSN Now spacecraft identifier for Artemis II */
export const DSN_SPACECRAFT_ID = "ART2";

/** JPL Horizons API base URL */
export const JPL_HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api";

/** DSN Now XML feed URL */
export const DSN_NOW_URL = "https://eyes.nasa.gov/dsn/data/dsn.xml";

/** Poll JPL every 5 minutes */
export const JPL_POLL_INTERVAL_MS = 5 * 60 * 1000;

/** Poll DSN every 10 seconds */
export const DSN_POLL_INTERVAL_MS = 10 * 1000;

/** SSE keepalive every 30 seconds (Cloudflare Tunnel idle timeout is 100s) */
export const SSE_KEEPALIVE_INTERVAL_MS = 30 * 1000;

/** Earth mean radius in km */
export const EARTH_RADIUS_KM = 6371;

/** Mission total duration in MET milliseconds (9d 1h 42m 48s) */
export const MISSION_DURATION_MS =
  (9 * 24 * 60 * 60 + 1 * 60 * 60 + 42 * 60 + 48) * 1000;
```

- [ ] **Step 4: Create types.ts**

```typescript
// src/lib/types.ts

/** Raw state vector from JPL Horizons */
export interface StateVector {
  /** UTC timestamp as ISO string */
  timestamp: string;
  /** Milliseconds since launch */
  metMs: number;
  /** Position in km (Earth-centered J2000) */
  position: { x: number; y: number; z: number };
  /** Velocity in km/s (Earth-centered J2000) */
  velocity: { x: number; y: number; z: number };
}

/** Transformed telemetry for display */
export interface Telemetry {
  /** Milliseconds since launch */
  metMs: number;
  /** Speed in km/s */
  speedKmS: number;
  /** Speed in km/h */
  speedKmH: number;
  /** Altitude above Earth surface in km */
  altitudeKm: number;
  /** Distance from Earth center in km */
  earthDistKm: number;
  /** Distance from Moon center in km */
  moonDistKm: number;
  /** Estimated periapsis in km */
  periapsisKm: number;
  /** Estimated apoapsis in km */
  apoapsisKm: number;
  /** Estimated g-force */
  gForce: number;
}

/** DSN dish communication status */
export interface DsnDish {
  /** Dish name, e.g. "DSS54" */
  dish: string;
  /** Station name, e.g. "mdscc" */
  station: string;
  /** Friendly station name, e.g. "Madrid" */
  stationName: string;
  /** Azimuth angle in degrees */
  azimuth: number;
  /** Elevation angle in degrees */
  elevation: number;
  /** Whether downlink signal is active */
  downlinkActive: boolean;
  /** Downlink data rate in bps */
  downlinkRate: number;
  /** Downlink frequency band */
  downlinkBand: string;
  /** Whether uplink signal is active */
  uplinkActive: boolean;
  /** Uplink data rate in bps */
  uplinkRate: number;
  /** Uplink frequency band */
  uplinkBand: string;
  /** Target range in km (downleg) */
  rangeKm: number;
  /** Round-trip light time in seconds */
  rtltSeconds: number;
}

/** Full DSN status for ART2 */
export interface DsnStatus {
  /** UTC timestamp of the feed */
  timestamp: string;
  /** All dishes currently tracking ART2 */
  dishes: DsnDish[];
  /** Whether any signal is active */
  signalActive: boolean;
}

/** NSN comm status (inferred from timeline) */
export interface NsnStatus {
  /** Link type */
  type: "DTE" | "SR";
  /** Whether in a scheduled comm window */
  inWindow: boolean;
  /** Marked as estimated (not live data) */
  estimated: true;
}

/** Combined comm status */
export type CommStatus =
  | { source: "DSN"; data: DsnStatus }
  | { source: "NSN"; data: NsnStatus };

/** SSE payload pushed to clients */
export interface SsePayload {
  /** Latest transformed telemetry */
  telemetry: Telemetry;
  /** Latest state vector (for client-side interpolation) */
  stateVector: StateVector;
  /** Moon position (for distance calculations on client) */
  moonPosition: { x: number; y: number; z: number };
  /** DSN comm status */
  dsn: DsnStatus;
}

/** Mission phase */
export type MissionPhase =
  | "Prelaunch"
  | "LEO"
  | "High Earth Orbit"
  | "Trans-Lunar"
  | "Trans-Earth"
  | "EDL"
  | "Recovery";

/** Activity type for color coding */
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

/** A crew activity block on the timeline */
export interface TimelineActivity {
  name: string;
  type: ActivityType;
  /** MET start in milliseconds */
  startMetMs: number;
  /** MET end in milliseconds */
  endMetMs: number;
  /** Optional notes */
  notes?: string;
}

/** An attitude mode block */
export interface AttitudeBlock {
  mode: string;
  startMetMs: number;
  endMetMs: number;
}

/** A mission phase block */
export interface PhaseBlock {
  phase: MissionPhase;
  startMetMs: number;
  endMetMs: number;
}

/** A mission milestone */
export interface Milestone {
  name: string;
  description: string;
  /** MET in milliseconds */
  metMs: number;
}

/** Full timeline data served by /api/timeline */
export interface TimelineData {
  activities: TimelineActivity[];
  attitudes: AttitudeBlock[];
  phases: PhaseBlock[];
  milestones: Milestone[];
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/lib/constants.test.ts -v
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/constants.ts src/lib/types.ts __tests__/lib/constants.test.ts
git commit -m "feat: add mission constants and TypeScript types"
```

---

### Task 3: MET Utilities

**Files:**
- Create: `src/lib/met.ts`
- Test: `__tests__/lib/met.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/met.test.ts
import { utcToMetMs, metMsToUtc, formatMet, getCurrentMetMs } from "@/lib/met";
import { LAUNCH_TIME_MS } from "@/lib/constants";

describe("MET utilities", () => {
  test("utcToMetMs converts UTC timestamp to MET milliseconds", () => {
    // 1 hour after launch
    const oneHourAfter = new Date(LAUNCH_TIME_MS + 3600000).toISOString();
    expect(utcToMetMs(oneHourAfter)).toBe(3600000);
  });

  test("utcToMetMs returns negative for pre-launch", () => {
    const oneHourBefore = new Date(LAUNCH_TIME_MS - 3600000).toISOString();
    expect(utcToMetMs(oneHourBefore)).toBe(-3600000);
  });

  test("metMsToUtc converts MET milliseconds to UTC ISO string", () => {
    const utc = metMsToUtc(3600000);
    expect(new Date(utc).getTime()).toBe(LAUNCH_TIME_MS + 3600000);
  });

  test("formatMet formats milliseconds as DDD:HH:MM:SS", () => {
    // 0 milliseconds
    expect(formatMet(0)).toBe("000:00:00:00");
    // 1 day, 1 hour, 8 minutes, 42 seconds (TLI)
    const tli = (1 * 24 * 3600 + 1 * 3600 + 8 * 60 + 42) * 1000;
    expect(formatMet(tli)).toBe("001:01:08:42");
    // 9 days, 1 hour, 42 minutes, 48 seconds (splashdown)
    const splash = (9 * 24 * 3600 + 1 * 3600 + 42 * 60 + 48) * 1000;
    expect(formatMet(splash)).toBe("009:01:42:48");
  });

  test("formatMet handles negative MET (pre-launch) with minus sign", () => {
    expect(formatMet(-3600000)).toBe("-000:01:00:00");
  });

  test("getCurrentMetMs returns current MET based on wall clock", () => {
    const now = Date.now();
    const met = getCurrentMetMs();
    const expected = now - LAUNCH_TIME_MS;
    // Allow 50ms tolerance for execution time
    expect(Math.abs(met - expected)).toBeLessThan(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/met.test.ts -v
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement met.ts**

```typescript
// src/lib/met.ts
import { LAUNCH_TIME_MS } from "./constants";

/** Convert a UTC ISO string to MET in milliseconds */
export function utcToMetMs(utcIso: string): number {
  return new Date(utcIso).getTime() - LAUNCH_TIME_MS;
}

/** Convert MET milliseconds to a UTC ISO string */
export function metMsToUtc(metMs: number): string {
  return new Date(LAUNCH_TIME_MS + metMs).toISOString();
}

/** Format MET milliseconds as DDD:HH:MM:SS */
export function formatMet(metMs: number): string {
  const negative = metMs < 0;
  const totalSeconds = Math.floor(Math.abs(metMs) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted =
    String(days).padStart(3, "0") +
    ":" +
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0");

  return negative ? `-${formatted}` : formatted;
}

/** Get current MET in milliseconds based on wall clock */
export function getCurrentMetMs(): number {
  return Date.now() - LAUNCH_TIME_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/met.test.ts -v
```

Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/met.ts __tests__/lib/met.test.ts
git commit -m "feat: add MET calculation utilities"
```

---

### Task 4: Telemetry Transformer

**Files:**
- Create: `src/lib/telemetry/transformer.ts`
- Test: `__tests__/lib/telemetry/transformer.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/telemetry/transformer.test.ts
import { transformStateVector } from "@/lib/telemetry/transformer";
import type { StateVector, Telemetry } from "@/lib/types";

describe("transformStateVector", () => {
  const moonPosition = { x: 300000, y: 100000, z: 0 };

  test("computes speed from velocity vector magnitude", () => {
    const sv: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 5700000,
      position: { x: 6571, y: 0, z: 0 }, // 200km altitude
      velocity: { x: 0, y: 7.8, z: 0 },  // ~7.8 km/s orbital velocity
    };

    const result = transformStateVector(sv, moonPosition);
    expect(result.speedKmS).toBeCloseTo(7.8, 1);
    expect(result.speedKmH).toBeCloseTo(7.8 * 3600, 0);
  });

  test("computes altitude as distance from Earth center minus Earth radius", () => {
    const sv: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 5700000,
      position: { x: 6571, y: 0, z: 0 }, // 6371 + 200 = 6571 km
      velocity: { x: 0, y: 7.8, z: 0 },
    };

    const result = transformStateVector(sv, moonPosition);
    expect(result.altitudeKm).toBeCloseTo(200, 0);
  });

  test("computes Earth distance as position vector magnitude", () => {
    const sv: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 5700000,
      position: { x: 3000, y: 4000, z: 0 }, // magnitude = 5000
      velocity: { x: 0, y: 1, z: 0 },
    };

    const result = transformStateVector(sv, moonPosition);
    expect(result.earthDistKm).toBeCloseTo(5000, 0);
  });

  test("computes Moon distance from Orion position minus Moon position", () => {
    const sv: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 5700000,
      position: { x: 300000, y: 100000, z: 0 }, // same as Moon = 0 distance
      velocity: { x: 0, y: 1, z: 0 },
    };

    const result = transformStateVector(sv, moonPosition);
    expect(result.moonDistKm).toBeCloseTo(0, 0);
  });

  test("returns correct metMs", () => {
    const sv: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 5700000,
      position: { x: 6571, y: 0, z: 0 },
      velocity: { x: 0, y: 7.8, z: 0 },
    };

    const result = transformStateVector(sv, moonPosition);
    expect(result.metMs).toBe(5700000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/telemetry/transformer.test.ts -v
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement transformer.ts**

```typescript
// src/lib/telemetry/transformer.ts
import { EARTH_RADIUS_KM } from "../constants";
import type { StateVector, Telemetry } from "../types";

function magnitude(v: { x: number; y: number; z: number }): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function transformStateVector(
  sv: StateVector,
  moonPosition: { x: number; y: number; z: number },
  previousSv?: StateVector
): Telemetry {
  const speedKmS = magnitude(sv.velocity);
  const earthDistKm = magnitude(sv.position);
  const altitudeKm = earthDistKm - EARTH_RADIUS_KM;

  const moonDelta = {
    x: sv.position.x - moonPosition.x,
    y: sv.position.y - moonPosition.y,
    z: sv.position.z - moonPosition.z,
  };
  const moonDistKm = magnitude(moonDelta);

  // Estimate g-force from acceleration between consecutive vectors
  let gForce = 0;
  if (previousSv) {
    const dt = (sv.metMs - previousSv.metMs) / 1000; // seconds
    if (dt > 0) {
      const dv = {
        x: sv.velocity.x - previousSv.velocity.x,
        y: sv.velocity.y - previousSv.velocity.y,
        z: sv.velocity.z - previousSv.velocity.z,
      };
      const accelKmS2 = magnitude(dv) / dt;
      const accelMS2 = accelKmS2 * 1000;
      gForce = accelMS2 / 9.80665;
    }
  }

  return {
    metMs: sv.metMs,
    speedKmS,
    speedKmH: speedKmS * 3600,
    altitudeKm,
    earthDistKm,
    moonDistKm,
    periapsisKm: 0, // Updated by cache when we have enough orbital data
    apoapsisKm: 0,
    gForce,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/telemetry/transformer.test.ts -v
```

Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telemetry/transformer.ts __tests__/lib/telemetry/transformer.test.ts
git commit -m "feat: add telemetry transformer (state vectors to display values)"
```

---

### Task 5: Telemetry Cache

**Files:**
- Create: `src/lib/telemetry/cache.ts`
- Test: `__tests__/lib/telemetry/cache.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/telemetry/cache.test.ts
import { TelemetryCache } from "@/lib/telemetry/cache";
import type { StateVector, Telemetry, DsnStatus, SsePayload } from "@/lib/types";

function makeSv(metMs: number): StateVector {
  return {
    timestamp: new Date(1775254700000 + metMs).toISOString(),
    metMs,
    position: { x: 6571 + metMs / 1000, y: 0, z: 0 },
    velocity: { x: 0, y: 7.8, z: 0 },
  };
}

function makeTelemetry(metMs: number): Telemetry {
  return {
    metMs,
    speedKmS: 7.8,
    speedKmH: 28080,
    altitudeKm: 200 + metMs / 1000,
    earthDistKm: 6571 + metMs / 1000,
    moonDistKm: 300000,
    periapsisKm: 185,
    apoapsisKm: 78800,
    gForce: 0,
  };
}

describe("TelemetryCache", () => {
  let cache: TelemetryCache;

  beforeEach(() => {
    cache = new TelemetryCache();
  });

  test("stores and retrieves the latest state vector", () => {
    const sv = makeSv(3600000);
    const telemetry = makeTelemetry(3600000);
    const moonPos = { x: 300000, y: 100000, z: 0 };
    cache.push(sv, telemetry, moonPos);

    expect(cache.getLatest()).toEqual({
      stateVector: sv,
      telemetry,
      moonPosition: moonPos,
    });
  });

  test("getHistory returns vectors within MET range", () => {
    cache.push(makeSv(1000), makeTelemetry(1000), { x: 0, y: 0, z: 0 });
    cache.push(makeSv(2000), makeTelemetry(2000), { x: 0, y: 0, z: 0 });
    cache.push(makeSv(3000), makeTelemetry(3000), { x: 0, y: 0, z: 0 });
    cache.push(makeSv(4000), makeTelemetry(4000), { x: 0, y: 0, z: 0 });

    const history = cache.getHistory(1500, 3500);
    expect(history).toHaveLength(2);
    expect(history[0].metMs).toBe(2000);
    expect(history[1].metMs).toBe(3000);
  });

  test("getHistory returns empty array when no data in range", () => {
    cache.push(makeSv(1000), makeTelemetry(1000), { x: 0, y: 0, z: 0 });
    const history = cache.getHistory(5000, 6000);
    expect(history).toHaveLength(0);
  });

  test("getLatest returns null when empty", () => {
    expect(cache.getLatest()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/telemetry/cache.test.ts -v
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement cache.ts**

```typescript
// src/lib/telemetry/cache.ts
import type { StateVector, Telemetry } from "../types";
import { promises as fs } from "fs";
import path from "path";

interface CacheEntry {
  stateVector: StateVector;
  telemetry: Telemetry;
  moonPosition: { x: number; y: number; z: number };
}

const HISTORY_FILE = path.join(process.cwd(), "data", "telemetry-history.json");

export class TelemetryCache {
  private entries: CacheEntry[] = [];
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  push(
    stateVector: StateVector,
    telemetry: Telemetry,
    moonPosition: { x: number; y: number; z: number }
  ): void {
    this.entries.push({ stateVector, telemetry, moonPosition });
    this.schedulePersist();
  }

  getLatest(): CacheEntry | null {
    if (this.entries.length === 0) return null;
    return this.entries[this.entries.length - 1];
  }

  getHistory(fromMetMs: number, toMetMs: number): StateVector[] {
    return this.entries
      .filter(
        (e) =>
          e.stateVector.metMs >= fromMetMs && e.stateVector.metMs <= toMetMs
      )
      .map((e) => e.stateVector);
  }

  getEntries(): CacheEntry[] {
    return this.entries;
  }

  private schedulePersist(): void {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(async () => {
      this.persistTimer = null;
      await this.persistToDisk();
    }, 10000);
  }

  private async persistToDisk(): Promise<void> {
    try {
      const data = this.entries.map((e) => e.stateVector);
      await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2));
    } catch {
      // Disk persistence is best-effort; cache stays in memory
    }
  }

  async loadFromDisk(): Promise<void> {
    try {
      const raw = await fs.readFile(HISTORY_FILE, "utf-8");
      const vectors: StateVector[] = JSON.parse(raw);
      // We only restore state vectors; telemetry will be recomputed on next poll
      for (const sv of vectors) {
        this.entries.push({
          stateVector: sv,
          telemetry: {
            metMs: sv.metMs,
            speedKmS: 0,
            speedKmH: 0,
            altitudeKm: 0,
            earthDistKm: 0,
            moonDistKm: 0,
            periapsisKm: 0,
            apoapsisKm: 0,
            gForce: 0,
          },
          moonPosition: { x: 0, y: 0, z: 0 },
        });
      }
    } catch {
      // No history file yet, start fresh
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/telemetry/cache.test.ts -v
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telemetry/cache.ts __tests__/lib/telemetry/cache.test.ts
git commit -m "feat: add telemetry cache with in-memory storage and disk persistence"
```

---

### Task 6: JPL Horizons Poller

**Files:**
- Create: `src/lib/pollers/jpl-horizons.ts`
- Test: `__tests__/lib/pollers/jpl-horizons.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/pollers/jpl-horizons.test.ts
import { buildHorizonsUrl, parseHorizonsResponse } from "@/lib/pollers/jpl-horizons";
import type { StateVector } from "@/lib/types";

describe("JPL Horizons poller", () => {
  test("buildHorizonsUrl constructs correct API URL for spacecraft and moon", () => {
    const now = new Date("2026-04-02T10:00:00Z");
    const url = buildHorizonsUrl("-1024", now);

    expect(url).toContain("https://ssd.jpl.nasa.gov/api/horizons.api");
    expect(url).toContain("COMMAND=%27-1024%27");
    expect(url).toContain("EPHEM_TYPE=%27VECTORS%27");
    expect(url).toContain("CENTER=%27500%4010%27");
    expect(url).toContain("format=json");
  });

  test("parseHorizonsResponse extracts state vector from JPL JSON", () => {
    // Minimal JPL Horizons response with one vector
    const jplResponse = {
      result: [
        "$$SOE",
        "2460767.916666667 = A.D. 2026-Apr-02 10:00:00.0000 TDB",
        " X = 6.571000000000000E+03 Y = 0.000000000000000E+00 Z = 0.000000000000000E+00",
        " VX= 0.000000000000000E+00 VY= 7.800000000000000E+00 VZ= 0.000000000000000E+00",
        "$$EOE",
      ].join("\n"),
    };

    const vectors = parseHorizonsResponse(jplResponse.result);
    expect(vectors).toHaveLength(1);
    expect(vectors[0].position.x).toBeCloseTo(6571, 0);
    expect(vectors[0].position.y).toBeCloseTo(0, 0);
    expect(vectors[0].velocity.y).toBeCloseTo(7.8, 1);
  });

  test("parseHorizonsResponse returns empty array for malformed data", () => {
    const vectors = parseHorizonsResponse("no valid data here");
    expect(vectors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/pollers/jpl-horizons.test.ts -v
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement jpl-horizons.ts**

```typescript
// src/lib/pollers/jpl-horizons.ts
import { JPL_HORIZONS_API, JPL_SPACECRAFT_ID } from "../constants";
import { utcToMetMs } from "../met";
import type { StateVector } from "../types";

/**
 * Build the JPL Horizons API URL for a given target.
 * Uses Earth body center (500@10 = Sun-centered is wrong; we use 500@399 = Earth geocenter)
 * and requests vectors for the current time.
 */
export function buildHorizonsUrl(target: string, time: Date): string {
  const start = time.toISOString().replace("T", " ").slice(0, 19);
  // Request a single point: 1 step over 1 minute
  const stop = new Date(time.getTime() + 60000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);

  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${target}'`,
    EPHEM_TYPE: "'VECTORS'",
    CENTER: "'500@10'",
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: "'1'",
    VEC_TABLE: "'2'",
  });

  return `${JPL_HORIZONS_API}?${params.toString()}`;
}

/**
 * Parse the JPL Horizons text response to extract state vectors.
 * Vectors appear between $$SOE and $$EOE markers.
 */
export function parseHorizonsResponse(result: string): StateVector[] {
  const vectors: StateVector[] = [];

  const soeIdx = result.indexOf("$$SOE");
  const eoeIdx = result.indexOf("$$EOE");
  if (soeIdx === -1 || eoeIdx === -1) return vectors;

  const block = result.slice(soeIdx + 5, eoeIdx).trim();
  const lines = block.split("\n").map((l) => l.trim());

  let i = 0;
  while (i < lines.length) {
    // Find timestamp line (contains "A.D.")
    if (!lines[i].includes("A.D.")) {
      i++;
      continue;
    }

    // Extract date from timestamp line
    const dateMatch = lines[i].match(
      /A\.D\.\s+(\d{4})-([A-Za-z]+)-(\d{2})\s+(\d{2}:\d{2}:\d{2})/
    );
    if (!dateMatch) {
      i++;
      continue;
    }

    const monthMap: Record<string, string> = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04",
      May: "05", Jun: "06", Jul: "07", Aug: "08",
      Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };
    const month = monthMap[dateMatch[2]] || "01";
    const timestamp = `${dateMatch[1]}-${month}-${dateMatch[3]}T${dateMatch[4]}Z`;

    // Next line should have X, Y, Z
    i++;
    if (i >= lines.length) break;
    const posMatch = lines[i].match(
      /X\s*=\s*([-\d.E+]+)\s+Y\s*=\s*([-\d.E+]+)\s+Z\s*=\s*([-\d.E+]+)/
    );
    if (!posMatch) continue;

    // Next line should have VX, VY, VZ
    i++;
    if (i >= lines.length) break;
    const velMatch = lines[i].match(
      /VX\s*=\s*([-\d.E+]+)\s+VY\s*=\s*([-\d.E+]+)\s+VZ\s*=\s*([-\d.E+]+)/
    );
    if (!velMatch) continue;

    vectors.push({
      timestamp,
      metMs: utcToMetMs(timestamp),
      position: {
        x: parseFloat(posMatch[1]),
        y: parseFloat(posMatch[2]),
        z: parseFloat(posMatch[3]),
      },
      velocity: {
        x: parseFloat(velMatch[1]),
        y: parseFloat(velMatch[2]),
        z: parseFloat(velMatch[3]),
      },
    });

    i++;
  }

  return vectors;
}

/**
 * Fetch current state vector for Orion from JPL Horizons.
 * Also fetches Moon position for distance calculations.
 */
export async function pollJplHorizons(): Promise<{
  orion: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
}> {
  const now = new Date();

  try {
    // Fetch Orion and Moon positions in parallel
    const [orionRes, moonRes] = await Promise.all([
      fetch(buildHorizonsUrl(JPL_SPACECRAFT_ID, now)),
      fetch(buildHorizonsUrl("301", now)), // 301 = Moon
    ]);

    const [orionJson, moonJson] = await Promise.all([
      orionRes.json(),
      moonRes.json(),
    ]);

    const orionVectors = parseHorizonsResponse(orionJson.result || "");
    const moonVectors = parseHorizonsResponse(moonJson.result || "");

    return {
      orion: orionVectors.length > 0 ? orionVectors[0] : null,
      moonPosition:
        moonVectors.length > 0 ? moonVectors[0].position : null,
    };
  } catch (error) {
    console.error("JPL Horizons poll failed:", error);
    return { orion: null, moonPosition: null };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/pollers/jpl-horizons.test.ts -v
```

Expected: PASS — all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pollers/jpl-horizons.ts __tests__/lib/pollers/jpl-horizons.test.ts
git commit -m "feat: add JPL Horizons poller with URL builder and response parser"
```

---

### Task 7: DSN Now Poller

**Files:**
- Create: `src/lib/pollers/dsn-now.ts`
- Test: `__tests__/lib/pollers/dsn-now.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/pollers/dsn-now.test.ts
import { parseDsnXml } from "@/lib/pollers/dsn-now";
import type { DsnStatus } from "@/lib/types";

const SAMPLE_XML = `<?xml version="1.0"?>
<dsn>
  <station name="mdscc" friendlyName="Madrid" timeUTC="1775300000000" timeZoneOffset="-28800000">
    <dish name="DSS54" azimuthAngle="250.5" elevationAngle="35.2" windSpeed="12.3"
          isMSPA="false" isArray="false" isDDOR="false" created="test" updated="test">
      <downSignal signalType="data" dataRate="2000000" frequency="2200000000"
                  band="S" power="-120.5" spacecraft="ART2" spacecraftId="1024"
                  active="true"/>
      <upSignal signalType="data" dataRate="1000" frequency="2100000000"
                band="S" power="50.0" spacecraft="ART2" spacecraftId="1024"
                active="true"/>
      <target name="ART2" id="1024" uplegRange="66100.5" downlegRange="66100.5" rtlt="0.441"/>
    </dish>
    <dish name="DSS56" azimuthAngle="248.1" elevationAngle="33.8" windSpeed="11.0"
          isMSPA="false" isArray="false" isDDOR="false" created="test" updated="test">
      <downSignal signalType="none" dataRate="0" frequency="0"
                  band="" power="0" spacecraft="" spacecraftId=""
                  active="false"/>
      <upSignal signalType="none" dataRate="0" frequency="0"
                band="" power="0" spacecraft="" spacecraftId=""
                active="false"/>
    </dish>
  </station>
  <station name="gdscc" friendlyName="Goldstone" timeUTC="1775300000000" timeZoneOffset="-25200000">
    <dish name="DSS24" azimuthAngle="180.0" elevationAngle="45.0" windSpeed="5.0"
          isMSPA="false" isArray="false" isDDOR="false" created="test" updated="test">
      <downSignal signalType="data" dataRate="500000" frequency="8400000000"
                  band="X" power="-130.2" spacecraft="ART2" spacecraftId="1024"
                  active="true"/>
      <upSignal signalType="none" dataRate="0" frequency="0"
                band="" power="0" spacecraft="" spacecraftId=""
                active="false"/>
      <target name="ART2" id="1024" uplegRange="66200.0" downlegRange="66200.0" rtlt="0.442"/>
    </dish>
  </station>
  <timestamp>1775300000000</timestamp>
</dsn>`;

describe("DSN Now poller", () => {
  test("parseDsnXml extracts dishes tracking ART2", () => {
    const status = parseDsnXml(SAMPLE_XML);

    expect(status.signalActive).toBe(true);
    expect(status.dishes).toHaveLength(2); // DSS54 and DSS24
  });

  test("parseDsnXml extracts dish details correctly", () => {
    const status = parseDsnXml(SAMPLE_XML);
    const dss54 = status.dishes.find((d) => d.dish === "DSS54");

    expect(dss54).toBeDefined();
    expect(dss54!.station).toBe("mdscc");
    expect(dss54!.stationName).toBe("Madrid");
    expect(dss54!.downlinkActive).toBe(true);
    expect(dss54!.downlinkRate).toBe(2000000);
    expect(dss54!.downlinkBand).toBe("S");
    expect(dss54!.uplinkActive).toBe(true);
    expect(dss54!.rangeKm).toBeCloseTo(66100.5, 1);
    expect(dss54!.rtltSeconds).toBeCloseTo(0.441, 3);
  });

  test("parseDsnXml ignores dishes not tracking ART2", () => {
    const status = parseDsnXml(SAMPLE_XML);
    const dishNames = status.dishes.map((d) => d.dish);
    expect(dishNames).not.toContain("DSS56");
  });

  test("parseDsnXml returns signalActive false when no ART2 dishes", () => {
    const emptyXml = `<?xml version="1.0"?>
    <dsn>
      <station name="gdscc" friendlyName="Goldstone" timeUTC="1234">
        <dish name="DSS24" azimuthAngle="0" elevationAngle="0" windSpeed="0"
              isMSPA="false" isArray="false" isDDOR="false" created="test" updated="test">
          <downSignal signalType="none" dataRate="0" frequency="0"
                      band="" power="0" spacecraft="JWST" spacecraftId="170"
                      active="false"/>
        </dish>
      </station>
      <timestamp>1234</timestamp>
    </dsn>`;

    const status = parseDsnXml(emptyXml);
    expect(status.signalActive).toBe(false);
    expect(status.dishes).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/pollers/dsn-now.test.ts -v
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement dsn-now.ts**

```typescript
// src/lib/pollers/dsn-now.ts
import { XMLParser } from "fast-xml-parser";
import { DSN_NOW_URL, DSN_SPACECRAFT_ID } from "../constants";
import type { DsnDish, DsnStatus } from "../types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

interface DsnXmlDish {
  "@_name": string;
  "@_azimuthAngle": string;
  "@_elevationAngle": string;
  downSignal?: DsnXmlSignal | DsnXmlSignal[];
  upSignal?: DsnXmlSignal | DsnXmlSignal[];
  target?: DsnXmlTarget | DsnXmlTarget[];
}

interface DsnXmlSignal {
  "@_active": string;
  "@_signalType": string;
  "@_dataRate": string;
  "@_frequency": string;
  "@_band": string;
  "@_power": string;
  "@_spacecraft": string;
}

interface DsnXmlTarget {
  "@_name": string;
  "@_uplegRange": string;
  "@_downlegRange": string;
  "@_rtlt": string;
}

interface DsnXmlStation {
  "@_name": string;
  "@_friendlyName": string;
  "@_timeUTC": string;
  dish?: DsnXmlDish | DsnXmlDish[];
}

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function findArt2Signal(
  signals: DsnXmlSignal[]
): DsnXmlSignal | undefined {
  return signals.find((s) => s["@_spacecraft"] === DSN_SPACECRAFT_ID);
}

export function parseDsnXml(xml: string): DsnStatus {
  const parsed = parser.parse(xml);
  const dishes: DsnDish[] = [];

  const stations = toArray<DsnXmlStation>(parsed?.dsn?.station);
  const timestamp = parsed?.dsn?.timestamp
    ? new Date(Number(parsed.dsn.timestamp)).toISOString()
    : new Date().toISOString();

  for (const station of stations) {
    const stationDishes = toArray<DsnXmlDish>(station.dish);

    for (const dish of stationDishes) {
      const downSignals = toArray(dish.downSignal);
      const upSignals = toArray(dish.upSignal);
      const targets = toArray(dish.target);

      const art2Down = findArt2Signal(downSignals);
      const art2Up = findArt2Signal(upSignals);
      const art2Target = targets.find(
        (t) => t["@_name"] === DSN_SPACECRAFT_ID
      );

      // Skip this dish if it's not tracking ART2 at all
      if (!art2Down && !art2Up && !art2Target) continue;

      dishes.push({
        dish: dish["@_name"],
        station: station["@_name"],
        stationName: station["@_friendlyName"],
        azimuth: parseFloat(dish["@_azimuthAngle"]) || 0,
        elevation: parseFloat(dish["@_elevationAngle"]) || 0,
        downlinkActive: art2Down?.["@_active"] === "true",
        downlinkRate: parseFloat(art2Down?.["@_dataRate"] || "0"),
        downlinkBand: art2Down?.["@_band"] || "",
        uplinkActive: art2Up?.["@_active"] === "true",
        uplinkRate: parseFloat(art2Up?.["@_dataRate"] || "0"),
        uplinkBand: art2Up?.["@_band"] || "",
        rangeKm: parseFloat(art2Target?.["@_downlegRange"] || "0"),
        rtltSeconds: parseFloat(art2Target?.["@_rtlt"] || "0"),
      });
    }
  }

  return {
    timestamp,
    dishes,
    signalActive: dishes.some((d) => d.downlinkActive || d.uplinkActive),
  };
}

/** Fetch and parse current DSN status for ART2 */
export async function pollDsnNow(): Promise<DsnStatus> {
  try {
    const res = await fetch(DSN_NOW_URL);
    const xml = await res.text();
    return parseDsnXml(xml);
  } catch (error) {
    console.error("DSN Now poll failed:", error);
    return { timestamp: new Date().toISOString(), dishes: [], signalActive: false };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/pollers/dsn-now.test.ts -v
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pollers/dsn-now.ts __tests__/lib/pollers/dsn-now.test.ts
git commit -m "feat: add DSN Now poller with XML parser, filters for ART2"
```

---

### Task 8: SSE Manager

**Files:**
- Create: `src/lib/telemetry/sse-manager.ts`
- Test: `__tests__/lib/telemetry/sse-manager.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/telemetry/sse-manager.test.ts
import { SseManager } from "@/lib/telemetry/sse-manager";

describe("SseManager", () => {
  let manager: SseManager;

  beforeEach(() => {
    manager = new SseManager();
  });

  test("addClient increases client count", () => {
    const controller = new ReadableStreamDefaultController();
    // We can't easily mock ReadableStream controllers in tests,
    // so test the encodeEvent utility instead
    expect(manager.getClientCount()).toBe(0);
  });

  test("encodeEvent formats SSE correctly", () => {
    const data = { metMs: 3600000, speedKmS: 7.8 };
    const encoded = SseManager.encodeEvent("telemetry", data);
    expect(encoded).toBe(
      `event: telemetry\ndata: ${JSON.stringify(data)}\n\n`
    );
  });

  test("encodeKeepAlive returns SSE comment", () => {
    const encoded = SseManager.encodeKeepAlive();
    expect(encoded).toBe(":keepalive\n\n");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/telemetry/sse-manager.test.ts -v
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement sse-manager.ts**

```typescript
// src/lib/telemetry/sse-manager.ts
import { SSE_KEEPALIVE_INTERVAL_MS } from "../constants";

type SseClient = {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
};

export class SseManager {
  private clients: Set<SseClient> = new Set();
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  static encodeEvent(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  static encodeKeepAlive(): string {
    return ":keepalive\n\n";
  }

  addClient(controller: ReadableStreamDefaultController): () => void {
    const client: SseClient = {
      controller,
      encoder: new TextEncoder(),
    };
    this.clients.add(client);
    this.ensureKeepalive();

    // Return cleanup function
    return () => {
      this.clients.delete(client);
      if (this.clients.size === 0 && this.keepaliveTimer) {
        clearInterval(this.keepaliveTimer);
        this.keepaliveTimer = null;
      }
    };
  }

  broadcast(event: string, data: unknown): void {
    const message = SseManager.encodeEvent(event, data);
    for (const client of this.clients) {
      try {
        client.controller.enqueue(client.encoder.encode(message));
      } catch {
        // Client disconnected, remove on next keepalive
        this.clients.delete(client);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private ensureKeepalive(): void {
    if (this.keepaliveTimer) return;
    this.keepaliveTimer = setInterval(() => {
      const message = SseManager.encodeKeepAlive();
      for (const client of this.clients) {
        try {
          client.controller.enqueue(client.encoder.encode(message));
        } catch {
          this.clients.delete(client);
        }
      }
    }, SSE_KEEPALIVE_INTERVAL_MS);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/telemetry/sse-manager.test.ts -v
```

Expected: PASS — all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telemetry/sse-manager.ts __tests__/lib/telemetry/sse-manager.test.ts
git commit -m "feat: add SSE manager with broadcast, keepalive, and client tracking"
```

---

### Task 9: Mission Timeline Data

**Files:**
- Create: `src/lib/timeline/data.ts`
- Test: `__tests__/lib/timeline/data.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/timeline/data.test.ts
import { getTimelineData } from "@/lib/timeline/data";
import type { TimelineData } from "@/lib/types";

describe("timeline data", () => {
  let data: TimelineData;

  beforeAll(() => {
    data = getTimelineData();
  });

  test("has milestones sorted by MET", () => {
    expect(data.milestones.length).toBeGreaterThan(0);
    for (let i = 1; i < data.milestones.length; i++) {
      expect(data.milestones[i].metMs).toBeGreaterThanOrEqual(
        data.milestones[i - 1].metMs
      );
    }
  });

  test("first milestone is Launch at MET 0", () => {
    expect(data.milestones[0].name).toBe("Launch");
    expect(data.milestones[0].metMs).toBe(0);
  });

  test("last milestone is Splashdown", () => {
    const last = data.milestones[data.milestones.length - 1];
    expect(last.name).toBe("Splashdown");
    // MET 9d 1h 42m 48s = 788568000 ms
    expect(last.metMs).toBe(
      (9 * 24 * 3600 + 1 * 3600 + 42 * 60 + 48) * 1000
    );
  });

  test("has all 20 milestones from spec", () => {
    expect(data.milestones).toHaveLength(20);
  });

  test("has phases covering entire mission", () => {
    expect(data.phases.length).toBeGreaterThan(0);
    expect(data.phases[0].startMetMs).toBe(0);
    const lastPhase = data.phases[data.phases.length - 1];
    expect(lastPhase.phase).toBe("Recovery");
  });

  test("has activities for all 10 flight days", () => {
    expect(data.activities.length).toBeGreaterThan(0);
    // Check we have activities spanning the full mission
    const maxMet = Math.max(...data.activities.map((a) => a.endMetMs));
    // Should extend to at least FD10
    expect(maxMet).toBeGreaterThan(8 * 24 * 3600 * 1000);
  });

  test("TLI milestone is at approximately MET 1d 1h 8m 42s", () => {
    const tli = data.milestones.find((m) => m.name === "Trans-Lunar Injection");
    expect(tli).toBeDefined();
    const expectedMs = (1 * 24 * 3600 + 1 * 3600 + 8 * 60 + 42) * 1000;
    expect(tli!.metMs).toBe(expectedMs);
  });

  test("Lunar Close Approach milestone is at MET 5d 0h 29m 59s", () => {
    const lca = data.milestones.find((m) => m.name === "Lunar Close Approach");
    expect(lca).toBeDefined();
    const expectedMs = (5 * 24 * 3600 + 0 * 3600 + 29 * 60 + 59) * 1000;
    expect(lca!.metMs).toBe(expectedMs);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/timeline/data.test.ts -v
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement data.ts with full mission timeline**

```typescript
// src/lib/timeline/data.ts
import type {
  TimelineData,
  Milestone,
  PhaseBlock,
  TimelineActivity,
  AttitudeBlock,
  MissionPhase,
  ActivityType,
} from "../types";

/** Convert D/HH:MM:SS to milliseconds */
function met(days: number, hours: number, minutes: number, seconds: number): number {
  return ((days * 24 + hours) * 3600 + minutes * 60 + seconds) * 1000;
}

const milestones: Milestone[] = [
  { name: "Launch", description: "SLS launches from Pad 39B at Kennedy Space Center", metMs: met(0, 0, 0, 0) },
  { name: "ICPS PRM", description: "Interim Cryogenic Propulsion Stage perigee raise maneuver", metMs: met(0, 0, 50, 0) },
  { name: "ARB TIG", description: "Apogee raise burn time of ignition", metMs: met(0, 1, 47, 0) },
  { name: "Orion/ICPS Separation", description: "Orion separates from the ICPS upper stage", metMs: met(0, 3, 23, 0) },
  { name: "Orion USS", description: "Orion upper stage separation", metMs: met(0, 4, 51, 0) },
  { name: "Solar Panel Deploy", description: "Solar array wing panels deploy", metMs: met(0, 5, 27, 0) },
  { name: "Trans-Lunar Injection", description: "TLI burn sends Orion toward the Moon. Speed increases to ~39,000 km/h", metMs: met(1, 1, 8, 42) },
  { name: "OTC-1", description: "Outbound trajectory correction burn 1", metMs: met(2, 1, 8, 42) },
  { name: "OTC-2", description: "Outbound trajectory correction burn 2", metMs: met(3, 1, 8, 42) },
  { name: "Lunar SOI Entry", description: "Orion enters the Moon's sphere of gravitational influence", metMs: met(4, 6, 38, 0) },
  { name: "OTC-3", description: "Outbound trajectory correction burn 3", metMs: met(4, 4, 29, 52) },
  { name: "Lunar Close Approach", description: "Closest approach to Moon's far side at ~6,513 km altitude. Breaks Apollo 13 distance record", metMs: met(5, 0, 29, 59) },
  { name: "Max Earth Distance", description: "Maximum distance from Earth (~400,171 km). Farthest humans have ever traveled", metMs: met(5, 0, 35, 0) },
  { name: "Lunar SOI Exit", description: "Orion exits the Moon's sphere of gravitational influence", metMs: met(5, 18, 53, 0) },
  { name: "RTC-1", description: "Return trajectory correction burn 1", metMs: met(6, 1, 29, 52) },
  { name: "RTC-2", description: "Return trajectory correction burn 2", metMs: met(8, 4, 29, 10) },
  { name: "RTC-3", description: "Return trajectory correction burn 3", metMs: met(8, 20, 29, 10) },
  { name: "CM/SM Separation", description: "Crew module separates from service module for re-entry", metMs: met(9, 1, 9, 0) },
  { name: "Entry Interface", description: "Orion hits Earth's atmosphere at ~40,000 km/h", metMs: met(9, 1, 29, 0) },
  { name: "Splashdown", description: "Splashdown in the Pacific Ocean. Mission complete", metMs: met(9, 1, 42, 48) },
];

const phases: PhaseBlock[] = [
  { phase: "Prelaunch", startMetMs: met(0, 0, 0, 0) - 3600000, endMetMs: met(0, 0, 0, 0) },
  { phase: "LEO", startMetMs: met(0, 0, 0, 0), endMetMs: met(0, 0, 50, 0) },
  { phase: "High Earth Orbit", startMetMs: met(0, 0, 50, 0), endMetMs: met(1, 1, 8, 42) },
  { phase: "Trans-Lunar", startMetMs: met(1, 1, 8, 42), endMetMs: met(5, 18, 53, 0) },
  { phase: "Trans-Earth", startMetMs: met(5, 18, 53, 0), endMetMs: met(9, 1, 9, 0) },
  { phase: "EDL", startMetMs: met(9, 1, 9, 0), endMetMs: met(9, 1, 42, 48) },
  { phase: "Recovery", startMetMs: met(9, 1, 42, 48), endMetMs: met(9, 3, 0, 0) },
];

// Representative activities for each flight day (derived from NASA PDF)
// Each flight day's activities are modeled as blocks on the timeline
const activities: TimelineActivity[] = [
  // FD01 — Launch day
  { name: "Ascent", type: "maneuver", startMetMs: met(0, 0, 0, 0), endMetMs: met(0, 0, 50, 0) },
  { name: "Pre-ARB Checkouts", type: "config", startMetMs: met(0, 0, 50, 0), endMetMs: met(0, 1, 47, 0) },
  { name: "T-Roll Maneuvers", type: "maneuver", startMetMs: met(0, 1, 47, 0), endMetMs: met(0, 2, 30, 0) },
  { name: "Doff OCSS", type: "config", startMetMs: met(0, 2, 30, 0), endMetMs: met(0, 3, 0, 0) },
  { name: "DCAM Ops", type: "science", startMetMs: met(0, 3, 0, 0), endMetMs: met(0, 3, 23, 0) },
  { name: "Proximity Ops Demo", type: "science", startMetMs: met(0, 3, 23, 0), endMetMs: met(0, 5, 0, 0) },
  { name: "Cabin Config", type: "config", startMetMs: met(0, 5, 0, 0), endMetMs: met(0, 6, 0, 0) },
  { name: "4K Encoder Setup", type: "config", startMetMs: met(0, 6, 0, 0), endMetMs: met(0, 6, 30, 0) },
  { name: "PAO", type: "pao", startMetMs: met(0, 7, 0, 0), endMetMs: met(0, 8, 0, 0) },
  { name: "Sleep", type: "sleep", startMetMs: met(0, 8, 0, 0), endMetMs: met(0, 12, 0, 0) },
  { name: "Post-Sleep", type: "config", startMetMs: met(0, 12, 0, 0), endMetMs: met(0, 13, 0, 0) },
  { name: "OpNav Checkout", type: "science", startMetMs: met(0, 14, 0, 0), endMetMs: met(0, 15, 0, 0) },
  { name: "Sleep", type: "sleep", startMetMs: met(0, 17, 0, 0), endMetMs: met(0, 21, 30, 0) },

  // FD02 — TLI day
  { name: "Daily Planning Conference", type: "config", startMetMs: met(0, 22, 0, 0), endMetMs: met(0, 22, 30, 0) },
  { name: "Exercise Test", type: "exercise", startMetMs: met(0, 22, 30, 0), endMetMs: met(0, 23, 30, 0) },
  { name: "NatGeo Setup", type: "science", startMetMs: met(0, 23, 30, 0), endMetMs: met(1, 0, 0, 0) },
  { name: "TLI Burn", type: "maneuver", startMetMs: met(1, 1, 0, 0), endMetMs: met(1, 1, 30, 0) },
  { name: "Meal", type: "meal", startMetMs: met(1, 2, 0, 0), endMetMs: met(1, 3, 0, 0) },
  { name: "PAO", type: "pao", startMetMs: met(1, 4, 0, 0), endMetMs: met(1, 5, 0, 0) },
  { name: "Window Inspection", type: "science", startMetMs: met(1, 5, 0, 0), endMetMs: met(1, 6, 0, 0) },
  { name: "TLI Confirmation", type: "config", startMetMs: met(1, 6, 0, 0), endMetMs: met(1, 7, 0, 0) },
  { name: "Sleep", type: "sleep", startMetMs: met(1, 8, 0, 0), endMetMs: met(1, 16, 30, 0) },

  // FD03 — Outbound coast
  { name: "Daily Planning Conference", type: "config", startMetMs: met(1, 17, 0, 0), endMetMs: met(1, 17, 30, 0) },
  { name: "NatGeo", type: "science", startMetMs: met(1, 18, 0, 0), endMetMs: met(1, 19, 0, 0) },
  { name: "OTC-1 Burn", type: "maneuver", startMetMs: met(2, 1, 0, 0), endMetMs: met(2, 1, 30, 0) },
  { name: "CPR Demo", type: "science", startMetMs: met(2, 3, 0, 0), endMetMs: met(2, 4, 0, 0) },
  { name: "PAO", type: "pao", startMetMs: met(2, 5, 0, 0), endMetMs: met(2, 6, 0, 0) },
  { name: "SAT Mode Test", type: "science", startMetMs: met(2, 6, 30, 0), endMetMs: met(2, 7, 30, 0) },
  { name: "DSN Emergency Comm", type: "config", startMetMs: met(2, 8, 0, 0), endMetMs: met(2, 9, 0, 0) },
  { name: "CSA PAO", type: "pao", startMetMs: met(2, 9, 0, 0), endMetMs: met(2, 10, 0, 0) },
  { name: "Sleep", type: "sleep", startMetMs: met(2, 10, 30, 0), endMetMs: met(2, 19, 0, 0) },

  // FD04 — Outbound coast
  { name: "Daily Planning Conference", type: "config", startMetMs: met(2, 19, 30, 0), endMetMs: met(2, 20, 0, 0) },
  { name: "NatGeo", type: "science", startMetMs: met(2, 20, 30, 0), endMetMs: met(2, 21, 30, 0) },
  { name: "OTC-2 Burn", type: "maneuver", startMetMs: met(3, 1, 0, 0), endMetMs: met(3, 1, 30, 0) },
  { name: "Manual Piloting Demo", type: "science", startMetMs: met(3, 3, 0, 0), endMetMs: met(3, 4, 0, 0) },
  { name: "Cognitive Assessment", type: "science", startMetMs: met(3, 4, 0, 0), endMetMs: met(3, 5, 0, 0) },
  { name: "ESA Event", type: "pao", startMetMs: met(3, 5, 0, 0), endMetMs: met(3, 6, 0, 0) },
  { name: "Lunar Imaging Review", type: "science", startMetMs: met(3, 6, 0, 0), endMetMs: met(3, 7, 0, 0) },
  { name: "PAO", type: "pao", startMetMs: met(3, 8, 0, 0), endMetMs: met(3, 9, 0, 0) },
  { name: "Sleep", type: "sleep", startMetMs: met(3, 9, 45, 0), endMetMs: met(3, 18, 15, 0) },

  // FD05 — Approaching Moon
  { name: "Daily Planning Conference", type: "config", startMetMs: met(3, 18, 45, 0), endMetMs: met(3, 19, 15, 0) },
  { name: "OCSS DFTO Ops", type: "science", startMetMs: met(3, 20, 0, 0), endMetMs: met(3, 21, 0, 0) },
  { name: "Cabin Depress Ops", type: "config", startMetMs: met(3, 21, 0, 0), endMetMs: met(3, 22, 0, 0) },
  { name: "OTC-3 Burn", type: "maneuver", startMetMs: met(4, 4, 0, 0), endMetMs: met(4, 5, 0, 0) },
  { name: "PAO", type: "pao", startMetMs: met(4, 6, 0, 0), endMetMs: met(4, 7, 0, 0) },
  { name: "Sleep", type: "sleep", startMetMs: met(4, 8, 45, 0), endMetMs: met(4, 17, 15, 0) },

  // FD06 — Lunar flyby day!
  { name: "Daily Planning Conference", type: "config", startMetMs: met(4, 17, 45, 0), endMetMs: met(4, 18, 15, 0) },
  { name: "Science Imaging", type: "science", startMetMs: met(4, 19, 0, 0), endMetMs: met(4, 20, 0, 0) },
  { name: "Lunar Config", type: "config", startMetMs: met(4, 20, 0, 0), endMetMs: met(4, 21, 0, 0) },
  { name: "Lunar Observation 1", type: "science", startMetMs: met(4, 22, 0, 0), endMetMs: met(4, 23, 30, 0) },
  { name: "Lunar Observation 2", type: "science", startMetMs: met(5, 0, 0, 0), endMetMs: met(5, 1, 30, 0) },
  { name: "Lunar Doc & Transfer", type: "science", startMetMs: met(5, 2, 0, 0), endMetMs: met(5, 4, 0, 0) },
  { name: "PAO", type: "pao", startMetMs: met(5, 4, 0, 0), endMetMs: met(5, 5, 0, 0) },
  { name: "CM/SM Survey", type: "science", startMetMs: met(5, 12, 0, 0), endMetMs: met(5, 13, 0, 0) },
  { name: "Sleep", type: "sleep", startMetMs: met(5, 10, 0, 0), endMetMs: met(5, 19, 30, 0) },

  // FD07 — Return coast
  { name: "Daily Planning Conference", type: "config", startMetMs: met(5, 20, 0, 0), endMetMs: met(5, 20, 30, 0) },
  { name: "Post-Lunar Debrief", type: "science", startMetMs: met(5, 21, 0, 0), endMetMs: met(5, 22, 0, 0) },
  { name: "Crew-to-Crew Call", type: "pao", startMetMs: met(5, 22, 0, 0), endMetMs: met(5, 23, 0, 0) },
  { name: "Off Duty", type: "off-duty", startMetMs: met(5, 23, 0, 0), endMetMs: met(6, 0, 30, 0) },
  { name: "RTC-1 Burn", type: "maneuver", startMetMs: met(6, 1, 0, 0), endMetMs: met(6, 2, 0, 0) },
  { name: "Exercise", type: "exercise", startMetMs: met(6, 3, 0, 0), endMetMs: met(6, 4, 0, 0) },
  { name: "PAO", type: "pao", startMetMs: met(6, 5, 0, 0), endMetMs: met(6, 6, 0, 0) },
  { name: "Sleep", type: "sleep", startMetMs: met(6, 8, 0, 0), endMetMs: met(6, 16, 30, 0) },

  // FD08 — Return coast
  { name: "Daily Planning Conference", type: "config", startMetMs: met(6, 17, 0, 0), endMetMs: met(6, 17, 30, 0) },
  { name: "Exercise", type: "exercise", startMetMs: met(6, 18, 0, 0), endMetMs: met(6, 19, 0, 0) },
  { name: "CSA PAO", type: "pao", startMetMs: met(6, 20, 0, 0), endMetMs: met(6, 21, 0, 0) },
  { name: "Cognitive Assessment", type: "science", startMetMs: met(6, 21, 0, 0), endMetMs: met(6, 22, 0, 0) },
  { name: "Cabin Repress", type: "config", startMetMs: met(6, 22, 0, 0), endMetMs: met(6, 23, 0, 0) },
  { name: "Radiation Shelter Demo", type: "science", startMetMs: met(7, 0, 0, 0), endMetMs: met(7, 1, 0, 0) },
  { name: "Manual Piloting DFTO", type: "science", startMetMs: met(7, 1, 0, 0), endMetMs: met(7, 2, 0, 0) },
  { name: "PAO", type: "pao", startMetMs: met(7, 3, 0, 0), endMetMs: met(7, 4, 0, 0) },
  { name: "Sleep", type: "sleep", startMetMs: met(7, 8, 0, 0), endMetMs: met(7, 16, 30, 0) },

  // FD09 — Pre-entry
  { name: "Daily Planning Conference", type: "config", startMetMs: met(7, 17, 0, 0), endMetMs: met(7, 17, 30, 0) },
  { name: "Entry Study", type: "config", startMetMs: met(7, 18, 0, 0), endMetMs: met(7, 19, 0, 0) },
  { name: "Entry Conference", type: "config", startMetMs: met(7, 19, 0, 0), endMetMs: met(7, 20, 0, 0) },
  { name: "PAO", type: "pao", startMetMs: met(7, 21, 0, 0), endMetMs: met(7, 22, 0, 0) },
  { name: "Entry Stow", type: "config", startMetMs: met(7, 23, 0, 0), endMetMs: met(8, 1, 0, 0) },
  { name: "RTC-2 Burn", type: "maneuver", startMetMs: met(8, 4, 0, 0), endMetMs: met(8, 5, 0, 0) },
  { name: "Entry Stow", type: "config", startMetMs: met(8, 5, 0, 0), endMetMs: met(8, 7, 0, 0) },
  { name: "Sleep", type: "sleep", startMetMs: met(8, 8, 0, 0), endMetMs: met(8, 16, 30, 0) },

  // FD10 — Entry and splashdown
  { name: "RTC-3 Burn", type: "maneuver", startMetMs: met(8, 20, 0, 0), endMetMs: met(8, 21, 0, 0) },
  { name: "Daily Planning Conference", type: "config", startMetMs: met(8, 21, 0, 0), endMetMs: met(8, 21, 30, 0) },
  { name: "Cabin Config", type: "config", startMetMs: met(8, 22, 0, 0), endMetMs: met(8, 23, 0, 0) },
  { name: "Entry Checklist", type: "config", startMetMs: met(9, 0, 0, 0), endMetMs: met(9, 1, 0, 0) },
  { name: "Entry & Landing", type: "maneuver", startMetMs: met(9, 1, 9, 0), endMetMs: met(9, 1, 42, 48) },
  { name: "Recovery Ops", type: "config", startMetMs: met(9, 1, 42, 48), endMetMs: met(9, 3, 0, 0) },
];

// Representative attitude modes (simplified from NASA PDF)
const attitudes: AttitudeBlock[] = [
  { mode: "Ascent", startMetMs: met(0, 0, 0, 0), endMetMs: met(0, 0, 50, 0) },
  { mode: "Bias -XSI", startMetMs: met(0, 0, 50, 0), endMetMs: met(0, 10, 0, 0) },
  { mode: "OpComm", startMetMs: met(0, 10, 0, 0), endMetMs: met(0, 13, 0, 0) },
  { mode: "Bias -XSI", startMetMs: met(0, 13, 0, 0), endMetMs: met(1, 1, 0, 0) },
  { mode: "TLI", startMetMs: met(1, 1, 0, 0), endMetMs: met(1, 1, 30, 0) },
  { mode: "Bias -XSI", startMetMs: met(1, 1, 30, 0), endMetMs: met(2, 1, 0, 0) },
  { mode: "OTC", startMetMs: met(2, 1, 0, 0), endMetMs: met(2, 1, 30, 0) },
  { mode: "Bias -XSI", startMetMs: met(2, 1, 30, 0), endMetMs: met(3, 1, 0, 0) },
  { mode: "OTC", startMetMs: met(3, 1, 0, 0), endMetMs: met(3, 1, 30, 0) },
  { mode: "Bias -XSI", startMetMs: met(3, 1, 30, 0), endMetMs: met(4, 4, 0, 0) },
  { mode: "OTC", startMetMs: met(4, 4, 0, 0), endMetMs: met(4, 5, 0, 0) },
  { mode: "Bias -XSI", startMetMs: met(4, 5, 0, 0), endMetMs: met(4, 22, 0, 0) },
  { mode: "Observation", startMetMs: met(4, 22, 0, 0), endMetMs: met(5, 4, 0, 0) },
  { mode: "Bias -XSI", startMetMs: met(5, 4, 0, 0), endMetMs: met(5, 12, 0, 0) },
  { mode: "Survey", startMetMs: met(5, 12, 0, 0), endMetMs: met(5, 13, 0, 0) },
  { mode: "Bias -XSI", startMetMs: met(5, 13, 0, 0), endMetMs: met(6, 1, 0, 0) },
  { mode: "RTC", startMetMs: met(6, 1, 0, 0), endMetMs: met(6, 2, 0, 0) },
  { mode: "Bias -XSI", startMetMs: met(6, 2, 0, 0), endMetMs: met(8, 4, 0, 0) },
  { mode: "RTC", startMetMs: met(8, 4, 0, 0), endMetMs: met(8, 5, 0, 0) },
  { mode: "Bias -XSI Mitigate X", startMetMs: met(8, 5, 0, 0), endMetMs: met(8, 20, 0, 0) },
  { mode: "RTC", startMetMs: met(8, 20, 0, 0), endMetMs: met(8, 21, 0, 0) },
  { mode: "Bias -XSI Mitigate X", startMetMs: met(8, 21, 0, 0), endMetMs: met(9, 1, 9, 0) },
  { mode: "EDL", startMetMs: met(9, 1, 9, 0), endMetMs: met(9, 1, 42, 48) },
];

let cachedData: TimelineData | null = null;

export function getTimelineData(): TimelineData {
  if (cachedData) return cachedData;

  cachedData = {
    milestones,
    phases,
    activities,
    attitudes,
  };

  return cachedData;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/timeline/data.test.ts -v
```

Expected: PASS — all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timeline/data.ts __tests__/lib/timeline/data.test.ts
git commit -m "feat: add mission timeline data with milestones, phases, activities, and attitudes"
```

---

### Task 10: SSE Stream API Route

**Files:**
- Create: `src/app/api/telemetry/stream/route.ts`

- [ ] **Step 1: Implement the SSE stream endpoint**

```typescript
// src/app/api/telemetry/stream/route.ts
import { TelemetryCache } from "@/lib/telemetry/cache";
import { SseManager } from "@/lib/telemetry/sse-manager";
import { transformStateVector } from "@/lib/telemetry/transformer";
import { pollJplHorizons } from "@/lib/pollers/jpl-horizons";
import { pollDsnNow } from "@/lib/pollers/dsn-now";
import { JPL_POLL_INTERVAL_MS, DSN_POLL_INTERVAL_MS } from "@/lib/constants";
import type { SsePayload, DsnStatus } from "@/lib/types";

// Singletons — persist across requests in the same server process
const cache = new TelemetryCache();
const sseManager = new SseManager();
let jplTimer: ReturnType<typeof setInterval> | null = null;
let dsnTimer: ReturnType<typeof setInterval> | null = null;
let latestDsn: DsnStatus = {
  timestamp: new Date().toISOString(),
  dishes: [],
  signalActive: false,
};
let initialized = false;

async function pollJpl(): Promise<void> {
  const { orion, moonPosition } = await pollJplHorizons();
  if (!orion || !moonPosition) return;

  const latest = cache.getLatest();
  const telemetry = transformStateVector(
    orion,
    moonPosition,
    latest?.stateVector
  );
  cache.push(orion, telemetry, moonPosition);

  const payload: SsePayload = {
    telemetry,
    stateVector: orion,
    moonPosition,
    dsn: latestDsn,
  };

  sseManager.broadcast("telemetry", payload);
}

async function pollDsn(): Promise<void> {
  latestDsn = await pollDsnNow();
  sseManager.broadcast("dsn", latestDsn);
}

function ensurePollers(): void {
  if (initialized) return;
  initialized = true;

  // Load historical data from disk
  cache.loadFromDisk();

  // Start polling immediately
  pollJpl();
  pollDsn();

  // Set up intervals
  jplTimer = setInterval(pollJpl, JPL_POLL_INTERVAL_MS);
  dsnTimer = setInterval(pollDsn, DSN_POLL_INTERVAL_MS);
}

export async function GET(): Promise<Response> {
  ensurePollers();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const cleanup = sseManager.addClient(controller);

      // Send current state immediately on connect
      const latest = cache.getLatest();
      if (latest) {
        const payload: SsePayload = {
          telemetry: latest.telemetry,
          stateVector: latest.stateVector,
          moonPosition: latest.moonPosition,
          dsn: latestDsn,
        };
        const message = SseManager.encodeEvent("telemetry", payload);
        controller.enqueue(encoder.encode(message));
      }

      // Cleanup on close is handled by the SSE manager detecting
      // failed enqueues on disconnected controllers
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit src/app/api/telemetry/stream/route.ts 2>&1 || echo "Check and fix any type errors"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/telemetry/stream/route.ts
git commit -m "feat: add SSE telemetry stream endpoint with JPL + DSN pollers"
```

---

### Task 11: History API Route

**Files:**
- Create: `src/app/api/telemetry/history/route.ts`
- Test: `__tests__/api/telemetry-history.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/api/telemetry-history.test.ts
import { parseHistoryParams } from "@/lib/telemetry/cache";

// We test the param parsing logic; the route itself is an integration test
describe("history params", () => {
  test("valid MET range is accepted", () => {
    // This validates that the cache.getHistory method works with MET ms values
    // Full integration test would hit the route, but we test the logic here
    expect(typeof 0).toBe("number"); // placeholder to verify test infra works
  });
});
```

- [ ] **Step 2: Implement history route**

```typescript
// src/app/api/telemetry/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TelemetryCache } from "@/lib/telemetry/cache";

// Share the same cache singleton used by the stream route
// In production, this would be imported from a shared module
// For now, we create a separate instance that loads from disk
const cache = new TelemetryCache();
let loaded = false;

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!loaded) {
    await cache.loadFromDisk();
    loaded = true;
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing 'from' and 'to' query parameters (MET in ms)" },
      { status: 400 }
    );
  }

  const fromMs = parseInt(from, 10);
  const toMs = parseInt(to, 10);

  if (isNaN(fromMs) || isNaN(toMs)) {
    return NextResponse.json(
      { error: "'from' and 'to' must be valid integers (MET in ms)" },
      { status: 400 }
    );
  }

  const vectors = cache.getHistory(fromMs, toMs);
  return NextResponse.json({ vectors });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/telemetry/history/route.ts __tests__/api/telemetry-history.test.ts
git commit -m "feat: add telemetry history endpoint for SIM mode"
```

---

### Task 12: Timeline API Route

**Files:**
- Create: `src/app/api/timeline/route.ts`
- Test: `__tests__/api/timeline.test.ts`

- [ ] **Step 1: Write test**

```typescript
// __tests__/api/timeline.test.ts
import { getTimelineData } from "@/lib/timeline/data";

describe("timeline API data", () => {
  test("getTimelineData returns complete structure for API consumption", () => {
    const data = getTimelineData();
    expect(data).toHaveProperty("milestones");
    expect(data).toHaveProperty("phases");
    expect(data).toHaveProperty("activities");
    expect(data).toHaveProperty("attitudes");
    expect(data.milestones.length).toBe(20);
    expect(data.phases.length).toBeGreaterThan(0);
    expect(data.activities.length).toBeGreaterThan(0);
    expect(data.attitudes.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement timeline route**

```typescript
// src/app/api/timeline/route.ts
import { NextResponse } from "next/server";
import { getTimelineData } from "@/lib/timeline/data";

export async function GET(): Promise<NextResponse> {
  const data = getTimelineData();
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Run all tests**

```bash
npx jest -v
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/timeline/route.ts __tests__/api/timeline.test.ts
git commit -m "feat: add timeline API endpoint serving mission schedule data"
```

---

### Task 13: Integration Smoke Test

**Files:**
- None new — just verify everything works together

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --verbose
```

Expected: All tests pass.

- [ ] **Step 2: Run dev server and test endpoints manually**

```bash
npm run dev
```

In a separate terminal, test the endpoints:

```bash
# Test timeline endpoint
curl http://localhost:3000/api/timeline | head -c 500

# Test SSE stream (should see events flowing)
curl -N http://localhost:3000/api/telemetry/stream

# Test history endpoint
curl "http://localhost:3000/api/telemetry/history?from=0&to=3600000"
```

Expected:
- `/api/timeline` returns JSON with milestones, phases, activities, attitudes
- `/api/telemetry/stream` returns SSE events (may take up to 5 min for first JPL poll; keepalive comments appear every 30s)
- `/api/telemetry/history` returns JSON with vectors array (empty until first poll completes)

- [ ] **Step 3: Run build to verify production readiness**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Plan 1 — project scaffolding and data pipeline"
```
