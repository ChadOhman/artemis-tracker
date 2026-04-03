"use client";
import { useRef, useEffect, useState } from "react";

interface AttitudeIndicatorProps {
  quaternion: { w: number; x: number; y: number; z: number } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type THREE = typeof import("three");

function buildOrionModel(T: THREE) {
  const group = new T.Group();
  const cyanWire = new T.LineBasicMaterial({ color: 0x8bd5ca, transparent: true, opacity: 0.7 });
  const cyanFill = new T.MeshBasicMaterial({ color: 0x8bd5ca, transparent: true, opacity: 0.08, side: T.DoubleSide });
  const greenWire = new T.LineBasicMaterial({ color: 0xa6da95, transparent: true, opacity: 0.6 });

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

  // Forward axis indicator — green line pointing "up" (forward)
  const fwdGeo = new T.BufferGeometry().setFromPoints([
    new T.Vector3(0, 1.2, 0),
    new T.Vector3(0, 1.8, 0),
  ]);
  group.add(new T.Line(fwdGeo, greenWire));

  // Arrowhead
  const arrowGeo = new T.ConeGeometry(0.08, 0.2, 4);
  const arrowMat = new T.MeshBasicMaterial({ color: 0xa6da95, transparent: true, opacity: 0.6 });
  const arrow = new T.Mesh(arrowGeo, arrowMat);
  arrow.position.y = 1.9;
  group.add(arrow);

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
      camera.position.set(3, 2, 4);
      camera.lookAt(0, -0.3, 0);

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
        width: 100,
        height: 100,
        flexShrink: 0,
        opacity: hasData ? 1 : 0.3,
      }}
      aria-label={
        hasData
          ? "Spacecraft attitude indicator"
          : "Attitude indicator — no data"
      }
    />
  );
}
