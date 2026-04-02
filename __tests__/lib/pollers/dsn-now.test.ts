// __tests__/lib/pollers/dsn-now.test.ts
import { parseDsnXml } from "@/lib/pollers/dsn-now";

// Real DSN XML structure: stations are self-closing sibling markers, dishes follow as siblings
const SAMPLE_XML = `<?xml version="1.0"?>
<dsn>
  <station name="mdscc" friendlyName="Madrid" timeUTC="1775300000000" timeZoneOffset="-28800000"/>
  <dish name="DSS54" azimuthAngle="250.5" elevationAngle="35.2" windSpeed="12.3"
        isMSPA="false" isArray="false" isDDOR="false" activity="Tracking">
    <downSignal signalType="data" dataRate="2000000" frequency="2200000000"
                band="S" power="-120.5" spacecraft="EM2" spacecraftID="-24"
                active="true"/>
    <upSignal signalType="data" dataRate="1000" frequency="2100000000"
              band="S" power="50.0" spacecraft="EM2" spacecraftID="-24"
              active="true"/>
    <target name="EM2" id="24" uplegRange="66100.5" downlegRange="66100.5" rtlt="0.441"/>
  </dish>
  <dish name="DSS56" azimuthAngle="248.1" elevationAngle="33.8" windSpeed="11.0"
        isMSPA="false" isArray="false" isDDOR="false" activity="Tracking">
    <downSignal signalType="none" dataRate="0" frequency="0"
                band="" power="0" spacecraft="" spacecraftID=""
                active="false"/>
  </dish>
  <station name="gdscc" friendlyName="Goldstone" timeUTC="1775300000000" timeZoneOffset="-25200000"/>
  <dish name="DSS24" azimuthAngle="180.0" elevationAngle="45.0" windSpeed="5.0"
        isMSPA="false" isArray="false" isDDOR="false" activity="Tracking">
    <downSignal signalType="data" dataRate="500000" frequency="8400000000"
                band="X" power="-130.2" spacecraft="EM2" spacecraftID="-24"
                active="true"/>
    <upSignal signalType="none" dataRate="0" frequency="0"
              band="" power="0" spacecraft="" spacecraftID=""
              active="false"/>
    <target name="EM2" id="24" uplegRange="66200.0" downlegRange="66200.0" rtlt="0.442"/>
  </dish>
  <timestamp>1775300000000</timestamp>
</dsn>`;

describe("DSN Now poller", () => {
  test("parseDsnXml extracts dishes tracking EM2", () => {
    const status = parseDsnXml(SAMPLE_XML);
    expect(status.signalActive).toBe(true);
    expect(status.dishes).toHaveLength(2); // DSS54 and DSS24
  });

  test("parseDsnXml extracts dish details correctly", () => {
    const status = parseDsnXml(SAMPLE_XML);
    const dss54 = status.dishes.find((d) => d.dish === "DSS54");

    expect(dss54).toBeDefined();
    expect(dss54!.station).toBe("mdscc");
    expect(dss54!.stationName).toBe("Madrid");
    expect(dss54!.downlinkActive).toBe(true);
    expect(dss54!.downlinkRate).toBe(2000000);
    expect(dss54!.downlinkBand).toBe("S");
    expect(dss54!.uplinkActive).toBe(true);
    expect(dss54!.rangeKm).toBeCloseTo(66100.5, 1);
    expect(dss54!.rtltSeconds).toBeCloseTo(0.441, 3);
  });

  test("parseDsnXml associates dishes with correct stations", () => {
    const status = parseDsnXml(SAMPLE_XML);
    const dss24 = status.dishes.find((d) => d.dish === "DSS24");
    expect(dss24).toBeDefined();
    expect(dss24!.station).toBe("gdscc");
    expect(dss24!.stationName).toBe("Goldstone");
  });

  test("parseDsnXml ignores dishes not tracking EM2", () => {
    const status = parseDsnXml(SAMPLE_XML);
    const dishNames = status.dishes.map((d) => d.dish);
    expect(dishNames).not.toContain("DSS56");
  });

  test("parseDsnXml returns signalActive false when no EM2 dishes", () => {
    const emptyXml = `<?xml version="1.0"?>
    <dsn>
      <station name="gdscc" friendlyName="Goldstone" timeUTC="1234" timeZoneOffset="0"/>
      <dish name="DSS24" azimuthAngle="0" elevationAngle="0" windSpeed="0"
            isMSPA="false" isArray="false" isDDOR="false" activity="Tracking">
        <downSignal signalType="none" dataRate="0" frequency="0"
                    band="" power="0" spacecraft="JWST" spacecraftID="170"
                    active="false"/>
      </dish>
      <timestamp>1234</timestamp>
    </dsn>`;

    const status = parseDsnXml(emptyXml);
    expect(status.signalActive).toBe(false);
    expect(status.dishes).toHaveLength(0);
  });
});
