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
    expect(last.metMs).toBe((9 * 24 * 3600 + 1 * 3600 + 42 * 60 + 48) * 1000);
  });

  test("has all 20 milestones from spec", () => {
    expect(data.milestones).toHaveLength(20);
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

  test("TLI milestone is at approximately MET 1d 1h 8m 42s", () => {
    const tli = data.milestones.find((m) => m.name === "Trans-Lunar Injection");
    expect(tli).toBeDefined();
    expect(tli!.metMs).toBe((1 * 24 * 3600 + 1 * 3600 + 8 * 60 + 42) * 1000);
  });

  test("Lunar Close Approach milestone is at MET 5d 0h 29m 59s", () => {
    const lca = data.milestones.find((m) => m.name === "Lunar Close Approach");
    expect(lca).toBeDefined();
    expect(lca!.metMs).toBe((5 * 24 * 3600 + 0 * 3600 + 29 * 60 + 59) * 1000);
  });
});
