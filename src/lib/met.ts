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

/** Format a MET in milliseconds as a UTC wall-clock string (YYYY-MM-DD HH:MM:SSZ). */
export function formatUtcFromMet(metMs: number): string {
  const date = new Date(LAUNCH_TIME_MS + metMs);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:${s}Z`;
}

/** Short form: MMM DD HH:MM UTC */
export function formatUtcShort(metMs: number): string {
  const date = new Date(LAUNCH_TIME_MS + metMs);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[date.getUTCMonth()];
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${m} ${d} ${h}:${min}Z`;
}
