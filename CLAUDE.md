# Artemis II Mission Tracker

Real-time mission control dashboard for NASA's Artemis II crewed lunar flyby.

## Tech Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS
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
