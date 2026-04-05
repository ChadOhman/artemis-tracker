import type { Locale } from "@/lib/i18n";

export const ACTIVITY_NAME_TRANSLATIONS: Record<string, string> = {
  "Sleep period": "Période de sommeil",
  "Wake & meal": "Réveil et repas",
  "Crew meal": "Repas équipage",
  "Exercise": "Exercice",
  "Crew exercise": "Exercice d'équipage",
  "Personal time": "Temps libre",
  "Off-duty time": "Temps libre",
  "Launch & ascent": "Lancement et ascension",
  "Orbital insertion burns": "Brûlages d'insertion orbitale",
  "Post-insertion checks": "Vérifications post-insertion",
  "Proximity operations demo": "Démo d'opérations de proximité",
  "Orion systems checkout": "Vérification des systèmes Orion",
  "TLI burn conference": "Conférence brûlage TLI",
  "Translunar injection burn": "Brûlage d'injection translunaire",
  "TLI burn preparation": "Préparation brûlage TLI",
  "Post-TLI checks": "Vérifications post-TLI",
  "Video downlink & crew meal": "Liaison vidéo et repas équipage",
  "Video downlink": "Liaison vidéo",
  "Crew meal & pre-sleep": "Repas et pré-sommeil",
  "Trajectory correction burn #1 prep": "Préparation brûlage correction #1",
  "Trajectory correction burn #2 prep": "Préparation brûlage correction #2",
  "Trajectory correction burn #3 prep": "Préparation brûlage correction #3",
  "Outbound trajectory correction burn #1": "Brûlage correction sortant #1",
  "Outbound trajectory correction burn #2": "Brûlage correction sortant #2",
  "Outbound trajectory correction burn #3": "Brûlage correction sortant #3",
  "Return trajectory correction burn #1": "Brûlage correction retour #1",
  "Return trajectory correction burn #2": "Brûlage correction retour #2",
  "CPR & medical kit demo": "Démo RCR et trousse médicale",
  "DSN emergency comms test": "Test comm. d'urgence DSN",
  "Lunar flyby rehearsal": "Répétition survol lunaire",
  "Exercise & personal time": "Exercice et temps libre",
  "Exercise & crew meal": "Exercice et repas équipage",
  "Crew meal & rest": "Repas et repos",
  "Celestial photography": "Photographie céleste",
  "Lunar target study": "Étude cibles lunaires",
  "Spacesuit pressure testing": "Test pression combinaison",
  "Wake early — lunar flyby day": "Réveil tôt — jour du survol",
  "Crew meal & flyby prep": "Repas et préparation survol",
  "Lunar flyby — photography & observations": "Survol lunaire — photos et observations",
  "Solar eclipse observation": "Observation éclipse solaire",
  "Far-side transit — loss of signal": "Transit face cachée — perte de signal",
  "Post-flyby science & observation": "Science et observation post-survol",
  "Crew lunar debrief": "Débriefing lunaire équipage",
  "Radiation shelter demonstration": "Démo abri anti-radiation",
  "Manual piloting demonstration": "Démo pilotage manuel",
  "Video downlink & personal time": "Liaison vidéo et temps libre",
  "Re-entry & splashdown procedure review": "Révision procédure rentrée et amerrissage",
  "Waste system & garment testing": "Test système déchets et vêtements",
  "Wake early — re-entry day": "Réveil tôt — jour rentrée",
  "Final stow & cabin prep": "Rangement final et préparation cabine",
  "Don spacesuits for re-entry": "Revêtir combinaisons pour rentrée",
  "Service module separation": "Séparation module service",
  "Atmospheric re-entry": "Rentrée atmosphérique",
  "Parachute descent": "Descente sous parachute",
  "Splashdown & recovery": "Amerrissage et récupération",
  "Sleep Period 1": "Période de sommeil 1",
  "Sleep Period 2": "Période de sommeil 2",
  "Sleep": "Sommeil",
};

export function translateActivityName(name: string, locale: Locale): string {
  if (locale === "en") return name;
  return ACTIVITY_NAME_TRANSLATIONS[name] ?? name;
}

export const MILESTONE_NAME_TRANSLATIONS: Record<string, string> = {
  "Launch": "Lancement",
  "Perigee Raise Burn": "Brûlage rehaussement périgée",
  "Apogee Raise Burn": "Brûlage rehaussement apogée",
  "Orion/ICPS Separation": "Séparation Orion/ICPS",
  "Trans-Lunar Injection": "Injection translunaire",
  "OTC-1": "OTC-1",
  "OTC-2": "OTC-2",
  "OTC-3": "OTC-3",
  "Lunar SOI Entry": "Entrée SOI lunaire",
  "Lunar Close Approach": "Approche rapprochée lunaire",
  "Max Earth Distance": "Distance max de la Terre",
  "Lunar SOI Exit": "Sortie SOI lunaire",
  "RTC-1": "RTC-1",
  "RTC-2": "RTC-2",
  "RTC-3": "RTC-3",
  "CM/SM Separation": "Séparation CM/SM",
  "Entry Interface": "Interface de rentrée",
  "Splashdown": "Amerrissage",
};

export function translateMilestoneName(name: string, locale: Locale): string {
  if (locale === "en") return name;
  return MILESTONE_NAME_TRANSLATIONS[name] ?? name;
}

export const PHASE_TRANSLATIONS: Record<string, string> = {
  "Prelaunch": "Pré-lancement",
  "LEO": "OBT",
  "High Earth Orbit": "Orbite terrestre haute",
  "Trans-Lunar": "Trans-lunaire",
  "Trans-Earth": "Trans-terrestre",
  "EDL": "ERD",
  "Recovery": "Récupération",
};

export function translateMissionPhase(phase: string, locale: Locale): string {
  if (locale === "en") return phase;
  return PHASE_TRANSLATIONS[phase] ?? phase;
}
