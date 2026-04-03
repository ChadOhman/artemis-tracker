"use client";
import { useRef, useEffect, useState } from "react";

interface AttitudeIndicatorProps {
  quaternion: { w: number; x: number; y: number; z: number } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type THREE = typeof import("three");

function makeTextSprite(T: THREE, text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 28px 'JetBrains Mono', monospace";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 24);

  const tex = new T.CanvasTexture(canvas);
  tex.minFilter = T.LinearFilter;
  const mat = new T.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7 });
  const sprite = new T.Sprite(mat);
  sprite.scale.set(1.0, 0.4, 1);
  return sprite;
}

function buildReferenceAxes(T: THREE) {
  const group = new T.Group();
  const len = 2.8;

  // X axis — red (Prograde)
  const xMat = new T.LineBasicMaterial({ color: 0xed8796, transparent: true, opacity: 0.4 });
  const xGeo = new T.BufferGeometry().setFromPoints([
    new T.Vector3(0, 0, 0),
    new T.Vector3(len, 0, 0),
  ]);
  group.add(new T.Line(xGeo, xMat));
  const xLabel = makeTextSprite(T, "X", "#ed8796");
  xLabel.position.set(len + 0.4, 0, 0);
  group.add(xLabel);

  // Y axis — green (Normal)
  const yMat = new T.LineBasicMaterial({ color: 0xa6da95, transparent: true, opacity: 0.4 });
  const yGeo = new T.BufferGeometry().setFromPoints([
    new T.Vector3(0, 0, 0),
    new T.Vector3(0, len, 0),
  ]);
  group.add(new T.Line(yGeo, yMat));
  const yLabel = makeTextSprite(T, "Y", "#a6da95");
  yLabel.position.set(0, len + 0.3, 0);
  group.add(yLabel);

  // Z axis — blue (Radial)
  const zMat = new T.LineBasicMaterial({ color: 0x7dc4e4, transparent: true, opacity: 0.4 });
  const zGeo = new T.BufferGeometry().setFromPoints([
    new T.Vector3(0, 0, 0),
    new T.Vector3(0, 0, len),
  ]);
  group.add(new T.Line(zGeo, zMat));
  const zLabel = makeTextSprite(T, "Z", "#7dc4e4");
  zLabel.position.set(0, 0, len + 0.4);
  group.add(zLabel);

  return group;
}

function buildOrionModel(T: THREE) {
  const group = new T.Group();
  const cyanWire = new T.LineBasicMaterial({ color: 0x8bd5ca, transparent: true, opacity: 0.7 });
  const cyanFill = new T.MeshBasicMaterial({ color: 0x8bd5ca, transparent: true, opacity: 0.08, side: T.DoubleSide });

  // Crew module — tapered capsule (cone frustum)
  const cmGeo = new T.CylinderGeometry(0.55, 0.85, 1.2, 12);
  group.add(new T.LineSegments(new T.EdgesGeometry(cmGeo), cyanWire));
  group.add(new T.Mesh(cmGeo, cyanFill));

  // Heat shield — flat disc at bottom of crew module
  const shieldGeo = new T.CircleGeometry(0.85, 12);
  const shield = new T.Mesh(shieldGeo, cyanFill);
  shield.position.y = -0.6;
  shield.rotation.x = Math.PI / 2;
  group.add(shield);
  const shieldEdge = new T.LineSegments(new T.EdgesGeometry(shieldGeo), cyanWire);
  shieldEdge.position.copy(shield.position);
  shieldEdge.rotation.copy(shield.rotation);
  group.add(shieldEdge);

  // Service module — cylinder below heat shield
  const smGeo = new T.CylinderGeometry(0.85, 0.85, 1.6, 12);
  const smOffset = -0.6 - 0.8;
  const smWire = new T.LineSegments(new T.EdgesGeometry(smGeo), cyanWire);
  smWire.position.y = smOffset;
  group.add(smWire);
  const smFill = new T.Mesh(smGeo, cyanFill);
  smFill.position.y = smOffset;
  group.add(smFill);

  // Engine bell — small cone at bottom of service module
  const bellGeo = new T.CylinderGeometry(0.3, 0.5, 0.4, 8);
  const bellWire = new T.LineSegments(new T.EdgesGeometry(bellGeo), cyanWire);
  bellWire.position.y = smOffset - 1.0;
  group.add(bellWire);

  // Solar array wings — two flat panels on service module
  const wingGeo = new T.PlaneGeometry(1.8, 0.4);
  const wingMat = new T.MeshBasicMaterial({ color: 0x8bd5ca, transparent: true, opacity: 0.12, side: T.DoubleSide });
  const wingEdgeMat = new T.LineBasicMaterial({ color: 0x8bd5ca, transparent: true, opacity: 0.5 });

  for (const side of [-1, 1]) {
    const wing = new T.Mesh(wingGeo, wingMat);
    wing.position.set(side * 1.75, smOffset, 0);
    group.add(wing);
    const wingEdge = new T.LineSegments(new T.EdgesGeometry(wingGeo), wingEdgeMat);
    wingEdge.position.copy(wing.position);
    group.add(wingEdge);
  }

  // Nose cone / docking adapter — small cone on top
  const noseGeo = new T.ConeGeometry(0.35, 0.5, 8);
  const noseWire = new T.LineSegments(new T.EdgesGeometry(noseGeo), cyanWire);
  noseWire.position.y = 0.85;
  group.add(noseWire);

  return group;
}

export function AttitudeIndicator({ quaternion }: AttitudeIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const stateRef = useRef<{
    T: THREE;
    renderer: InstanceType<THREE["WebGLRenderer"]>;
    scene: InstanceType<THREE["Scene"]>;
    camera: InstanceType<THREE["PerspectiveCamera"]>;
    model: InstanceType<THREE["Group"]>;
    targetQuat: InstanceType<THREE["Quaternion"]>;
    currentQuat: InstanceType<THREE["Quaternion"]>;
    animId: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    import("three").then((T) => {
      if (cancelled || !el) return;

      const w = el.clientWidth;
      const h = el.clientHeight;

      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(35, w / h, 0.1, 100);
      camera.position.set(4, 3, 5);
      camera.lookAt(0, -0.3, 0);

      // Fixed reference axes — don't rotate with model
      const axes = buildReferenceAxes(T);
      scene.add(axes);

      // Spacecraft model — rotates with quaternion
      const model = buildOrionModel(T);
      scene.add(model);

      const targetQuat = new T.Quaternion();
      const currentQuat = new T.Quaternion();

      const state = { T, renderer, scene, camera, model, targetQuat, currentQuat, animId: 0 };
      stateRef.current = state;
      setThreeLoaded(true);

      function animate() {
        state.animId = requestAnimationFrame(animate);
        state.currentQuat.slerp(state.targetQuat, 0.1);
        state.model.quaternion.copy(state.currentQuat);
        renderer.render(scene, camera);
      }
      animate();
    });

    return () => {
      cancelled = true;
      if (stateRef.current) {
        cancelAnimationFrame(stateRef.current.animId);
        stateRef.current.renderer.dispose();
        if (stateRef.current.renderer.domElement.parentNode === el) {
          el.removeChild(stateRef.current.renderer.domElement);
        }
        stateRef.current = null;
      }
    };
  }, []);

  // Update target quaternion when prop changes
  useEffect(() => {
    if (!stateRef.current || !quaternion) return;
    stateRef.current.targetQuat.set(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
  }, [quaternion, threeLoaded]);

  const hasData = quaternion !== null;

  return (
    <div
      ref={containerRef}
      style={{
        width: 120,
        height: 120,
        flexShrink: 0,
        opacity: hasData ? 1 : 0.3,
      }}
      aria-label={
        hasData
          ? "Spacecraft attitude indicator with reference axes"
          : "Attitude indicator — no data"
      }
    />
  );
}
