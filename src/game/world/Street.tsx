"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Q } from "../quality";
import { useGame } from "../store";
import { Instances } from "./Resort";
import { ROAD, STREET, TERRACE_Y } from "./layout";
import { CAR_GLASS, CAR_WINDSCREEN, carGeometries } from "./shapes";
import { pavers, render } from "./textures";

// The street outside the gate: a long two-way road with lane markings, pavements with kerbs on
// both sides, street lights, and traffic going by in both directions.

const Y = TERRACE_Y;
const LEN = ROAD.z1 - ROAD.z0;
const CZ = (ROAD.z0 + ROAD.z1) / 2;

/** Asphalt with its markings: a 13 m-wide strip, 20 m long, repeated down the road. */
function asphalt() {
  const W = 520, H = 800; // 4 px a 10 cm
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2f3033";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    const v = Math.random() < 0.5 ? 20 : 70;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.25})`;
    g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  // tyre wear down each lane
  for (const lane of [STREET.southSlow, STREET.southFast, STREET.northFast, STREET.northSlow]) {
    const x = (lane - STREET.road.x0) * 40;
    for (const o of [-28, 28]) {
      g.fillStyle = "rgba(0,0,0,0.12)";
      g.fillRect(x + o - 8, 0, 16, H);
    }
  }
  const px = (m: number) => (m - STREET.road.x0) * 40;
  g.fillStyle = "#e9e6dc";
  // the parking lane's edge (solid), the dashes between the lanes going the same way
  g.fillRect(px(47.2) - 3, 0, 6, H);
  for (let y = 0; y < H; y += 200) {
    g.fillRect(px(49.95) - 3, y, 6, 110);
    g.fillRect(px(55.25) - 3, y, 6, 110);
  }
  // the double yellow line down the middle
  g.fillStyle = "#e3b23c";
  g.fillRect(px(52.7) - 9, 0, 6, H);
  g.fillRect(px(52.7) + 3, 0, 6, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, LEN / 20);
  t.anisotropy = Q.lite ? 2 : 8;
  return t;
}

function Road() {
  const top = useMemo(() => new THREE.MeshStandardMaterial({ map: asphalt(), roughness: 0.92 }), []);
  const walk = useMemo(() => new THREE.MeshStandardMaterial({ map: pavers([2, LEN / 4]), roughness: 0.9 }), []);
  const side = useMemo(() => new THREE.MeshStandardMaterial({ map: render("#8a8478", [LEN / 6, 1], 49), roughness: 0.95 }), []);
  const kerb = useMemo(() => new THREE.MeshStandardMaterial({ color: "#bdb8ad", roughness: 0.8 }), []);
  const RW = STREET.road.x1 - STREET.road.x0;
  return (
    <group>
      {/* the embankment the street sits on */}
      <mesh position={[(ROAD.x0 + ROAD.x1) / 2, Y / 2 - 0.01, CZ]} material={side} receiveShadow>
        <boxGeometry args={[ROAD.x1 - ROAD.x0, Y - 0.02, LEN]} />
      </mesh>
      <mesh position={[(STREET.road.x0 + STREET.road.x1) / 2, Y, CZ]} rotation-x={-Math.PI / 2} material={top} receiveShadow>
        <planeGeometry args={[RW, LEN]} />
      </mesh>
      {/* pavements, raised behind their kerbs */}
      {[
        [STREET.walk.x0, STREET.walk.x1],
        [STREET.road.x1, ROAD.x1],
      ].map(([a, b], i) => (
        <group key={i}>
          <mesh position={[(a + b) / 2, Y + 0.075, CZ]} material={walk} receiveShadow>
            <boxGeometry args={[b - a, 0.15, LEN]} />
          </mesh>
          <mesh position={[i ? a + 0.08 : b - 0.08, Y + 0.08, CZ]} material={kerb}>
            <boxGeometry args={[0.16, 0.17, LEN]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Street lights down both pavements, every 25 m: a pole, an arm, and a lamp that glows at night. */
function StreetLights() {
  const evening = useGame((s) => s.evening);
  const items = useMemo(() => {
    const out: { x: number; y: number; z: number; ry: number }[] = [];
    for (let z = ROAD.z0 + 10; z < ROAD.z1; z += 25) {
      out.push({ x: STREET.walk.x1 - 0.35, y: Y, z, ry: 0 });
      out.push({ x: STREET.road.x1 + 0.35, y: Y, z: z + 12, ry: Math.PI });
    }
    return out;
  }, []);
  const pole = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.07, 0.1, 7, 8).translate(0, 3.5, 0);
    return g;
  }, []);
  const arm = useMemo(() => new THREE.BoxGeometry(1.6, 0.08, 0.1).translate(0.8, 6.9, 0), []);
  const lamp = useMemo(() => new THREE.BoxGeometry(0.6, 0.12, 0.28).translate(1.45, 6.82, 0), []);
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5d6166", metalness: 0.6, roughness: 0.4 }), []);
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fff3d6", emissive: "#ffd99a", emissiveIntensity: 0 }), []);
  glow.emissiveIntensity = evening ? 4 : 0.2;
  // a pool of light under each lamp (a soft disc, not a real light)
  const poolTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,220,160,0.55)");
    r.addColorStop(1, "rgba(255,220,160,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
  const poolMat = useMemo(() => new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), [poolTex]);
  const poolGeo = useMemo(() => new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2).translate(1.45, 0.03, 0), []);
  // the arm reaches out over the road: on the far side it's turned round
  const turned = items.map((it) => ({ ...it, ry: it.ry === 0 ? 0 : Math.PI }));
  return (
    <group>
      <Instances geo={pole} mat={metal} items={turned} />
      <Instances geo={arm} mat={metal} items={turned} cast={false} />
      <Instances geo={lamp} mat={glow} items={turned} cast={false} />
      {evening && <Instances geo={poolGeo} mat={poolMat} items={turned} cast={false} />}
    </group>
  );
}

type TrafficCar = { lane: number; dir: 1 | -1; speed: number; z: number; kind: "sedan" | "suv"; color: string };

/** Cars going by in both directions (none in the lane by the kerb, where the limo comes in). */
function Traffic() {
  const cars = useMemo<TrafficCar[]>(() => {
    const n = Q.lite ? (Q.models > 6 ? 4 : 2) : 8;
    const colors = ["#c9c9c9", "#1c2a44", "#8a1f1f", "#e8e8e8", "#2b2b2b", "#d4a017", "#3c5a3a", "#5b6470"];
    return Array.from({ length: n }, (_, i) => {
      const south = i % 2 === 0;
      return {
        lane: south ? STREET.southFast : i % 4 === 1 ? STREET.northFast : STREET.northSlow,
        dir: south ? 1 : -1,
        speed: 9 + (i % 3) * 2.5,
        z: ROAD.z0 + ((i * 47) % LEN),
        kind: i % 3 === 0 ? "suv" : "sedan",
        color: colors[i % colors.length],
      } as TrafficCar;
    });
  }, []);
  const geos = useMemo(() => ({ sedan: carGeometries("sedan"), suv: carGeometries("suv") }), []);
  const detail = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.35 }), []);
  const paints = useMemo(() => cars.map((c) => new THREE.MeshPhysicalMaterial({ color: c.color, roughness: 0.3, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1 })), [cars]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const evening = useGame((s) => s.evening);
  const head = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fff6dc", toneMapped: false }), []);
  const tail = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff2a2a", toneMapped: false }), []);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    cars.forEach((c, i) => {
      // keep a safe gap behind the car in front in the same lane
      let speed = c.speed;
      for (const o of cars) {
        if (o === c || o.lane !== c.lane) continue;
        const ahead = (o.z - c.z) * c.dir;
        if (ahead > 0 && ahead < 14) speed = Math.min(speed, o.speed * (ahead < 9 ? 0.6 : 1));
      }
      c.z += c.dir * speed * dt;
      if (c.dir > 0 && c.z > ROAD.z1 - 5) c.z = ROAD.z0 + 5;
      if (c.dir < 0 && c.z < ROAD.z0 + 5) c.z = ROAD.z1 - 5;
      const g = refs.current[i];
      if (g) g.position.set(c.lane, Y, c.z);
    });
  });
  return (
    <group>
      {cars.map((c, i) => (
        <group key={i} ref={(r) => void (refs.current[i] = r)} rotation-y={c.dir > 0 ? 0 : Math.PI}>
          <mesh geometry={geos[c.kind].body} material={paints[i]} castShadow={!Q.lite} />
          <mesh geometry={geos[c.kind].detail} material={detail} />
          <mesh geometry={geos[c.kind].glass} material={CAR_GLASS} renderOrder={3} />
          <mesh geometry={geos[c.kind].windscreen} material={CAR_WINDSCREEN} renderOrder={3} />
          {evening &&
            [-0.6, 0.6].map((x) => (
              <group key={x}>
                <mesh position={[x, c.kind === "suv" ? 0.86 : 0.66, 2.38]} material={head}>
                  <boxGeometry args={[0.36, 0.1, 0.02]} />
                </mesh>
                <mesh position={[x * 1.05, c.kind === "suv" ? 1.02 : 0.8, -2.36]} material={tail}>
                  <boxGeometry args={[0.3, 0.1, 0.02]} />
                </mesh>
              </group>
            ))}
        </group>
      ))}
    </group>
  );
}

export function Street() {
  return (
    <group>
      <Road />
      <StreetLights />
      <Traffic />
    </group>
  );
}
