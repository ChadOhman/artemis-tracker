// src/lib/met.ts
import { LAUNCH_TIME_MS } from "./constants";

export function utcToMetMs(utcIso: string): number {
  return new Date(utcIso).getTime() - LAUNCH_TIME_MS;
}

export function metMsToUtc(metMs: number): string {
  return new Date(LAUNCH_TIME_MS + metMs).toISOString();
}

export function formatMet(metMs: number): string {
  const negative = metMs < 0;
  const totalSeconds = Math.floor(Math.abs(metMs) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted =
    String(days).padStart(3, "0") +
    ":" +
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0");

  return negative ? `-${formatted}` : formatted;
}

export function getCurrentMetMs(): number {
  return Date.now() - LAUNCH_TIME_MS;
}
