// __tests__/lib/pollers/jpl-horizons.test.ts
import { buildHorizonsUrl, parseHorizonsResponse } from "@/lib/pollers/jpl-horizons";

describe("JPL Horizons poller", () => {
  test("buildHorizonsUrl constructs correct API URL", () => {
    const now = new Date("2026-04-02T10:00:00Z");
    const url = buildHorizonsUrl("-1024", now);
    expect(url).toContain("https://ssd.jpl.nasa.gov/api/horizons.api");
    expect(url).toContain("COMMAND");
    expect(url).toContain("EPHEM_TYPE");
    expect(url).toContain("format=json");
  });

  test("parseHorizonsResponse extracts state vector from JPL JSON", () => {
    const jplResult = [
      "$$SOE",
      "2460767.916666667 = A.D. 2026-Apr-02 10:00:00.0000 TDB",
      " X = 6.571000000000000E+03 Y = 0.000000000000000E+00 Z = 0.000000000000000E+00",
      " VX= 0.000000000000000E+00 VY= 7.800000000000000E+00 VZ= 0.000000000000000E+00",
      "$$EOE",
    ].join("\n");

    const vectors = parseHorizonsResponse(jplResult);
    expect(vectors).toHaveLength(1);
    expect(vectors[0].position.x).toBeCloseTo(6571, 0);
    expect(vectors[0].position.y).toBeCloseTo(0, 0);
    expect(vectors[0].velocity.y).toBeCloseTo(7.8, 1);
  });

  test("parseHorizonsResponse returns empty array for malformed data", () => {
    const vectors = parseHorizonsResponse("no valid data here");
    expect(vectors).toEqual([]);
  });
});
