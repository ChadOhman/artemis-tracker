// src/lib/telemetry/sse-manager.ts
import { SSE_KEEPALIVE_INTERVAL_MS } from "../constants";

type SseClient = {
  controller: ReadableStreamDefaultController;
};

// Shared encoder — TextEncoder is stateless, no reason to allocate per-client.
const SHARED_ENCODER = new TextEncoder();
// Pre-encoded keepalive frame — never changes, compute once at module load.
const KEEPALIVE_BYTES = SHARED_ENCODER.encode(":keepalive\n\n");

export class SseManager {
  private clients: Set<SseClient> = new Set();
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  static encodeEvent(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  static encodeKeepAlive(): string {
    return ":keepalive\n\n";
  }

  addClient(controller: ReadableStreamDefaultController): () => void {
    const client: SseClient = { controller };
    this.clients.add(client);
    this.ensureKeepalive();
    return () => {
      this.clients.delete(client);
      if (this.clients.size === 0 && this.keepaliveTimer) {
        clearInterval(this.keepaliveTimer);
        this.keepaliveTimer = null;
      }
    };
  }

  broadcast(event: string, data: unknown): void {
    // Encode once — identical bytes go to every client. At 1000 clients this
    // replaces 1000× TextEncoder.encode() calls with a single one.
    const bytes = SHARED_ENCODER.encode(SseManager.encodeEvent(event, data));
    for (const client of this.clients) {
      try {
        client.controller.enqueue(bytes);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  public get clientCount(): number {
    return this.clients.size;
  }

  private ensureKeepalive(): void {
    if (this.keepaliveTimer) return;
    this.keepaliveTimer = setInterval(() => {
      for (const client of this.clients) {
        try {
          client.controller.enqueue(KEEPALIVE_BYTES);
        } catch {
          this.clients.delete(client);
        }
      }
    }, SSE_KEEPALIVE_INTERVAL_MS);
  }
}
