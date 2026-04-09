// src/lib/radiation.ts

export interface RadiationEstimate {
  missionDoseGcr: number;     // mSv from GCR (cumulative)
  missionDoseSep: number;     // mSv from solar events (cumulative)
  missionDoseBelt: number;    // mSv from Van Allen belt passage
  totalDose: number;          // total mSv
  dailyRate: number;          // current mSv/day
  riskLevel: "nominal" | "elevated" | "high";
  riskDescription: string;
  annualLimitPercent: number; // percent of NASA's 500 mSv annual limit
}

const GCR_RATE_MSV_PER_DAY = 0.7;  // average GCR in cislunar space
const BELT_DOSE_OUTBOUND_MSV = 5.0;       // estimated outbound Van Allen belt transit dose
const BELT_OUTBOUND_START_MS = 0;         // belt exposure starts at launch
const BELT_OUTBOUND_END_MS = 2 * 3600 * 1000; // ~2 hours in belts (slower, higher dose)
const BELT_DOSE_RETURN_MSV = 2.0;         // return transit — faster pass, less exposure
const BELT_RETURN_START_MS = 216.5 * 3600 * 1000; // ~MET 216.5h, approaching entry interface
const BELT_RETURN_END_MS = 217 * 3600 * 1000;     // ~30 min transit at re-entry speed
const NASA_ANNUAL_LIMIT_MSV = 500;

/**
 * Estimate cumulative radiation dose based on mission elapsed time
 * and current solar proton flux.
 *
 * @param metMs - current mission elapsed time in milliseconds
 * @param proton10MeV - current proton flux ≥10 MeV in pfu (from NOAA)
 */
export function estimateRadiation(metMs: number, proton10MeV: number): RadiationEstimate {
  const missionDays = metMs / (24 * 3600 * 1000);

  // GCR: constant rate throughout mission
  const missionDoseGcr = missionDays * GCR_RATE_MSV_PER_DAY;

  // Van Allen belts: outbound (launch, ~2h) and return (re-entry, ~30min)
  const outboundFraction = Math.min(1, Math.max(0,
    (Math.min(metMs, BELT_OUTBOUND_END_MS) - BELT_OUTBOUND_START_MS) / (BELT_OUTBOUND_END_MS - BELT_OUTBOUND_START_MS)
  ));
  const returnFraction = Math.min(1, Math.max(0,
    (Math.min(metMs, BELT_RETURN_END_MS) - BELT_RETURN_START_MS) / (BELT_RETURN_END_MS - BELT_RETURN_START_MS)
  ));
  const missionDoseBelt = (BELT_DOSE_OUTBOUND_MSV * outboundFraction) + (BELT_DOSE_RETURN_MSV * returnFraction);

  // SEP: derived from proton flux
  // At 10 pfu (S1 minor storm): ~0.1 mSv/hr additional
  // At 100 pfu (S2 moderate): ~1.0 mSv/hr
  // At 1000 pfu (S3 strong): ~10 mSv/hr
  const sepRateMsvPerHr = proton10MeV > 0 ? Math.log10(Math.max(1, proton10MeV)) * 0.05 : 0;
  // Rough cumulative estimate — assume current rate has been sustained
  // (In production, this would integrate over the archived solar history)
  const missionDoseSep = sepRateMsvPerHr * missionDays * 24 * 0.1; // 10% duty cycle estimate

  const totalDose = missionDoseGcr + missionDoseBelt + missionDoseSep;
  const dailyRate = GCR_RATE_MSV_PER_DAY + sepRateMsvPerHr * 24;

  const annualLimitPercent = (totalDose / NASA_ANNUAL_LIMIT_MSV) * 100;

  let riskLevel: "nominal" | "elevated" | "high";
  let riskDescription: string;

  if (proton10MeV >= 100 || dailyRate > 5) {
    riskLevel = "high";
    riskDescription = "Solar particle event — crew in shelter recommended";
  } else if (proton10MeV >= 10 || dailyRate > 2) {
    riskLevel = "elevated";
    riskDescription = "Elevated solar activity — monitoring radiation levels";
  } else {
    riskLevel = "nominal";
    riskDescription = "Normal deep space radiation environment";
  }

  return {
    missionDoseGcr: Math.round(missionDoseGcr * 100) / 100,
    missionDoseSep: Math.round(missionDoseSep * 100) / 100,
    missionDoseBelt: Math.round(missionDoseBelt * 100) / 100,
    totalDose: Math.round(totalDose * 100) / 100,
    dailyRate: Math.round(dailyRate * 100) / 100,
    riskLevel,
    riskDescription,
    annualLimitPercent: Math.round(annualLimitPercent * 10) / 10,
  };
}
