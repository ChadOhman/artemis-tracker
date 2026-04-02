// src/lib/telemetry/cache.ts
import type { StateVector, Telemetry } from "../types";
import { promises as fs } from "fs";
import path from "path";

interface CacheEntry {
  stateVector: StateVector;
  telemetry: Telemetry;
  moonPosition: { x: number; y: number; z: number };
}

const HISTORY_FILE = path.join(process.cwd(), "data", "telemetry-history.json");

export class TelemetryCache {
  private entries: CacheEntry[] = [];
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  push(
    stateVector: StateVector,
    telemetry: Telemetry,
    moonPosition: { x: number; y: number; z: number }
  ): void {
    this.entries.push({ stateVector, telemetry, moonPosition });
    this.schedulePersist();
  }

  getLatest(): CacheEntry | null {
    if (this.entries.length === 0) return null;
    return this.entries[this.entries.length - 1];
  }

  getHistory(fromMetMs: number, toMetMs: number): StateVector[] {
    return this.entries
      .filter(
        (e) =>
          e.stateVector.metMs >= fromMetMs && e.stateVector.metMs <= toMetMs
      )
      .map((e) => e.stateVector);
  }

  getEntries(): CacheEntry[] {
    return this.entries;
  }

  private schedulePersist(): void {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(async () => {
      this.persistTimer = null;
      await this.persistToDisk();
    }, 10000);
  }

  private async persistToDisk(): Promise<void> {
    try {
      const data = this.entries.map((e) => e.stateVector);
      await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2));
    } catch {
      // Best-effort persistence
    }
  }

  async loadFromDisk(): Promise<void> {
    try {
      const raw = await fs.readFile(HISTORY_FILE, "utf-8");
      const vectors: StateVector[] = JSON.parse(raw);
      for (const sv of vectors) {
        this.entries.push({
          stateVector: sv,
          telemetry: {
            metMs: sv.metMs,
            speedKmS: 0, speedKmH: 0, altitudeKm: 0, earthDistKm: 0,
            moonDistKm: 0, periapsisKm: 0, apoapsisKm: 0, gForce: 0,
          },
          moonPosition: { x: 0, y: 0, z: 0 },
        });
      }
    } catch {
      // No history file yet
    }
  }
}
