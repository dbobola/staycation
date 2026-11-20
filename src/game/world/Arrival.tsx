"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { LITE, Q } from "../quality";
import { useGame } from "../store";
import { Instances } from "./Resort";
import { STREET, TERRACE_Y } from "./layout";
import { CAR_WINDSCREEN, LIMO_GLASS, carGeometries } from "./shapes";
import { Avatar } from "../avatar/Avatar";
import type { Outfit } from "../avatar/outfit";

// The first scene: a pearl-white stretch limousine comes down the road and pulls up at the gate with you inside. It
// waits while you say who you are, then drives off once you've stepped out. Fireworks go up over
// the resort to welcome you.

const Y = TERRACE_Y;
// down the street in the lane nearest the kerb, then in to the kerb alongside the gate, side-on:
// you step out onto the pavement facing straight in
const PARK = { x: STREET.park, z: -29 };
const IN = new THREE.CatmullRomCurve3([
  new THREE.Vector3(STREET.southSlow, Y, -96),
  new THREE.Vector3(STREET.southSlow, Y, -60),
  new THREE.Vector3(STREET.southSlow, Y, -40),
  new THREE.Vector3(47.3, Y, -33),
  new THREE.Vector3(PARK.x, Y, PARK.z),
]);
const OUT = new THREE.CatmullRomCurve3([
  new THREE.Vector3(PARK.x, Y, PARK.z),
  new THREE.Vector3(PARK.x + 0.4, Y, -22),
  new THREE.Vector3(STREET.southSlow, Y, -12),
  new THREE.Vector3(STREET.southSlow, Y, 60),
  new THREE.Vector3(STREET.southSlow, Y, 140),
]);
const DRIVE_IN = 7;
const DRIVE_OUT = 9;

const CHAUFFEUR: Outfit = { kind: "staff", shirt: "#121315", trousers: "#121315" };

/** Where the car is (the camera follows it in). */
export const arrival = { x: STREET.southSlow, z: -96, heading: 0, t: 0, leaving: -1 };
/** Where you step out: beside the car's passenger side, facing the gate. */
export const DROP_OFF = { x: STREET.walk.x1 - 0.7, z: PARK.z, heading: -Math.PI / 2 };
/** How far you walk in by yourself while you're being welcomed. */
export const WALK_IN_TO = { x: 41.5, z: -29 };

export function ArrivalCar() {
  const phase = useGame((s) => s.phase);
  const g = useRef<THREE.Group>(null!);
  const geos = useMemo(() => carGeometries("limo"), []);
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#f4f3ef", roughness: 0.16, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.05 }), []);
  const detail = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.35 }), []);
  const one = useMemo(() => [{ x: 0, y: 0, z: 0 }], []);
  const pt = new THREE.Vector3();
  const tan = new THREE.Vector3();
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const st = useGame.getState();
    let curve = IN;
    let u = 0;
    if (st.phase === "arrive") {
      arrival.t = Math.min(1, arrival.t + dt / DRIVE_IN);
      u = 1 - Math.pow(1 - arrival.t, 2);
      if (arrival.t >= 1) st.set({ phase: "setup" });
    } else if (arrival.leaving >= 0) {
      // you're out: off it goes, on down the road
      curve = OUT;
      arrival.leaving = Math.min(1, arrival.leaving + dt / DRIVE_OUT);
      u = Math.pow(arrival.leaving, 1.6);
      if (arrival.leaving >= 1) arrival.leaving = -2;
    } else if (st.phase === "setup" || st.phase === "celebrate") {
      u = 1;
    } else {
      if (g.current) g.current.visible = false;
      return;
    }
    curve.getPointAt(u, pt);
    curve.getTangentAt(u, tan);
    arrival.x = pt.x;
    arrival.z = pt.z;
    arrival.heading = Math.atan2(tan.x, tan.z);
    g.current.visible = true;
    g.current.position.set(pt.x, pt.y, pt.z);
    g.current.rotation.y = arrival.heading;
  });
  const evening = useGame((s) => s.evening);
  if (phase !== "loading" && phase !== "arrive" && phase !== "setup" && phase !== "celebrate" && arrival.leaving < 0) return null;
  return (
    <group ref={g} position={[STREET.southSlow, Y, -96]}>
      <Instances geo={geos.body} mat={paint} items={one} />
      <Instances geo={geos.detail} mat={detail} items={one} />
      <mesh geometry={geos.glass} material={LIMO_GLASS} renderOrder={3} />
      <mesh geometry={geos.windscreen} material={CAR_WINDSCREEN} renderOrder={3} />
      {/* the chauffeur, in a black suit, hands on the wheel (scaled to sit under the low roof) */}
      <Suspense fallback={null}>
        <Avatar avatarId="bm02" anim="sit" outfit={CHAUFFEUR} position={[geos.driver.x, geos.driver.floor - 0.2, geos.driver.z - 0.05]} scale={0.78} shadows={false} />
      </Suspense>
      {/* headlights on */}
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.68, 3.84]}>
          <boxGeometry args={[0.4, 0.1, 0.02]} />
          <meshBasicMaterial color="#fffbe8" toneMapped={false} />
        </mesh>
      ))}
      {evening && !LITE && (
        <pointLight position={[0, 0.8, 6]} intensity={25} distance={12} color="#fff4d6" />
      )}
    </group>
  );
}

/** How many sparks the fireworks have (fewer on phones). */
const N = Q.particles * 6;

/** Fireworks over the resort while you're welcomed in. */
export function Fireworks() {
  const phase = useGame((s) => s.phase);
  const pts = useRef<THREE.Points>(null!);
  const data = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const life = new Float32Array(N).fill(-1);
    return { pos, col, vel, life };
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(data.col, 3));
    return g;
  }, [data]);
  const next = useRef(0);
  const cursor = useRef(0);
  const until = useRef(0);
  const seenPhase = useRef<string>("");
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    const t = clock.elapsedTime;
    if (phase !== seenPhase.current) {
      seenPhase.current = phase;
      if (phase === "celebrate") until.current = t + 7;
    }
    // a new burst every half second while the welcome lasts
    if (t < until.current && t > next.current) {
      next.current = t + 0.35 + Math.random() * 0.35;
      const cx = 5 + Math.random() * 35, cy = 22 + Math.random() * 14, cz = -42 + Math.random() * 30;
      const c = new THREE.Color().setHSL(Math.random(), 0.9, 0.62);
      for (let k = 0; k < 110; k++) {
        const i = cursor.current;
        cursor.current = (cursor.current + 1) % N;
        const v = new THREE.Vector3().randomDirection().multiplyScalar(7 + Math.random() * 3);
        data.pos.set([cx, cy, cz], i * 3);
        data.vel.set([v.x, v.y, v.z], i * 3);
        data.col.set([c.r, c.g, c.b], i * 3);
        data.life[i] = 1.6 + Math.random() * 0.5;
      }
    }
    for (let i = 0; i < N; i++) {
      if (data.life[i] <= 0) {
        data.pos[i * 3 + 1] = -999;
        continue;
      }
      data.life[i] -= dt;
      data.vel[i * 3 + 1] -= 5 * dt;
      const drag = Math.pow(0.4, dt);
      for (let a = 0; a < 3; a++) {
        data.vel[i * 3 + a] *= drag;
        data.pos[i * 3 + a] += data.vel[i * 3 + a] * dt;
      }
      // fade
      const f = Math.min(1, data.life[i]);
      data.col[i * 3] *= 0.985 + 0.015 * f;
      data.col[i * 3 + 1] *= 0.985 + 0.015 * f;
      data.col[i * 3 + 2] *= 0.985 + 0.015 * f;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });
  return (
    <points ref={pts} geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.55} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} sizeAttenuation />
    </points>
  );
}
