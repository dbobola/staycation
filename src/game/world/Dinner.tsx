"use client";

import { Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LITE } from "../quality";
import { useGame } from "../store";
import { Instances } from "./Resort";
import { BUFFET, DINNER, SEATS } from "./layout";

// The poolside dinner: one long table for 50 between the pool and the grill. White cloth to the
// ground, a greenery-and-flowers runner, candles, a place setting and a cocktail at every seat,
// platters of jollof, chicken, plantain and salad down the middle, gold chairs, and strings of
// bulbs overhead. Across its east end, the buffet: chafing dishes, platters and stacked plates.

const SH = !LITE;
const TOP = 0.76;

type Item = { x: number; y: number; z: number; ry?: number; s?: number; color?: string };

function colorize(g: THREE.BufferGeometry, color: string) {
  const out = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(color);
  const n = out.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  out.setAttribute("color", new THREE.BufferAttribute(a, 3));
  out.deleteAttribute("uv");
  return out;
}

/** A gold Chiavari chair with a white cushion (origin on the ground, facing +z). */
function chiavari() {
  const gold = "#c9a54a";
  const p: THREE.BufferGeometry[] = [];
  const seat = new THREE.BoxGeometry(0.42, 0.04, 0.4);
  seat.translate(0, 0.45, 0);
  p.push(colorize(seat, gold));
  const cushion = new THREE.BoxGeometry(0.38, 0.04, 0.36);
  cushion.translate(0, 0.49, 0.01);
  p.push(colorize(cushion, "#f6f3ec"));
  for (const [x, z, h] of [[-0.19, 0.18, 0.45], [0.19, 0.18, 0.45], [-0.19, -0.18, 0.95], [0.19, -0.18, 0.95]] as const) {
    const l = new THREE.CylinderGeometry(0.015, 0.018, h, 6);
    l.translate(x, h / 2, z);
    p.push(colorize(l, gold));
  }
  for (const y of [0.62, 0.78, 0.93]) {
    const r = new THREE.BoxGeometry(0.38, 0.025, 0.025);
    r.translate(0, y, -0.18);
    p.push(colorize(r, gold));
  }
  for (const x of [-0.1, 0, 0.1]) {
    const sp = new THREE.CylinderGeometry(0.008, 0.008, 0.45, 5);
    sp.translate(x, 0.71, -0.18);
    p.push(colorize(sp, gold));
  }
  return mergeGeometries(p)!;
}

/** A place setting: charger, plate, napkin, knife and fork. */
function setting() {
  const p: THREE.BufferGeometry[] = [];
  const charger = new THREE.CylinderGeometry(0.16, 0.16, 0.008, 20);
  charger.translate(0, 0.004, 0);
  p.push(colorize(charger, "#c9a54a"));
  const plate = new THREE.CylinderGeometry(0.13, 0.11, 0.018, 20);
  plate.translate(0, 0.016, 0);
  p.push(colorize(plate, "#fbfaf6"));
  const napkin = new THREE.BoxGeometry(0.1, 0.02, 0.06);
  napkin.translate(0, 0.03, 0);
  p.push(colorize(napkin, "#0e5d6b"));
  for (const x of [-0.2, 0.2]) {
    const c = new THREE.BoxGeometry(0.015, 0.006, 0.19);
    c.translate(x, 0.006, 0);
    p.push(colorize(c, "#d9dde3"));
  }
  return mergeGeometries(p)!;
}

/** A cocktail glass (coupe) with a coloured drink and a slice on the rim. */
export function cocktailGeometry(drink: string) {
  const p: THREE.BufferGeometry[] = [];
  const foot = new THREE.CylinderGeometry(0.035, 0.035, 0.004, 12);
  p.push(colorize(foot, "#e8f2f4"));
  const stem = new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6);
  stem.translate(0, 0.047, 0);
  p.push(colorize(stem, "#e8f2f4"));
  const bowl = new THREE.CylinderGeometry(0.05, 0.012, 0.05, 14, 1, true);
  bowl.translate(0, 0.117, 0);
  p.push(colorize(bowl, "#f4fbfc"));
  const liquid = new THREE.CylinderGeometry(0.044, 0.014, 0.036, 14);
  liquid.translate(0, 0.112, 0);
  p.push(colorize(liquid, drink));
  const slice = new THREE.CylinderGeometry(0.018, 0.018, 0.006, 10, 1, false, 0, Math.PI);
  slice.rotateX(Math.PI / 2);
  slice.translate(0.045, 0.14, 0);
  p.push(colorize(slice, "#f2c21b"));
  return mergeGeometries(p)!;
}

export const DRINKS = ["#e8642a", "#d6247c", "#f2c21b", "#2ec4d6", "#9bd34a", "#b0132f"];

function Table() {
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f7f5f0", roughness: 0.85 }), []);
  const L = DINNER.x1 - DINNER.x0;
  const cx = (DINNER.x0 + DINNER.x1) / 2;
  const vc = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.25 }), []);
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.9 }), []);
  const geos = useMemo(() => ({ chair: chiavari(), setting: setting(), cocktails: DRINKS.map((d) => cocktailGeometry(d)) }), []);
  const seats = useMemo(() => SEATS.filter((s) => s.kind === "dinner"), []);
  const chairs: Item[] = useMemo(() => seats.map((s) => ({ x: s.x, y: 0, z: s.z + (s.facing === 0 ? -0.08 : 0.08), ry: s.facing })), [seats]);
  const settings: Item[] = useMemo(() => seats.map((s) => ({ x: s.x, y: TOP, z: DINNER.z + (s.facing === 0 ? -0.36 : 0.36), ry: 0 })), [seats]);
  // a cocktail beside every plate (sorted into the six drinks)
  const drinks = useMemo(() => {
    const by: Item[][] = DRINKS.map(() => []);
    seats.forEach((s, i) => by[i % DRINKS.length].push({ x: s.x + 0.2, y: TOP, z: DINNER.z + (s.facing === 0 ? -0.2 : 0.2) }));
    return by;
  }, [seats]);
  // down the middle: platters of food between candles and flowers
  const FOODS = ["#d9561e", "#8a4a22", "#e8b23a", "#4f8a3a", "#f0e6c8"];
  const platters = useMemo(() => {
    const by: Item[][] = FOODS.map(() => []);
    let k = 0;
    for (let x = DINNER.x0 + 0.9; x < DINNER.x1 - 0.5; x += 1.45) by[k++ % FOODS.length].push({ x, y: TOP + 0.03, z: DINNER.z });
    return by;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const candles: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (let x = DINNER.x0 + 1.6; x < DINNER.x1; x += 1.45) for (const dz of [-0.12, 0.12]) out.push({ x: x + dz, y: TOP, z: DINNER.z + dz });
    return out;
  }, []);
  const blooms: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (let x = DINNER.x0 + 0.3; x < DINNER.x1 - 0.2; x += 0.23) out.push({ x, y: TOP + 0.05, z: DINNER.z + Math.sin(x * 7) * 0.08, s: 0.8 + ((x * 13) % 1) * 0.5, color: ["#f4f3ee", "#e8a0b4", "#f6d3d9", "#d6247c"][Math.floor(Math.abs(x * 9)) % 4] });
    return out;
  }, []);
  const evening = useGame((s) => s.evening);
  const flame = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffd27a", toneMapped: false }), []);
  const wax = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4efe2", roughness: 0.6 }), []);
  const flowerMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.7 }), []);
  const bowl = useMemo(() => new THREE.CylinderGeometry(0.2, 0.15, 0.06, 18), []);
  const china = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f2efe8", metalness: 0.3, roughness: 0.3 }), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const foodMats = useMemo(() => FOODS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })), []);
  const food = useMemo(() => new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), []);
  return (
    <group>
      {/* the tablecloth, falling to the ground */}
      <mesh position={[cx, TOP / 2, DINNER.z]} material={cloth} castShadow={SH} receiveShadow>
        <boxGeometry args={[L + 0.3, TOP, DINNER.w]} />
      </mesh>
      {/* the greenery runner */}
      <mesh position={[cx, TOP + 0.012, DINNER.z]}>
        <boxGeometry args={[L - 0.2, 0.025, 0.32]} />
        <meshStandardMaterial color="#3f6a33" roughness={0.9} />
      </mesh>
      <Instances geo={useMemo(() => new THREE.IcosahedronGeometry(0.045, 1), [])} mat={flowerMat} items={blooms} cast={false} />
      <Instances geo={geos.chair} mat={vc} items={chairs} />
      <Instances geo={geos.setting} mat={vc} items={settings} cast={false} />
      {drinks.map((items, i) => (
        <Instances key={i} geo={geos.cocktails[i]} mat={glassMat} items={items} cast={false} />
      ))}
      {/* platters: a serving bowl each, heaped with food */}
      {platters.map((items, i) => (
        <group key={i}>
          <Instances geo={bowl} mat={china} items={items} cast={false} />
          <Instances geo={food} mat={foodMats[i]} items={items.map((it) => ({ ...it, y: it.y + 0.01 }))} cast={false} />
        </group>
      ))}
      {/* candles */}
      <Instances geo={useMemo(() => new THREE.CylinderGeometry(0.025, 0.025, 0.14, 10).translate(0, 0.07, 0), [])} mat={wax} items={candles} cast={false} />
      <Instances geo={useMemo(() => new THREE.SphereGeometry(0.018, 8, 6).scale(1, 1.8, 1).translate(0, 0.165, 0), [])} mat={flame} items={candles} cast={false} />
      {evening && (
        <>
          {(LITE ? [0] : [-5, 0, 5]).map((x) => (
            <pointLight key={x} position={[x, 1.4, DINNER.z]} color="#ffcf8a" intensity={10} distance={6} />
          ))}
        </>
      )}
    </group>
  );
}

/** Strings of warm bulbs over the table, between poles at each end and along both sides. */
function StringLights() {
  const evening = useGame((s) => s.evening);
  const poles = useMemo(() => {
    const out: Item[] = [];
    for (const x of [DINNER.x0 - 0.9, 0, DINNER.x1 + 0.9]) for (const z of [DINNER.z - 2.2, DINNER.z + 2.2]) out.push({ x, y: 0, z });
    return out;
  }, []);
  const bulbs = useMemo(() => {
    const out: Item[] = [];
    // along each side, and zig-zagging across the table, sagging between the poles
    const H = 3.6;
    const spans: [number, number, number, number][] = [];
    for (const z of [DINNER.z - 2.2, DINNER.z + 2.2]) spans.push([DINNER.x0 - 0.9, z, 0, z], [0, z, DINNER.x1 + 0.9, z]);
    for (let i = 0; i < 6; i++) {
      const xa = DINNER.x0 - 0.9 + (i / 6) * (DINNER.x1 - DINNER.x0 + 1.8);
      const xb = DINNER.x0 - 0.9 + ((i + 1) / 6) * (DINNER.x1 - DINNER.x0 + 1.8);
      spans.push([xa, DINNER.z - 2.2, xb, DINNER.z + 2.2]);
    }
    for (const [ax, az, bx, bz] of spans) {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.round(len / 0.55);
      for (let k = 1; k < n; k++) {
        const t = k / n;
        out.push({ x: ax + (bx - ax) * t, y: H - Math.sin(t * Math.PI) * 0.55, z: az + (bz - az) * t });
      }
    }
    return out;
  }, []);
  const bulbMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fff2d0", emissive: "#ffcf7a", emissiveIntensity: 0 }), []);
  bulbMat.emissiveIntensity = evening ? 3.2 : 0.3;
  const pole = useMemo(() => new THREE.CylinderGeometry(0.04, 0.05, 3.7, 8).translate(0, 1.85, 0), []);
  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1d1f22", metalness: 0.6, roughness: 0.4 }), []);
  return (
    <group>
      <Instances geo={pole} mat={poleMat} items={poles} />
      <Instances geo={useMemo(() => new THREE.SphereGeometry(0.05, 8, 6), [])} mat={bulbMat} items={bulbs} cast={false} />
    </group>
  );
}

/** The buffet across the end of the table: chafing dishes, platters, plates, and its sign. */
function Buffet() {
  const len = BUFFET.z1 - BUFFET.z0;
  const cz = (BUFFET.z0 + BUFFET.z1) / 2;
  const silver = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9dde3", metalness: 0.9, roughness: 0.2 }), []);
  const evening = useGame((s) => s.evening);
  const dishes = [-1.35, -0.45, 0.45, 1.35];
  const FOOD = ["#d9561e", "#c47a2c", "#8a4a22", "#e8b23a"];
  return (
    <group position={[BUFFET.x, 0, cz]}>
      <mesh position={[0, TOP / 2 + 0.06, 0]} castShadow={SH} receiveShadow>
        <boxGeometry args={[BUFFET.w, TOP + 0.12, len]} />
        <meshStandardMaterial color="#f7f5f0" roughness={0.85} />
      </mesh>
      {/* a teal skirt along the front */}
      <mesh position={[-BUFFET.w / 2 - 0.005, 0.42, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[len, 0.84]} />
        <meshStandardMaterial color="#0e5d6b" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {dishes.map((z, i) => (
        <group key={z} position={[0, TOP + 0.12, z]}>
          {/* chafing dish: a silver tray of food, a half-open lid, the burner glow underneath */}
          <mesh position-y={0.07} material={silver}>
            <boxGeometry args={[0.5, 0.1, 0.62]} />
          </mesh>
          <mesh position-y={0.125}>
            <boxGeometry args={[0.44, 0.02, 0.56]} />
            <meshStandardMaterial color={FOOD[i]} roughness={0.85} />
          </mesh>
          <mesh position={[0.18, 0.2, 0]} rotation-z={-0.9} material={silver}>
            <cylinderGeometry args={[0.25, 0.25, 0.6, 16, 1, true, 0, Math.PI]} />
          </mesh>
          <mesh position-y={0.015}>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 10]} />
            <meshBasicMaterial color={evening ? "#5aa8ff" : "#33475e"} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* a stack of plates and a bowl of fruit */}
      <mesh position={[0.12, TOP + 0.2, BUFFET.z1 - cz - 0.25]}>
        <cylinderGeometry args={[0.14, 0.13, 0.16, 18]} />
        <meshStandardMaterial color="#fbfaf6" />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[0.1 + Math.cos(k * 1.3) * 0.08, TOP + 0.2, BUFFET.z0 - cz + 0.3 + Math.sin(k * 1.3) * 0.08]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshStandardMaterial color={["#f2c21b", "#e8642a", "#9bd34a", "#b0132f", "#f2c21b"][k]} roughness={0.5} />
        </mesh>
      ))}
      {/* the sign facing the table */}
      <group position={[-0.1, TOP + 0.62, 0]} rotation-y={-Math.PI / 2}>
        <mesh>
          <boxGeometry args={[1.3, 0.34, 0.03]} />
          <meshStandardMaterial color="#0e5d6b" />
        </mesh>
        <Text position={[0, 0, 0.02]} fontSize={0.15} color="#fff6e8" anchorX="center" anchorY="middle" fontWeight={800}>
          DINNER BUFFET
        </Text>
      </group>
      {evening && <pointLight position={[-0.6, 1.6, 0]} color="#ffd59a" intensity={8} distance={5} />}
    </group>
  );
}

export function Dinner() {
  return (
    <group>
      <Table />
      <StringLights />
      <Buffet />
    </group>
  );
}
