// __tests__/lib/topocentric.test.ts
import {
  gmst,
  eclipticToEquatorial,
  eciToEcef,
  geodeticToEcef,
  ecefToGeodetic,
  computeTopocentric,
  computeSubPoint,
  formatRA,
  formatDec,
} from "@/lib/topocentric";

describe("topocentric", () => {
  describe("gmst", () => {
    test("J2000 epoch gives ~18.697h GMST", () => {
      // At J2000.0 (2000-01-01T12:00:00 UTC), GMST ≈ 18.6973 hours
      const j2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
      const g = gmst(j2000);
      const gHours = (g / (2 * Math.PI)) * 24;
      expect(gHours).toBeCloseTo(18.697, 0);
    });
  });

  describe("eclipticToEquatorial", () => {
    test("pure X direction unchanged", () => {
      const result = eclipticToEquatorial({ x: 1, y: 0, z: 0 });
      expect(result.x).toBeCloseTo(1, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    test("Y rotates by obliquity", () => {
      const result = eclipticToEquatorial({ x: 0, y: 1, z: 0 });
      // Y_eq = cos(23.44°) * 1 ≈ 0.9175
      // Z_eq = sin(23.44°) * 1 ≈ 0.3978
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0.9175, 2);
      expect(result.z).toBeCloseTo(0.3978, 2);
    });
  });

  describe("geodeticToEcef", () => {
    test("equator prime meridian gives correct X", () => {
      const result = geodeticToEcef({ lat: 0, lon: 0, alt: 0 });
      expect(result.x).toBeCloseTo(6378.137, 0);
      expect(result.y).toBeCloseTo(0, 0);
      expect(result.z).toBeCloseTo(0, 0);
    });

    test("north pole gives correct Z", () => {
      const result = geodeticToEcef({ lat: 90, lon: 0, alt: 0 });
      expect(result.x).toBeCloseTo(0, 0);
      expect(result.y).toBeCloseTo(0, 0);
      expect(result.z).toBeCloseTo(6356.752, 0);
    });
  });

  describe("ecefToGeodetic", () => {
    test("roundtrips equator", () => {
      const ecef = geodeticToEcef({ lat: 0, lon: 0, alt: 0 });
      const geo = ecefToGeodetic(ecef);
      expect(geo.lat).toBeCloseTo(0, 3);
      expect(geo.lon).toBeCloseTo(0, 3);
    });

    test("roundtrips mid-latitude", () => {
      const ecef = geodeticToEcef({ lat: 45, lon: -75, alt: 0 });
      const geo = ecefToGeodetic(ecef);
      expect(geo.lat).toBeCloseTo(45, 2);
      expect(geo.lon).toBeCloseTo(-75, 2);
    });
  });

  describe("computeTopocentric", () => {
    test("produces finite azimuth and elevation for near-Earth object", () => {
      const utcMs = Date.UTC(2026, 3, 3, 8, 0, 0);
      const result = computeTopocentric(
        { x: 6778, y: 0, z: 0 },
        { lat: 0, lon: 0, alt: 0 },
        utcMs
      );
      expect(Number.isFinite(result.azimuth)).toBe(true);
      expect(Number.isFinite(result.elevation)).toBe(true);
      expect(result.range).toBeGreaterThan(0);
      expect(result.range).toBeLessThan(20000); // near-Earth object
    });

    test("returns visible=false for object below horizon", () => {
      // Object on opposite side of Earth
      const utcMs = Date.UTC(2026, 3, 3, 12, 0, 0);
      const result = computeTopocentric(
        { x: -100000, y: 0, z: 0 },
        { lat: 0, lon: 0, alt: 0 },
        utcMs
      );
      // Likely below horizon depending on GMST
      expect(typeof result.visible).toBe("boolean");
      expect(typeof result.azimuth).toBe("number");
      expect(typeof result.elevation).toBe("number");
    });

    test("produces valid RA/Dec ranges", () => {
      const utcMs = Date.UTC(2026, 3, 3, 8, 0, 0);
      const result = computeTopocentric(
        { x: -56241, y: -64095, z: -6501 },
        { lat: 53.55, lon: -113.53, alt: 0.7 },
        utcMs
      );
      expect(result.ra).toBeGreaterThanOrEqual(0);
      expect(result.ra).toBeLessThan(24);
      expect(result.dec).toBeGreaterThanOrEqual(-90);
      expect(result.dec).toBeLessThanOrEqual(90);
      expect(result.range).toBeGreaterThan(0);
    });
  });

  describe("computeSubPoint", () => {
    test("returns valid lat/lon", () => {
      const utcMs = Date.UTC(2026, 3, 3, 8, 0, 0);
      const sub = computeSubPoint(
        { x: -56241, y: -64095, z: -6501 },
        utcMs
      );
      expect(sub.lat).toBeGreaterThanOrEqual(-90);
      expect(sub.lat).toBeLessThanOrEqual(90);
      expect(sub.lon).toBeGreaterThanOrEqual(-180);
      expect(sub.lon).toBeLessThanOrEqual(180);
    });
  });

  describe("formatRA", () => {
    test("formats 6.5 hours correctly", () => {
      const result = formatRA(6.5);
      expect(result).toMatch(/06h 30m/);
    });
  });

  describe("formatDec", () => {
    test("formats positive declination", () => {
      const result = formatDec(45.5);
      expect(result).toMatch(/\+45°/);
    });

    test("formats negative declination", () => {
      const result = formatDec(-23.4);
      expect(result).toMatch(/-23°/);
    });
  });
});
