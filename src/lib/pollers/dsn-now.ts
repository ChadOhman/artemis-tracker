// src/lib/pollers/dsn-now.ts
import { XMLParser } from "fast-xml-parser";
import { DSN_NOW_URL, DSN_SPACECRAFT_ID } from "../constants";
import type { DsnDish, DsnStatus } from "../types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export function parseDsnXml(xml: string): DsnStatus {
  const parsed = parser.parse(xml);
  const dishes: DsnDish[] = [];
  const stations = toArray(parsed?.dsn?.station);
  const timestamp = parsed?.dsn?.timestamp
    ? new Date(Number(parsed.dsn.timestamp)).toISOString()
    : new Date().toISOString();

  for (const station of stations) {
    const stationDishes = toArray(station.dish);
    for (const dish of stationDishes) {
      const downSignals = toArray(dish.downSignal);
      const upSignals = toArray(dish.upSignal);
      const targets = toArray(dish.target);

      const art2Down = downSignals.find((s: any) => s["@_spacecraft"] === DSN_SPACECRAFT_ID);
      const art2Up = upSignals.find((s: any) => s["@_spacecraft"] === DSN_SPACECRAFT_ID);
      const art2Target = targets.find((t: any) => t["@_name"] === DSN_SPACECRAFT_ID);

      if (!art2Down && !art2Up && !art2Target) continue;

      dishes.push({
        dish: dish["@_name"],
        station: station["@_name"],
        stationName: station["@_friendlyName"],
        azimuth: parseFloat(dish["@_azimuthAngle"]) || 0,
        elevation: parseFloat(dish["@_elevationAngle"]) || 0,
        downlinkActive: art2Down?.["@_active"] === "true",
        downlinkRate: parseFloat(art2Down?.["@_dataRate"] || "0"),
        downlinkBand: art2Down?.["@_band"] || "",
        uplinkActive: art2Up?.["@_active"] === "true",
        uplinkRate: parseFloat(art2Up?.["@_dataRate"] || "0"),
        uplinkBand: art2Up?.["@_band"] || "",
        rangeKm: parseFloat(art2Target?.["@_downlegRange"] || "0"),
        rtltSeconds: parseFloat(art2Target?.["@_rtlt"] || "0"),
      });
    }
  }

  return { timestamp, dishes, signalActive: dishes.some((d) => d.downlinkActive || d.uplinkActive) };
}

export async function pollDsnNow(): Promise<DsnStatus> {
  try {
    const res = await fetch(DSN_NOW_URL);
    const xml = await res.text();
    return parseDsnXml(xml);
  } catch (error) {
    console.error("DSN Now poll failed:", error);
    return { timestamp: new Date().toISOString(), dishes: [], signalActive: false };
  }
}
