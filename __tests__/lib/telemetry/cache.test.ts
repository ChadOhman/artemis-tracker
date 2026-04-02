// __tests__/lib/telemetry/cache.test.ts
import { TelemetryCache } from "@/lib/telemetry/cache";
import type { StateVector, Telemetry } from "@/lib/types";

function makeSv(metMs: number): StateVector {
  return {
    timestamp: new Date(1775082300000 + metMs).toISOString(),
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
