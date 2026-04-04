// src/lib/alpaca.ts
// ASCOM Alpaca REST API client for telescope control.
// Alpaca is the HTTP/REST standard for astronomical instrument control.
// Works with SeeStar, Vaonis, DWARFLAB, and any ASCOM-compatible telescope.

export interface AlpacaDevice {
  DeviceName: string;
  DeviceType: string;
  DeviceNumber: number;
  UniqueID: string;
}

export interface AlpacaState {
  connected: boolean;
  tracking: boolean;
  slewing: boolean;
  ra: number;      // current RA in hours
  dec: number;     // current Dec in degrees
  error: string | null;
}

const CLIENT_ID = 1;
let transactionId = 0;

function nextTx(): number {
  return ++transactionId;
}

/**
 * Discover Alpaca devices on the given host.
 */
export async function discoverDevices(host: string): Promise<AlpacaDevice[]> {
  const res = await fetch(`http://${host}/management/v1/configureddevices`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Alpaca discovery failed: ${res.status}`);
  const data = await res.json();
  return data.Value || [];
}

/**
 * Connect to a telescope.
 */
export async function connectTelescope(host: string, deviceNum = 0): Promise<void> {
  const res = await fetch(
    `http://${host}/api/v1/telescope/${deviceNum}/connected`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `Connected=true&ClientID=${CLIENT_ID}&ClientTransactionID=${nextTx()}`,
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) throw new Error(`Connect failed: ${res.status}`);
  const data = await res.json();
  if (data.ErrorNumber !== 0) throw new Error(data.ErrorMessage || "Connect error");
}

/**
 * Disconnect from a telescope.
 */
export async function disconnectTelescope(host: string, deviceNum = 0): Promise<void> {
  await fetch(
    `http://${host}/api/v1/telescope/${deviceNum}/connected`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `Connected=false&ClientID=${CLIENT_ID}&ClientTransactionID=${nextTx()}`,
      signal: AbortSignal.timeout(5000),
    }
  );
}

/**
 * Slew telescope to RA/Dec coordinates (async slew).
 * @param ra - Right Ascension in hours (0-24)
 * @param dec - Declination in degrees (-90 to +90)
 */
export async function slewToCoordinates(
  host: string,
  ra: number,
  dec: number,
  deviceNum = 0
): Promise<void> {
  const res = await fetch(
    `http://${host}/api/v1/telescope/${deviceNum}/slewtocoordinatesasync`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `RightAscension=${ra}&Declination=${dec}&ClientID=${CLIENT_ID}&ClientTransactionID=${nextTx()}`,
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!res.ok) throw new Error(`Slew failed: ${res.status}`);
  const data = await res.json();
  if (data.ErrorNumber !== 0) throw new Error(data.ErrorMessage || "Slew error");
}

/**
 * Enable or disable telescope tracking.
 */
export async function setTracking(
  host: string,
  enabled: boolean,
  deviceNum = 0
): Promise<void> {
  const res = await fetch(
    `http://${host}/api/v1/telescope/${deviceNum}/tracking`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `Tracking=${enabled}&ClientID=${CLIENT_ID}&ClientTransactionID=${nextTx()}`,
      signal: AbortSignal.timeout(5000),
    }
  );
  if (!res.ok) throw new Error(`Set tracking failed: ${res.status}`);
}

/**
 * Get current telescope state (connected, tracking, slewing, position).
 */
export async function getTelescopeState(host: string, deviceNum = 0): Promise<AlpacaState> {
  const base = `http://${host}/api/v1/telescope/${deviceNum}`;
  const tx = nextTx();
  const params = `?ClientID=${CLIENT_ID}&ClientTransactionID=${tx}`;

  try {
    const [connRes, trackRes, slewRes, raRes, decRes] = await Promise.all([
      fetch(`${base}/connected${params}`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${base}/tracking${params}`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${base}/slewing${params}`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${base}/rightascension${params}`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${base}/declination${params}`, { signal: AbortSignal.timeout(3000) }),
    ]);

    const [conn, track, slew, ra, dec] = await Promise.all([
      connRes.json(),
      trackRes.json(),
      slewRes.json(),
      raRes.json(),
      decRes.json(),
    ]);

    return {
      connected: conn.Value === true,
      tracking: track.Value === true,
      slewing: slew.Value === true,
      ra: typeof ra.Value === "number" ? ra.Value : 0,
      dec: typeof dec.Value === "number" ? dec.Value : 0,
      error: null,
    };
  } catch (err) {
    return {
      connected: false,
      tracking: false,
      slewing: false,
      ra: 0,
      dec: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Abort any in-progress slew.
 */
export async function abortSlew(host: string, deviceNum = 0): Promise<void> {
  await fetch(
    `http://${host}/api/v1/telescope/${deviceNum}/abortslew`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `ClientID=${CLIENT_ID}&ClientTransactionID=${nextTx()}`,
      signal: AbortSignal.timeout(5000),
    }
  );
}
