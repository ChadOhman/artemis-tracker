// src/app/api/recovery-ship/route.ts
// Returns the latest known position of the Artemis II recovery ship
// (USS John P. Murtha). Real AIS data when available, hardcoded
// staging area otherwise.

import {
  getRecoveryShipPosition,
  RECOVERY_SHIP_NAME,
  RECOVERY_SHIP_HULL,
  RECOVERY_SHIP_MMSI,
} from "@/lib/pollers/ais-recovery-ship";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const position = getRecoveryShipPosition();
  return Response.json({
    name: RECOVERY_SHIP_NAME,
    hull: RECOVERY_SHIP_HULL,
    mmsi: RECOVERY_SHIP_MMSI,
    ...position,
  });
}
