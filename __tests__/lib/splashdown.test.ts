import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import path from "path";

// We test the module's file I/O logic directly
const SPLASHDOWN_PATH = path.join(process.cwd(), "data", "splashdown.json");

// Clean up before/after tests
function cleanup() {
  try { unlinkSync(SPLASHDOWN_PATH); } catch { /* ignore */ }
}

describe("splashdown flag", () => {
  beforeEach(cleanup);
  afterAll(cleanup);

  test("getSplashdownTriggered returns false when file does not exist", async () => {
    jest.resetModules();
    const { getSplashdownTriggered } = await import("@/lib/splashdown");
    expect(getSplashdownTriggered()).toBe(false);
  });

  test("setSplashdownTriggered(true) persists to disk and updates in-memory cache", async () => {
    jest.resetModules();
    const { setSplashdownTriggered, getSplashdownTriggered } = await import("@/lib/splashdown");
    setSplashdownTriggered(true);
    expect(getSplashdownTriggered()).toBe(true);
    const data = JSON.parse(readFileSync(SPLASHDOWN_PATH, "utf-8"));
    expect(data.triggered).toBe(true);
  });

  test("setSplashdownTriggered(false) retracts and persists", async () => {
    jest.resetModules();
    const { setSplashdownTriggered, getSplashdownTriggered } = await import("@/lib/splashdown");
    setSplashdownTriggered(true);
    setSplashdownTriggered(false);
    expect(getSplashdownTriggered()).toBe(false);
    const data = JSON.parse(readFileSync(SPLASHDOWN_PATH, "utf-8"));
    expect(data.triggered).toBe(false);
  });

  test("flag survives module reload (simulates server restart)", async () => {
    jest.resetModules();
    const mod1 = await import("@/lib/splashdown");
    mod1.setSplashdownTriggered(true);

    jest.resetModules();
    const mod2 = await import("@/lib/splashdown");
    expect(mod2.getSplashdownTriggered()).toBe(true);
  });
});
