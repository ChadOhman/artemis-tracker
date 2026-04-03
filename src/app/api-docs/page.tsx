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
  "timestamp": "2026-04-03T07:15:03.179Z",
  "quaternion": { "w": 0.221, "x": -0.256, "y": -0.724, "z": -0.588 },
  "eulerDeg": { "roll": -12.4, "pitch": 75.2, "yaw": -1.8 },
  "rollRate": 19.4,
  "pitchRate": 7.0,
  "yawRate": -19.4,
  "antennaGimbal": { "az1": 19.4, "el1": 7.0, "az2": -19.4, "el2": -7.0 },
  "sawAngles": { "saw1": 177.1, "saw2": 0.2, "saw3": 177.1, "saw4": 166.1 },
  "icps": {
    "quaternion": { "w": 0.20, "x": 0.34, "y": -0.22, "z": -0.68 },
    "active": true
  },
  "spacecraftMode": "ec"
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
