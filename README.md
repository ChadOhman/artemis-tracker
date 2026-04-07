# Artemis II Mission Tracker

Real-time mission control dashboard for NASA's Artemis II crewed lunar flyby mission. Live at **[artemis.cdnspace.ca](https://artemis.cdnspace.ca)**

**Created by [Canadian Space](https://cdnspace.ca)**

## Features

### Telemetry & Tracking
- Live MET (Mission Elapsed Time) clock with UTC
- Real ephemeris orbit map (JPL Horizons + NASA/JSC OEM data) with fullscreen mode and real-scale toggle
- Moon detail zoom inset with dynamic zoom, real-position projection, and lunar ground track labels
- Earth detail zoom inset for re-entry approach with splashdown zone
- Orbital telemetry: speed, Moon-relative speed, G-force, altitude, Earth/Moon distance, periapsis/apoapsis
- Inline sparklines for all key metrics (24h history)
- Speed units: km/h, m/s, mph, knots — distance units adapt automatically

### Spacecraft Health
- NASA AROW real-time telemetry (1 Hz): attitude quaternion, Euler angles, angular rates
- 3D attitude indicator (Three.js wireframe Orion model)
- RCS thruster activity map with recent-firing indicators (5-min amber fade)
- Solar array wing gimbal angles (inner/outer) with sun-facing efficiency bars
- Solar power estimate from SAW efficiency
- Gyro cross-check (primary vs fallback IMU deviation)
- Dead-band indicators on angular rates
- Signal light time display
- Spacecraft mode decoder

### Communications
- Deep Space Network live dish status with country flags (🇺🇸🇪🇸🇦🇺)
- DSN bandwidth chart (30-min rolling, per-dish breakdown)
- Ground station handoff predictions with elevation angles
- Signal light-time delay

### Dedicated Pages
- **/dsn** — 3D globe with NASA Black Marble night texture, real-time day/night terminator, signal beams, station visibility forecast, 24h signal timeline, bandwidth chart, all-dishes view with az/el polar plots
- **/stats** — Cumulative mission statistics (max speed, max Earth distance, closest Moon approach, total distance, space weather)
- **/track** — Ground track map (Leaflet + OpenStreetMap/CARTO)
- **/api-docs** — Full REST and SSE API documentation
- **/admin** — Protected admin panel for live status updates

### Mission Context
- Crew activities timeline (Gantt chart) synced with [jakobrosin/artemis-data](https://github.com/jakobrosin/artemis-data)
- Apollo 8 historical comparison panel with event-by-event context
- Wake-up songs panel (continuing the Apollo/Shuttle tradition)
- Δ-V budget tracker (ESM post-TLI maneuver accounting)
- Space weather (NOAA SWPC: Kp index, X-ray flux, proton flux, radiation risk)
- Next milestone countdown
- Crew bios and spacecraft specifications

### Customization
- Panel visibility modal (press **M**) — toggle any panel or top bar item
- Save/load layout presets with column placement (left/center/right)
- Bilingual: English and French (full i18n coverage)
- SIM mode — replay the mission from archived snapshots with playback controls
- GDPR-compliant cookie consent (GA only loads after acceptance)

## Tech Stack

- Next.js 16 (App Router), TypeScript
- HTML Canvas (orbit map, Gantt timeline, sparklines)
- Three.js (attitude indicator, DSN globe)
- Leaflet + OpenStreetMap/CARTO (ground track)
- better-sqlite3 (telemetry archive, WAL mode)
- Server-Sent Events for real-time updates

## Data Sources

| Source | Data | Interval |
|--------|------|----------|
| [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Orion & Moon state vectors (EME2000) | 5 min |
| [NASA AROW](https://www.nasa.gov/missions/artemis-ii/arow/) | Attitude, SAW, RCS, antenna, ICPS (80+ params) | 1 sec |
| [DSN Now](https://eyes.nasa.gov/dsn/data/dsn.xml) | Ground station dish status, signal bands, data rates | 10 sec |
| [NOAA SWPC](https://www.swpc.noaa.gov/) | Kp index, X-ray flux, proton flux | 60 sec |
| [jakobrosin/artemis-data](https://github.com/jakobrosin/artemis-data) | Crew schedule, milestones, mission timeline | Static |
| NASA/JSC OEM | Artemis II reference trajectory (EME2000) | Build-time |

## API Endpoints

All telemetry is available via free REST and SSE endpoints. See [/api-docs](https://artemis.cdnspace.ca/api-docs) for full documentation.

| Endpoint | Description |
|----------|-------------|
| `GET /api/telemetry/stream` | SSE firehose: telemetry, DSN, AROW, solar, visitors |
| `GET /api/arow` | Latest AROW spacecraft telemetry |
| `GET /api/arow/stream` | SSE stream of AROW telemetry (1 Hz) |
| `GET /api/all` | Everything in one request |
| `GET /api/orbit` | Computed orbital telemetry |
| `GET /api/state` | Raw state vectors (Orion + Moon) |
| `GET /api/dsn` | DSN dish contacts |
| `GET /api/solar` | Space weather |
| `GET /api/history?metric=&hours=&points=` | Downsampled time-series |
| `GET /api/snapshot?metMs=` | Point-in-time replay snapshot |
| `GET /api/stats` | Cumulative mission statistics |
| `GET /api/timeline` | Full mission timeline |

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Proxmox LXC

One-command deploy from the Proxmox host:

```bash
CTID=200 bash -c '
pct create $CTID local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst \
  --hostname artemis-tracker \
  --memory 2048 --cores 4 --swap 512 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 --features nesting=1 \
  --start 1 && sleep 5 && \
pct exec $CTID -- bash -c "
  apt-get update && apt-get install -y curl git ca-certificates && \
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
  apt-get install -y nodejs && \
  git clone https://github.com/ChadOhman/artemis-tracker.git /opt/artemis-tracker && \
  cd /opt/artemis-tracker && \
  npm ci && npm run build && \
  mkdir -p data && \
  cat > /etc/systemd/system/artemis-tracker.service <<EOF
[Unit]
Description=Artemis II Mission Tracker
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/artemis-tracker
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=ADMIN_TOKEN=your-secret-token

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload && \
  systemctl enable --now artemis-tracker
"
echo "Deployed! Access at http://\$(pct exec $CTID -- hostname -I | tr -d \" \"):3000"
'
```

### Update an Existing Deployment

```bash
cd /opt/artemis-tracker && git pull && rm -rf .next node_modules && npm install && npm run build && systemctl restart artemis-tracker
```

### Cloudflare Tunnel

```yaml
ingress:
  - hostname: artemis.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

SSE keepalives every 30s for Cloudflare Tunnel compatibility.

## Key Mission Dates

- **Launch:** April 1, 2026 at 18:35 ET
- **TLI:** ~MET 25.23h
- **Lunar Close Approach:** ~MET 120.43h (6,545 km)
- **Max Earth Distance:** ~MET 120.46h (406,770 km)
- **Splashdown:** ~MET 217.51h

## Community Contributors

- **[Brian Brown](https://github.com/briangbrown)** — Real ephemeris trajectory from JPL Horizons + NASA/JSC OEM
- **[agmccar](https://github.com/agmccar)** — Panel visibility modal with layout presets

## Land Acknowledgement

This tracker is hosted on servers located in Edmonton, Alberta, Canada — Treaty 6 territory and the traditional and ancestral lands of the Cree, Dene, Blackfoot, Saulteaux, Nakota Sioux, and Metis peoples.
