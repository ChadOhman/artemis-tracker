"use client";

interface AttitudeIndicatorProps {
  quaternion: { w: number; x: number; y: number; z: number } | null;
}

/** Convert quaternion to a CSS matrix3d string for 3D rotation. */
function quaternionToMatrix3d(q: {
  w: number;
  x: number;
  y: number;
  z: number;
}): string {
  const { w, x, y, z } = q;
  const m00 = 1 - 2 * (y * y + z * z);
  const m01 = 2 * (x * y - w * z);
  const m02 = 2 * (x * z + w * y);
  const m10 = 2 * (x * y + w * z);
  const m11 = 1 - 2 * (x * x + z * z);
  const m12 = 2 * (y * z - w * x);
  const m20 = 2 * (x * z - w * y);
  const m21 = 2 * (y * z + w * x);
  const m22 = 1 - 2 * (x * x + y * y);
  return `matrix3d(${m00},${m10},${m20},0,${m01},${m11},${m21},0,${m02},${m12},${m22},0,0,0,0,1)`;
}

export function AttitudeIndicator({ quaternion }: AttitudeIndicatorProps) {
  const hasData = quaternion !== null;
  const transform = hasData
    ? quaternionToMatrix3d(quaternion)
    : "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)";

  return (
    <div
      style={{
        width: 80,
        height: 80,
        perspective: 200,
        opacity: hasData ? 1 : 0.3,
        flexShrink: 0,
      }}
      aria-label={
        hasData
          ? "Spacecraft attitude indicator"
          : "Attitude indicator — no data"
      }
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transform,
          transition: "transform 300ms ease-out",
        }}
      >
        {/* Capsule body — front face */}
        <div
          style={{
            position: "absolute",
            width: 32,
            height: 48,
            left: 24,
            top: 8,
            background: "var(--accent-cyan)",
            opacity: 0.25,
            border: "1px solid var(--accent-cyan)",
            borderRadius: 4,
            transform: "translateZ(16px)",
          }}
        />
        {/* Back face */}
        <div
          style={{
            position: "absolute",
            width: 32,
            height: 48,
            left: 24,
            top: 8,
            background: "var(--accent-cyan)",
            opacity: 0.15,
            border: "1px solid var(--accent-cyan)",
            borderRadius: 4,
            transform: "translateZ(-16px)",
          }}
        />
        {/* Left face */}
        <div
          style={{
            position: "absolute",
            width: 32,
            height: 48,
            left: 24,
            top: 8,
            background: "var(--accent-cyan)",
            opacity: 0.1,
            border: "1px solid var(--accent-cyan)",
            transformOrigin: "left center",
            transform: "rotateY(-90deg)",
          }}
        />
        {/* Right face */}
        <div
          style={{
            position: "absolute",
            width: 32,
            height: 48,
            left: 24,
            top: 8,
            background: "var(--accent-cyan)",
            opacity: 0.1,
            border: "1px solid var(--accent-cyan)",
            transformOrigin: "right center",
            transform: "rotateY(90deg)",
          }}
        />
        {/* Nose cone */}
        <div
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            left: 28,
            top: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderBottom: "12px solid var(--accent-cyan)",
            opacity: 0.6,
            transform: "translateZ(16px)",
          }}
        />
        {/* Forward axis line */}
        <div
          style={{
            position: "absolute",
            width: 2,
            height: 20,
            left: 39,
            bottom: 0,
            background: "var(--accent-green)",
            opacity: 0.5,
            transform: "translateZ(16px)",
          }}
        />
      </div>
    </div>
  );
}
