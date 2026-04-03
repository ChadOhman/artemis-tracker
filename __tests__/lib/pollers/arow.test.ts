// __tests__/lib/pollers/arow.test.ts
import { parseArowResponse, parseDoyTimestamp } from "@/lib/pollers/arow";

const SAMPLE_RESPONSE = {
  File: { Date: "2026/04/03 01:18:58", Activity: "MIS", Type: 4 },
  Parameter_2016: { Number: "2016", Status: "Good", Time: "2026:093:06:18:55.441", Type: "3", Value: "ec" },
  Parameter_2074: { Number: "2074", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "0.2207199335098" },
  Parameter_2075: { Number: "2075", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "-0.2556181252003" },
  Parameter_2076: { Number: "2076", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "-0.7238367795944" },
  Parameter_2077: { Number: "2077", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "-0.5877192616463" },
  Parameter_2078: { Number: "2078", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "1.312229275703" },
  Parameter_2079: { Number: "2079", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "-0.0322639234364" },
  Parameter_2080: { Number: "2080", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "-0.2162663340569" },
  Parameter_2084: { Number: "2084", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "0.2012345678901" },
  Parameter_2085: { Number: "2085", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "0.3398765432100" },
  Parameter_2086: { Number: "2086", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "-0.2201234567890" },
  Parameter_2087: { Number: "2087", Status: "Good", Time: "2026:093:06:18:54.390", Type: "2", Value: "-0.6812345678901" },
  Parameter_2091: { Number: "2091", Status: "Good", Time: "2026:093:06:18:54.265", Type: "2", Value: "0.3381006717682" },
  Parameter_2092: { Number: "2092", Status: "Good", Time: "2026:093:06:18:54.265", Type: "2", Value: "0.1230099201202" },
  Parameter_2093: { Number: "2093", Status: "Good", Time: "2026:093:06:18:54.265", Type: "2", Value: "-0.3380193710327" },
  Parameter_5002: { Number: "5002", Status: "Good", Time: "2026:093:06:18:55.039", Type: "2", Value: "19.37174153843" },
  Parameter_5003: { Number: "5003", Status: "Good", Time: "2026:093:06:18:55.039", Type: "2", Value: "7.047949259522" },
  Parameter_5004: { Number: "5004", Status: "Good", Time: "2026:093:06:18:55.039", Type: "2", Value: "-19.36708334942" },
  Parameter_5005: { Number: "5005", Status: "Good", Time: "2026:093:06:18:55.039", Type: "2", Value: "-7.041132730732" },
  Parameter_5006: { Number: "5006", Status: "Good", Time: "2026:093:06:18:55.039", Type: "2", Value: "177.1023456789" },
  Parameter_5007: { Number: "5007", Status: "Good", Time: "2026:093:06:18:55.039", Type: "2", Value: "0.2034567890123" },
  Parameter_5008: { Number: "5008", Status: "Good", Time: "2026:093:06:18:55.039", Type: "2", Value: "177.0987654321" },
  Parameter_5009: { Number: "5009", Status: "Good", Time: "2026:093:06:18:55.039", Type: "2", Value: "166.1012345678" },
};

describe("AROW poller", () => {
  describe("parseDoyTimestamp", () => {
    test("converts DOY format to ISO-8601", () => {
      expect(parseDoyTimestamp("2026:093:06:18:55.441")).toBe("2026-04-03T06:18:55.441Z");
    });
    test("handles day 001 (Jan 1)", () => {
      expect(parseDoyTimestamp("2026:001:00:00:00.000")).toBe("2026-01-01T00:00:00.000Z");
    });
    test("handles day 365 (Dec 31)", () => {
      expect(parseDoyTimestamp("2026:365:23:59:59.999")).toBe("2026-12-31T23:59:59.999Z");
    });
  });

  describe("parseArowResponse", () => {
    test("extracts quaternion from confirmed params 2074-2077", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.quaternion.w).toBeCloseTo(0.2207199335098, 6);
      expect(result!.quaternion.x).toBeCloseTo(-0.2556181252003, 6);
      expect(result!.quaternion.y).toBeCloseTo(-0.7238367795944, 6);
      expect(result!.quaternion.z).toBeCloseTo(-0.5877192616463, 6);
    });

    test("extracts euler angles from confirmed params 2078-2080 (rad to deg)", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.eulerDeg.pitch).toBeCloseTo(75.2, 0);
      expect(result!.eulerDeg.yaw).toBeCloseTo(-1.8, 0);
      expect(result!.eulerDeg.roll).toBeCloseTo(-12.4, 0);
    });

    test("extracts angular rates from params 2091-2093 (rad/s to deg/s)", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.rollRate).toBeCloseTo(19.37, 0);
      expect(result!.pitchRate).toBeCloseTo(7.05, 0);
      expect(result!.yawRate).toBeCloseTo(-19.37, 0);
    });

    test("extracts SAW angles from params 5006-5009 (already in degrees)", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.sawAngles.saw1).toBeCloseTo(177.10, 1);
      expect(result!.sawAngles.saw2).toBeCloseTo(0.20, 1);
      expect(result!.sawAngles.saw3).toBeCloseTo(177.10, 1);
      expect(result!.sawAngles.saw4).toBeCloseTo(166.10, 1);
    });

    test("extracts ICPS quaternion from params 2084-2087", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.icps.quaternion.w).toBeCloseTo(0.2012, 3);
      expect(result!.icps.quaternion.x).toBeCloseTo(0.3399, 3);
      expect(result!.icps.quaternion.y).toBeCloseTo(-0.2201, 3);
      expect(result!.icps.quaternion.z).toBeCloseTo(-0.6812, 3);
      expect(result!.icps.active).toBe(true);
    });

    test("sets icps.active to false when ICPS param status is not Good", () => {
      const modified = { ...SAMPLE_RESPONSE, Parameter_2084: { ...SAMPLE_RESPONSE.Parameter_2084, Status: "Stale" } };
      const result = parseArowResponse(modified);
      expect(result).not.toBeNull();
      expect(result!.icps.active).toBe(false);
    });

    test("extracts antenna gimbal angles from params 5002-5005", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.antennaGimbal.az1).toBeCloseTo(19.3717, 2);
      expect(result!.antennaGimbal.el1).toBeCloseTo(7.0479, 2);
      expect(result!.antennaGimbal.az2).toBeCloseTo(-19.3671, 2);
      expect(result!.antennaGimbal.el2).toBeCloseTo(-7.0411, 2);
    });

    test("extracts spacecraft mode and timestamp", () => {
      const result = parseArowResponse(SAMPLE_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.spacecraftMode).toBe("ec");
      expect(result!.timestamp).toMatch(/^2026-04-03T06:18:\d{2}/);
    });

    test("returns null for empty object", () => {
      expect(parseArowResponse({})).toBeNull();
    });

    test("returns null when required parameters are missing", () => {
      expect(parseArowResponse({
        File: { Date: "2026/04/03", Activity: "MIS", Type: 4 },
        Parameter_2016: { Number: "2016", Status: "Good", Time: "2026:093:06:18:55.441", Type: "3", Value: "ec" },
      })).toBeNull();
    });

    test("still parses when ICPS params are missing (icps defaults)", () => {
      const withoutIcps = { ...SAMPLE_RESPONSE };
      delete (withoutIcps as any).Parameter_2084;
      delete (withoutIcps as any).Parameter_2085;
      delete (withoutIcps as any).Parameter_2086;
      delete (withoutIcps as any).Parameter_2087;
      const result = parseArowResponse(withoutIcps);
      expect(result).not.toBeNull();
      expect(result!.icps.active).toBe(false);
      expect(result!.icps.quaternion.w).toBe(0);
    });
  });
});
