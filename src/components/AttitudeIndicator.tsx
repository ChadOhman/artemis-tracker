"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";

interface AttitudeIndicatorProps {
  quaternion: { w: number; x: number; y: number; z: number } | null;
}

function buildOrionModel(): THREE.Group {
  const group = new THREE.Group();
  const cyanWire = new THREE.LineBasicMaterial({ color: 0x8bd5ca, transparent: true, opacity: 0.7 });
  const cyanFill = new THREE.MeshBasicMaterial({ color: 0x8bd5ca, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
  const greenWire = new THREE.LineBasicMaterial({ color: 0xa6da95, transparent: true, opacity: 0.6 });

  // Crew module — tapered capsule (cone frustum)
  const cmGeo = new THREE.CylinderGeometry(0.55, 0.85, 1.2, 12);
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(cmGeo), cyanWire));
  group.add(new THREE.Mesh(cmGeo, cyanFill));

  // Heat shield — flat disc at bottom of crew module
  const shieldGeo = new THREE.CircleGeometry(0.85, 12);
  const shield = new THREE.Mesh(shieldGeo, cyanFill);
  shield.position.y = -0.6;
  shield.rotation.x = Math.PI / 2;
  group.add(shield);
  const shieldEdge = new THREE.LineSegments(new THREE.EdgesGeometry(shieldGeo), cyanWire);
  shieldEdge.position.copy(shield.position);
  shieldEdge.rotation.copy(shield.rotation);
  group.add(shieldEdge);

  // Service module — cylinder below heat shield
  const smGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.6, 12);
  const smOffset = -0.6 - 0.8;
  const smWire = new THREE.LineSegments(new THREE.EdgesGeometry(smGeo), cyanWire);
  smWire.position.y = smOffset;
  group.add(smWire);
  const smFill = new THREE.Mesh(smGeo, cyanFill);
  smFill.position.y = smOffset;
  group.add(smFill);

  // Engine bell — small cone at bottom of service module
  const bellGeo = new THREE.CylinderGeometry(0.3, 0.5, 0.4, 8);
  const bellWire = new THREE.LineSegments(new THREE.EdgesGeometry(bellGeo), cyanWire);
  bellWire.position.y = smOffset - 1.0;
  group.add(bellWire);

  // Solar array wings — two flat panels on service module
  const wingGeo = new THREE.PlaneGeometry(1.8, 0.4);
  const wingMat = new THREE.MeshBasicMaterial({ color: 0x8bd5ca, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
  const wingEdgeMat = new THREE.LineBasicMaterial({ color: 0x8bd5ca, transparent: true, opacity: 0.5 });

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(side * 1.75, smOffset, 0);
    group.add(wing);
    const wingEdge = new THREE.LineSegments(new THREE.EdgesGeometry(wingGeo), wingEdgeMat);
    wingEdge.position.copy(wing.position);
    group.add(wingEdge);
  }

  // Nose cone / docking adapter — small cone on top
  const noseGeo = new THREE.ConeGeometry(0.35, 0.5, 8);
  const noseWire = new THREE.LineSegments(new THREE.EdgesGeometry(noseGeo), cyanWire);
  noseWire.position.y = 0.85;
  group.add(noseWire);

  // Forward axis indicator — green line pointing "up" (forward)
  const fwdGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 1.2, 0),
    new THREE.Vector3(0, 1.8, 0),
  ]);
  group.add(new THREE.Line(fwdGeo, greenWire));

  // Arrowhead
  const arrowGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xa6da95, transparent: true, opacity: 0.6 });
  const arrow = new THREE.Mesh(arrowGeo, arrowMat);
  arrow.position.y = 1.9;
  group.add(arrow);

  return group;
}

export function AttitudeIndicator({ quaternion }: AttitudeIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    model: THREE.Group;
    targetQuat: THREE.Quaternion;
    currentQuat: THREE.Quaternion;
    animId: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(3, 2, 4);
    camera.lookAt(0, -0.3, 0);

    const model = buildOrionModel();
    scene.add(model);

    const targetQuat = new THREE.Quaternion();
    const currentQuat = new THREE.Quaternion();

    const state = { renderer, scene, camera, model, targetQuat, currentQuat, animId: 0 };
    stateRef.current = state;

    function animate() {
      state.animId = requestAnimationFrame(animate);
      // Slerp toward target for smooth rotation
      state.currentQuat.slerp(state.targetQuat, 0.1);
      state.model.quaternion.copy(state.currentQuat);
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(state.animId);
      renderer.dispose();
      el.removeChild(renderer.domElement);
      stateRef.current = null;
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
  }, [quaternion]);

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
