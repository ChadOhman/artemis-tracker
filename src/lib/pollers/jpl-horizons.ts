// src/lib/pollers/jpl-horizons.ts
import { JPL_HORIZONS_API, JPL_SPACECRAFT_ID } from "../constants";
import { utcToMetMs } from "../met";
import type { StateVector } from "../types";

export function buildHorizonsUrl(target: string, time: Date): string {
  const start = time.toISOString().replace("T", " ").slice(0, 19);
  const stop = new Date(time.getTime() + 60000).toISOString().replace("T", " ").slice(0, 19);

  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${target}'`,
    EPHEM_TYPE: "'VECTORS'",
    CENTER: "'500@399'",
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: "'1'",
    VEC_TABLE: "'2'",
  });

  return `${JPL_HORIZONS_API}?${params.toString()}`;
}

export function parseHorizonsResponse(result: string): StateVector[] {
  const vectors: StateVector[] = [];
  const soeIdx = result.indexOf("$$SOE");
  const eoeIdx = result.indexOf("$$EOE");
  if (soeIdx === -1 || eoeIdx === -1) return vectors;

  const block = result.slice(soeIdx + 5, eoeIdx).trim();
  const lines = block.split("\n").map((l) => l.trim());

  let i = 0;
  while (i < lines.length) {
    if (!lines[i].includes("A.D.")) { i++; continue; }

    const dateMatch = lines[i].match(
      /A\.D\.\s+(\d{4})-([A-Za-z]+)-(\d{2})\s+(\d{2}:\d{2}:\d{2})/
    );
    if (!dateMatch) { i++; continue; }

    const monthMap: Record<string, string> = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04",
      May: "05", Jun: "06", Jul: "07", Aug: "08",
      Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };
    const month = monthMap[dateMatch[2]] || "01";
    const timestamp = `${dateMatch[1]}-${month}-${dateMatch[3]}T${dateMatch[4]}Z`;

    i++;
    if (i >= lines.length) break;
    const posMatch = lines[i].match(
      /X\s*=\s*([-\d.E+]+)\s+Y\s*=\s*([-\d.E+]+)\s+Z\s*=\s*([-\d.E+]+)/
    );
    if (!posMatch) continue;

    i++;
    if (i >= lines.length) break;
    const velMatch = lines[i].match(
      /VX\s*=\s*([-\d.E+]+)\s+VY\s*=\s*([-\d.E+]+)\s+VZ\s*=\s*([-\d.E+]+)/
    );
    if (!velMatch) continue;

    vectors.push({
      timestamp,
      metMs: utcToMetMs(timestamp),
      position: {
        x: parseFloat(posMatch[1]),
        y: parseFloat(posMatch[2]),
        z: parseFloat(posMatch[3]),
      },
      velocity: {
        x: parseFloat(velMatch[1]),
        y: parseFloat(velMatch[2]),
        z: parseFloat(velMatch[3]),
      },
    });
    i++;
  }
  return vectors;
}

export async function pollJplHorizons(): Promise<{
  orion: StateVector | null;
  moonPosition: { x: number; y: number; z: number } | null;
}> {
  const now = new Date();
  try {
    const [orionRes, moonRes] = await Promise.all([
      fetch(buildHorizonsUrl(JPL_SPACECRAFT_ID, now)),
      fetch(buildHorizonsUrl("301", now)),
    ]);
    const [orionJson, moonJson] = await Promise.all([orionRes.json(), moonRes.json()]);
    const orionVectors = parseHorizonsResponse(orionJson.result || "");
    const moonVectors = parseHorizonsResponse(moonJson.result || "");
    return {
      orion: orionVectors.length > 0 ? orionVectors[0] : null,
      moonPosition: moonVectors.length > 0 ? moonVectors[0].position : null,
    };
  } catch (error) {
    console.error("JPL Horizons poll failed:", error);
    return { orion: null, moonPosition: null };
  }
}
