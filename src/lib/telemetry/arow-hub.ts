// src/lib/telemetry/arow-hub.ts
// Singleton AROW poller shared by all SSE endpoints and REST routes.
// Previously /api/telemetry/stream and /api/arow/stream each ran their own
// 1 Hz poller, double-fetching from NASA's GCS bucket and duplicating state.
// This hub polls once and fans out to all subscribers.

import { pollArow } from "@/lib/pollers/arow";
import { AROW_POLL_INTERVAL_MS } from "@/lib/constants";
import type { ArowTelemetry } from "@/lib/types";

type Listener = (arow: ArowTelemetry) => void;

class ArowHub {
  private listeners: Set<Listener> = new Set();
  private timer: ReturnType<typeof setInterval> | null = null;
  private _latest: ArowTelemetry | null = null;

  get latest(): ArowTelemetry | null {
    return this._latest;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.ensurePolling();
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Start polling if not already running. Safe to call repeatedly. */
  ensurePolling(): void {
    if (this.timer) return;
    const tick = async (): Promise<void> => {
      const arow = await pollArow();
      if (!arow) return;
      this._latest = arow;
      for (const l of this.listeners) {
        try {
          l(arow);
        } catch {
          /* listener error — non-fatal */
        }
      }
    };
    tick();
    this.timer = setInterval(tick, AROW_POLL_INTERVAL_MS);
  }
}

export const arowHub = new ArowHub();
