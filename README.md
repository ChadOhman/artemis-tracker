# Artemis II Mission Tracker

Real-time mission control dashboard for NASA's Artemis II crewed lunar flyby mission. Tracks Orion's position, DSN communications, crew activities, and mission milestones — all updating live.

**Created by [Canadian Space](https://cdnspace.ca)**

## Features

- Live MET (Mission Elapsed Time) clock
- 2D orbit map with figure-8 free-return trajectory
- Orbital telemetry from JPL Horizons (position, velocity, orbital elements)
- DSN ground station communications (live from NASA's DSN Now feed)
- Gantt-style mission timeline with crew activities, attitude modes, and phases
- NASA Live stream embed (Official Broadcast + Orion Views)
- Crew bios and spacecraft specifications
- SIM mode — scrub to any point in the 10-day mission with playback controls
- Milestone tracker with JUMP TO navigation

## Tech Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- HTML Canvas for orbit map and Gantt timeline
- JPL Horizons API (spacecraft `-1024`) for orbital state vectors
- DSN Now XML feed (spacecraft `EM2`) for comm status
- Server-Sent Events for real-time updates

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## One-Command Deploy from Proxmox Host

Create and deploy to an LXC container in a single command. Replace `CTID` with your desired container ID and `REPO_URL` with your git repo URL.

```bash
# From the Proxmox host — creates LXC, installs everything, starts the app
CTID=200 bash -c '
pct create $CTID local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst \
  --hostname artemis-tracker \
  --memory 2048 --cores 2 --swap 512 \
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
  mkdir -p data && echo \"[]\" > data/telemetry-history.json && \
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

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload && \
  systemctl enable --now artemis-tracker
"
echo "Deployed! Access at http://\$(pct exec $CTID -- hostname -I | tr -d \" \"):3000"
'
```

### Deploy to an Existing LXC

Already have an LXC running? Deploy from the Proxmox host:

```bash
CTID=200 bash -c '
pct exec $CTID -- bash -c "
  apt-get update && apt-get install -y curl git ca-certificates && \
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
  apt-get install -y nodejs && \
  git clone https://github.com/ChadOhman/artemis-tracker.git /opt/artemis-tracker && \
  cd /opt/artemis-tracker && \
  npm ci && npm run build && \
  mkdir -p data && echo '[]' > data/telemetry-history.json && \
  cat > /etc/systemd/system/artemis-tracker.service <<SVCEOF
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

[Install]
WantedBy=multi-user.target
SVCEOF
  systemctl daemon-reload && \
  systemctl enable --now artemis-tracker
"
echo "Deployed! Access at http://$(pct exec $CTID -- hostname -I | tr -d " "):3000"
'
```

Or SSH directly into the LXC and run:

```bash
apt-get update && apt-get install -y curl git ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
git clone https://github.com/ChadOhman/artemis-tracker.git /opt/artemis-tracker
cd /opt/artemis-tracker
npm ci && npm run build
mkdir -p data && echo "[]" > data/telemetry-history.json
node node_modules/.bin/next start -p 3000
```

### Update an Existing Deployment

```bash
CTID=200 bash -c '
pct exec $CTID -- bash -c "
  cd /opt/artemis-tracker && \
  git pull && npm ci && npm run build && \
  systemctl restart artemis-tracker
"
'
```

### Cloudflare Tunnel

If you're exposing through a Cloudflare Tunnel, add an ingress rule to your `config.yml`:

```yaml
ingress:
  - hostname: artemis.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

The SSE endpoint includes 30-second keepalives for Cloudflare Tunnel compatibility (100s idle timeout).

## Deploy to LXC (Manual)

If you prefer step-by-step instead of the one-liner:

### Prerequisites

- Debian/Ubuntu LXC container (or any Linux)
- Node.js 20+ (`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt install -y nodejs`)
- Git

### Setup

```bash
git clone https://github.com/ChadOhman/artemis-tracker.git
cd artemis-tracker
npm ci
npm run build
mkdir -p data && echo "[]" > data/telemetry-history.json
```

### Run

```bash
# With systemd (recommended)
sudo cp artemis-tracker.service /etc/systemd/system/  # if provided
sudo systemctl enable --now artemis-tracker

# Or with PM2
npm install -g pm2
pm2 start node_modules/.bin/next --name artemis-tracker -- start -p 3000
pm2 save && pm2 startup
```

## Data Sources

| Source | Endpoint | Poll Interval | Data |
|--------|----------|---------------|------|
| JPL Horizons | `ssd.jpl.nasa.gov/api/horizons.api` | 5 min | Orion position/velocity vectors |
| DSN Now | `eyes.nasa.gov/dsn/data/dsn.xml` | 10 sec | Ground station comm status |
| Mission Timeline | Static (from NASA PDF) | — | Crew activities, milestones, phases |

## API Endpoints

- `GET /api/telemetry/stream` — SSE stream of live telemetry + DSN updates
- `GET /api/telemetry/history?from={metMs}&to={metMs}` — Historical state vectors for SIM mode
- `GET /api/timeline` — Mission timeline data (activities, milestones, phases, attitudes)

## Key Mission Dates

- **Launch:** April 1, 2026 at 18:35 ET
- **TLI:** ~MET 1d 1h 8m 42s
- **Lunar Close Approach:** ~MET 5d 0h 29m 59s
- **Splashdown:** ~MET 9d 1h 42m 48s
