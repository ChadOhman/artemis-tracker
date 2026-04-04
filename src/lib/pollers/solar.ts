// src/lib/pollers/solar.ts
// Polls NOAA Space Weather Prediction Center for real-time solar activity.
// Data relevant to Artemis II crew radiation exposure.

export interface SolarActivity {
  timestamp: string;
  kpIndex: number;         // Planetary K-index (0-9), geomagnetic storm scale
  kpLabel: string;         // "Quiet" / "Active" / "Storm" / "Severe Storm"
  xrayFlux: number;        // GOES X-ray flux (W/m²), 0.1-0.8nm band
  xrayClass: string;       // Solar flare class: "A" / "B" / "C" / "M" / "X"
  protonFlux1MeV: number;  // Proton flux ≥1 MeV (pfu)
  protonFlux10MeV: number; // Proton flux ≥10 MeV (pfu) — radiation storm threshold
  protonFlux100MeV: number;// Proton flux ≥100 MeV (pfu) — dangerous to crew
  radiationRisk: "low" | "moderate" | "high" | "severe";
}

const SWPC_BASE = "https://services.swpc.noaa.gov/json";
const KP_URL = `${SWPC_BASE}/planetary_k_index_1m.json`;
const XRAY_URL = `${SWPC_BASE}/goes/primary/xrays-6-hour.json`;
const PROTON_URL = `${SWPC_BASE}/goes/primary/integral-protons-1-day.json`;

function classifyKp(kp: number): string {
  if (kp < 4) return "Quiet";
  if (kp < 5) return "Active";
  if (kp < 7) return "Storm";
  return "Severe Storm";
}

function classifyXray(flux: number): string {
  if (flux < 1e-7) return "A";
  if (flux < 1e-6) return "B";
  if (flux < 1e-5) return "C";
  if (flux < 1e-4) return "M";
  return "X";
}

function classifyRadiationRisk(
  kp: number,
  proton10MeV: number,
  xrayFlux: number
): "low" | "moderate" | "high" | "severe" {
  // NOAA S-scale: proton flux ≥10 MeV thresholds
  if (proton10MeV >= 1000 || kp >= 8) return "severe";
  if (proton10MeV >= 100 || kp >= 7 || xrayFlux >= 1e-4) return "high";
  if (proton10MeV >= 10 || kp >= 5 || xrayFlux >= 1e-5) return "moderate";
  return "low";
}

export async function pollSolarActivity(): Promise<SolarActivity | null> {
  try {
    const [kpRes, xrayRes, protonRes] = await Promise.all([
      fetch(KP_URL, { signal: AbortSignal.timeout(10000) }),
      fetch(XRAY_URL, { signal: AbortSignal.timeout(10000) }),
      fetch(PROTON_URL, { signal: AbortSignal.timeout(10000) }),
    ]);

    const [kpData, xrayData, protonData] = await Promise.all([
      kpRes.json() as Promise<{ time_tag: string; estimated_kp: number }[]>,
      xrayRes.json() as Promise<{ time_tag: string; flux: number; energy: string }[]>,
      protonRes.json() as Promise<{ time_tag: string; flux: number; energy: string }[]>,
    ]);

    // Latest Kp
    const latestKp = kpData[kpData.length - 1];
    const kpIndex = latestKp?.estimated_kp ?? 0;

    // Latest X-ray (0.1-0.8nm band)
    const xrayEntries = xrayData.filter((e) => e.energy === "0.1-0.8nm");
    const latestXray = xrayEntries[xrayEntries.length - 1];
    const xrayFlux = latestXray?.flux ?? 0;

    // Latest proton fluxes by energy threshold
    const latest1MeV = protonData.filter((e) => e.energy === ">=1 MeV");
    const latest10MeV = protonData.filter((e) => e.energy === ">=10 MeV");
    const latest100MeV = protonData.filter((e) => e.energy === ">=100 MeV");

    const protonFlux1MeV = latest1MeV[latest1MeV.length - 1]?.flux ?? 0;
    const protonFlux10MeV = latest10MeV[latest10MeV.length - 1]?.flux ?? 0;
    const protonFlux100MeV = latest100MeV[latest100MeV.length - 1]?.flux ?? 0;

    const timestamp = latestKp?.time_tag ?? new Date().toISOString();

    return {
      timestamp,
      kpIndex: Math.round(kpIndex * 10) / 10,
      kpLabel: classifyKp(kpIndex),
      xrayFlux,
      xrayClass: classifyXray(xrayFlux),
      protonFlux1MeV,
      protonFlux10MeV,
      protonFlux100MeV,
      radiationRisk: classifyRadiationRisk(kpIndex, protonFlux10MeV, xrayFlux),
    };
  } catch (error) {
    console.error("Solar activity poll failed:", error);
    return null;
  }
}
