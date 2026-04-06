# AROW Parameter Map

Extracted from NASA AROW Unity WebGL build `global-metadata.dat` (IL2CPP).
The `OnlineParameters` class at offset `0x828b4` maps C# field names to
parameter numbers in the GCS telemetry feed at:

    https://storage.googleapis.com/p-2-cen1/October/1/October_105_1.txt

Parameters arrive as `Parameter_NNNN` keys with `Value`, `Status`, `Time`, and `Type` fields.

---

## Orion State Vector

| Param | Field Name | Unit (estimated) | Notes |
|-------|-----------|-----------------|-------|
| 2003 | craftXPos | feet | Geocentric X position |
| 2004 | craftYPos | feet | Geocentric Y position |
| 2005 | craftZPos | feet | Geocentric Z position |
| 2009 | craftXVel | ft/s | Geocentric X velocity |
| 2010 | craftYVel | ft/s | Geocentric Y velocity |
| 2011 | craftZVel | ft/s | Geocentric Z velocity |

## Orion Attitude (Primary)

| Param | Field Name | Unit | Notes |
|-------|-----------|------|-------|
| 2012 | craftAttitudeQuatW | - | Redundant with 2074 |
| 2013 | craftAttitudeQuatX | - | Redundant with 2075 |
| 2014 | craftAttitudeQuatY | - | Redundant with 2076 |
| 2015 | craftAttitudeQuatZ | - | Redundant with 2077 |
| 2016 | (spacecraft mode) | hex | Mode byte, e.g. "80" |

## Time Parameters

| Param | Field Name | Notes |
|-------|-----------|-------|
| 2025 | liftoffConfirmed | 1 = confirmed |
| 2026 | GCLiftoffEstimate / GCLiftoffCount / GCMET | Possibly MET counter or mode code |

## SAW Gimbal Angles (Inner/Outer)

| Param | Field Name | Notes |
|-------|-----------|-------|
| 2048 | SAW1IG | Solar Array Wing 1 Inner Gimbal (rad) |
| 2049 | SAW2IG | Solar Array Wing 2 Inner Gimbal (rad) |
| 2050 | SAW3IG | Solar Array Wing 3 Inner Gimbal (rad) |
| 2051 | SAW4IG | Solar Array Wing 4 Inner Gimbal (rad) |
| 2052 | SAW1OG | Solar Array Wing 1 Outer Gimbal (rad) |
| 2053 | SAW2OG | Solar Array Wing 2 Outer Gimbal (rad) |
| 2054 | SAW3OG | Solar Array Wing 3 Outer Gimbal (rad) |
| 2055 | SAW4OG | Solar Array Wing 4 Outer Gimbal (rad) |
| 2056 | SAW1IGFallback | Fallback value for SAW1 IG |
| 2057 | SAW2IGFallback | Fallback value for SAW2 IG |
| 2058 | SAW3IGFallback | Fallback value for SAW3 IG |
| 2059 | SAW4IGFallback | Fallback value for SAW4 IG |
| 2060 | SAW1OGFallback | Fallback value for SAW1 OG |
| 2061 | SAW2OGFallback | Fallback value for SAW2 OG |
| 2062 | SAW3OGFallback | Fallback value for SAW3 OG |
| 2063 | SAW4OGFallback | Fallback value for SAW4 OG |

## Separation / Event Flags

| Param | Field Name | Notes |
|-------|-----------|-------|
| 2064 | SRBSep | SRB separation flag |
| 2065 | SRBSepFallback | Fallback |
| 2066 | MissionSegment | Current mission segment ID |
| 2067 | LASSepFallback | Launch Abort System separation |
| 2068 | LASSepFallback2 | LAS separation fallback 2 |
| 2069 | CoreStageSep | Core stage separation flag |
| 2070 | CoreStageSepORN | Core stage separation (Orion-side) |
| 2071 | ICPSSep1 | ICPS separation flag 1 |
| 2072 | ICPSSep2 | ICPS separation flag 2 |
| 2073 | ICPSSep3 | ICPS separation flag 3 |

## Orion Attitude (Telemetry Stream)

| Param | Field Name | Unit | Notes |
|-------|-----------|------|-------|
| 2074 | craftAttitudeQuatW | - | **Currently used** |
| 2075 | craftAttitudeQuatX | - | **Currently used** |
| 2076 | craftAttitudeQuatY | - | **Currently used** |
| 2077 | craftAttitudeQuatZ | - | **Currently used** |
| 2078 | craftAttitudePitch | rad | **Currently used** (converted to deg) |
| 2079 | craftAttitudeYaw | rad | **Currently used** (converted to deg) |
| 2080 | craftAttitudeRoll | rad | **Currently used** (converted to deg) |

## Orion Angular Rates (Fallback)

| Param | Field Name | Notes |
|-------|-----------|-------|
| 2081 | OrionRollRate (fallback) | Fallback body rate |
| 2082 | OrionPitchRate (fallback) | Fallback body rate |
| 2083 | OrionYawRate (fallback) | Fallback body rate |

## ICPS Attitude

| Param | Field Name | Unit | Notes |
|-------|-----------|------|-------|
| 2084 | ICPSAttitudeQuatW | - | **Currently parsed** (UI removed — deorbited) |
| 2085 | ICPSAttitudeQuatX | - | |
| 2086 | ICPSAttitudeQuatY | - | |
| 2087 | ICPSAttitudeQuatZ | - | |

## RCS Thruster Flags

| Param | Field Name | Notes |
|-------|-----------|-------|
| 2088 | attMotorSR1R / attMotorSR2R | Bit-packed thruster firing states |
| 2089 | attMotorSA3A / attMotorSA4A | Bit-packed thruster firing states |
| 2090 | (thruster status byte) | Hex value, e.g. "b0" |

## Orion Angular Rates (Primary)

| Param | Field Name | Unit | Notes |
|-------|-----------|------|-------|
| 2091 | OrionRollRate | deg/s | **Currently used** (raw value, no conversion) |
| 2092 | OrionPitchRate | deg/s | **Currently used** |
| 2093 | OrionYawRate | deg/s | **Currently used** |

## RCS Thruster Flags (continued)

| Param | Field Name | Notes |
|-------|-----------|-------|
| 2094 | attMotorSR1L / attMotorSR2L | Bit-packed |
| 2095 | attMotorSB5A / attMotorSB6A | Bit-packed |
| 2096 | attMotorSR4R / attMotorSR3R | Bit-packed |
| 2097 | attMotorSC2A / attMotorSC1A | Bit-packed |
| 2098 | attMotorSC2F / attMotorSC1F | Bit-packed |
| 2099 | (thruster status byte) | Hex value, e.g. "b0" |

## Auxiliary Burns / Thruster Accumulators

| Param | Field Name | Notes |
|-------|-----------|-------|
| 2101 | OrionAux1 | Possibly accumulated delta-v or residual rate |
| 2102 | OrionAux2 | |
| 2103 | OrionAux3 | |

## Antenna / Comm (5000-series)

| Param | Field Name | Unit | Notes |
|-------|-----------|------|-------|
| 5001 | (range to ground station) | km | Matches Earth distance closely |
| 5002 | (antenna 1 azimuth) | deg | **Currently used** |
| 5003 | (antenna 1 elevation) | deg | **Currently used** |
| 5004 | (antenna 2 azimuth) | deg | **Currently used** |
| 5005 | (antenna 2 elevation) | deg | **Currently used** |
| 5006 | (SAW 1 angle) | deg | **Currently used** |
| 5007 | (SAW 2 angle) | deg | **Currently used** |
| 5008 | (SAW 3 angle) | deg | **Currently used** |
| 5009 | (SAW 4 angle) | deg | **Currently used** |
| 5010 | (signal timing 1) | ns? | ~1.775 billion — possibly one-way light time in ns |
| 5011 | (signal timing 2) | ns? | |
| 5012 | (signal timing 3) | ns? | |
| 5013 | (signal timing 4) | ns? | |
| 5016 | (range integer) | km | Duplicate of 5001 as integer |
| 5017 | (range integer 2) | km | Second antenna range |

## Burn Controller Fields

From the `BurnController` class (not parameter numbers, but relevant context):

- `OrionPrimaryBurn` / `OrionPrimaryBurn2` — ESM main engine burns
- `OrionAux1`...`OrionAux8` — 8 auxiliary thruster channels
- `OrionAux1Fallback`...`OrionAux8Fallback` — fallback values
- `ICPSBurn` / `ICPSBurn2` — ICPS engine burns
- `SRBBurn` — SRB burn flag
- `CoreStageBurn` / `CoreStageCutoff` — core stage

## Attitude Motor Names (RCS Thruster Layout)

The thruster naming convention: `attMotor` + position code

- **S** = Starboard? / Service Module
- **R** = Roll, **A** = Aft?, **B** = ???, **C** = ???, **D** = ???
- Suffix: **R** = Right, **L** = Left, **A** = Active, **F** = Firing

Full list: SR1R, SR2R, SA3A, SA4A, SA3F, SA4F, SR1L, SR2L, SB5A, SB6A,
SB5F, SB6F, SR4R, SR3R, SC2A, SC1A, SC2F, SC1F, SR4L, SR3L, SD6A, SD5A,
SD5F, SD6F

---

*Extracted 2026-04-05 from `nasa/tmp-metadata.dat` (AROW Unity IL2CPP global-metadata.dat)*
*OnlineParameters class at offset 0x828b4*
