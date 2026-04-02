// src/lib/constants.ts
/** Artemis II launch: April 1, 2026 at 18:35 ET = 22:35 UTC */
export const LAUNCH_TIME_UTC = "2026-04-01T22:35:00Z";
export const LAUNCH_TIME_MS = new Date(LAUNCH_TIME_UTC).getTime();
export const JPL_SPACECRAFT_ID = "-1024";
/** DSN feed uses "EM2" (Exploration Mission 2) for Artemis II */
export const DSN_SPACECRAFT_ID = "EM2";
export const JPL_HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api";
export const DSN_NOW_URL = "https://eyes.nasa.gov/dsn/data/dsn.xml";
export const JPL_POLL_INTERVAL_MS = 5 * 60 * 1000;
export const DSN_POLL_INTERVAL_MS = 10 * 1000;
export const SSE_KEEPALIVE_INTERVAL_MS = 30 * 1000;
export const EARTH_RADIUS_KM = 6371;
export const MISSION_DURATION_MS = (9 * 24 * 60 * 60 + 1 * 60 * 60 + 42 * 60 + 48) * 1000;
