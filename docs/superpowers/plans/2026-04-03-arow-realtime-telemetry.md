# AROW Real-Time Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate NASA AROW 1-second telemetry (attitude, angular rates, solar array wings, antenna gimbal, ICPS upper stage, spacecraft mode) into the Artemis II tracker dashboard, with public REST/SSE API endpoints and an API documentation page.

**Architecture:** New server-side poller fetches AROW GCS file every 1s, parses numbered parameters into a typed `ArowTelemetry` object, broadcasts via SSE as a new event type on the main telemetry stream. A separate SSE manager with its own poller instance powers a dedicated `/api/arow/stream` endpoint for external consumers, alongside a `/api/arow` REST endpoint. Client hook receives the data and feeds it to the Telemetry panel, which renders four new sections (Attitude, Solar Arrays, Comm Link, ICPS Upper Stage) including a CSS 3D wireframe capsule driven by the quaternion. An unlisted `/api-docs` page documents the public API.

**Tech Stack:** Next.js App Router, TypeScript, CSS 3D transforms, Server-Sent Events

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/types.ts` | Add `ArowTelemetry` type, extend `SsePayload` |
| Modify | `src/lib/constants.ts` | Add `AROW_POLL_INTERVAL_MS` and `AROW_OCTOBER_URL` |
| Create | `__tests__/lib/pollers/arow.test.ts` | Unit tests for AROW parser and DOY timestamp conversion |
| Create | `src/lib/pollers/arow.ts` | AROW poller: fetch, parse, DOY timestamp conversion |
| Modify | `src/app/api/telemetry/stream/route.ts` | Add AROW timer, broadcast `"arow"` events, export `latestArow` and `ensurePollers` |
| Modify | `src/hooks/useTelemetryStream.ts` | Listen for `"arow"` SSE events, expose in state |
| Modify | `src/components/Dashboard.tsx` | Thread `arow` from hook to TelemetryPanel |
| Modify | `src/components/panels/TelemetryPanel.tsx` | Add `arow` prop, Attitude, Solar Arrays, Comm Link, ICPS sections |
| Create | `src/components/AttitudeIndicator.tsx` | CSS 3D wireframe capsule driven by quaternion |
| Create | `src/app/api/arow/route.ts` | REST endpoint returning latest ArowTelemetry JSON |
| Create | `src/app/api/arow/stream/route.ts` | Dedicated SSE endpoint for external AROW consumers |
| Create | `src/app/api-docs/page.tsx` | Unlisted API documentation page (server component) |

---

### Task 1: Add ArowTelemetry Type and Constants

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add ArowTelemetry type to types.ts**

Add this after the `SsePayload` interface (after line 59):

```typescript
export interface ArowTelemetry {
  timestamp: string;
  quaternion: { w: number; x: number; y: number; z: number };
  eulerDeg: { roll: number; pitch: number; yaw: number };
  rollRate: number;
  pitchRate: number;
  yawRate: number;
  antennaGimbal: { az1: number; el1: number; az2: number; el2: number };
  sawAngles: { saw1: number; saw2: number; saw3: number; saw4: number };
  icps: {
    quaternion: { w: number; x: number; y: number; z: number };
    active: boolean;
  };
  spacecraftMode: string;
}
```

- [ ] **Step 2: Add optional arow field to SsePayload**

In the existing `SsePayload` interface, add `arow?: ArowTelemetry;` after the `dsn` field. The `"arow"` event is broadcast separately (like DSN), but adding it to the type documents the relationship. Change:

```typescript
export interface SsePayload {
  telemetry: Telemetry;
  stateVector: StateVector;
  moonPosition: { x: number; y: number; z: number };
  dsn: DsnStatus;
}
```

To:

```typescript
export interface SsePayload {
  telemetry: Telemetry;
  stateVector: StateVector;
  moonPosition: { x: number; y: number; z: number };
  dsn: DsnStatus;
  arow?: ArowTelemetry;
}
```

- [ ] **Step 3: Add AROW constants to constants.ts**

Add these two lines at the end of `src/lib/constants.ts`:

```typescript
export const AROW_POLL_INTERVAL_MS = 1000;
export const AROW_OCTOBER_URL =
  "https://storage.googleapis.com/p-2-cen1/October/1/October_105_1.txt";
```

- [ ] **Step 4: Run existing tests to verify no breakage**

Run: `npm test`
Expected: All existing tests pass — we only added new types/constants.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: add ArowTelemetry type with SAW/ICPS fields and AROW constants"
```

---

### Task 2: AROW Poller — Parser (TDD)

**Files:**
- Create: `__tests__/lib/pollers/arow.test.ts`
- Create: `src/lib/pollers/arow.ts`

- [ ] **Step 1: Write the test file**

Create `__tests__/lib/pollers/arow.test.ts`:

```typescript
// __tests__/lib/pollers/arow.test.ts
import { parseArowResponse, parseDoyTimestamp } from "@/lib/pollers/arow";

const SAMPLE_RESPONSE = {
  File: { Date: "2026/04/03 01:18:58", Activity: "MIS", Type: 4 },
  Parameter_2016: {
    Number: "2016",
    Status: "Good",
    Time: "2026:093:06:18:55.441",
    Type: "3",
    Value: "ec",
  },
  Parameter_2074: {
    Number: "2074",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "0.2207199335098",
  },
  Parameter_2075: {
    Number: "2075",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "-0.2556181252003",
  },
  Parameter_2076: {
    Number: "2076",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "-0.7238367795944",
  },
  Parameter_2077: {
    Number: "2077",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "-0.5877192616463",
  },
  Parameter_2078: {
    Number: "2078",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "1.312229275703",
  },
  Parameter_2079: {
    Number: "2079",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "-0.0322639234364",
  },
  Parameter_2080: {
    Number: "2080",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "-0.2162663340569",
  },
  Parameter_2084: {
    Number: "2084",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "0.2012345678901",
  },
  Parameter_2085: {
    Number: "2085",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "0.3398765432100",
  },
  Parameter_2086: {
    Number: "2086",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "-0.2201234567890",
  },
  Parameter_2087: {
    Number: "2087",
    Status: "Good",
    Time: "2026:093:06:18:54.390",
    Type: "2",
    Value: "-0.6812345678901",
  },
  Parameter_2091: {
    Number: "2091",
    Status: "Good",
    Time: "2026:093:06:18:54.265",
    Type: "2",
    Value: "0.3381006717682",
  },
  Parameter_2092: {
    Number: "2092",
    Status: "Good",
    Time: "2026:093:06:18:54.265",
    Type: "2",
    Value: "0.1230099201202",
  },
  Parameter_2093: {
    Number: "2093",
    Status: "Good",
    Time: "2026:093:06:18:54.265",
    Type: "2",
    Value: "-0.3380193710327",
  },
  Parameter_5002: {
    Number: "5002",
    Status: "Good",
    Time: "2026:093:06:18:55.039",
    Type: "2",
    Value: "19.37174153843",
  },
  Parameter_5003: {
    Number: "5003",
    Status: "Good",
    Time: "2026:093:06:18:55.039",
    Type: "2",
    Value: "7.047949259522",
  },
  Parameter_5004: {
    Number: "5004",
    Status: "Good",
    Time: "2026:093:06:18:55.039",
    Type: "2",
    Value: "-19.36708334942",
  },
  Parameter_5005: {
    Number: "5005",
    Status: "Good",
    Time: "2026:093:06:18:55.039",
    Type: "2",
    Value: "-7.041132730732",
  },
  Parameter_5006: {
    Number: "5006",
    Status: "Good",
    Time: "2026:093:06:18:55.039",
    Type: "2",
    Value: "177.1023456789",
  },
  Parameter_5007: {
    Number: "5007",
    Status: "Good",
    Time: "2026:093:06:18:55.039",
    Type: "2",
    Value: "0.2034567890123",
  },
  Parameter_5008: {
    Number: "5008",
    Status: "Good",
    Time: "2026:093:06:18:55.039",
    Type: "2",
    Value: "177.0987654321",
  },
  Parameter_5009: {
    Number: "5009",
    Status: "Good",
    Time: "2026:093:06:18:55.039",
    Type: "2",
    Value: "166.1012345678",
  },
};

describe("AROW poller", () => {
  describe("parseDoyTimestamp", () => {
    test("converts DOY format to ISO-8601", () => {
      expect(parseDoyTimestamp("2026:093:06:18:55.441")).toBe(
        "2026-04-03T06:18:55.441Z"
      );
    });

    test("handles day 001 (Jan 1)", () => {
      expect(parseDoyTimestamp("2026:001:00:00:00.000")).toBe(
        "2026-01-01T00:00:00.000Z"
      );
    });

    test("handles day 365 (Dec 31)", () => {
      expect(parseDoyTimestamp("2026:365:23:59:59.999")).toBe(
        "2026-12-31T23:59:59.999Z"
      );
    });
  });

  describe("parseArowResponse", () => {
    test("extracts quaternion from confirmed params 2074-2077", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.quaternion.w).toBeCloseTo(0.2207199335098, 6);
      expect(result!.quaternion.x).toBeCloseTo(-0.2556181252003, 6);
      expect(result!.quaternion.y).toBeCloseTo(-0.7238367795944, 6);
      expect(result!.quaternion.z).toBeCloseTo(-0.5877192616463, 6);
    });

    test("extracts euler angles from confirmed params 2078-2080 (rad to deg)", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      // 2078 = craftAttitudePitch = 1.3122 rad = 75.2 deg
      expect(result!.eulerDeg.pitch).toBeCloseTo(75.2, 0);
      // 2079 = craftAttitudeYaw = -0.0323 rad = -1.8 deg
      expect(result!.eulerDeg.yaw).toBeCloseTo(-1.8, 0);
      // 2080 = craftAttitudeRoll = -0.2163 rad = -12.4 deg
      expect(result!.eulerDeg.roll).toBeCloseTo(-12.4, 0);
    });

    test("extracts angular rates from params 2091-2093 (rad/s to deg/s)", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      // 2091 = OrionRollRate = 0.3381 rad/s = 19.37 deg/s
      expect(result!.rollRate).toBeCloseTo(19.37, 0);
      // 2092 = OrionPitchRate = 0.1230 rad/s = 7.05 deg/s
      expect(result!.pitchRate).toBeCloseTo(7.05, 0);
      // 2093 = OrionYawRate = -0.3380 rad/s = -19.37 deg/s
      expect(result!.yawRate).toBeCloseTo(-19.37, 0);
    });

    test("extracts SAW angles from params 5006-5009 (already in degrees)", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.sawAngles.saw1).toBeCloseTo(177.10, 1);
      expect(result!.sawAngles.saw2).toBeCloseTo(0.20, 1);
      expect(result!.sawAngles.saw3).toBeCloseTo(177.10, 1);
      expect(result!.sawAngles.saw4).toBeCloseTo(166.10, 1);
    });

    test("extracts ICPS quaternion from params 2084-2087", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.icps.quaternion.w).toBeCloseTo(0.2012, 3);
      expect(result!.icps.quaternion.x).toBeCloseTo(0.3399, 3);
      expect(result!.icps.quaternion.y).toBeCloseTo(-0.2201, 3);
      expect(result!.icps.quaternion.z).toBeCloseTo(-0.6812, 3);
      expect(result!.icps.active).toBe(true);
    });

    test("sets icps.active to false when ICPS param status is not Good", () => {
      const modified = {
        ...SAMPLE_RESPONSE,
        Parameter_2084: {
          ...SAMPLE_RESPONSE.Parameter_2084,
          Status: "Stale",
        },
      };
      const result = parseArowResponse(modified);
      expect(result).not.toBeNull();
      expect(result!.icps.active).toBe(false);
    });

    test("extracts antenna gimbal angles from params 5002-5005", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.antennaGimbal.az1).toBeCloseTo(19.3717, 2);
      expect(result!.antennaGimbal.el1).toBeCloseTo(7.0479, 2);
      expect(result!.antennaGimbal.az2).toBeCloseTo(-19.3671, 2);
      expect(result!.antennaGimbal.el2).toBeCloseTo(-7.0411, 2);
    });

    test("extracts spacecraft mode and timestamp", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.spacecraftMode).toBe("ec");
      expect(result!.timestamp).toMatch(/^2026-04-03T06:18:\d{2}/);
    });

    test("returns null for empty object", () => {
      expect(parseArowResponse({})).toBeNull();
    });

    test("returns null when required parameters are missing", () => {
      expect(
        parseArowResponse({
          File: { Date: "2026/04/03", Activity: "MIS", Type: 4 },
          Parameter_2016: {
            Number: "2016",
            Status: "Good",
            Time: "2026:093:06:18:55.441",
            Type: "3",
            Value: "ec",
          },
        })
      ).toBeNull();
    });

    test("still parses when ICPS params are missing (icps defaults)", () => {
      const withoutIcps = { ...SAMPLE_RESPONSE };
      delete (withoutIcps as any).Parameter_2084;
      delete (withoutIcps as any).Parameter_2085;
      delete (withoutIcps as any).Parameter_2086;
      delete (withoutIcps as any).Parameter_2087;
      const result = parseArowResponse(withoutIcps);
      expect(result).not.toBeNull();
      expect(result!.icps.active).toBe(false);
      expect(result!.icps.quaternion.w).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- __tests__/lib/pollers/arow.test.ts`
Expected: FAIL — module `@/lib/pollers/arow` does not exist.

- [ ] **Step 3: Implement the AROW poller**

Create `src/lib/pollers/arow.ts`:

```typescript
// src/lib/pollers/arow.ts
import { AROW_OCTOBER_URL } from "../constants";
import type { ArowTelemetry } from "../types";

const RAD2DEG = 180 / Math.PI;

/** Convert AROW DOY timestamp "YYYY:DDD:HH:MM:SS.mmm" to ISO-8601 UTC. */
export function parseDoyTimestamp(doy: string): string {
  const [yearStr, dayStr, rest] = [
    doy.slice(0, 4),
    doy.slice(5, 8),
    doy.slice(9),
  ];
  const year = parseInt(yearStr, 10);
  const dayOfYear = parseInt(dayStr, 10);

  // Jan 1 is day 1 — create Jan 1 then add (day - 1) days
  const date = new Date(Date.UTC(year, 0, 1));
  date.setUTCDate(date.getUTCDate() + dayOfYear - 1);

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}T${rest}Z`;
}

function getParam(data: Record<string, any>, num: string): string | undefined {
  return data[`Parameter_${num}`]?.Value;
}

function getParamFloat(
  data: Record<string, any>,
  num: string
): number | undefined {
  const val = getParam(data, num);
  if (val === undefined) return undefined;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : undefined;
}

function getParamTime(
  data: Record<string, any>,
  num: string
): string | undefined {
  return data[`Parameter_${num}`]?.Time;
}

function getParamStatus(
  data: Record<string, any>,
  num: string
): string | undefined {
  return data[`Parameter_${num}`]?.Status;
}

/** Parse raw AROW JSON response into ArowTelemetry, or null on failure. */
export function parseArowResponse(
  data: Record<string, any>
): ArowTelemetry | null {
  // Confirmed quaternion: craftAttitudeQuatW/X/Y/Z (params 2074-2077)
  const qw = getParamFloat(data, "2074");
  const qx = getParamFloat(data, "2075");
  const qy = getParamFloat(data, "2076");
  const qz = getParamFloat(data, "2077");

  // Confirmed euler angles in radians: craftAttitudePitch/Yaw/Roll (params 2078-2080)
  const pitchRad = getParamFloat(data, "2078");
  const yawRad = getParamFloat(data, "2079");
  const rollRad = getParamFloat(data, "2080");

  // Confirmed angular rates: OrionRollRate/PitchRate/YawRate (params 2091-2093)
  const rollRateRad = getParamFloat(data, "2091");
  const pitchRateRad = getParamFloat(data, "2092");
  const yawRateRad = getParamFloat(data, "2093");

  // Antenna gimbal (params 5002-5005)
  const az1 = getParamFloat(data, "5002");
  const el1 = getParamFloat(data, "5003");
  const az2 = getParamFloat(data, "5004");
  const el2 = getParamFloat(data, "5005");

  // SAW angles — already in degrees (params 5006-5009)
  const saw1 = getParamFloat(data, "5006");
  const saw2 = getParamFloat(data, "5007");
  const saw3 = getParamFloat(data, "5008");
  const saw4 = getParamFloat(data, "5009");

  // ICPS upper stage quaternion (params 2084-2087) — optional
  const icpsQw = getParamFloat(data, "2084") ?? 0;
  const icpsQx = getParamFloat(data, "2085") ?? 0;
  const icpsQy = getParamFloat(data, "2086") ?? 0;
  const icpsQz = getParamFloat(data, "2087") ?? 0;
  const icpsActive = getParamStatus(data, "2084") === "Good";

  // Spacecraft mode (hex status byte)
  const mode = getParam(data, "2016");

  // All core Orion fields must be present (ICPS is optional)
  if (
    qw === undefined || qx === undefined ||
    qy === undefined || qz === undefined ||
    pitchRad === undefined || yawRad === undefined || rollRad === undefined ||
    rollRateRad === undefined || pitchRateRad === undefined || yawRateRad === undefined ||
    az1 === undefined || el1 === undefined ||
    az2 === undefined || el2 === undefined ||
    saw1 === undefined || saw2 === undefined ||
    saw3 === undefined || saw4 === undefined ||
    mode === undefined
  ) {
    return null;
  }

  // Use the quaternion parameter timestamp as the canonical timestamp
  const timeStr = getParamTime(data, "2074");
  const timestamp = timeStr ? parseDoyTimestamp(timeStr) : new Date().toISOString();

  return {
    timestamp,
    quaternion: { w: qw, x: qx, y: qy, z: qz },
    eulerDeg: {
      roll: rollRad * RAD2DEG,
      pitch: pitchRad * RAD2DEG,
      yaw: yawRad * RAD2DEG,
    },
    rollRate: rollRateRad * RAD2DEG,
    pitchRate: pitchRateRad * RAD2DEG,
    yawRate: yawRateRad * RAD2DEG,
    antennaGimbal: { az1, el1, az2, el2 },
    sawAngles: { saw1, saw2, saw3, saw4 },
    icps: {
      quaternion: { w: icpsQw, x: icpsQx, y: icpsQy, z: icpsQz },
      active: icpsActive,
    },
    spacecraftMode: mode,
  };
}

/** Fetch and parse the current AROW telemetry from GCS. */
export async function pollArow(): Promise<ArowTelemetry | null> {
  try {
    const res = await fetch(AROW_OCTOBER_URL);
    const data = await res.json();
    return parseArowResponse(data);
  } catch (error) {
    console.error("AROW poll failed:", error);
    return null;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- __tests__/lib/pollers/arow.test.ts`
Expected: All 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pollers/arow.ts __tests__/lib/pollers/arow.test.ts
git commit -m "feat: add AROW poller with SAW, ICPS, and confirmed parameter mappings"
```

---

### Task 3: SSE Integration — Server-Side AROW Broadcasting

**Files:**
- Modify: `src/app/api/telemetry/stream/route.ts`

- [ ] **Step 1: Add AROW imports, state, and poll function**

In `src/app/api/telemetry/stream/route.ts`, change these existing import lines at the top:

```typescript
import { pollJplHorizons } from "@/lib/pollers/jpl-horizons";
import { pollDsnNow } from "@/lib/pollers/dsn-now";
import { JPL_POLL_INTERVAL_MS, DSN_POLL_INTERVAL_MS } from "@/lib/constants";
import type { SsePayload, DsnStatus } from "@/lib/types";
```

To:

```typescript
import { pollJplHorizons } from "@/lib/pollers/jpl-horizons";
import { pollDsnNow } from "@/lib/pollers/dsn-now";
import { pollArow } from "@/lib/pollers/arow";
import {
  JPL_POLL_INTERVAL_MS,
  DSN_POLL_INTERVAL_MS,
  AROW_POLL_INTERVAL_MS,
} from "@/lib/constants";
import type { SsePayload, DsnStatus, ArowTelemetry } from "@/lib/types";
```

- [ ] **Step 2: Add AROW state variable and timer**

After the existing `let latestDsn: DsnStatus = ...` line, add:

```typescript
let arowTimer: ReturnType<typeof setInterval> | null = null;
/** Latest AROW telemetry — exported so the REST endpoint can read it. */
export let latestArow: ArowTelemetry | null = null;
```

After the existing `pollDsn` function, add:

```typescript
async function pollArowData(): Promise<void> {
  const arow = await pollArow();
  if (!arow) return;
  latestArow = arow;
  sseManager.broadcast("arow", arow);
}
```

- [ ] **Step 3: Start AROW timer in ensurePollers**

In the `ensurePollers` function, after `dsnTimer = setInterval(pollDsn, DSN_POLL_INTERVAL_MS);`, add:

```typescript
  pollArowData();
  arowTimer = setInterval(pollArowData, AROW_POLL_INTERVAL_MS);
```

- [ ] **Step 4: Export ensurePollers so API routes can start polling**

Change the `ensurePollers` function signature from:

```typescript
function ensurePollers(): void {
```

To:

```typescript
export function ensurePollers(): void {
```

This allows `/api/arow` and `/api/arow/stream` to call `ensurePollers()` to guarantee the poller is running before they try to read `latestArow`.

- [ ] **Step 5: Run all tests to verify no breakage**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/telemetry/stream/route.ts
git commit -m "feat: broadcast AROW telemetry as SSE event every 1 second"
```

---

### Task 4: Client Hook — Listen for AROW Events

**Files:**
- Modify: `src/hooks/useTelemetryStream.ts`

- [ ] **Step 1: Add ArowTelemetry import and state**

Change the existing import at the top of `src/hooks/useTelemetryStream.ts`:

```typescript
import type { Telemetry, StateVector, DsnStatus } from "@/lib/types";
```

To:

```typescript
import type { Telemetry, StateVector, DsnStatus, ArowTelemetry } from "@/lib/types";
```

Change the `TelemetryStreamState` interface:

```typescript
interface TelemetryStreamState {
  telemetry: Telemetry | null;
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  dsn: DsnStatus | null;
  connected: boolean;
  /** True while the SSE connection is in the process of reconnecting after an error. */
  reconnecting: boolean;
  /** Wall-clock timestamp (ms) of the last received telemetry event, or null if none yet. */
  lastUpdate: number | null;
}
```

To:

```typescript
interface TelemetryStreamState {
  telemetry: Telemetry | null;
  stateVector: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
  dsn: DsnStatus | null;
  arow: ArowTelemetry | null;
  connected: boolean;
  /** True while the SSE connection is in the process of reconnecting after an error. */
  reconnecting: boolean;
  /** Wall-clock timestamp (ms) of the last received telemetry event, or null if none yet. */
  lastUpdate: number | null;
}
```

Change the `INITIAL_STATE`:

```typescript
const INITIAL_STATE: TelemetryStreamState = {
  telemetry: null,
  stateVector: null,
  moonPosition: null,
  dsn: null,
  connected: false,
  reconnecting: false,
  lastUpdate: null,
};
```

To:

```typescript
const INITIAL_STATE: TelemetryStreamState = {
  telemetry: null,
  stateVector: null,
  moonPosition: null,
  dsn: null,
  arow: null,
  connected: false,
  reconnecting: false,
  lastUpdate: null,
};
```

- [ ] **Step 2: Add AROW event listener**

In the `connect()` function, after the `"dsn"` event listener block and before the `"error"` listener, add:

```typescript
      es.addEventListener("arow", (event: MessageEvent) => {
        if (unmounted) return;
        try {
          const arow: ArowTelemetry = JSON.parse(event.data);
          setState((prev) => ({ ...prev, arow }));
        } catch {
          // malformed payload — ignore
        }
      });
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTelemetryStream.ts
git commit -m "feat: listen for AROW SSE events in telemetry stream hook"
```

---

### Task 5: Dashboard Wiring

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/panels/TelemetryPanel.tsx` (props only)

- [ ] **Step 1: Destructure arow from hook and pass to TelemetryPanel**

In `src/components/Dashboard.tsx`, change:

```typescript
  const {
    telemetry: liveTelemetry,
    stateVector: liveStateVector,
    moonPosition: liveMoonPosition,
    dsn,
    connected,
    reconnecting,
    lastUpdate,
  } = useTelemetryStream();
```

To:

```typescript
  const {
    telemetry: liveTelemetry,
    stateVector: liveStateVector,
    moonPosition: liveMoonPosition,
    dsn,
    arow,
    connected,
    reconnecting,
    lastUpdate,
  } = useTelemetryStream();
```

Then change:

```typescript
        <TelemetryPanel telemetry={telemetry} timeline={timeline} />
```

To:

```typescript
        <TelemetryPanel telemetry={telemetry} timeline={timeline} arow={mode === "LIVE" ? arow : null} />
```

- [ ] **Step 2: Update TelemetryPanel props interface**

In `src/components/panels/TelemetryPanel.tsx`, change:

```typescript
import type { Telemetry } from "@/lib/types";
```

To:

```typescript
import type { Telemetry, ArowTelemetry } from "@/lib/types";
```

Change the props interface:

```typescript
interface TelemetryPanelProps {
  telemetry: Telemetry | null;
  timeline: TimelineState;
}
```

To:

```typescript
interface TelemetryPanelProps {
  telemetry: Telemetry | null;
  timeline: TimelineState;
  arow: ArowTelemetry | null;
}
```

Change the component signature:

```typescript
export function TelemetryPanel({ telemetry, timeline }: TelemetryPanelProps) {
```

To:

```typescript
export function TelemetryPanel({ telemetry, timeline, arow }: TelemetryPanelProps) {
```

(No rendering changes yet — that's Task 7.)

- [ ] **Step 3: Run all tests and verify dev server compiles**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx src/components/panels/TelemetryPanel.tsx
git commit -m "feat: wire AROW data from hook through Dashboard to TelemetryPanel"
```

---

### Task 6: CSS 3D Attitude Indicator Component

**Files:**
- Create: `src/components/AttitudeIndicator.tsx`

- [ ] **Step 1: Create the AttitudeIndicator component**

Create `src/components/AttitudeIndicator.tsx`:

```typescript
"use client";

interface AttitudeIndicatorProps {
  quaternion: { w: number; x: number; y: number; z: number } | null;
}

/** Convert quaternion to a CSS matrix3d string for 3D rotation. */
function quaternionToMatrix3d(q: {
  w: number;
  x: number;
  y: number;
  z: number;
}): string {
  const { w, x, y, z } = q;
  // Rotation matrix from unit quaternion (column-major for CSS)
  const m00 = 1 - 2 * (y * y + z * z);
  const m01 = 2 * (x * y - w * z);
  const m02 = 2 * (x * z + w * y);

  const m10 = 2 * (x * y + w * z);
  const m11 = 1 - 2 * (x * x + z * z);
  const m12 = 2 * (y * z - w * x);

  const m20 = 2 * (x * z - w * y);
  const m21 = 2 * (y * z + w * x);
  const m22 = 1 - 2 * (x * x + y * y);

  // CSS matrix3d is column-major, 4x4
  return `matrix3d(${m00},${m10},${m20},0,${m01},${m11},${m21},0,${m02},${m12},${m22},0,0,0,0,1)`;
}

export function AttitudeIndicator({ quaternion }: AttitudeIndicatorProps) {
  const hasData = quaternion !== null;
  const transform = hasData
    ? quaternionToMatrix3d(quaternion)
    : "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)";

  return (
    <div
      style={{
        width: 80,
        height: 80,
        perspective: 200,
        opacity: hasData ? 1 : 0.3,
        flexShrink: 0,
      }}
      aria-label={
        hasData
          ? `Spacecraft attitude indicator`
          : "Attitude indicator — no data"
      }
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transform,
          transition: "transform 300ms ease-out",
        }}
      >
        {/* Capsule body — cylinder approximated as front/back faces */}
        <div
          style={{
            position: "absolute",
            width: 32,
            height: 48,
            left: 24,
            top: 8,
            background: "var(--accent-cyan)",
            opacity: 0.25,
            border: "1px solid var(--accent-cyan)",
            borderRadius: 4,
            transform: "translateZ(16px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 32,
            height: 48,
            left: 24,
            top: 8,
            background: "var(--accent-cyan)",
            opacity: 0.15,
            border: "1px solid var(--accent-cyan)",
            borderRadius: 4,
            transform: "translateZ(-16px)",
          }}
        />
        {/* Left face */}
        <div
          style={{
            position: "absolute",
            width: 32,
            height: 48,
            left: 24,
            top: 8,
            background: "var(--accent-cyan)",
            opacity: 0.1,
            border: "1px solid var(--accent-cyan)",
            transformOrigin: "left center",
            transform: "rotateY(-90deg)",
          }}
        />
        {/* Right face */}
        <div
          style={{
            position: "absolute",
            width: 32,
            height: 48,
            left: 24,
            top: 8,
            background: "var(--accent-cyan)",
            opacity: 0.1,
            border: "1px solid var(--accent-cyan)",
            transformOrigin: "right center",
            transform: "rotateY(90deg)",
          }}
        />
        {/* Nose cone — triangular top indicator */}
        <div
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            left: 28,
            top: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderBottom: "12px solid var(--accent-cyan)",
            opacity: 0.6,
            transform: "translateZ(16px)",
          }}
        />
        {/* Forward axis line */}
        <div
          style={{
            position: "absolute",
            width: 2,
            height: 20,
            left: 39,
            bottom: 0,
            background: "var(--accent-green)",
            opacity: 0.5,
            transform: "translateZ(16px)",
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests to verify no breakage**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/AttitudeIndicator.tsx
git commit -m "feat: add CSS 3D attitude indicator component"
```

---

### Task 7: Telemetry Panel — Attitude, Solar Arrays, Comm Link, and ICPS Sections

**Files:**
- Modify: `src/components/panels/TelemetryPanel.tsx`

- [ ] **Step 1: Add AttitudeIndicator import**

At the top of `src/components/panels/TelemetryPanel.tsx`, add:

```typescript
import { AttitudeIndicator } from "@/components/AttitudeIndicator";
```

- [ ] **Step 2: Add helper functions**

After the existing `fmtKm` function, add:

```typescript
function fmtDeg(n: number | undefined, decimals = 1): string {
  if (n === undefined || n === null) return "\u2014";
  return n.toFixed(decimals) + "\u00B0";
}

/** Convert quaternion to euler angles (roll, pitch, yaw) in degrees for display. */
function quaternionToEulerDeg(q: { w: number; x: number; y: number; z: number }): {
  roll: number;
  pitch: number;
  yaw: number;
} {
  const { w, x, y, z } = q;
  // Roll (x-axis rotation)
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp) * (180 / Math.PI);
  // Pitch (y-axis rotation)
  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1
    ? (Math.sign(sinp) * 90)
    : Math.asin(sinp) * (180 / Math.PI);
  // Yaw (z-axis rotation)
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp) * (180 / Math.PI);
  return { roll, pitch, yaw };
}
```

Note: `quaternionToEulerDeg` is used only for the ICPS upper stage display. The Orion Euler angles come directly from params 2078-2080 via `arow.eulerDeg`, which the poller already converts from radians to degrees.

- [ ] **Step 3: Add all four new sections to the JSX**

Inside the `<div aria-live="polite" aria-atomic="false">` block, after the Orbit section's closing `TelemRow` for Apoapsis (the last element before `</div>`), add:

```typescript
      <TelemSection label="Attitude" />
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <TelemRow
            label="Roll"
            value={arow ? fmtDeg(arow.eulerDeg.roll) : "\u2014"}
          />
          <TelemRow
            label="Pitch"
            value={arow ? fmtDeg(arow.eulerDeg.pitch) : "\u2014"}
          />
          <TelemRow
            label="Yaw"
            value={arow ? fmtDeg(arow.eulerDeg.yaw) : "\u2014"}
          />
          <TelemRow
            label="Roll Rate"
            value={arow ? fmt(arow.rollRate, 2) : "\u2014"}
            unit="\u00B0/s"
          />
          <TelemRow
            label="Pitch Rate"
            value={arow ? fmt(arow.pitchRate, 2) : "\u2014"}
            unit="\u00B0/s"
          />
          <TelemRow
            label="Yaw Rate"
            value={arow ? fmt(arow.yawRate, 2) : "\u2014"}
            unit="\u00B0/s"
          />
        </div>
        <AttitudeIndicator quaternion={arow?.quaternion ?? null} />
      </div>

      <TelemSection label="Solar Arrays" />
      <TelemRow
        label="SAW 1"
        value={arow ? fmtDeg(arow.sawAngles.saw1) : "\u2014"}
      />
      <TelemRow
        label="SAW 2"
        value={arow ? fmtDeg(arow.sawAngles.saw2) : "\u2014"}
      />
      <TelemRow
        label="SAW 3"
        value={arow ? fmtDeg(arow.sawAngles.saw3) : "\u2014"}
      />
      <TelemRow
        label="SAW 4"
        value={arow ? fmtDeg(arow.sawAngles.saw4) : "\u2014"}
      />

      <TelemSection label="Comm Link" />
      <TelemRow
        label="Ant 1 Az/El"
        value={
          arow
            ? `${fmt(arow.antennaGimbal.az1)}\u00B0 / ${fmt(arow.antennaGimbal.el1)}\u00B0`
            : "\u2014"
        }
      />
      <TelemRow
        label="Ant 2 Az/El"
        value={
          arow
            ? `${fmt(arow.antennaGimbal.az2)}\u00B0 / ${fmt(arow.antennaGimbal.el2)}\u00B0`
            : "\u2014"
        }
      />
      <TelemRow
        label="Mode"
        value={arow ? `0x${arow.spacecraftMode.toUpperCase()}` : "\u2014"}
      />

      <TelemSection label="ICPS Upper Stage" />
      {arow ? (
        <div className="telem-row">
          <span className="telem-label">Status</span>
          <span
            className="telem-value"
            style={{
              color: arow.icps.active ? "var(--accent-green)" : "var(--text-dim)",
              fontWeight: 700,
            }}
          >
            {arow.icps.active ? "ACTIVE" : "LOST"}
          </span>
        </div>
      ) : (
        <TelemRow label="Status" value={"\u2014"} />
      )}
      {arow && arow.icps.active && (() => {
        const e = quaternionToEulerDeg(arow.icps.quaternion);
        return (
          <>
            <TelemRow label="ICPS Roll" value={fmtDeg(e.roll)} />
            <TelemRow label="ICPS Pitch" value={fmtDeg(e.pitch)} />
            <TelemRow label="ICPS Yaw" value={fmtDeg(e.yaw)} />
          </>
        );
      })()}
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/TelemetryPanel.tsx
git commit -m "feat: add Attitude, Solar Arrays, Comm Link, and ICPS sections to Telemetry panel"
```

---

### Task 8: REST API Endpoint — `/api/arow`

**Files:**
- Create: `src/app/api/arow/route.ts`

- [ ] **Step 1: Create the REST endpoint**

Create `src/app/api/arow/route.ts`:

```typescript
// src/app/api/arow/route.ts
import { ensurePollers, latestArow } from "@/app/api/telemetry/stream/route";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensurePollers();

  if (!latestArow) {
    return Response.json(
      { error: "No data available" },
      { status: 503 }
    );
  }

  return Response.json(latestArow);
}
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/arow/route.ts
git commit -m "feat: add REST endpoint GET /api/arow returning latest AROW telemetry"
```

---

### Task 9: Dedicated SSE Endpoint — `/api/arow/stream`

**Files:**
- Create: `src/app/api/arow/stream/route.ts`

- [ ] **Step 1: Create the dedicated AROW SSE endpoint**

Create `src/app/api/arow/stream/route.ts`:

```typescript
// src/app/api/arow/stream/route.ts
import { SseManager } from "@/lib/telemetry/sse-manager";
import { pollArow } from "@/lib/pollers/arow";
import { AROW_POLL_INTERVAL_MS } from "@/lib/constants";
import type { ArowTelemetry } from "@/lib/types";

const arowSseManager = new SseManager();
let arowTimer: ReturnType<typeof setInterval> | null = null;
let latestArow: ArowTelemetry | null = null;
let initialized = false;

async function pollArowData(): Promise<void> {
  const arow = await pollArow();
  if (!arow) return;
  latestArow = arow;
  arowSseManager.broadcast("arow", arow);
}

function ensureArowPoller(): void {
  if (initialized) return;
  initialized = true;
  pollArowData();
  arowTimer = setInterval(pollArowData, AROW_POLL_INTERVAL_MS);
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  ensureArowPoller();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const cleanup = arowSseManager.addClient(controller);

      // Send latest data immediately if available
      if (latestArow) {
        const message = SseManager.encodeEvent("arow", latestArow);
        controller.enqueue(encoder.encode(message));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

Note: This endpoint runs its own `pollArow()` loop independently from the main telemetry stream. This is intentional — the two endpoints are decoupled. External consumers of `/api/arow/stream` get their own dedicated polling cycle without depending on the dashboard's internal stream.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/arow/stream/route.ts
git commit -m "feat: add dedicated SSE endpoint GET /api/arow/stream for external consumers"
```

---

### Task 10: API Documentation Page — `/api-docs`

**Files:**
- Create: `src/app/api-docs/page.tsx`

- [ ] **Step 1: Create the API docs page**

Create `src/app/api-docs/page.tsx`:

```typescript
// src/app/api-docs/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artemis II Real-Time Telemetry API",
  description: "API documentation for the Artemis II real-time telemetry endpoints.",
  robots: "noindex, nofollow",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: "#0a0e14",
        border: "1px solid #1a2332",
        borderRadius: 6,
        padding: "12px 16px",
        overflowX: "auto",
        fontSize: 13,
        lineHeight: 1.5,
        color: "#8bd5ca",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {children}
    </pre>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2
      style={{
        fontSize: 18,
        fontWeight: 700,
        color: "#e0e0e0",
        marginTop: 40,
        marginBottom: 12,
        paddingBottom: 6,
        borderBottom: "1px solid #1a2332",
      }}
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: string }) {
  return (
    <h3
      style={{
        fontSize: 15,
        fontWeight: 600,
        color: "#b0c4de",
        marginTop: 24,
        marginBottom: 8,
      }}
    >
      {children}
    </h3>
  );
}

function Badge({ children, color }: { children: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: color,
        color: "#000",
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 4,
        marginRight: 8,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {children}
    </span>
  );
}

export default function ApiDocsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060a10",
        color: "#c0c8d4",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#e0e0e0",
            marginBottom: 8,
          }}
        >
          Artemis II Real-Time Telemetry API
        </h1>
        <p style={{ fontSize: 14, color: "#7a8a9e", marginBottom: 32 }}>
          Real-time spacecraft telemetry from NASA&apos;s AROW (Artemis Real-time Orbit Website) ground
          control system. Data is sourced from Orion&apos;s onboard sensors at 1-second cadence and
          includes attitude, angular rates, solar array wing positions, antenna gimbal angles, ICPS
          upper stage tracking, and spacecraft mode.
        </p>

        {/* REST Endpoint */}
        <SectionHeading>REST Endpoint</SectionHeading>
        <div style={{ marginBottom: 8 }}>
          <Badge color="#8bd5ca">GET</Badge>
          <code
            style={{
              fontSize: 14,
              color: "#8bd5ca",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          >
            /api/arow
          </code>
        </div>
        <p style={{ fontSize: 13, marginBottom: 12 }}>
          Returns the latest cached telemetry snapshot as JSON. Poll at your own rate (recommend no
          faster than 1 request/second since that matches the upstream cadence).
        </p>

        <SubHeading>Example</SubHeading>
        <CodeBlock>{`curl -s https://artemis.lambnet.ca/api/arow | jq .`}</CodeBlock>

        <SubHeading>Response (200 OK)</SubHeading>
        <CodeBlock>{`{
  "timestamp": "2026-04-03T07:15:03.179Z",
  "quaternion": { "w": 0.221, "x": -0.256, "y": -0.724, "z": -0.588 },
  "eulerDeg": { "roll": -12.4, "pitch": 75.2, "yaw": -1.8 },
  "rollRate": 19.4,
  "pitchRate": 7.0,
  "yawRate": -19.4,
  "antennaGimbal": { "az1": 19.4, "el1": 7.0, "az2": -19.4, "el2": -7.0 },
  "sawAngles": { "saw1": 177.1, "saw2": 0.2, "saw3": 177.1, "saw4": 166.1 },
  "icps": {
    "quaternion": { "w": 0.20, "x": 0.34, "y": -0.22, "z": -0.68 },
    "active": true
  },
  "spacecraftMode": "ec"
}`}</CodeBlock>

        <SubHeading>Error Response (503)</SubHeading>
        <CodeBlock>{`{ "error": "No data available" }`}</CodeBlock>
        <p style={{ fontSize: 13, color: "#7a8a9e", marginTop: 4 }}>
          Returned when the server has not yet received any AROW data (e.g., immediately after startup).
        </p>

        {/* SSE Endpoint */}
        <SectionHeading>SSE Endpoint</SectionHeading>
        <div style={{ marginBottom: 8 }}>
          <Badge color="#8bd5ca">GET</Badge>
          <code
            style={{
              fontSize: 14,
              color: "#8bd5ca",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          >
            /api/arow/stream
          </code>
        </div>
        <p style={{ fontSize: 13, marginBottom: 12 }}>
          Server-Sent Events stream pushing telemetry every second. Each message is an{" "}
          <code style={{ color: "#8bd5ca" }}>event: arow</code> with the same JSON schema as the REST
          endpoint. Keepalive comments sent every 30 seconds.
        </p>

        <SubHeading>Example (JavaScript)</SubHeading>
        <CodeBlock>{`const es = new EventSource("https://artemis.lambnet.ca/api/arow/stream");

es.addEventListener("arow", (event) => {
  const telemetry = JSON.parse(event.data);
  console.log("Roll:", telemetry.eulerDeg.roll.toFixed(1) + "\u00B0");
  console.log("SAW 1:", telemetry.sawAngles.saw1.toFixed(1) + "\u00B0");
  console.log("ICPS active:", telemetry.icps.active);
});

es.addEventListener("error", () => {
  console.log("Connection lost, reconnecting...");
});`}</CodeBlock>

        <SubHeading>Example (curl)</SubHeading>
        <CodeBlock>{`curl -N https://artemis.lambnet.ca/api/arow/stream`}</CodeBlock>

        {/* Field Reference */}
        <SectionHeading>Field Reference</SectionHeading>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #1a2332",
                  color: "#7a8a9e",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "8px 12px" }}>Field</th>
                <th style={{ padding: "8px 12px" }}>Type</th>
                <th style={{ padding: "8px 12px" }}>Unit</th>
                <th style={{ padding: "8px 12px", fontFamily: "'Inter', sans-serif" }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["timestamp", "string", "ISO-8601", "UTC timestamp of the telemetry sample"],
                ["quaternion.w/x/y/z", "number", "\u2014", "Orion attitude quaternion (params 2074\u20132077)"],
                ["eulerDeg.roll", "number", "deg", "Roll angle from param 2080 (rad converted to deg)"],
                ["eulerDeg.pitch", "number", "deg", "Pitch angle from param 2078 (rad converted to deg)"],
                ["eulerDeg.yaw", "number", "deg", "Yaw angle from param 2079 (rad converted to deg)"],
                ["rollRate", "number", "deg/s", "Roll rate from param 2091 OrionRollRate (rad/s to deg/s)"],
                ["pitchRate", "number", "deg/s", "Pitch rate from param 2092 OrionPitchRate (rad/s to deg/s)"],
                ["yawRate", "number", "deg/s", "Yaw rate from param 2093 OrionYawRate (rad/s to deg/s)"],
                ["antennaGimbal.az1/el1", "number", "deg", "Antenna 1 gimbal azimuth/elevation (params 5002/5003)"],
                ["antennaGimbal.az2/el2", "number", "deg", "Antenna 2 gimbal azimuth/elevation (params 5004/5005)"],
                ["sawAngles.saw1\u2013saw4", "number", "deg", "Solar Array Wing angles (params 5006\u20135009)"],
                ["icps.quaternion.w/x/y/z", "number", "\u2014", "ICPS upper stage attitude quaternion (params 2084\u20132087)"],
                ["icps.active", "boolean", "\u2014", "true if ICPS params have Good status (may still be in orbit)"],
                ["spacecraftMode", "string", "\u2014", "Spacecraft mode/status byte in hex (param 2016)"],
              ].map(([field, type, unit, desc], i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #0d1520",
                    color: "#c0c8d4",
                  }}
                >
                  <td style={{ padding: "6px 12px", color: "#8bd5ca" }}>{field}</td>
                  <td style={{ padding: "6px 12px" }}>{type}</td>
                  <td style={{ padding: "6px 12px" }}>{unit}</td>
                  <td
                    style={{
                      padding: "6px 12px",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                    }}
                  >
                    {desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Data Provenance */}
        <SectionHeading>Data Provenance</SectionHeading>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          Telemetry originates from NASA&apos;s Artemis Real-time Orbit Website (AROW) ground control
          system. Parameter numbers were confirmed by reverse-engineering the AROW Unity IL2CPP metadata
          (<code style={{ color: "#8bd5ca" }}>global-metadata.dat</code>), which contains the C#
          <code style={{ color: "#8bd5ca" }}> OnlineParameters</code> class mapping field names to
          parameter numbers. Data is fetched from a Google Cloud Storage bucket at 1-second intervals and
          re-served through this API with no modification beyond unit conversion (radians to degrees for
          Euler angles and angular rates).
        </p>

        {/* Notes */}
        <SectionHeading>Notes</SectionHeading>
        <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
          <li>
            <strong>Rate limiting:</strong> No hard limit, but upstream data updates once per second.
            Polling the REST endpoint faster than 1/s will return the same data.
          </li>
          <li>
            <strong>ICPS tracking:</strong> The ICPS (Interim Cryogenic Propulsion Stage) disposal burn
            was scheduled at MET+5h, but telemetry shows params still updating with &quot;Good&quot; status.
            The <code style={{ color: "#8bd5ca" }}>icps.active</code> field reflects whether the ground
            system is still receiving valid ICPS data.
          </li>
          <li>
            <strong>Availability:</strong> This API is available only while the Artemis II mission is
            active and the upstream AROW data source is online.
          </li>
        </ul>

        <div
          style={{
            marginTop: 48,
            paddingTop: 16,
            borderTop: "1px solid #1a2332",
            fontSize: 11,
            color: "#4a5568",
          }}
        >
          Artemis II Mission Tracker &mdash; Not affiliated with NASA
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run all tests and verify build**

Run: `npm test`
Expected: All tests pass.

Run: `npm run build`
Expected: Build succeeds — the page renders as a static server component.

- [ ] **Step 3: Commit**

```bash
git add src/app/api-docs/page.tsx
git commit -m "feat: add unlisted API documentation page at /api-docs"
```

---

### Task 11: Integration Verification

**Files:** None — manual verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests pass, including the new AROW tests from Task 2.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Manual smoke test — Dashboard**

Run: `npm run dev`

Verify in the browser:
1. The Telemetry panel now has four new sections below "Orbit": Attitude, Solar Arrays, Comm Link, ICPS Upper Stage
2. If live AROW data is available: Roll/Pitch/Yaw show degree values, rates show deg/s values, the CSS capsule rotates, SAW angles display, antenna angles display, Mode shows a hex value, ICPS shows ACTIVE/LOST with attitude rows if active
3. If AROW data is unavailable: all new rows show dashes, the capsule is dimmed/static
4. Switching to SIM mode: AROW sections show dashes (by design — no historical AROW data)
5. Existing telemetry data (velocity, altitude, distances) is unaffected
6. No console errors related to AROW polling

- [ ] **Step 4: Manual smoke test — REST API**

Run:

```bash
curl -s http://localhost:3000/api/arow | jq .
```

Verify: Returns ArowTelemetry JSON with all fields (quaternion, eulerDeg, rollRate, pitchRate, yawRate, antennaGimbal, sawAngles, icps, spacecraftMode) or `{ "error": "No data available" }` with 503.

- [ ] **Step 5: Manual smoke test — SSE API**

Run:

```bash
curl -N http://localhost:3000/api/arow/stream
```

Verify: Receives `event: arow` messages every ~1 second with ArowTelemetry JSON.

- [ ] **Step 6: Manual smoke test — API Docs**

Open `http://localhost:3000/api-docs` in a browser.

Verify: Page renders with dark theme, shows REST and SSE endpoint docs, field reference table, code examples, and data provenance section. No client-side JavaScript required.

- [ ] **Step 7: Final commit if any adjustments were needed**

Only if manual testing revealed issues that needed fixing:

```bash
git add -A
git commit -m "fix: address issues found during AROW integration testing"
```
