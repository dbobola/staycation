"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LITE } from "../quality";
import { useGame } from "../store";
import {
  CINEMA,
  COMPOUND,
  DECK,
  GATE,
  GAZEBO,
  GRILL,
  HOTEL,
  HOTEL_BAY,
  LOUNGERS,
  MOVIE_LAWN,
  MURAL,
  PAVILION,
  PAVILION_FLOOR,
  POOL,
  PORCH,
  SEATS,
  STAIRS,
  TABLES,
  TERRACE_EDGE,
  TERRACE_Y,
  type Rect,
  BAR,
  BARRICADES,
  CARS,
  CHECKIN_DESK,
  PALMS,
} from "./layout";
import { CAR_GLASS, CAR_WINDSCREEN, carGeometries, hipRoof, loungerGeometry, metalChairGeometry, palmGeometry, rattanChairGeometry, shrubGeometry } from "./shapes";
import { flagstone, grass, hotelBay, ivy, marble, mural, pavers, render, roofSheet } from "./textures";

// The resort's buildings and grounds (everything that doesn't move).

const SH = !LITE;

type V3 = [number, number, number];

function Box({ p, s, m, cast = SH, receive = true }: { p: V3; s: V3; m: THREE.Material | THREE.Material[]; cast?: boolean; receive?: boolean }) {
  return (
    <mesh position={p} material={m} castShadow={cast} receiveShadow={receive}>
      <boxGeometry args={s} />
    </mesh>
  );
}

/** A flat rectangle of ground (top face only) at height y. */
function Ground({ r, y, m }: { r: Rect; y: number; m: THREE.Material }) {
  return (
    <mesh position={[(r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2]} rotation-x={-Math.PI / 2} material={m} receiveShadow>
      <planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} />
    </mesh>
  );
}

/** Rectangle minus a hole, as up to four rectangles. */
function minus(r: Rect, h: Rect): Rect[] {
  return [
    { x0: r.x0, x1: r.x1, z0: r.z0, z1: h.z0 },
    { x0: r.x0, x1: r.x1, z0: h.z1, z1: r.z1 },
    { x0: r.x0, x1: h.x0, z0: h.z0, z1: h.z1 },
    { x0: h.x1, x1: r.x1, z0: h.z0, z1: h.z1 },
  ].filter((q) => q.x1 - q.x0 > 0.01 && q.z1 - q.z0 > 0.01);
}

const mat = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });

function useMats() {
  return useMemo(() => {
    const cw = COMPOUND.x1 - COMPOUND.x0;
    return {
      yard: mat({ map: pavers([cw / 4, 36 / 4]) }),
      terrace: mat({ map: pavers([cw / 4, 24 / 4], "red") }),
      deck: mat({ map: flagstone([(DECK.x1 - DECK.x0) / 3, (DECK.z1 - DECK.z0) / 3]), roughness: 0.9 }),
      turf: mat({ map: grass([12, 1], "turf") }),
      wall: mat({ map: render("#6f7f8c", [14, 1], 43) }),
      retaining: mat({ map: render("#8a8478", [20, 1], 44) }),
      cream: mat({ map: render("#d9c6a0", [4, 2], 45) }),
      beige: mat({ map: render("#cdbb98", [6, 2], 46) }),
      grey: mat({ map: render("#a8a39a", [4, 2], 47) }),
      pilaster: mat({ color: "#5b3a2a" }),
      white: mat({ color: "#f3efe6" }),
      black: mat({ color: "#16181a", roughness: 0.5, metalness: 0.5 }),
      steel: mat({ color: "#1d1f22", roughness: 0.4, metalness: 0.7 }),
      glass: new THREE.MeshStandardMaterial({ color: "#0f1a20", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.28 }),
      roof: mat({ map: roofSheet([6, 3]), side: THREE.DoubleSide }),
      roofSmall: mat({ map: roofSheet([2, 2], "#c06236"), side: THREE.DoubleSide }),
      fascia: mat({ color: "#e8dcc4" }),
      door: mat({ color: "#3a2a22", roughness: 0.6 }),
      darkGlass: mat({ color: "#22303a", roughness: 0.1, metalness: 0.4 }),
      marble: mat({ map: marble([2, 1]), roughness: 0.25 }),
      counter: mat({ color: "#2b2622", roughness: 0.6 }),
      greenPanel: new THREE.MeshStandardMaterial({ color: "#1f6b3a", roughness: 0.9, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
      mesh: new THREE.MeshStandardMaterial({ color: "#111", transparent: true, opacity: 0.2, side: THREE.DoubleSide, roughness: 1 }),
      floorTile: mat({ color: "#3d3a37", roughness: 0.4 }),
      asphalt: mat({ map: render("#3c3d3f", [3, 20], 48) }),
      mural: mat({ map: mural(), roughness: 0.9 }),
      orangeCap: mat({ color: "#c0643a" }),
      ivy: new THREE.MeshStandardMaterial({ map: ivy([4, 5]), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }),
      corrugated: mat({ color: "#8d9095", metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }),
      brick: mat({ color: "#7a4a36" }),
    };
  }, []);
}

type Mats = ReturnType<typeof useMats>;

// ---------------------------------------------------------------------------------------------

function Grounds({ m }: { m: Mats }) {
  const inner: Rect = { x0: COMPOUND.x0, x1: COMPOUND.x1, z0: TERRACE_EDGE, z1: COMPOUND.z1 };
  return (
    <group>
      {/* courtyard pavers everywhere at pool level, except the deck */}
      {minus(inner, DECK).map((r, i) => (
        <Ground key={i} r={r} y={0} m={m.yard} />
      ))}
      {/* stone flags round the pool (the water is cut out) */}
      {minus(DECK, { x0: POOL.x0 - 0.45, x1: POOL.x1 + 0.45, z0: POOL.z0 - 0.45, z1: POOL.z1 + 0.45 }).map((r, i) => (
        <Ground key={i} r={r} y={0.012} m={m.deck} />
      ))}
      {/* the movie lawn */}
      <Ground r={MOVIE_LAWN} y={0.02} m={m.turf} />
      {/* artificial turf strip along the fence, north of the pool */}
      <Ground r={{ x0: DECK.x0, x1: DECK.x1, z0: DECK.z0, z1: DECK.z0 + 1.2 }} y={0.02} m={m.turf} />
      {/* the terrace: a raised slab with its retaining wall */}
      <Box p={[(COMPOUND.x0 + COMPOUND.x1) / 2, TERRACE_Y / 2, (COMPOUND.z0 + TERRACE_EDGE) / 2]} s={[COMPOUND.x1 - COMPOUND.x0, TERRACE_Y, TERRACE_EDGE - COMPOUND.z0]} m={[m.retaining, m.retaining, m.terrace, m.retaining, m.retaining, m.retaining]} cast={false} />
      {/* the stairs up to the hotel */}
      {Array.from({ length: 9 }, (_, i) => {
        const z = STAIRS.z1 - (i + 0.5) * ((STAIRS.z1 - STAIRS.z0) / 9);
        const h = ((i + 1) / 9) * TERRACE_Y;
        return <Box key={i} p={[(STAIRS.x0 + STAIRS.x1) / 2, h / 2, z]} s={[STAIRS.x1 - STAIRS.x0, h, (STAIRS.z1 - STAIRS.z0) / 9 + 0.01]} m={m.grey} cast={false} />;
      })}
      {[STAIRS.x0 - 0.15, STAIRS.x1 + 0.15].map((x) => (
        <mesh key={x} position={[x, 0, (STAIRS.z0 + STAIRS.z1) / 2]} material={m.retaining} castShadow={SH}>
          <boxGeometry args={[0.3, 0.1, 0.1]} />
        </mesh>
      ))}
      <StairCheeks m={m} />
    </group>
  );
}

/** The sloping side walls of the stairs. */
function StairCheeks({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    const L = STAIRS.z1 - STAIRS.z0;
    s.moveTo(0, 0);
    s.lineTo(L, 0);
    s.lineTo(L, 0.5);
    s.lineTo(0, TERRACE_Y + 0.5);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
    return g;
  }, []);
  return (
    <>
      {[STAIRS.x0 - 0.3, STAIRS.x1].map((x) => (
        <mesh key={x} geometry={geo} material={m.retaining} position={[x, 0, STAIRS.z1]} rotation-y={Math.PI / 2} castShadow={SH} receiveShadow />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------

function PerimeterWall({ m }: { m: Mats }) {
  const lights = useGame((s) => s.evening);
  const H = 2.7;
  const segs: { a: [number, number]; b: [number, number]; y0: number }[] = [
    { a: [COMPOUND.x0, COMPOUND.z1], b: [COMPOUND.x1, COMPOUND.z1], y0: 0 },
    { a: [COMPOUND.x0, COMPOUND.z0], b: [COMPOUND.x1, COMPOUND.z0], y0: TERRACE_Y },
    // west: terrace part, courtyard part either side of the field gap
    { a: [COMPOUND.x0, COMPOUND.z0], b: [COMPOUND.x0, TERRACE_EDGE], y0: TERRACE_Y },
    { a: [COMPOUND.x0, TERRACE_EDGE], b: [COMPOUND.x0, -15], y0: 0 },
    { a: [COMPOUND.x0, -10.5], b: [COMPOUND.x0, COMPOUND.z1], y0: 0 },
    // east: either side of the gate
    { a: [COMPOUND.x1, COMPOUND.z0], b: [COMPOUND.x1, GATE.z0], y0: TERRACE_Y },
    { a: [COMPOUND.x1, GATE.z1], b: [COMPOUND.x1, TERRACE_EDGE], y0: TERRACE_Y },
    { a: [COMPOUND.x1, TERRACE_EDGE], b: [COMPOUND.x1, COMPOUND.z1], y0: 0 },
  ];
  const lamps: [number, number, number][] = [];
  for (let x = COMPOUND.x0 + 3; x < COMPOUND.x1; x += 5.5) lamps.push([x, 1.9, COMPOUND.z1 - 0.2]);
  return (
    <group>
      {segs.map(({ a, b, y0 }, i) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const alongX = a[1] === b[1];
        const h = y0 === 0 && !alongX && a[1] < TERRACE_EDGE ? H : H + (y0 ? 0 : 0);
        return (
          <group key={i}>
            <Box p={[(a[0] + b[0]) / 2, y0 + h / 2 - (y0 ? 0 : 0), (a[1] + b[1]) / 2]} s={alongX ? [len, h, 0.3] : [0.3, h, len]} m={m.wall} />
            {/* coping on top */}
            <Box p={[(a[0] + b[0]) / 2, y0 + h + 0.05, (a[1] + b[1]) / 2]} s={alongX ? [len + 0.1, 0.1, 0.42] : [0.42, 0.1, len + 0.1]} m={m.grey} cast={false} />
          </group>
        );
      })}
      {/* the retaining wall face continues the perimeter under the terrace walls */}
      {lamps.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <boxGeometry args={[0.16, 0.22, 0.12]} />
            <meshStandardMaterial color="#222" emissive={lights ? "#ffcf8a" : "#000"} emissiveIntensity={lights ? 2.2 : 0} />
          </mesh>
          {lights && !LITE && i % 2 === 0 && <spotLight position={[0, 0, -0.2]} target-position={[p[0], 3.5, p[2] - 0.5]} angle={0.7} penumbra={0.8} intensity={4} distance={4} color="#ffcf8a" />}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

/** A black steel fence: posts and a mesh panel between them. */
export function Fence({ x0, x1, z0, z1, y = 0, h = 1.4, m }: { x0: number; x1: number; z0: number; z1: number; y?: number; h?: number; m: Mats }) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / 2.4));
  const ang = Math.atan2(z1 - z0, x1 - x0);
  return (
    <group position={[x0, y, z0]} rotation-y={-ang}>
      <mesh position={[len / 2, h / 2 + 0.05, 0]} material={m.mesh}>
        <planeGeometry args={[len, h]} />
      </mesh>
      <mesh position={[len / 2, h + 0.05, 0]} material={m.black}>
        <boxGeometry args={[len, 0.04, 0.04]} />
      </mesh>
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={i} position={[(i / n) * len, (h + 0.5) / 2, 0]} material={m.black} castShadow={SH}>
          <boxGeometry args={[0.06, h + 0.5, 0.06]} />
        </mesh>
      ))}
    </group>
  );
}

function PoolFence({ m }: { m: Mats }) {
  const z = -6.25;
  return (
    <group>
      <Fence x0={-11.6} x1={-2} z0={z} z1={z} m={m} />
      <Fence x0={0.5} x1={11} z0={z} z1={z} m={m} />
      <Fence x0={13} x1={15.2} z0={z} z1={z} m={m} />
      <Fence x0={15.2} x1={15.2} z0={z} z1={7.2} m={m} />
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

function Hotel({ m }: { m: Mats }) {
  const evening = useGame((s) => s.evening);
  const H = HOTEL.floors * HOTEL.floorH;
  const y0 = TERRACE_Y;
  const blocks = [
    { x0: HOTEL.x0, x1: HOTEL_BAY.x0, front: HOTEL.front, back: HOTEL.back, roofH: 3.2 },
    { x0: HOTEL_BAY.x0, x1: HOTEL_BAY.x1, front: HOTEL_BAY.front, back: HOTEL.back + 1, roofH: 3.6 },
    { x0: HOTEL_BAY.x1, x1: HOTEL.x1, front: HOTEL.front, back: HOTEL.back, roofH: 3.2 },
  ];
  const facade = (w: number) => {
    const t = hotelBay([w / 4, HOTEL.floors], evening);
    return mat({ map: t });
  };
  const pilasters: number[] = [];
  for (const b of blocks) for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / Math.max(1, Math.round((b.x1 - b.x0) / 8))) pilasters.push(x);
  return (
    <group>
      {blocks.map((b, i) => {
        const w = b.x1 - b.x0, d = b.back - b.front;
        const fm = facade(w);
        const sm = facade(Math.abs(d));
        return (
          <group key={i}>
            <Box p={[(b.x0 + b.x1) / 2, y0 + H / 2, (b.front + b.back) / 2]} s={[w, H, Math.abs(d)]} m={[sm, sm, m.cream, m.cream, fm, fm]} />
            {/* fascia band and the hip roof with eaves */}
            <Box p={[(b.x0 + b.x1) / 2, y0 + H + 0.15, (b.front + b.back) / 2]} s={[w + 1.2, 0.3, Math.abs(d) + 1.2]} m={m.fascia} />
            <mesh geometry={hipRoof(w + 1.6, Math.abs(d) + 1.6, b.roofH)} material={m.roof} position={[(b.x0 + b.x1) / 2, y0 + H + 0.3, (b.front + b.back) / 2]} castShadow={SH} receiveShadow />
            {/* the split-unit air conditioners under the windows */}
            {Array.from({ length: Math.floor(w / 4) }, (_, k) =>
              Array.from({ length: HOTEL.floors }, (_, f) => (
                <mesh key={`${k}-${f}`} position={[b.x0 + 4 * k + 3.3, y0 + f * HOTEL.floorH + 0.55, b.front + 0.18]} material={m.white}>
                  <boxGeometry args={[0.8, 0.5, 0.3]} />
                </mesh>
              )),
            )}
          </group>
        );
      })}
      {pilasters.map((x, i) => (
        <Box key={i} p={[x, y0 + H / 2, (x > HOTEL_BAY.x0 + 0.1 && x < HOTEL_BAY.x1 - 0.1 ? HOTEL_BAY.front : HOTEL.front) + 0.15]} s={[0.55, H + 0.1, 0.32]} m={m.pilaster} />
      ))}
      {/* the entrance: glass doors and the porch with its own little hip roof */}
      <Box p={[(PORCH.x0 + PORCH.x1) / 2, y0 + 1.3, HOTEL_BAY.front + 0.05]} s={[3.2, 2.6, 0.12]} m={m.darkGlass} />
      <Box p={[(PORCH.x0 + PORCH.x1) / 2, y0 + 3.1, (HOTEL_BAY.front + PORCH.front) / 2]} s={[PORCH.x1 - PORCH.x0 + 0.6, 0.25, HOTEL_BAY.front - PORCH.front + 0.6]} m={m.fascia} />
      <mesh geometry={hipRoof(PORCH.x1 - PORCH.x0 + 1.2, HOTEL_BAY.front - PORCH.front + 1.2, 1.1)} material={m.roofSmall} position={[(PORCH.x0 + PORCH.x1) / 2, y0 + 3.22, (HOTEL_BAY.front + PORCH.front) / 2]} castShadow={SH} />
      {[PORCH.x0 + 0.3, PORCH.x1 - 0.3].map((x) => (
        <Box key={x} p={[x, y0 + 1.5, PORCH.front + 0.3]} s={[0.4, 3, 0.4]} m={m.white} />
      ))}
      {/* the reception desk under the porch */}
      <Box p={[(PORCH.x0 + PORCH.x1) / 2, y0 + 0.55, HOTEL_BAY.front + 1.1]} s={[3, 1.1, 0.7]} m={m.counter} />
      <Box p={[(PORCH.x0 + PORCH.x1) / 2, y0 + 1.12, HOTEL_BAY.front + 1.1]} s={[3.1, 0.06, 0.8]} m={m.marble} />
      {/* the hotel's name over the porch */}
      <HotelName />
      {/* night: warm light out of the windows and the porch */}
      {evening && <pointLight position={[(PORCH.x0 + PORCH.x1) / 2, y0 + 2.6, PORCH.front + 1]} intensity={40} distance={14} color="#ffd59a" />}
    </group>
  );
}

function HotelName() {
  const t = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 160;
    const g = c.getContext("2d")!;
    g.fillStyle = "#3b2418";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "700 96px Georgia, serif";
    g.fillText("SILVER DOME", 512, 84);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  }, []);
  return (
    <mesh position={[(HOTEL_BAY.x0 + HOTEL_BAY.x1) / 2, TERRACE_Y + HOTEL.floors * HOTEL.floorH - 0.5, HOTEL_BAY.front + 0.02]}>
      <planeGeometry args={[7, 1.1]} />
      <meshStandardMaterial map={t} transparent />
    </mesh>
  );
}

function Gazebo({ m }: { m: Mats }) {
  const w = GAZEBO.w;
  return (
    <group position={[GAZEBO.x, TERRACE_Y, GAZEBO.z]}>
      <Box p={[0, 1.5, 0]} s={[w, 3, w]} m={m.cream} />
      <Box p={[0, 1.1, w / 2 + 0.01]} s={[1.1, 2.2, 0.05]} m={m.door} />
      <Box p={[0, 3.1, 0]} s={[w + 0.8, 0.2, w + 0.8]} m={m.fascia} />
      <mesh geometry={hipRoof(w + 1.1, w + 1.1, 2.4)} material={m.roofSmall} position={[0, 3.2, 0]} castShadow={SH} />
    </group>
  );
}

/** The graffiti wall by the stairs, and the green fence panels along the terrace edge. */
function MuralAndTerraceEdge({ m }: { m: Mats }) {
  const wallW = MURAL.x1 - MURAL.x0;
  const panels: [number, number][] = [
    [COMPOUND.x0, MURAL.x0],
    [MURAL.x1, STAIRS.x0 - 0.3],
    [STAIRS.x1 + 0.3, CINEMA.x0 - 0.5],
    [CINEMA.x1 + 0.5, COMPOUND.x1],
  ];
  return (
    <group>
      <Box p={[(MURAL.x0 + MURAL.x1) / 2, MURAL.h / 2, MURAL.z]} s={[wallW, MURAL.h, 0.35]} m={[m.grey, m.grey, m.grey, m.grey, m.mural, m.grey]} />
      {panels.map(([a, b], i) => (
        <group key={i}>
          <mesh position={[(a + b) / 2, TERRACE_Y + 0.62, TERRACE_EDGE + 0.05]} material={m.greenPanel}>
            <planeGeometry args={[b - a, 1.2]} />
          </mesh>
          <Fence x0={a} x1={b} z0={TERRACE_EDGE + 0.06} z1={TERRACE_EDGE + 0.06} y={TERRACE_Y} h={1.2} m={m} />
        </group>
      ))}
    </group>
  );
}

function Cinema({ m }: { m: Mats }) {
  const w = CINEMA.x1 - CINEMA.x0, d = CINEMA.z1 - CINEMA.z0;
  return (
    <group>
      <Box p={[(CINEMA.x0 + CINEMA.x1) / 2, CINEMA.h / 2, (CINEMA.z0 + CINEMA.z1) / 2]} s={[w, CINEMA.h, d]} m={m.beige} />
      <Box p={[(CINEMA.x0 + CINEMA.x1) / 2, CINEMA.h + 0.25, (CINEMA.z0 + CINEMA.z1) / 2]} s={[w + 0.2, 0.5, d + 0.2]} m={m.cream} />
      <Box p={[CINEMA.x0 + 3, 1.15, CINEMA.z1 + 0.03]} s={[1.3, 2.3, 0.08]} m={m.door} />
      <Box p={[CINEMA.x1 - 3, 2.2, CINEMA.z1 + 0.03]} s={[1.2, 0.9, 0.08]} m={m.darkGlass} />
    </group>
  );
}

/** The covered grill in the courtyard: brick counter, coals, chicken on the grate, smoke. */
function Grill({ m }: { m: Mats }) {
  const evening = useGame((s) => s.evening);
  const smoke = useRef<THREE.Group>(null!);
  const puffs = useMemo(() => Array.from({ length: LITE ? 5 : 10 }, (_, i) => ({ t: i / 10, x: (Math.random() - 0.5) * 2.4 })), []);
  const smokeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#d8d8d8", transparent: true, opacity: 0.25, depthWrite: false }), []);
  useFrame((_, dt) => {
    smoke.current?.children.forEach((c, i) => {
      const p = puffs[i];
      p.t = (p.t + dt * 0.12) % 1;
      c.position.set(p.x + Math.sin(p.t * 6 + i) * 0.3, 1.3 + p.t * 3.5, Math.sin(p.t * 4 + i) * 0.2);
      c.scale.setScalar(0.3 + p.t * 1.3);
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.28 * (1 - p.t);
    });
  });
  return (
    <group position={[GRILL.x, 0, GRILL.z]}>
      {/* shelter */}
      {[[-2.6, -1.4], [2.6, -1.4], [-2.6, 1.6], [2.6, 1.6]].map(([x, z], i) => (
        <Box key={i} p={[x, 1.4, z]} s={[0.12, 2.8, 0.12]} m={m.steel} />
      ))}
      <mesh position={[0, 2.95, 0.1]} rotation-x={0.12} material={m.corrugated} castShadow={SH}>
        <boxGeometry args={[5.8, 0.05, 3.6]} />
      </mesh>
      {/* counter */}
      <Box p={[0, 0.45, 0]} s={[4.4, 0.9, 1]} m={m.brick} />
      <Box p={[0, 0.92, 0]} s={[4.5, 0.06, 1.05]} m={m.counter} />
      <mesh position={[0, 0.97, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.6, 0.8]} />
        <meshStandardMaterial color="#1a0d06" emissive="#ff5a1a" emissiveIntensity={evening ? 1.4 : 0.6} />
      </mesh>
      {/* the grate and what's on it */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-1.7 + i * 0.26, 1.05, 0]} material={m.steel}>
          <boxGeometry args={[0.02, 0.02, 0.8]} />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-1.5 + i * 0.38, 1.12, (i % 2) * 0.25 - 0.12]} scale={[1, 0.55, 0.8]}>
          <sphereGeometry args={[0.15, 8, 6]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#6b3418" : "#8a4a22"} roughness={0.6} />
        </mesh>
      ))}
      <group ref={smoke}>
        {puffs.map((_, i) => (
          <mesh key={i} material={smokeMat.clone()}>
            <sphereGeometry args={[0.5, 8, 6]} />
          </mesh>
        ))}
      </group>
      {evening && <pointLight position={[0, 1.4, 0.6]} color="#ff8a3a" intensity={16} distance={8} />}
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

/** The black-grid glass pavilion at the pool's west end: the bar and dining room. */
function Pavilion({ m }: { m: Mats }) {
  const evening = useGame((s) => s.evening);
  const P = PAVILION;
  const H = 3.2;
  const y0 = PAVILION_FLOOR;
  const walls: { a: [number, number]; b: [number, number]; gaps?: [number, number][] }[] = [
    { a: [P.x0, P.z0], b: [P.x0, P.z1] },
    { a: [P.x0, P.z1], b: [P.x1, P.z1] },
    { a: [P.x0, P.z0], b: [P.x1, P.z0], gaps: [[-19, -16.5]] },
    { a: [P.x1, P.z0], b: [P.x1, P.z1], gaps: [[-1, 2]] },
  ];
  const led = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a1a40", emissive: "#a44dff", emissiveIntensity: 0 }), []);
  led.emissiveIntensity = evening ? 3 : 0.4;
  return (
    <group>
      <Box p={[(P.x0 + P.x1) / 2, y0 / 2, (P.z0 + P.z1) / 2]} s={[P.x1 - P.x0, y0, P.z1 - P.z0]} m={m.floorTile} cast={false} />
      {walls.map((w, i) => {
        const alongX = w.a[1] === w.b[1];
        const from = alongX ? w.a[0] : w.a[1];
        const to = alongX ? w.b[0] : w.b[1];
        const fixed = alongX ? w.a[1] : w.a[0];
        const parts: [number, number][] = [];
        let s = from;
        for (const [g0, g1] of w.gaps ?? []) {
          parts.push([s, g0]);
          s = g1;
        }
        parts.push([s, to]);
        return parts.map(([u0, u1], k) => {
          const len = u1 - u0;
          const n = Math.max(1, Math.round(len / 1.1));
          const mid = (u0 + u1) / 2;
          const pos = (u: number, y: number): V3 => (alongX ? [u, y, fixed] : [fixed, y, u]);
          return (
            <group key={`${i}-${k}`}>
              {/* glass */}
              <mesh position={pos(mid, y0 + H / 2)} rotation-y={alongX ? 0 : Math.PI / 2} material={m.glass}>
                <planeGeometry args={[len, H]} />
              </mesh>
              {/* the black grid: mullions and transoms */}
              {Array.from({ length: n + 1 }, (_, j) => (
                <Box key={j} p={pos(u0 + (j / n) * len, y0 + H / 2)} s={alongX ? [0.07, H, 0.09] : [0.09, H, 0.07]} m={m.steel} cast={false} />
              ))}
              {[0.45, 1.3, 2.15, H].map((y) => (
                <Box key={y} p={pos(mid, y0 + y)} s={alongX ? [len, 0.06, 0.09] : [0.09, 0.06, len]} m={m.steel} cast={false} />
              ))}
              {/* low solid wall under the glass on the south side */}
              {i === 1 && <Box p={pos(mid, y0 + 0.4)} s={alongX ? [len, 0.8, 0.2] : [0.2, 0.8, len]} m={m.cream} />}
              {/* the purple LED strip under the roof on the pool side */}
              {(i === 3 || i === 1) && (
                <mesh position={pos(mid, y0 + H - 0.12)} material={led}>
                  <boxGeometry args={alongX ? [len, 0.05, 0.12] : [0.12, 0.05, len]} />
                </mesh>
              )}
            </group>
          );
        });
      })}
      {/* roof: pergola beams, ivy hanging below, a dark sheet roof above */}
      {/* the frame round the top */}
      {[P.z0, P.z1].map((z) => (
        <Box key={z} p={[(P.x0 + P.x1) / 2, y0 + H + 0.22, z]} s={[P.x1 - P.x0 + 0.3, 0.3, 0.15]} m={m.steel} />
      ))}
      {[P.x0, P.x1].map((x) => (
        <Box key={x} p={[x, y0 + H + 0.22, (P.z0 + P.z1) / 2]} s={[0.15, 0.3, P.z1 - P.z0 + 0.3]} m={m.steel} />
      ))}
      {/* slats across, close together */}
      {Array.from({ length: 22 }, (_, i) => (
        <Box key={`s${i}`} p={[(P.x0 + P.x1) / 2, y0 + H + 0.32, P.z0 + ((i + 0.5) / 22) * (P.z1 - P.z0)]} s={[P.x1 - P.x0, 0.08, 0.1]} m={m.steel} cast={false} />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <Box key={i} p={[P.x0 + ((i + 0.5) / 10) * (P.x1 - P.x0), y0 + H + 0.1, (P.z0 + P.z1) / 2]} s={[0.12, 0.25, P.z1 - P.z0]} m={m.steel} cast={false} />
      ))}
      <mesh position={[(P.x0 + P.x1) / 2, y0 + H + 0.38, (P.z0 + P.z1) / 2]} rotation-x={-Math.PI / 2} material={m.ivy}>
        <planeGeometry args={[P.x1 - P.x0, P.z1 - P.z0]} />
      </mesh>
      <mesh position={[(P.x0 + P.x1) / 2, y0 + H - 0.05, (P.z0 + P.z1) / 2]} rotation-x={Math.PI / 2} material={m.ivy}>
        <planeGeometry args={[P.x1 - P.x0, P.z1 - P.z0]} />
      </mesh>
      {/* the marble bar along the west wall, bottles behind it */}
      <Box p={[BAR.x, y0 + 0.55, (BAR.z0 + BAR.z1) / 2]} s={[BAR.w, 1.1, BAR.z1 - BAR.z0]} m={m.counter} />
      <Box p={[BAR.x, y0 + 1.12, (BAR.z0 + BAR.z1) / 2]} s={[BAR.w + 0.2, 0.07, BAR.z1 - BAR.z0 + 0.2]} m={m.marble} />
      <Bottles />
      {/* rattan pendant lamps */}
      {[-3, 0.5, 4].map((z) => (
        <group key={z} position={[BAR.x, y0 + 2.45, z]}>
          <mesh position-y={0.4}>
            <cylinderGeometry args={[0.01, 0.01, 0.8, 4]} />
            <meshBasicMaterial color="#111" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.32, 10, 8]} />
            <meshStandardMaterial color="#a8834f" emissive="#ffbe6a" emissiveIntensity={evening ? 2.5 : 0.3} wireframe />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshBasicMaterial color={evening ? "#fff1c8" : "#d9cdb0"} toneMapped={!evening} />
          </mesh>
          {evening && !LITE && <pointLight intensity={22} distance={9} color="#ffc27a" />}
        </group>
      ))}
      {evening && <pointLight position={[-15, y0 + 2.6, 1]} intensity={30} distance={12} color="#b170ff" />}
      {evening && <pointLight position={[-16.5, y0 + 2.7, -1]} intensity={22} distance={10} color="#ffd29a" />}
    </group>
  );
}

function Bottles() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const n = 40;
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const cols = ["#3f6b2f", "#7a3a1a", "#d8d2c0", "#1f3a5a", "#a8781a"].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
      const shelf = Math.floor(i / 20);
      o.position.set(-22.75, PAVILION_FLOOR + 1.5 + shelf * 0.5, -4 + (i % 20) * 0.45);
      o.scale.set(1, 0.9 + (i % 3) * 0.15, 1);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
      ref.current.setColorAt(i, cols[i % cols.length]);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, n]}>
        <cylinderGeometry args={[0.04, 0.045, 0.32, 6]} />
        <meshStandardMaterial roughness={0.2} metalness={0.1} />
      </instancedMesh>
      {[1.32, 1.82].map((y) => (
        <mesh key={y} position={[-22.75, PAVILION_FLOOR + y, 0.3]}>
          <boxGeometry args={[0.3, 0.04, 9.5]} />
          <meshStandardMaterial color="#2b2622" />
        </mesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------

/** Tables, chairs and loungers (instanced: one draw per kind). */
function Furniture() {
  const metal = useMemo(() => metalChairGeometry(), []);
  const rattan = useMemo(() => rattanChairGeometry(), []);
  const lounger = useMemo(() => loungerGeometry(), []);
  const plastic = useMemo(() => metalChairGeometry("#e9e6de"), []);
  const groups = useMemo(() => {
    const metalSeats = SEATS.filter((s) => s.kind === "dining" && s.x > -11 || s.kind === "courtyard" || s.kind === "grill");
    const rattanSeats = SEATS.filter((s) => (s.kind === "dining" && s.x <= -11));
    const stools = SEATS.filter((s) => s.kind === "bar");
    const movie = SEATS.filter((s) => s.kind === "movie");
    return { metalSeats, rattanSeats, stools, movie };
  }, []);
  const vc = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 }), []);
  return (
    <group>
      <Instances geo={metal} mat={vc} items={groups.metalSeats.map((s) => ({ x: s.x, y: s.y, z: s.z, ry: s.facing }))} />
      <Instances geo={rattan} mat={vc} items={groups.rattanSeats.map((s) => ({ x: s.x, y: s.y, z: s.z, ry: s.facing }))} />
      <Instances geo={plastic} mat={vc} items={groups.movie.map((s) => ({ x: s.x, y: s.y, z: s.z, ry: s.facing }))} />
      <Instances geo={lounger} mat={vc} items={LOUNGERS.map((l) => ({ x: l.x, y: 0.02, z: l.z, ry: l.facing + Math.PI }))} />
      {/* bar stools */}
      {groups.stools.map((s) => (
        <group key={s.id} position={[s.x, s.y, s.z]}>
          <mesh position-y={0.38}>
            <cylinderGeometry args={[0.03, 0.03, 0.76, 6]} />
            <meshStandardMaterial color="#111" metalness={0.6} />
          </mesh>
          <mesh position-y={0.78}>
            <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
            <meshStandardMaterial color="#3b2f26" />
          </mesh>
        </group>
      ))}
      {TABLES.map((t, i) => (
        <group key={i} position={[t.x, t.y, t.z]}>
          <mesh position-y={t.kind === "high" ? 0.55 : 0.36} castShadow={SH}>
            <cylinderGeometry args={[0.04, 0.05, t.kind === "high" ? 1.1 : 0.72, 6]} />
            <meshStandardMaterial color={t.kind === "square" ? "#1d1b19" : "#d9d9d4"} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position-y={t.kind === "high" ? 1.1 : 0.74} castShadow={SH} receiveShadow>
            {t.kind === "square" ? <boxGeometry args={[0.9, 0.04, 0.9]} /> : <cylinderGeometry args={[t.r + 0.05, t.r + 0.05, 0.035, 20]} />}
            <meshStandardMaterial color={t.kind === "square" ? "#4a3a2d" : "#ecebe6"} roughness={0.5} metalness={t.kind === "square" ? 0 : 0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Instances({ geo, mat: material, items, cast = SH }: { geo: THREE.BufferGeometry; mat: THREE.Material; items: { x: number; y: number; z: number; ry?: number; s?: number; color?: string }[]; cast?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.rotation.set(0, it.ry ?? 0, 0);
      o.scale.setScalar(it.s ?? 1);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
      if (it.color) ref.current.setColorAt(i, new THREE.Color(it.color));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, material, items.length]} castShadow={cast} receiveShadow />;
}

// ---------------------------------------------------------------------------------------------

/** Palms in planters along the south wall and round the yard, shrubs, parked cars, the gate. */
function Planting() {
  const palms = useMemo(() => [palmGeometry(1), palmGeometry(2)], []);
  const shrub = useMemo(() => shrubGeometry(), []);
  const vc = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), []);
  const spots = useMemo(() => [PALMS.filter((p) => p.v === 0), PALMS.filter((p) => p.v === 1)], []);
  const shrubs = useMemo(() => {
    const out: { x: number; y: number; z: number; ry: number; s: number }[] = [];
    for (let x = -10.5; x <= 14.5; x += 1.3) out.push({ x, y: 0.5, z: 8.05 + ((x * 7) % 1) * 0.2, ry: x, s: 0.8 });
    for (let x = HOTEL.x0; x < HOTEL.x1; x += 2.2) if (x < PORCH.x0 - 1 || x > PORCH.x1 + 1) out.push({ x, y: TERRACE_Y, z: HOTEL.front + 1, ry: x, s: 0.7 });
    return out;
  }, []);
  return (
    <group>
      {/* the planter boxes */}
      <mesh position={[2, 0.25, 7.95]} castShadow={SH} receiveShadow>
        <boxGeometry args={[26, 0.5, 1.3]} />
        <meshStandardMaterial color="#8b8478" roughness={0.9} />
      </mesh>
      <mesh position={[2, 0.51, 7.95]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[25.6, 1.1]} />
        <meshStandardMaterial color="#3d2c20" roughness={1} />
      </mesh>
      <Instances geo={palms[0]} mat={vc} items={spots[0]} />
      <Instances geo={palms[1]} mat={vc} items={spots[1]} />
      <Instances geo={shrub} mat={vc} items={shrubs} />
    </group>
  );
}

/** Parked cars: sedans and SUVs, glossy paint in each car's own colour, glass, rims and lights. */
function Cars() {
  const geos = useMemo(() => ({ sedan: carGeometries("sedan"), suv: carGeometries("suv") }), []);
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.28, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08 }), []);
  const detail = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.35 }), []);
  return (
    <>
      {(["sedan", "suv"] as const).map((k) => {
        const items = CARS.filter((c) => c.kind === k).map((c) => ({ x: c.x, y: TERRACE_Y, z: c.z, ry: c.ry, color: c.color }));
        return (
          <group key={k}>
            <Instances geo={geos[k].body} mat={paint} items={items} />
            <Instances geo={geos[k].detail} mat={detail} items={items.map(({ color, ...rest }) => (void color, rest))} />
            <Instances geo={geos[k].glass} mat={CAR_GLASS} items={items.map(({ color, ...rest }) => (void color, rest))} cast={false} />
            <Instances geo={geos[k].windscreen} mat={CAR_WINDSCREEN} items={items.map(({ color, ...rest }) => (void color, rest))} cast={false} />
          </group>
        );
      })}
    </>
  );
}

/** The welcome desk inside the gate: a counter with the key cards and a laptop, and its sign. */
function CheckInDesk({ m }: { m: Mats }) {
  const d = CHECKIN_DESK;
  const sign = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0e5d6b";
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = "#fff6e8";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "700 54px Georgia, serif";
    g.fillText("Check in here", 256, 58);
    g.fillStyle = "#f0a04b";
    g.fillRect(0, 112, 512, 16);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={[d.x, TERRACE_Y, d.z]}>
      <Box p={[0, 0.5, 0]} s={[d.w, 1.0, 0.7]} m={m.white} />
      <Box p={[0, 1.03, 0]} s={[d.w + 0.1, 0.06, 0.8]} m={m.marble} />
      <mesh position={[0, 0.55, 0.36]}>
        <planeGeometry args={[d.w - 0.1, 0.8]} />
        <meshStandardMaterial map={sign} />
      </mesh>
      {/* laptop and a tray of key cards */}
      <group position={[0.5, 1.07, -0.1]}>
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.34, 0.02, 0.24]} />
          <meshStandardMaterial color="#2b2e33" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.12, -0.11]} rotation-x={-0.25}>
          <boxGeometry args={[0.34, 0.22, 0.015]} />
          <meshStandardMaterial color="#1a1c20" emissive="#4fb6c4" emissiveIntensity={0.35} />
        </mesh>
      </group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.6 + i * 0.07, 1.08, 0.05]} rotation-z={0.1}>
          <boxGeometry args={[0.05, 0.005, 0.085]} />
          <meshStandardMaterial color={i % 2 ? "#ffe0bf" : "#9fe3ea"} />
        </mesh>
      ))}
    </group>
  );
}

/** Green barricades: mesh panels on posts, wherever the edge of where you can walk would look open. */
function Barricades({ m }: { m: Mats }) {
  return (
    <group>
      {BARRICADES.map((b, i) => {
        const len = Math.hypot(b.x1 - b.x0, b.z1 - b.z0);
        const ang = Math.atan2(b.z1 - b.z0, b.x1 - b.x0);
        const n = Math.max(1, Math.round(len / 2.2));
        return (
          <group key={i} position={[b.x0, b.y, b.z0]} rotation-y={-ang}>
            <mesh position={[len / 2, 0.75, 0]} material={m.greenPanel}>
              <planeGeometry args={[len, 1.3]} />
            </mesh>
            <mesh position={[len / 2, 1.42, 0]} material={m.black}>
              <boxGeometry args={[len, 0.05, 0.05]} />
            </mesh>
            {Array.from({ length: n + 1 }, (_, k) => (
              <mesh key={k} position={[(k / n) * len, 0.75, 0]} material={m.black} castShadow={SH}>
                <boxGeometry args={[0.07, 1.5, 0.07]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** The main gate on the east wall: pillars, half-open black gates, and the big welcome sign. */
function Gate({ m }: { m: Mats }) {
  const y = TERRACE_Y;
  const zc = (GATE.z0 + GATE.z1) / 2;
  const span = GATE.z1 - GATE.z0;
  return (
    <group position={[GATE.x, y, zc]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * (span / 2 + 0.4)]}>
          <Box p={[0, 1.9, 0]} s={[0.8, 3.8, 0.8]} m={m.cream} />
          <Box p={[0, 3.9, 0]} s={[1, 0.25, 1]} m={m.orangeCap} />
        </group>
      ))}
      {/* the two gate leaves, swung half open inward */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * (span / 2)]} rotation-y={s * 1.0}>
          <group position={[-span / 4, 0, 0]}>
            {/* a railed gate: top and bottom rails, vertical bars */}
            {[0.15, 2.2].map((y) => (
              <Box key={y} p={[0, y, 0]} s={[span / 2, 0.08, 0.06]} m={m.black} cast={false} />
            ))}
            {Array.from({ length: 13 }, (_, k) => (
              <Box key={k} p={[-span / 4 + (k / 12) * (span / 2), 1.2, 0]} s={[0.04, 2.1, 0.04]} m={m.black} cast={false} />
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

export function Resort() {
  const m = useMats();
  return (
    <group>
      <Grounds m={m} />
      <PerimeterWall m={m} />
      <PoolFence m={m} />
      <Hotel m={m} />
      <Gazebo m={m} />
      <MuralAndTerraceEdge m={m} />
      <Cinema m={m} />
      <Grill m={m} />
      <Pavilion m={m} />
      <Furniture />
      <Planting />
      <Cars />
      <Gate m={m} />
      <CheckInDesk m={m} />
      <Barricades m={m} />
      {/* a speaker for movie night */}
      <Box p={[CINEMA.x0 + 1, 0.9, CINEMA.z1 + 1.4]} s={[0.6, 1.8, 0.5]} m={m.black} />
    </group>
  );
}
