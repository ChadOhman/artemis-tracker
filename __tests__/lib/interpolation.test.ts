// __tests__/lib/interpolation.test.ts
import { hermiteInterpolate, interpolateStateVector } from "@/lib/interpolation";
import type { StateVector } from "@/lib/types";

describe("Hermite interpolation", () => {
  test("hermiteInterpolate returns start value at t=0", () => {
    const result = hermiteInterpolate(0, 10, 1, 1, 0);
    expect(result).toBeCloseTo(0, 5);
  });

  test("hermiteInterpolate returns end value at t=1", () => {
    const result = hermiteInterpolate(0, 10, 1, 1, 1);
    expect(result).toBeCloseTo(10, 5);
  });

  test("hermiteInterpolate returns midpoint-ish at t=0.5", () => {
    const result = hermiteInterpolate(0, 10, 0, 0, 0.5);
    expect(result).toBeCloseTo(5, 0);
  });

  test("interpolateStateVector interpolates between two vectors", () => {
    const sv1: StateVector = {
      timestamp: "2026-04-02T00:00:00Z", metMs: 0,
      position: { x: 0, y: 0, z: 0 }, velocity: { x: 10, y: 0, z: 0 },
    };
    const sv2: StateVector = {
      timestamp: "2026-04-02T01:00:00Z", metMs: 3600000,
      position: { x: 36000, y: 0, z: 0 }, velocity: { x: 10, y: 0, z: 0 },
    };
    const at0 = interpolateStateVector(sv1, sv2, 0);
    expect(at0.position.x).toBeCloseTo(0, 0);
    const atEnd = interpolateStateVector(sv1, sv2, 3600000);
    expect(atEnd.position.x).toBeCloseTo(36000, 0);
    const atMid = interpolateStateVector(sv1, sv2, 1800000);
    expect(atMid.position.x).toBeCloseTo(18000, -2);
  });

  test("interpolateStateVector clamps outside range", () => {
    const sv1: StateVector = {
      timestamp: "2026-04-02T00:00:00Z", metMs: 1000,
      position: { x: 0, y: 0, z: 0 }, velocity: { x: 1, y: 0, z: 0 },
    };
    const sv2: StateVector = {
      timestamp: "2026-04-02T00:01:00Z", metMs: 2000,
      position: { x: 1, y: 0, z: 0 }, velocity: { x: 1, y: 0, z: 0 },
    };
    const before = interpolateStateVector(sv1, sv2, 0);
    expect(before.position.x).toBeCloseTo(0, 5);
    const after = interpolateStateVector(sv1, sv2, 5000);
    expect(after.position.x).toBeCloseTo(1, 5);
  });
});
