// src/app/api-docs/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artemis II Real-Time Telemetry API",
  description: "API documentation for the Artemis II real-time telemetry endpoints.",
  robots: "noindex, nofollow",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: "#0a0e14",
        border: "1px solid #1a2332",
        borderRadius: 6,
        padding: "12px 16px",
        overflowX: "auto",
        fontSize: 13,
        lineHeight: 1.5,
        color: "#8bd5ca",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {children}
    </pre>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2
      style={{
        fontSize: 18,
        fontWeight: 700,
        color: "#e0e0e0",
        marginTop: 40,
        marginBottom: 12,
        paddingBottom: 6,
        borderBottom: "1px solid #1a2332",
      }}
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: string }) {
  return (
    <h3
      style={{
        fontSize: 15,
        fontWeight: 600,
        color: "#b0c4de",
        marginTop: 24,
        marginBottom: 8,
      }}
    >
      {children}
    </h3>
  );
}

function Badge({ children, color }: { children: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: color,
        color: "#000",
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 4,
        marginRight: 8,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {children}
    </span>
  );
}

export default function ApiDocsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060a10",
        color: "#c0c8d4",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#e0e0e0",
            marginBottom: 8,
          }}
        >
          Artemis II Real-Time Telemetry API
        </h1>
        <p style={{ fontSize: 14, color: "#7a8a9e", marginBottom: 32 }}>
          Real-time spacecraft telemetry from NASA&apos;s AROW (Artemis Real-time Orbit Website) ground
          control system. Data is sourced from Orion&apos;s onboard sensors at 1-second cadence and
          includes attitude, angular rates, solar array wing positions, antenna gimbal angles, ICPS
          upper stage tracking, and spacecraft mode.
        </p>

        {/* REST Endpoint */}
        <SectionHeading>REST Endpoint</SectionHeading>
        <div style={{ marginBottom: 8 }}>
          <Badge color="#8bd5ca">GET</Badge>
          <code
            style={{
              fontSize: 14,
              color: "#8bd5ca",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          >
            /api/arow
          </code>
        </div>
        <p style={{ fontSize: 13, marginBottom: 12 }}>
          Returns the latest cached telemetry snapshot as JSON. Poll at your own rate (recommend no
          faster than 1 request/second since that matches the upstream cadence).
        </p>

        <SubHeading>Example</SubHeading>
        <CodeBlock>{`curl -s https://artemis.cdnspace.ca/api/arow | jq .`}</CodeBlock>

        <SubHeading>Response (200 OK)</SubHeading>
        <CodeBlock>{`{
  "timestamp": "2026-04-05T23:54:32.675Z",
  "quaternion": { "w": 0.221, "x": -0.256, "y": -0.724, "z": -1.122 },
  "eulerDeg": { "roll": -43.2, "pitch": 75.2, "yaw": -1.8 },
  "rollRate": -0.70,
  "pitchRate": 0.16,
  "yawRate": -0.33,
  "antennaGimbal": { "az1": -39.9, "el1": 9.4, "az2": -18.7, "el2": -9.4 },
  "sawAngles": { "saw1": 6.0, "saw2": 163.7, "saw3": 179.7, "saw4": 163.7 },
  "rcsThrusters": {
    "thrusters": { "SR1R": false, "SR2R": false, "SA3A": false, ... },
    "status1": "b0",
    "status2": "b0"
  },
  "sawGimbals": {
    "saw1": { "ig": 7.2, "og": 94.2 },
    "saw2": { "ig": 220.5, "og": -38.0 },
    "saw3": { "ig": 51.8, "og": 145.7 },
    "saw4": { "ig": 33.4, "og": -17.0 }
  },
  "icps": {
    "quaternion": { "w": -0.33, "x": 0.34, "y": -0.22, "z": -0.68 },
    "active": true
  },
  "spacecraftMode": "80"
}`}</CodeBlock>

        <SubHeading>Error Response (503)</SubHeading>
        <CodeBlock>{`{ "error": "No data available" }`}</CodeBlock>
        <p style={{ fontSize: 13, color: "#7a8a9e", marginTop: 4 }}>
          Returned when the server has not yet received any AROW data (e.g., immediately after startup).
        </p>

        {/* SSE Endpoint */}
        <SectionHeading>SSE Endpoint</SectionHeading>
        <div style={{ marginBottom: 8 }}>
          <Badge color="#8bd5ca">GET</Badge>
          <code
            style={{
              fontSize: 14,
              color: "#8bd5ca",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          >
            /api/arow/stream
          </code>
        </div>
        <p style={{ fontSize: 13, marginBottom: 12 }}>
          Server-Sent Events stream pushing telemetry every second. Each message is an{" "}
          <code style={{ color: "#8bd5ca" }}>event: arow</code> with the same JSON schema as the REST
          endpoint. Keepalive comments sent every 30 seconds.
        </p>

        <SubHeading>Example (JavaScript)</SubHeading>
        <CodeBlock>{`const es = new EventSource("https://artemis.cdnspace.ca/api/arow/stream");

es.addEventListener("arow", (event) => {
  const telemetry = JSON.parse(event.data);
  console.log("Roll:", telemetry.eulerDeg.roll.toFixed(1) + "\u00B0");
  console.log("SAW 1:", telemetry.sawAngles.saw1.toFixed(1) + "\u00B0");
  console.log("ICPS active:", telemetry.icps.active);
});

es.addEventListener("error", () => {
  console.log("Connection lost, reconnecting...");
});`}</CodeBlock>

        <SubHeading>Example (curl)</SubHeading>
        <CodeBlock>{`curl -N https://artemis.cdnspace.ca/api/arow/stream`}</CodeBlock>

        {/* Additional Endpoints */}
        <SectionHeading>Additional Endpoints</SectionHeading>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#8bd5ca">GET</Badge>
            <code style={{ fontSize: 14, color: "#8bd5ca", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/orbit
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Computed orbital telemetry from JPL Horizons. Updates every 5 minutes.
          </p>
          <CodeBlock>{`{
  "metMs": 372600000,
  "speedKmS": 0.595,
  "speedKmH": 2141.0,
  "moonRelSpeedKmH": 3283.0,
  "altitudeKm": 367171.4,
  "earthDistKm": 383775.0,
  "moonDistKm": 61367.0,
  "periapsisKm": -2744.5,
  "apoapsisKm": 452478.1,
  "gForce": 0.0003
}`}</CodeBlock>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#8bd5ca">GET</Badge>
            <code style={{ fontSize: 14, color: "#8bd5ca", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/state
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Raw state vectors (position &amp; velocity in km and km/s, Earth-centered) for Orion and the Moon.
          </p>
          <CodeBlock>{`{
  "stateVector": {
    "timestamp": "2026-04-03T06:00:00Z",
    "metMs": 113100000,
    "position": { "x": -56241.2, "y": -64095.3, "z": -6501.4 },
    "velocity": { "x": -1.092, "y": -2.518, "z": -0.236 }
  },
  "moonPosition": { "x": -355007.6, "y": -176537.5, "z": -26760.0 }
}`}</CodeBlock>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#8bd5ca">GET</Badge>
            <code style={{ fontSize: 14, color: "#8bd5ca", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/dsn
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Deep Space Network dish contacts for Artemis II (EM2). Updates every 10 seconds.
          </p>
          <CodeBlock>{`{
  "timestamp": "2026-04-03T06:18:00Z",
  "dishes": [
    {
      "dish": "DSS54", "station": "mdscc", "stationName": "Madrid",
      "azimuth": 250.5, "elevation": 35.2,
      "downlinkActive": true, "downlinkRate": 2000000, "downlinkBand": "S",
      "uplinkActive": true, "uplinkRate": 1000, "uplinkBand": "S",
      "rangeKm": 66100.5, "rtltSeconds": 0.441
    }
  ],
  "signalActive": true
}`}</CodeBlock>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#8bd5ca">GET</Badge>
            <code style={{ fontSize: 14, color: "#8bd5ca", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/timeline
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Full mission timeline: crew activities, mission phases, attitude modes, and milestones.
          </p>
          <CodeBlock>{`curl -s https://artemis.cdnspace.ca/api/timeline | jq '.activities | length'
# 150+`}</CodeBlock>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#a6da95">GET</Badge>
            <code style={{ fontSize: 14, color: "#a6da95", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/all
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Everything in one request — telemetry, state vector, Moon position, DSN, and AROW combined.
          </p>
          <CodeBlock>{`curl -s https://artemis.cdnspace.ca/api/all | jq .`}</CodeBlock>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#8bd5ca">GET</Badge>
            <code style={{ fontSize: 14, color: "#8bd5ca", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/solar
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Space weather data from NOAA SWPC — geomagnetic activity, X-ray flux, proton flux, and radiation risk. Updates every 60 seconds.
          </p>
          <CodeBlock>{`{
  "timestamp": "2026-04-05T22:00:00Z",
  "kpIndex": 2, "kpLabel": "Quiet",
  "xrayFlux": 1.2e-6, "xrayClass": "B1.2",
  "protonFlux1MeV": 5.4, "protonFlux10MeV": 0.8, "protonFlux100MeV": 0.1,
  "radiationRisk": "low"
}`}</CodeBlock>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#8bd5ca">GET</Badge>
            <code style={{ fontSize: 14, color: "#8bd5ca", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/history?metric=&lt;name&gt;&amp;hours=24&amp;points=60
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Downsampled time-series history for sparklines and trend charts. Returns up to <code style={{ color: "#8bd5ca" }}>points</code> data points over the last <code style={{ color: "#8bd5ca" }}>hours</code> hours.
          </p>
          <p style={{ fontSize: 12, color: "#7a8a9e", marginBottom: 8 }}>
            Available metrics: <code style={{ color: "#8bd5ca" }}>speed_km_h</code>, <code style={{ color: "#8bd5ca" }}>speed_km_s</code>, <code style={{ color: "#8bd5ca" }}>moon_rel_speed_km_h</code>, <code style={{ color: "#8bd5ca" }}>altitude_km</code>, <code style={{ color: "#8bd5ca" }}>earth_dist_km</code>, <code style={{ color: "#8bd5ca" }}>moon_dist_km</code>, <code style={{ color: "#8bd5ca" }}>g_force</code>, <code style={{ color: "#8bd5ca" }}>kp_index</code>, <code style={{ color: "#8bd5ca" }}>xray_flux</code>, <code style={{ color: "#8bd5ca" }}>proton_10mev</code>
          </p>
          <CodeBlock>{`curl -s "https://artemis.cdnspace.ca/api/history?metric=earth_dist_km&hours=48&points=100" | jq .
{
  "metric": "earth_dist_km",
  "hours": 48,
  "data": [
    { "ts": 1743886800000, "value": 85520.3 },
    { "ts": 1743888600000, "value": 91244.1 },
    ...
  ]
}`}</CodeBlock>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#8bd5ca">GET</Badge>
            <code style={{ fontSize: 14, color: "#8bd5ca", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/snapshot?metMs=&lt;number&gt;
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Point-in-time mission replay. Returns the closest archived telemetry, state vector, DSN, and solar data for a given MET timestamp (milliseconds).
          </p>
          <CodeBlock>{`curl -s "https://artemis.cdnspace.ca/api/snapshot?metMs=360000000" | jq .`}</CodeBlock>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#8bd5ca">GET</Badge>
            <code style={{ fontSize: 14, color: "#8bd5ca", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/stats
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Cumulative mission statistics — max speed, max Earth distance, min Moon distance, total distance traveled, solar event counts, and sample counts.
          </p>
          <CodeBlock>{`curl -s https://artemis.cdnspace.ca/api/stats | jq .`}</CodeBlock>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#8bd5ca">GET</Badge>
            <code style={{ fontSize: 14, color: "#8bd5ca", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/dsn/history?minutes=30
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            DSN contact history — bandwidth rates, active stations, and dish details over the last N minutes (max 1440 = 24 hours). Used for signal timeline and bandwidth charts.
          </p>
          <CodeBlock>{`curl -s "https://artemis.cdnspace.ca/api/dsn/history?minutes=60" | jq '.history | length'`}</CodeBlock>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge color="#a6da95">SSE</Badge>
            <code style={{ fontSize: 14, color: "#a6da95", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              /api/telemetry/stream
            </code>
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Primary SSE stream — the full firehose. Pushes all event types: <code style={{ color: "#8bd5ca" }}>telemetry</code> (JPL state + orbit, every 5 min), <code style={{ color: "#8bd5ca" }}>dsn</code> (every 10s), <code style={{ color: "#8bd5ca" }}>arow</code> (every 1s), <code style={{ color: "#8bd5ca" }}>solar</code> (every 60s), <code style={{ color: "#8bd5ca" }}>visitors</code> (every 5s).
          </p>
          <CodeBlock>{`const es = new EventSource("https://artemis.cdnspace.ca/api/telemetry/stream");

es.addEventListener("telemetry", (e) => {
  const { telemetry, stateVector, moonPosition, dsn } = JSON.parse(e.data);
  console.log("Speed:", telemetry.speedKmH, "km/h");
});

es.addEventListener("arow", (e) => {
  const arow = JSON.parse(e.data);
  console.log("Roll:", arow.eulerDeg?.roll?.toFixed(1) + "\u00B0");
});

es.addEventListener("dsn", (e) => {
  const dsn = JSON.parse(e.data);
  console.log("Signal:", dsn.signalActive ? "ACTIVE" : "LOS");
});

es.addEventListener("solar", (e) => {
  const solar = JSON.parse(e.data);
  console.log("Kp:", solar.kpIndex, solar.kpLabel);
});`}</CodeBlock>
        </div>

        {/* Field Reference */}
        <SectionHeading>Field Reference</SectionHeading>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #1a2332",
                  color: "#7a8a9e",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "8px 12px" }}>Field</th>
                <th style={{ padding: "8px 12px" }}>Type</th>
                <th style={{ padding: "8px 12px" }}>Unit</th>
                <th style={{ padding: "8px 12px", fontFamily: "'Inter', sans-serif" }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["timestamp", "string", "ISO-8601", "UTC timestamp of the telemetry sample"],
                ["quaternion.w/x/y/z", "number", "\u2014", "Orion attitude quaternion (params 2074\u20132077)"],
                ["eulerDeg.roll", "number", "deg", "Roll angle from param 2080 (rad converted to deg)"],
                ["eulerDeg.pitch", "number", "deg", "Pitch angle from param 2078 (rad converted to deg)"],
                ["eulerDeg.yaw", "number", "deg", "Yaw angle from param 2079 (rad converted to deg)"],
                ["rollRate", "number", "deg/s", "Roll rate from param 2091 OrionRollRate (rad/s to deg/s)"],
                ["pitchRate", "number", "deg/s", "Pitch rate from param 2092 OrionPitchRate (rad/s to deg/s)"],
                ["yawRate", "number", "deg/s", "Yaw rate from param 2093 OrionYawRate (rad/s to deg/s)"],
                ["antennaGimbal.az1/el1", "number", "deg", "Antenna 1 gimbal azimuth/elevation (params 5002/5003)"],
                ["antennaGimbal.az2/el2", "number", "deg", "Antenna 2 gimbal azimuth/elevation (params 5004/5005)"],
                ["sawAngles.saw1\u2013saw4", "number", "deg", "Solar Array Wing angles (params 5006\u20135009)"],
                ["icps.quaternion.w/x/y/z", "number", "\u2014", "ICPS upper stage attitude quaternion (params 2084\u20132087)"],
                ["icps.active", "boolean", "\u2014", "true if ICPS params have Good status (may still be in orbit)"],
                ["spacecraftMode", "string", "\u2014", "Spacecraft mode/status byte in hex (param 2016)"],
              ].map(([field, type, unit, desc], i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #0d1520",
                    color: "#c0c8d4",
                  }}
                >
                  <td style={{ padding: "6px 12px", color: "#8bd5ca" }}>{field}</td>
                  <td style={{ padding: "6px 12px" }}>{type}</td>
                  <td style={{ padding: "6px 12px" }}>{unit}</td>
                  <td
                    style={{
                      padding: "6px 12px",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                    }}
                  >
                    {desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Data Provenance */}
        <SectionHeading>Data Provenance</SectionHeading>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          Telemetry originates from NASA&apos;s Artemis Real-time Orbit Website (AROW) ground control
          system. Parameter numbers were confirmed by reverse-engineering the AROW Unity IL2CPP metadata
          (<code style={{ color: "#8bd5ca" }}>global-metadata.dat</code>), which contains the C#
          <code style={{ color: "#8bd5ca" }}> OnlineParameters</code> class mapping field names to
          parameter numbers. Data is fetched from a Google Cloud Storage bucket at 1-second intervals and
          re-served through this API with no modification beyond unit conversion (radians to degrees for
          Euler angles and angular rates).
        </p>

        {/* Notes */}
        <SectionHeading>Notes</SectionHeading>
        <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
          <li>
            <strong>Rate limiting:</strong> No hard limit, but upstream data updates once per second.
            Polling the REST endpoint faster than 1/s will return the same data.
          </li>
          <li>
            <strong>ICPS tracking:</strong> The ICPS (Interim Cryogenic Propulsion Stage) disposal burn
            was scheduled at MET+5h, but telemetry shows params still updating with &quot;Good&quot; status.
            The <code style={{ color: "#8bd5ca" }}>icps.active</code> field reflects whether the ground
            system is still receiving valid ICPS data.
          </li>
          <li>
            <strong>Availability:</strong> This API is available only while the Artemis II mission is
            active and the upstream AROW data source is online.
          </li>
        </ul>

        <div
          style={{
            marginTop: 48,
            paddingTop: 16,
            borderTop: "1px solid #1a2332",
            fontSize: 11,
            color: "#4a5568",
          }}
        >
          Artemis II Mission Tracker &mdash; Not affiliated with NASA
        </div>
      </div>
    </div>
  );
}
