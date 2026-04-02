import { getTimelineData } from "@/lib/timeline/data";

describe("timeline API data", () => {
  test("getTimelineData returns complete structure for API consumption", () => {
    const data = getTimelineData();
    expect(data).toHaveProperty("milestones");
    expect(data).toHaveProperty("phases");
    expect(data).toHaveProperty("activities");
    expect(data).toHaveProperty("attitudes");
    expect(data.milestones.length).toBe(20);
  });
});
