// __tests__/lib/timeline/data.test.ts
import { getTimelineData } from "@/lib/timeline/data";
import type { TimelineData } from "@/lib/types";

describe("timeline data", () => {
  let data: TimelineData;

  beforeAll(() => {
    data = getTimelineData();
  });

  test("has milestones sorted by MET", () => {
    expect(data.milestones.length).toBeGreaterThan(0);
    for (let i = 1; i < data.milestones.length; i++) {
      expect(data.milestones[i].metMs).toBeGreaterThanOrEqual(data.milestones[i - 1].metMs);
    }
  });

  test("first milestone is Launch at MET 0", () => {
    expect(data.milestones[0].name).toBe("Launch");
    expect(data.milestones[0].metMs).toBe(0);
  });

  test("last milestone is Splashdown", () => {
    const last = data.milestones[data.milestones.length - 1];
    expect(last.name).toBe("Splashdown");
    // Press kit: 09/01:46
    expect(last.metMs).toBe((9 * 24 * 3600 + 1 * 3600 + 46 * 60) * 1000);
  });

  test("has all milestones", () => {
    expect(data.milestones.length).toBeGreaterThanOrEqual(20);
  });

  test("has phases covering entire mission", () => {
    expect(data.phases.length).toBeGreaterThan(0);
    expect(data.phases[0].startMetMs).toBeLessThanOrEqual(0);
    const lastPhase = data.phases[data.phases.length - 1];
    expect(lastPhase.phase).toBe("Recovery");
  });

  test("has activities for all 10 flight days", () => {
    const maxMet = Math.max(...data.activities.map((a) => a.endMetMs));
    expect(maxMet).toBeGreaterThan(8 * 24 * 3600 * 1000);
  });

  test("TLI milestone matches press kit (01/01:37)", () => {
    const tli = data.milestones.find((m) => m.name === "Trans-Lunar Injection");
    expect(tli).toBeDefined();
    expect(tli!.metMs).toBe((1 * 24 * 3600 + 1 * 3600 + 37 * 60) * 1000);
  });

  test("Lunar Close Approach milestone matches press kit (05/01:23)", () => {
    const lca = data.milestones.find((m) => m.name === "Lunar Close Approach");
    expect(lca).toBeDefined();
    expect(lca!.metMs).toBe((5 * 24 * 3600 + 1 * 3600 + 23 * 60) * 1000);
  });
});
