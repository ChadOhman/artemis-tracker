# AROW Real-Time Telemetry Integration

## Overview

Integrate NASA's AROW (Artemis Real-time Orbit Website) data source to bring 1-second real-time spacecraft telemetry into the Artemis II tracker. This adds attitude orientation, angular rates, antenna pointing, ICPS upper stage tracking, solar array wing status, and spacecraft mode data — displayed in the existing Telemetry panel with a CSS 3D wireframe attitude indicator.

## Data Source

**URL:** `https://storage.googleapis.com/p-2-cen1/October/1/October_105_1.txt`
**Format:** JSON with numbered parameters, each containing Number, Status, Time, Type, and Value fields.
**Poll interval:** 1 second (matching AROW's own cadence)
**Activity field:** `"MIS"` indicates live mission data

### Parameter Mapping

Confirmed via reverse-engineering the AROW Unity IL2CPP metadata (`global-metadata.dat`).
The C# class `OnlineParameters` defines fields that map to these parameter numbers.

#### Orion Attitude (confirmed)

| Parameter | Field (from C# source) | Type | Unit | Description |
|-----------|------------------------|------|------|-------------|
| **2074** | **craftAttitudeQuatW** | float | — | Attitude quaternion W (norm=0.991, confirmed unit quat) |
| **2075** | **craftAttitudeQuatX** | float | — | Attitude quaternion X |
| **2076** | **craftAttitudeQuatY** | float | — | Attitude quaternion Y |
| **2077** | **craftAttitudeQuatZ** | float | — | Attitude quaternion Z |
| **2078** | **craftAttitudePitch** | float | rad | Pitch angle (1.312 rad = 75.2°) |
| **2079** | **craftAttitudeYaw** | float | rad | Yaw angle (-0.032 rad = -1.9°) |
| **2080** | **craftAttitudeRoll** | float | rad | Roll angle (-0.216 rad = -12.4°) |

#### Orion Angular Rates (confirmed)

| Parameter | Field (from C# source) | Type | Unit | Description |
|-----------|------------------------|------|------|-------------|
| **2091** | **OrionRollRate** | float | rad/s | Roll rate |
| **2092** | **OrionPitchRate** | float | rad/s | Pitch rate |
| **2093** | **OrionYawRate** | float | rad/s | Yaw rate |

#### ICPS Upper Stage (actively updating — still in flight!)

ICPS disposal burn was scheduled at MET+5h (April 2 ~03:35 UTC) for Pacific splashdown, but telemetry shows params still updating with "Good" status and current timestamps as of April 3. Values are actively changing between fetches, indicating ICPS may still be in orbit.

| Parameter | Field (from C# source) | Type | Unit | Description |
|-----------|------------------------|------|------|-------------|
| 2081 | ICPSXPos | float | unknown | ICPS position component |
| 2082 | ICPSYPos | float | unknown | ICPS position component |
| 2083 | ICPSZPos | float | unknown | ICPS position component |
| 2084 | ICPSAttitudeQuatW | float | — | ICPS attitude quaternion W |
| 2085 | ICPSAttitudeQuatX | float | — | ICPS attitude quaternion X |
| 2086 | ICPSAttitudeQuatY | float | — | ICPS attitude quaternion Y |
| 2087 | ICPSAttitudeQuatZ | float | — | ICPS attitude quaternion Z |

#### Solar Array Wings (confirmed via cross-reference)

Params 2095-2098 (radians) match params 5006-5009 (degrees) exactly. These are Solar Array Wing deployment/tracking angles, NOT antenna boresight as originally assumed.

| Parameter | Type | Unit | Description | Sample Value |
|-----------|------|------|-------------|-------------|
| 5006 | float | deg | SAW 1 angle | 177.1° (nearly fully deployed) |
| 5007 | float | deg | SAW 2 angle | 0.2° (near zero — different axis) |
| 5008 | float | deg | SAW 3 angle | 177.1° (nearly fully deployed) |
| 5009 | float | deg | SAW 4 angle | 166.1° (partially deployed) |

#### Antenna & Status

| Parameter | Field | Type | Unit | Description |
|-----------|-------|------|------|-------------|
| 2016 | (status byte) | hex | — | Spacecraft mode/status flag |
| 5002 | antennaGimbal.az1 | float | deg | Antenna 1 gimbal azimuth |
| 5003 | antennaGimbal.el1 | float | deg | Antenna 1 gimbal elevation |
| 5004 | antennaGimbal.az2 | float | deg | Antenna 2 gimbal azimuth |
| 5005 | antennaGimbal.el2 | float | deg | Antenna 2 gimbal elevation |

#### Not Used

| Parameter | Reason |
|-----------|--------|
| 2048-2053 | `craftXPos/Y/Z`, `craftXVel/Y/Z` — unit and reference frame unknown (values ~0.1-3.8, don't match JPL km-based coordinates). JPL Horizons remains the position source. |
| 2054-2073 | Redundant nav solutions / additional attitude frames — unclear mapping |
| 2088-2090, 2094, 2099 | ICPS velocity (partial), status bytes — low value |
| 5010-5013 | Timestamps — could derive signal delay in future version |

### Time Format

Parameter timestamps use day-of-year format: `YYYY:DDD:HH:MM:SS.mmm` (e.g., `2026:093:06:18:55.441` = April 3, 2026 at 06:18:55.441 UTC).

## Architecture

### New Type: ArowTelemetry

```typescript
interface ArowTelemetry {
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
    active: boolean;  // true if params have "Good" status and recent timestamps
  };
  spacecraftMode: string;
}
```

### New Poller: `src/lib/pollers/arow.ts`

- Fetches the October file URL every 1 second
- Parses JSON, extracts mapped parameters into `ArowTelemetry`
- Uses confirmed Euler angles directly from params 2078-2080 (radians→degrees)
- Uses confirmed angular rates from params 2091-2093 (OrionRollRate/PitchRate/YawRate)
- Extracts ICPS attitude quaternion from params 2084-2087
- Extracts SAW angles from params 5006-5009 (already in degrees)
- Converts DOY timestamp to ISO-8601
- Returns `ArowTelemetry | null` (null on fetch failure)
- No disk caching — data is ephemeral at 1s cadence

### SSE Integration

In `src/app/api/telemetry/stream/route.ts`:
- New `arowTimer` at 1-second interval alongside existing JPL (5min) and DSN (10s) timers
- Broadcasts `"arow"` event type with `ArowTelemetry` payload
- Initialized in `ensurePollers()` same as other timers
- Timer cleared on cleanup

### Client Hook Extension

In `src/hooks/useTelemetryStream.ts`:
- Add `arow: ArowTelemetry | null` to hook state
- Add `"arow"` event listener on the EventSource
- Expose `arow` in the return object

### SsePayload Extension

Add optional `arow?: ArowTelemetry` field to the `SsePayload` type. The `"arow"` event is broadcast separately (like DSN), not bundled with the telemetry event.

## UI Design

### Telemetry Panel Additions

Three new sections appended below the existing "Orbit" section in `TelemetryPanel.tsx`:

#### "Attitude" Section

Layout: section header, then a flex row with the wireframe on the right and data rows on the left.

**CSS 3D Wireframe (~80x80px):**
- Simple cone-capsule shape built from CSS `div` elements with `transform-style: preserve-3d`
- Driven by the quaternion via `transform: matrix3d(...)` — quaternion-to-rotation-matrix conversion
- Updates every second when new AROW data arrives
- Subtle CSS transition (200-300ms) for smooth rotation between updates
- Falls back to a static "no data" state when `arow` is null

**Data rows (standard TelemRow components):**
- Roll: Euler roll in degrees from param 2080 (1 decimal)
- Pitch: Euler pitch in degrees from param 2078 (1 decimal)
- Yaw: Euler yaw in degrees from param 2079 (1 decimal)
- Roll Rate: from param 2091 OrionRollRate, deg/s (2 decimals)
- Pitch Rate: from param 2092 OrionPitchRate, deg/s (2 decimals)
- Yaw Rate: from param 2093 OrionYawRate, deg/s (2 decimals)

#### "Solar Arrays" Section

**Data rows:**
- SAW 1: angle in degrees (param 5006)
- SAW 2: angle in degrees (param 5007)
- SAW 3: angle in degrees (param 5008)
- SAW 4: angle in degrees (param 5009)

#### "Comm Link" Section

**Data rows:**
- Ant 1 Az/El: gimbal angles in degrees (params 5002/5003)
- Ant 2 Az/El: gimbal angles in degrees (params 5004/5005)
- Mode: spacecraft mode byte — displayed as hex value (e.g., `0xEC`)

#### "ICPS Upper Stage" Section

Show ICPS tracking status — this is noteworthy because ICPS was scheduled for disposal but appears to still be in flight.

**Data rows:**
- Status: "ACTIVE" (green) if ICPS params have Good status, "LOST" (dim) otherwise
- Attitude: quaternion displayed as roll/pitch/yaw (computed from params 2084-2087)

### Component Structure

New component: `src/components/AttitudeIndicator.tsx`
- Receives `quaternion: { w, x, y, z } | null`
- Renders the CSS 3D wireframe capsule
- Pure presentational, no data fetching
- Handles null state gracefully (dim/static wireframe)

The TelemetryPanel receives `arow: ArowTelemetry | null` as a new prop, threaded from Dashboard.

### Dashboard Wiring

In `src/components/Dashboard.tsx`:
- Destructure `arow` from `useTelemetryStream()`
- Pass `arow` to `TelemetryPanel` as a prop
- AROW data is live-mode only (not available in SIM mode — no historical AROW data)

## Constants

Add to `src/lib/constants.ts`:
```
AROW_POLL_INTERVAL_MS = 1000
AROW_OCTOBER_URL = "https://storage.googleapis.com/p-2-cen1/October/1/October_105_1.txt"
```

## Public API

### REST Endpoint: `GET /api/arow`

Returns the latest cached `ArowTelemetry` JSON snapshot. Consumers poll at their own rate.

**Response format:**
```json
{
  "timestamp": "2026-04-03T07:15:03.179Z",
  "quaternion": { "w": 0.221, "x": -0.256, "y": -0.724, "z": -0.588 },
  "eulerDeg": { "roll": -12.4, "pitch": 75.2, "yaw": -1.8 },
  "rollRate": 19.4,
  "pitchRate": 7.0,
  "yawRate": -19.4,
  "antennaGimbal": { "az1": 19.4, "el1": 7.0, "az2": -19.4, "el2": -7.0 },
  "sawAngles": { "saw1": 177.1, "saw2": 0.2, "saw3": 177.1, "saw4": 166.1 },
  "icps": { "quaternion": { "w": 0.20, "x": 0.34, "y": -0.22, "z": -0.68 }, "active": true },
  "spacecraftMode": "ec"
}
```

Returns `{ "error": "No data available" }` with 503 status if no AROW data has been received yet.

**Implementation:** Server-side route handler reads from the same `latestArow` in-memory variable that the SSE broadcaster uses. No additional caching or polling needed.

### SSE Endpoint: `GET /api/arow/stream`

Pushes `ArowTelemetry` JSON every second via Server-Sent Events. Same format as REST but delivered as `event: arow` SSE messages.

**Implementation:** Creates a new ReadableStream, registers the client with a dedicated `ArowSseManager` (separate from the main telemetry SSE manager), sends keepalives every 30s. Uses the same `pollArowData()` broadcast that feeds the dashboard.

Note: This is a SEPARATE SSE endpoint from `/api/telemetry/stream` — the main telemetry stream bundles all data (JPL + DSN + AROW) for the dashboard, while `/api/arow/stream` serves only AROW data for external consumers.

### API Documentation Page: `/api-docs`

Unlisted page (no links from the main dashboard) that can be shared privately.

**Content:**
- Title: "Artemis II Real-Time Telemetry API"
- Brief intro explaining the data source (AROW/GCS, 1s cadence)
- REST endpoint docs with URL, response schema, example `curl` command
- SSE endpoint docs with URL, event format, example JavaScript `EventSource` code
- Field descriptions table (what each field means, units)
- Note about data provenance (NASA AROW, parameter mappings confirmed from IL2CPP metadata)
- Rate limiting note: no hard limit, but recommend polling REST no faster than 1/s

**Implementation:** Static Next.js page at `src/app/api-docs/page.tsx`. Server component, no client JS needed. Styled to match the dashboard aesthetic (dark theme, monospace, cyan accents).

## Error Handling

- Fetch failures return null, logged to console (same pattern as JPL/DSN pollers)
- Stale data detection: if the parameter timestamps stop advancing for >10 seconds, the UI could dim the attitude section (optional, not required for v1)
- If the GCS bucket becomes unavailable, the rest of the dashboard is unaffected — AROW sections simply show "—" placeholders

## Scope Exclusions

- No disk caching of AROW data
- No AROW data in SIM mode (no historical archive)
- No position/velocity from AROW (unit/frame unknown — JPL Horizons is the source)
- No 3D model / WebGL — CSS transforms only
- The Io file (`Io_108_1.txt`) is not polled — it hasn't updated since pre-launch
