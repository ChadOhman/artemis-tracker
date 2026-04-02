// __tests__/lib/telemetry/sse-manager.test.ts
import { SseManager } from "@/lib/telemetry/sse-manager";

describe("SseManager", () => {
  let manager: SseManager;

  beforeEach(() => {
    manager = new SseManager();
  });

  test("client count starts at zero", () => {
    expect(manager.getClientCount()).toBe(0);
  });

  test("encodeEvent formats SSE correctly", () => {
    const data = { metMs: 3600000, speedKmS: 7.8 };
    const encoded = SseManager.encodeEvent("telemetry", data);
    expect(encoded).toBe(`event: telemetry\ndata: ${JSON.stringify(data)}\n\n`);
  });

  test("encodeKeepAlive returns SSE comment", () => {
    const encoded = SseManager.encodeKeepAlive();
    expect(encoded).toBe(":keepalive\n\n");
  });
});
