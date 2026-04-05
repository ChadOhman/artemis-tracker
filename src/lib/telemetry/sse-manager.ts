// src/lib/telemetry/sse-manager.ts
import { SSE_KEEPALIVE_INTERVAL_MS } from "../constants";

type SseClient = {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
};

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
    const client: SseClient = { controller, encoder: new TextEncoder() };
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
    const message = SseManager.encodeEvent(event, data);
    for (const client of this.clients) {
      try {
        client.controller.enqueue(client.encoder.encode(message));
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
      const message = SseManager.encodeKeepAlive();
      for (const client of this.clients) {
        try {
          client.controller.enqueue(client.encoder.encode(message));
        } catch {
          this.clients.delete(client);
        }
      }
    }, SSE_KEEPALIVE_INTERVAL_MS);
  }
}
