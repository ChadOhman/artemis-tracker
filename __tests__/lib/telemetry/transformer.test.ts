// __tests__/lib/telemetry/transformer.test.ts
import { transformStateVector } from "@/lib/telemetry/transformer";
import type { StateVector } from "@/lib/types";

describe("transformStateVector", () => {
  const moonPosition = { x: 300000, y: 100000, z: 0 };

  test("computes speed from velocity vector magnitude", () => {
    const sv: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 5700000,
      position: { x: 6571, y: 0, z: 0 },
      velocity: { x: 0, y: 7.8, z: 0 },
    };
    const result = transformStateVector(sv, moonPosition);
    expect(result.speedKmS).toBeCloseTo(7.8, 1);
    expect(result.speedKmH).toBeCloseTo(7.8 * 3600, 0);
  });

  test("computes altitude as distance from Earth center minus Earth radius", () => {
    const sv: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 5700000,
      position: { x: 6571, y: 0, z: 0 },
      velocity: { x: 0, y: 7.8, z: 0 },
    };
    const result = transformStateVector(sv, moonPosition);
    expect(result.altitudeKm).toBeCloseTo(200, 0);
  });

  test("computes Earth distance as position vector magnitude", () => {
    const sv: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 5700000,
      position: { x: 3000, y: 4000, z: 0 },
      velocity: { x: 0, y: 1, z: 0 },
    };
    const result = transformStateVector(sv, moonPosition);
    expect(result.earthDistKm).toBeCloseTo(5000, 0);
  });

  test("computes Moon distance from Orion position minus Moon position", () => {
    const sv: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 5700000,
      position: { x: 300000, y: 100000, z: 0 },
      velocity: { x: 0, y: 1, z: 0 },
    };
    const result = transformStateVector(sv, moonPosition);
    expect(result.moonDistKm).toBeCloseTo(0, 0);
  });

  test("returns correct metMs", () => {
    const sv: StateVector = {
      timestamp: "2026-04-02T00:00:00Z",
      metMs: 5700000,
      position: { x: 6571, y: 0, z: 0 },
      velocity: { x: 0, y: 7.8, z: 0 },
    };
    const result = transformStateVector(sv, moonPosition);
    expect(result.metMs).toBe(5700000);
  });
});
