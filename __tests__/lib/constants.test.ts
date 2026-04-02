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
    expect(new Date(LAUNCH_TIME_UTC).getTime()).toBe(1775082300000);
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
