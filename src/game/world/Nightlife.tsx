"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGame } from "../store";
import { COMPOUND, HOTEL, HOTEL_BAY, PALMS, POOL, TERRACE_EDGE, TERRACE_Y } from "./layout";

// The party at night: colour everywhere, all of it cheap to draw (glowing meshes, not lights).
//  - every palm lit from below in pink, cyan, violet or amber
//  - strings of multicoloured bulbs zig-zagging over the courtyard and along the pool
//  - colour washed up the hotel's front between its pilasters
//  - soft pools of coloured light on the ground
//  - the pool's lights slowly changing colour

const COLORS = ["#ff3fa4", "#2ee6ff", "#9b5cff", "#ffb02e", "#3dff9a", "#ff5a3c"];

/** A vertical fade texture (bright at the bottom), for light beams and washes. */
function fade() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 128, 0, 0);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}

/** A round soft spot (bright in the middle), for light on the ground. */
function spot() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,0.9)");
  grd.addColorStop(0.4, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function glow(map: THREE.Texture, color: string, opacity = 1) {
  return new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
}

/** Uplights at every palm: a coloured beam up the trunk and a pool of light round its foot. */
function PalmUplights({ fadeTex, spotTex }: { fadeTex: THREE.Texture; spotTex: THREE.Texture }) {
  const beams = useMemo(() => COLORS.map((c) => glow(fadeTex, c, 0.38)), [fadeTex]);
  const pools = useMemo(() => COLORS.map((c) => glow(spotTex, c, 0.7)), [spotTex]);
  const beamGeo = useMemo(() => new THREE.CylinderGeometry(0.75, 0.3, 6, 14, 1, true).translate(0, 3.25, 0), []);
  return (
    <group>
      {PALMS.map((p, i) => (
        <group key={i} position={[p.x, p.y + 0.02, p.z]}>
          <mesh geometry={beamGeo} material={beams[i % COLORS.length]} />
          <mesh rotation-x={-Math.PI / 2} position-y={0.03} material={pools[i % COLORS.length]}>
            <planeGeometry args={[3.2, 3.2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

type Bulb = { x: number; y: number; z: number };

/** Festoon strings between anchor points, sagging, with a bulb every half metre. */
function festoon(spans: [number, number, number, number, number, number][], spacing = 0.5, sag = 0.6): Bulb[] {
  const out: Bulb[] = [];
  for (const [ax, ay, az, bx, by, bz] of spans) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(2, Math.round(len / spacing));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t - Math.sin(t * Math.PI) * sag, z: az + (bz - az) * t });
    }
  }
  return out;
}

function Festoons() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const bulbs = useMemo(() => {
    const spans: [number, number, number, number, number, number][] = [];
    // zig-zags over the courtyard: from the terrace's edge down to the pool fence
    const top = TERRACE_Y + 2.8, low = 2.9;
    for (let x = -13; x < 15; x += 3.4) spans.push([x, top, TERRACE_EDGE + 0.2, x + 1.7, low, -6.4], [x + 1.7, low, -6.4, x + 3.4, top, TERRACE_EDGE + 0.2]);
    // along the pool's south wall, over the loungers
    spans.push([POOL.x0 - 2, 3.2, 8.6, 0, 3.2, 8.6], [0, 3.2, 8.6, POOL.x1 + 5, 3.2, 8.6]);
    // across the west courtyard (where Ayo and Ludo are)
    spans.push([COMPOUND.x0 + 2, 3.4, -24, -16, 3.4, -9], [-16, 3.4, -24, COMPOUND.x0 + 2, 3.4, -9]);
    return festoon(spans);
  }, []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    bulbs.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
      ref.current.setColorAt(i, c.set(COLORS[i % COLORS.length]).multiplyScalar(1.6));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.instanceColor!.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [bulbs]);
  // a gentle twinkle: brightness swells along the strings
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useFrame(({ clock }) => {
    const k = 0.85 + Math.sin(clock.elapsedTime * 1.4) * 0.15;
    mat.color.setScalar(k);
  });
  return (
    <instancedMesh ref={ref} args={[undefined, mat, bulbs.length]} frustumCulled={false}>
      <sphereGeometry args={[0.04, 8, 6]} />
    </instancedMesh>
  );
}

/** Colour washed up the hotel's front, a different colour in each bay between the pilasters. */
function FacadeWash({ fadeTex }: { fadeTex: THREE.Texture }) {
  const bays = useMemo(() => {
    const out: { x: number; z: number; w: number; c: string }[] = [];
    let k = 0;
    for (let x = HOTEL.x0 + 2; x < HOTEL.x1 - 1; x += 4) {
      const inBay = x > HOTEL_BAY.x0 && x < HOTEL_BAY.x1;
      out.push({ x, z: (inBay ? HOTEL_BAY.front : HOTEL.front) + 0.06, w: 3.6, c: COLORS[k++ % COLORS.length] });
    }
    return out;
  }, []);
  const mats = useMemo(() => COLORS.map((c) => glow(fadeTex, c, 0.42)), [fadeTex]);
  const H = HOTEL.floors * HOTEL.floorH;
  return (
    <group>
      {bays.map((b, i) => (
        <mesh key={i} position={[b.x, TERRACE_Y + H / 2, b.z]} material={mats[COLORS.indexOf(b.c)]}>
          <planeGeometry args={[b.w, H]} />
        </mesh>
      ))}
    </group>
  );
}

/** Soft coloured light on the courtyard floor under the festoons. */
function GroundGlow({ spotTex }: { spotTex: THREE.Texture }) {
  const mats = useMemo(() => COLORS.map((c) => glow(spotTex, c, 0.35)), [spotTex]);
  const spots = useMemo(() => {
    const out: { x: number; z: number; s: number }[] = [];
    let k = 0;
    for (let x = -12; x < 14; x += 4.2) out.push({ x, z: -17 - (k++ % 2) * 3, s: 6 });
    out.push({ x: -28, z: -16, s: 9 }, { x: 24, z: -2, s: 8 }, { x: 30, z: -30, s: 8 });
    return out;
  }, []);
  return (
    <group>
      {spots.map((s, i) => (
        <mesh key={i} position={[s.x, 0.04, s.z]} rotation-x={-Math.PI / 2} material={mats[i % COLORS.length]}>
          <planeGeometry args={[s.s, s.s]} />
        </mesh>
      ))}
    </group>
  );
}

/** The pool's underwater lights: two big coloured glows that drift through the colours. */
function PoolColours() {
  const a = useRef<THREE.PointLight>(null!);
  const b = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.08;
    a.current.color.setHSL(t % 1, 0.85, 0.55);
    b.current.color.setHSL((t + 0.45) % 1, 0.85, 0.55);
  });
  return (
    <>
      <pointLight ref={a} position={[-4, 0.6, 0]} intensity={18} distance={11} decay={1.4} />
      <pointLight ref={b} position={[4, 0.6, 0]} intensity={18} distance={11} decay={1.4} />
    </>
  );
}

export function Nightlife() {
  const evening = useGame((s) => s.evening);
  const fadeTex = useMemo(() => fade(), []);
  const spotTex = useMemo(() => spot(), []);
  if (!evening) return null;
  return (
    <group>
      <PalmUplights fadeTex={fadeTex} spotTex={spotTex} />
      <Festoons />
      <FacadeWash fadeTex={fadeTex} />
      <GroundGlow spotTex={spotTex} />
      <PoolColours />
    </group>
  );
}
