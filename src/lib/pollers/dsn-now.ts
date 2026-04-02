// src/lib/pollers/dsn-now.ts
import { XMLParser } from "fast-xml-parser";
import { DSN_NOW_URL, DSN_SPACECRAFT_ID } from "../constants";
import type { DsnDish, DsnStatus } from "../types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Preserve order so we can associate dishes with their preceding station
  preserveOrder: true,
});

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Parse DSN Now XML feed.
 *
 * The real XML structure has stations and dishes as SIBLINGS under <dsn>,
 * not nested. Stations are self-closing tags that act as group markers:
 *
 *   <dsn>
 *     <station name="gdscc" friendlyName="Goldstone" .../>
 *     <dish name="DSS24" ...>...</dish>
 *     <dish name="DSS26" ...>...</dish>
 *     <station name="mdscc" friendlyName="Madrid" .../>
 *     <dish name="DSS54" ...>...</dish>
 *     <timestamp>...</timestamp>
 *   </dsn>
 *
 * We use preserveOrder mode to iterate children sequentially,
 * tracking the current station context.
 */
export function parseDsnXml(xml: string): DsnStatus {
  const dishes: DsnDish[] = [];
  let timestamp = new Date().toISOString();

  try {
    const parsed = parser.parse(xml);

    // With preserveOrder, parsed is an array of ordered elements
    // Find the <dsn> element
    const dsnElement = parsed.find((el: any) => el.dsn !== undefined);
    if (!dsnElement) return { timestamp, dishes: [], signalActive: false };

    const children: any[] = dsnElement.dsn || [];

    let currentStation = "";
    let currentStationName = "";

    for (const child of children) {
      // Station marker — update current station context
      if (child.station !== undefined) {
        const attrs = child[":@"] || {};
        currentStation = attrs["@_name"] || "";
        currentStationName = attrs["@_friendlyName"] || "";
        continue;
      }

      // Timestamp
      if (child.timestamp !== undefined) {
        const tsChildren = child.timestamp;
        if (Array.isArray(tsChildren) && tsChildren.length > 0 && tsChildren[0]["#text"] !== undefined) {
          timestamp = new Date(Number(tsChildren[0]["#text"])).toISOString();
        }
        continue;
      }

      // Dish element
      if (child.dish === undefined) continue;

      const dishAttrs = child[":@"] || {};
      const dishName = dishAttrs["@_name"] || "";
      const dishChildren: any[] = child.dish || [];

      let hasEM2 = false;
      let downlinkActive = false;
      let downlinkRate = 0;
      let downlinkBand = "";
      let uplinkActive = false;
      let uplinkRate = 0;
      let uplinkBand = "";
      let rangeKm = 0;
      let rtltSeconds = 0;

      for (const signal of dishChildren) {
        if (signal.downSignal !== undefined) {
          const sAttrs = signal[":@"] || {};
          if (sAttrs["@_spacecraft"] === DSN_SPACECRAFT_ID) {
            hasEM2 = true;
            if (sAttrs["@_active"] === "true") {
              downlinkActive = true;
              downlinkRate = parseFloat(sAttrs["@_dataRate"] || "0");
              downlinkBand = sAttrs["@_band"] || "";
            }
          }
        }

        if (signal.upSignal !== undefined) {
          const sAttrs = signal[":@"] || {};
          if (sAttrs["@_spacecraft"] === DSN_SPACECRAFT_ID) {
            hasEM2 = true;
            if (sAttrs["@_active"] === "true") {
              uplinkActive = true;
              uplinkRate = parseFloat(sAttrs["@_dataRate"] || "0");
              uplinkBand = sAttrs["@_band"] || "";
            }
          }
        }

        if (signal.target !== undefined) {
          const tAttrs = signal[":@"] || {};
          if (tAttrs["@_name"] === DSN_SPACECRAFT_ID) {
            hasEM2 = true;
            rangeKm = parseFloat(tAttrs["@_downlegRange"] || "0");
            rtltSeconds = parseFloat(tAttrs["@_rtlt"] || "0");
          }
        }
      }

      if (!hasEM2) continue;

      dishes.push({
        dish: dishName,
        station: currentStation,
        stationName: currentStationName,
        azimuth: parseFloat(dishAttrs["@_azimuthAngle"] || "0"),
        elevation: parseFloat(dishAttrs["@_elevationAngle"] || "0"),
        downlinkActive,
        downlinkRate,
        downlinkBand,
        uplinkActive,
        uplinkRate,
        uplinkBand,
        rangeKm,
        rtltSeconds,
      });
    }
  } catch (error) {
    console.error("DSN XML parse error:", error);
  }

  return { timestamp, dishes, signalActive: dishes.some((d) => d.downlinkActive || d.uplinkActive) };
}

/** Fetch and parse current DSN status */
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
