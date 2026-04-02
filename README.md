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
- DSN Now XML feed (spacecraft `ART2`) for comm status
- Server-Sent Events for real-time updates

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to LXC (Production)

### Prerequisites

- Debian/Ubuntu LXC container (or any Linux)
- Node.js 20+ (`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt install -y nodejs`)
- Git

### Setup

```bash
# Clone the repo
git clone https://github.com/your-org/artemis-tracker.git
cd artemis-tracker

# Install dependencies
npm ci --production=false

# Build for production
npm run build

# Create data directory for telemetry persistence
mkdir -p data
echo "[]" > data/telemetry-history.json
```

### Run with systemd

Create `/etc/systemd/system/artemis-tracker.service`:

```ini
[Unit]
Description=Artemis II Mission Tracker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/artemis-tracker
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
# Copy files to /opt
sudo cp -r . /opt/artemis-tracker
sudo chown -R www-data:www-data /opt/artemis-tracker

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable artemis-tracker
sudo systemctl start artemis-tracker

# Check status
sudo systemctl status artemis-tracker
```

### Cloudflare Tunnel

If you're running behind a Cloudflare Tunnel:

```bash
# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared

# Configure tunnel (replace with your tunnel ID)
cloudflared tunnel route dns YOUR_TUNNEL_ID artemis.yourdomain.com

# Add ingress rule to ~/.cloudflared/config.yml:
# ingress:
#   - hostname: artemis.yourdomain.com
#     service: http://localhost:3000
#   - service: http_status:404
```

The SSE endpoint includes 30-second keepalives for Cloudflare Tunnel compatibility (100s idle timeout).

### PM2 Alternative

If you prefer PM2 over systemd:

```bash
npm install -g pm2
pm2 start node_modules/.bin/next --name artemis-tracker -- start -p 3000
pm2 save
pm2 startup
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
