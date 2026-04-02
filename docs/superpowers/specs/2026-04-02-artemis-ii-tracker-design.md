# Artemis II Mission Tracker — Design Spec

## Overview

A real-time mission control-style dashboard for tracking the NASA Artemis II crewed lunar flyby mission. Dense, data-rich, single-page layout showing telemetry, orbit visualization, timeline, crew activities, milestones, and NASA live streams — all updating in real-time. Includes a SIM mode for replaying any point in the 10-day mission.

**Launch:** April 1, 2026 at 18:25 ET  
**Splashdown:** ~MET 09/01:42:48  
**Self-hosted** behind Cloudflare Tunnels

## Tech Stack

- **Framework:** Next.js (React)
- **Orbit Map:** HTML Canvas (2D), Three.js (3D modal — stretch goal)
- **Telemetry Source:** JPL Horizons API (spacecraft ID `-1024`)
- **Comms Source:** DSN Now XML feed (`https://eyes.nasa.gov/dsn/data/dsn.xml`, spacecraft `ART2`)
- **Real-time:** Server-Sent Events (SSE) with 30s keepalive for Cloudflare Tunnel compatibility
- **Deployment:** Self-hosted behind Cloudflare Tunnels

## Layout

Single-page, no-scroll mission control view filling the viewport. Five zones:

### Top Bar

Always visible, full width. Contains:

- **ARTEMIS II** title + red LIVE indicator dot
- **MET Clock** — large monospace `000:DD:HH:MM:SS` ticking in real-time, computed from launch time
- **Phase Badge** — current mission phase (e.g., "HIGH EARTH ORBIT") with colored background
- **Flight Day** — e.g., "FD01"
- **Comms Status** — shows active comm link. DSN: live from DSN Now feed (e.g., "DSS54 Madrid"). NSN: inferred from timeline data during early LEO/HEO and re-entry phases, shows "NSN (DTE)" or "NSN (SR)" for direct-to-Earth or TDRS relay links. Green GO when signal active (DSN live) or in a scheduled comm window (NSN inferred), grey otherwise. Spacecraft identifier: `ART2`
- **Quick Telemetry** — velocity (km/s), altitude (km), Earth distance (km)
- **Next Event** — name + countdown (e.g., "Trans-Lunar Injection T-17h 5m")
- **Crew Sleep** — countdown to next sleep period
- **Crew/Spacecraft Info** button — opens modal overlay

### Left Column (~35% width)

**Orbit Map (2D, default):**

- Canvas-rendered, fixed aspect ratio
- Earth positioned left-center, Moon right-center (enlarged for readability, not to scale)
- Pre-computed figure-8 trajectory path drawn from historical state vectors
- Orion as a bright green dot with glow, animating along the path at 60fps
- Waypoint labels: TLI, Lunar SOI Entry, Closest Approach (~6,513 km), Lunar SOI Exit
- Distance labels: Earth-Moon (380,540 km), closest approach distance
- Path behind Orion = solid line, path ahead = dashed
- Subtle star field background
- "3D View" button opens Three.js modal overlay (stretch goal)

**Orbital Telemetry panel (below map):**

- Dynamics: velocity (km/s), g-force (g)
- Position: altitude (km), Earth distance (km), Moon distance (km)
- Orbit: periapsis (km), apoapsis (km)
- Attitude: pitch (deg), yaw (deg), roll (deg)
- All values update from the interpolation engine at 60fps
- Phase label in the panel header (e.g., "High Earth Orbit")

**DSN Communications panel (below telemetry):**

- Live from DSN Now feed, filtered for `ART2`
- Shows: active ground station name + dish (e.g., "DSS54 — Madrid")
- Signal direction indicator (uplink/downlink/both)
- Data rate, frequency band, signal power
- Round-trip light time (seconds)
- Range from ground station (km)
- Visual indicator: green pulsing dot when signal active, grey when no contact
- If multiple dishes are tracking simultaneously, show all
- During early mission (LEO/HEO) and re-entry phases, shows NSN comm status inferred from timeline data: "NSN (DTE)" for direct-to-Earth links, "NSN (SR)" for TDRS Space Relay links
- DSN live data takes priority when available; falls back to timeline-inferred NSN/TDRS
- NSN entries marked with a subtle "estimated" indicator to distinguish from live DSN data

### Center Column (~40% width)

**Mission Overview (Gantt-style timeline):**

- Horizontal timeline spanning all 10 flight days
- Three rows: Crew activities, Attitude mode, Phase
- Each activity = colored block with label, color-coded by type:
  - Sleep = dark grey
  - PAO/public events = blue
  - Science/DFTOs = green
  - Maneuvers (TLI, OTC, RTC) = purple
  - Configuration/setup = teal
- Red vertical playhead at current MET
- Auto-scrolls to keep playhead visible ("AUTO-TRACK" toggle)
- Click/drag to pan, scroll to zoom time scale
- Clicking an activity block populates Activity Detail

**Activity Detail:**

- Current activity: name, type, MET start → end, duration, progress bar (% complete)
- Current attitude mode
- Current mission phase with MET range and progress bar
- Notes from NASA PDF annotations (e.g., "Dock Cam Misalign - DFTO-EM2-03")

**Next Milestone callout:**

- Milestone name, description, countdown timer
- e.g., "▶ Trans-Lunar Injection in 17h 5m — TLI burn sends Orion toward the Moon"

**NASA Live Stream:**

- Embedded YouTube iframe, collapsible panel (defaults to open)
- **Stream switcher** in panel header: "Official Broadcast" | "Orion Views"
  - Official Broadcast: `https://www.youtube.com/watch?v=m3kR2KK8TEs`
  - Orion Views: `https://www.youtube.com/watch?v=6RwfNBtepa4`
- Remembers user's last selection
- Mute toggle in panel header
- When collapsed, shows compact "NASA LIVE" indicator with red dot

### Right Column (~25% width)

**Current Activities:**

- Current crew activity with label
- Current attitude mode
- Current phase

**Upcoming:**

- Next several scheduled activities with time-until countdown
- Color-coded by type, matching the Gantt bar colors

**Milestones:**

- Full mission milestone list:
  - Launch (0/00:00)
  - ICPS PRM (0/00:50)
  - ARB TIG (0/01:47)
  - Orion/ICPS Separation (0/03:23)
  - Orion USS (0/04:51)
  - Solar Panel Deploy (~0/05:27)
  - Trans-Lunar Injection (~1/01:08:42)
  - OTC-1 (~2/01:08:42)
  - OTC-2 (3/01:08:42)
  - Lunar SOI Entry (4/06:38)
  - OTC-3 (4/04:29:52)
  - Lunar Close Approach (5/00:29:59)
  - Max Earth Distance (5/00:35)
  - Lunar SOI Exit (5/18:53)
  - RTC-1 (6/01:29:52)
  - RTC-2 (8/04:29:10)
  - RTC-3 (8/20:29:10)
  - CM/SM Separation (09/01:09)
  - Entry Interface (09/01:29)
  - Splashdown (09/01:42:48)
- Completed = green dot + MET
- Active = yellow pulsing dot
- Upcoming = grey dot + MET
- Clicking a milestone in SIM mode jumps scrubber to that MET

### Bottom Bar

- **Left:** LIVE / SIM toggle buttons
- **Center:** Current MET display; in SIM mode, a time scrubber slider spanning MET 0/00:00:00 → 9/01:42:48
- **Right:** "Created by Canadian Space" linking to cdnspace.ca

## Data Pipeline

### Server-Side (Next.js API Routes)

**JPL Horizons Poller:**

- Polls every 5 minutes
- Queries spacecraft `-1024` for Cartesian state vectors (X, Y, Z position in km + VX, VY, VZ velocity in km/s)
- Reference frame: Earth-centered J2000
- Also queries Moon position for distance calculations
- Stores results in memory cache + appends to a JSON file on disk for SIM history

**DSN Now Poller:**

- Polls `https://eyes.nasa.gov/dsn/data/dsn.xml` every 10 seconds
- Parses XML, filters for spacecraft `ART2`
- Extracts: active ground station + dish name, signal direction (up/down), data rate (bps), frequency band (S/X/Ka), signal power (dBm), upleg/downleg range (km), round-trip light time (seconds)
- Feeds into SSE stream alongside telemetry updates

**Telemetry Transformer:**

- Converts raw state vectors to display values:
  - Speed: magnitude of velocity vector → km/h
  - Altitude: magnitude of position vector − Earth radius
  - Earth distance: magnitude of position vector
  - Moon distance: |Orion position − Moon position|
  - Orbital elements: periapsis/apoapsis estimated from state vectors
  - G-force: derived from acceleration (delta-v between consecutive vectors)

**SSE Endpoint — `GET /api/telemetry/stream`:**

- Clients connect via EventSource
- Pushes telemetry update on each new poll result
- Sends `:keepalive\n\n` comment every 30 seconds (Cloudflare Tunnel idle timeout is 100s)
- Payload: transformed telemetry + raw state vectors for client interpolation

**History Endpoint — `GET /api/telemetry/history?from={MET}&to={MET}`:**

- Returns cached state vectors for a MET range
- Used by SIM mode when user scrubs to a time range not yet loaded client-side

**Timeline Endpoint — `GET /api/timeline`:**

- Serves the full parsed mission timeline data
- Static data derived from the NASA PDF: crew activities, milestones, phases, attitudes per flight day with MET timestamps

### Client-Side

**Interpolation Engine:**

- Given two state vectors at known timestamps, uses Hermite interpolation (position + velocity) for smooth, physically accurate arcs between data points
- Runs at 60fps via requestAnimationFrame
- In LIVE mode: interpolates between the two most recent vectors using wall clock time
- In SIM mode: interpolates using the scrubber position as the time source

**MET Clock:**

- Launch time: `2026-04-01T22:25:00Z` (18:25 ET = 22:25 UTC)
- LIVE mode: `MET = Date.now() - launchTime`
- SIM mode: `MET = scrubberPosition`
- Displayed as `DDD:HH:MM:SS` in monospace font, ticking every second

**Timeline Tracker:**

- Given current MET, resolves: current flight day, phase, crew activity, attitude mode, next milestone, upcoming activities
- All derived from static timeline data loaded once from `/api/timeline`

## SIM Mode

- Toggle via LIVE/SIM buttons in bottom bar
- Activates a time scrubber slider spanning the full mission
- Scrubbing updates everything simultaneously: MET clock, orbit map position, Gantt playhead, telemetry values, activity detail, milestone states
- **JUMP TO** dropdown with preset milestone jumps
- **Playback speed controls:** 1x, 10x, 100x, 1000x for replay
- Client fetches historical vectors from `/api/telemetry/history` for the scrubbed range
- Same interpolation engine handles smooth animation during playback

## Crew Information (Modal Overlay)

Accessible via button in top bar.

| Name | Role | Agency | Notable |
|------|------|--------|---------|
| Reid Wiseman | Commander | NASA 🇺🇸 | Navy Captain, test pilot (F-35, F/A-18). ISS Expedition 40/41 (2014). Former Chief of the Astronaut Office. |
| Victor Glover | Pilot | NASA 🇺🇸 | Naval aviator and test pilot. SpaceX Crew-1, 4 spacewalks. **FIRST person of color beyond low Earth orbit.** |
| Christina Koch | Mission Specialist 1 | NASA 🇺🇸 | Electrical engineer. 328 days on ISS (women's record at the time). First all-female spacewalks. **FIRST woman beyond low Earth orbit.** |
| Jeremy Hansen | Mission Specialist 2 | CSA 🇨🇦 | CF-18 fighter pilot, Canadian Space Agency. First spaceflight. **FIRST Canadian & non-U.S. citizen beyond LEO.** |

## Spacecraft Specifications (Modal Overlay)

**SLS Block 1 (Rocket):**

| Spec | Value |
|------|-------|
| Height | 322 ft (98 m) |
| Thrust | 8.8M lbs at liftoff |
| Engines | 4x RS-25 + 2x SRBs |
| Payload LEO | 77 t |
| Liftoff Weight | 5.75M lbs (2,608 metric tons) |
| Type | Super Heavy — most powerful ever flown |

**Orion "Integrity" (Spacecraft):**

| Spec | Value |
|------|-------|
| Crew | 4 astronauts |
| Duration | 21 days max capability |
| Service Module | ESM (European Space Agency) |
| Heat Shield | 16.5 ft, AVCOAT ablative |
| Re-entry Speed | 40,000 km/h (~25,000 mph) |
| Solar Arrays | ~62 ft wingspan |

## 3D Orbit View (Stretch Goal)

- Three.js modal overlay, triggered by "3D View" button on the orbit map
- Textured Earth and Moon spheres with correct relative sizing
- Orbital trajectory as a 3D line
- Orion as a glowing point at current position
- Camera orbit controls (drag to rotate, scroll to zoom)
- Earth-centered and Moon-centered view toggle
- Path behind Orion = solid, path ahead = dashed
- Shares the same interpolation engine and MET source as the 2D map

## Mission Phases

1. **Prelaunch** — before launch
2. **LEO** — Low Earth Orbit after launch
3. **High Earth Orbit** — after perigee raise burn through TLI
4. **Trans-Lunar** — after TLI through lunar SOI exit
5. **Trans-Earth** — after lunar SOI exit through CM/SM separation
6. **EDL** — Entry, Descent, and Landing
7. **Recovery** — splashdown and crew recovery
