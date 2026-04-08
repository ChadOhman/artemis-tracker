// src/lib/splashdown.ts
// Persistent splashdown trigger flag — survives server restarts via disk.

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const SPLASHDOWN_PATH = path.join(process.cwd(), "data", "splashdown.json");

// Load from disk on module init (server startup)
let triggered: boolean = false;
try {
  if (existsSync(SPLASHDOWN_PATH)) {
    const data = JSON.parse(readFileSync(SPLASHDOWN_PATH, "utf-8"));
    triggered = data.triggered === true;
  }
} catch {
  // Corrupt or missing file — default to false
}

export function getSplashdownTriggered(): boolean {
  return triggered;
}

export function setSplashdownTriggered(value: boolean): void {
  triggered = value;
  writeFileSync(SPLASHDOWN_PATH, JSON.stringify({ triggered: value }), "utf-8");
}
