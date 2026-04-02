// __tests__/lib/met.test.ts
import { utcToMetMs, metMsToUtc, formatMet, getCurrentMetMs } from "@/lib/met";
import { LAUNCH_TIME_MS } from "@/lib/constants";

describe("MET utilities", () => {
  test("utcToMetMs converts UTC timestamp to MET milliseconds", () => {
    const oneHourAfter = new Date(LAUNCH_TIME_MS + 3600000).toISOString();
    expect(utcToMetMs(oneHourAfter)).toBe(3600000);
  });

  test("utcToMetMs returns negative for pre-launch", () => {
    const oneHourBefore = new Date(LAUNCH_TIME_MS - 3600000).toISOString();
    expect(utcToMetMs(oneHourBefore)).toBe(-3600000);
  });

  test("metMsToUtc converts MET milliseconds to UTC ISO string", () => {
    const utc = metMsToUtc(3600000);
    expect(new Date(utc).getTime()).toBe(LAUNCH_TIME_MS + 3600000);
  });

  test("formatMet formats milliseconds as DDD:HH:MM:SS", () => {
    expect(formatMet(0)).toBe("000:00:00:00");
    const tli = (1 * 24 * 3600 + 1 * 3600 + 8 * 60 + 42) * 1000;
    expect(formatMet(tli)).toBe("001:01:08:42");
    const splash = (9 * 24 * 3600 + 1 * 3600 + 42 * 60 + 48) * 1000;
    expect(formatMet(splash)).toBe("009:01:42:48");
  });

  test("formatMet handles negative MET (pre-launch) with minus sign", () => {
    expect(formatMet(-3600000)).toBe("-000:01:00:00");
  });

  test("getCurrentMetMs returns current MET based on wall clock", () => {
    const now = Date.now();
    const met = getCurrentMetMs();
    const expected = now - LAUNCH_TIME_MS;
    expect(Math.abs(met - expected)).toBeLessThan(50);
  });
});
