"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LITE, Q } from "../quality";
import { COMPOUND, FIELD, FIELD_PATH, ROAD, TERRACE_Y, type Rect } from "./layout";
import { hipRoof, treeGeometry } from "./shapes";
import { blockWall, grass, render, rustRoof } from "./textures";
import { Instances } from "./Resort";

// Ibadan around the resort: the neighbours' houses with rusty iron roofs, big shade trees, the
// yellow mosque with its minarets (photo 1), a telecom mast, and the football field (photo 3).

const SH = !LITE;

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** The ground outside the walls: four big rectangles around the compound (none under the pool). */
function OuterGround() {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ map: grass([60, 60], "wild"), roughness: 1 }), []);
  const dirt = useMemo(() => new THREE.MeshStandardMaterial({ map: render("#8a7356", [30, 30], 61), roughness: 1 }), []);
  const R = 420;
  const c = COMPOUND;
  const rects: Rect[] = [
    { x0: -R, x1: R, z0: -R, z1: c.z0 },
    { x0: -R, x1: R, z0: c.z1, z1: R },
    { x0: -R, x1: c.x0, z0: c.z0, z1: c.z1 },
    { x0: c.x1, x1: R, z0: c.z0, z1: c.z1 },
  ];
  return (
    <group>
      {rects.map((r, i) => (
        <mesh key={i} position={[(r.x0 + r.x1) / 2, -0.03, (r.z0 + r.z1) / 2]} rotation-x={-Math.PI / 2} material={m} receiveShadow>
          <planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} />
        </mesh>
      ))}
      {/* the laterite street outside the south wall */}
      <mesh position={[-30, -0.02, 16]} rotation-x={-Math.PI / 2} material={dirt} receiveShadow>
        <planeGeometry args={[140, 9]} />
      </mesh>
      <mesh position={[(FIELD_PATH.x0 + FIELD_PATH.x1) / 2, -0.015, (FIELD_PATH.z0 + FIELD_PATH.z1) / 2]} rotation-x={-Math.PI / 2} material={dirt}>
        <planeGeometry args={[FIELD_PATH.x1 - FIELD_PATH.x0, FIELD_PATH.z1 - FIELD_PATH.z0]} />
      </mesh>
    </group>
  );
}

type House = { x: number; z: number; w: number; d: number; h: number; ry: number; wall: string; roof: number; storeys: number };

/** Houses all round, kept clear of the compound, the road and the field. */
function useHouses() {
  return useMemo(() => {
    const r = rand(1234);
    const out: House[] = [];
    const clear: Rect[] = [
      { x0: COMPOUND.x0 - 6, x1: COMPOUND.x1 + 2, z0: COMPOUND.z0 - 6, z1: COMPOUND.z1 + 12 },
      { x0: ROAD.x0 - 2, x1: ROAD.x1 + 3, z0: -400, z1: 400 },
      { x0: FIELD.x0 - 6, x1: FIELD_PATH.x1, z0: FIELD.z0 - 6, z1: FIELD.z1 + 6 },
      { x0: -22, x1: 2, z0: 22, z1: 42 }, // the mosque
    ];
    const walls = ["#d8cdb6", "#c9b48f", "#e3d9c6", "#b9a88c", "#d2c4a0", "#a9b2b0", "#e0c7a4"];
    const tries = Q.houses * 3;
    for (let i = 0; i < tries && out.length < Q.houses; i++) {
      const ang = r() * Math.PI * 2;
      const dist = 40 + r() * 150;
      const x = -10 + Math.cos(ang) * dist * 1.25;
      const z = -18 + Math.sin(ang) * dist;
      const w = 8 + r() * 9, d = 7 + r() * 7;
      const box: Rect = { x0: x - w / 2 - 2, x1: x + w / 2 + 2, z0: z - d / 2 - 2, z1: z + d / 2 + 2 };
      const hit = (a: Rect) => !(a.x1 < box.x0 || a.x0 > box.x1 || a.z1 < box.z0 || a.z0 > box.z1);
      if (clear.some(hit) || out.some((h) => hit({ x0: h.x - h.w / 2, x1: h.x + h.w / 2, z0: h.z - h.d / 2, z1: h.z + h.d / 2 }))) continue;
      const storeys = r() < 0.22 ? 2 : 1;
      out.push({ x, z, w, d, h: storeys * 3.1, ry: Math.round(r() * 3) * (Math.PI / 2) * 0.0 + (r() - 0.5) * 0.1, wall: walls[Math.floor(r() * walls.length)], roof: Math.floor(r() * 3), storeys });
    }
    return out;
  }, []);
}

function Houses() {
  const houses = useHouses();
  const wallRef = useRef<THREE.InstancedMesh>(null!);
  const roofs = useMemo(() => [0, 1, 2].map((k) => houses.filter((h) => h.roof === k)), [houses]);
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ map: render("#ffffff", [2, 1], 62), roughness: 0.9 }), []);
  const roofMats = useMemo(() => [81, 82, 83].map((s, i) => new THREE.MeshStandardMaterial({ map: rustRoof([3, 3], s), roughness: 0.8, metalness: 0.2, color: i === 2 ? "#c46a3c" : "#ffffff" })), []);
  const unitRoof = useMemo(() => hipRoof(1.3, 1, 1), []);
  const windows = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2f33", roughness: 0.4 }), []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    houses.forEach((h, i) => {
      o.position.set(h.x, h.h / 2, h.z);
      o.rotation.set(0, h.ry, 0);
      o.scale.set(h.w, h.h, h.d);
      o.updateMatrix();
      wallRef.current.setMatrixAt(i, o.matrix);
      wallRef.current.setColorAt(i, new THREE.Color(h.wall));
    });
    wallRef.current.instanceMatrix.needsUpdate = true;
    wallRef.current.instanceColor!.needsUpdate = true;
    wallRef.current.computeBoundingSphere();
  }, [houses]);
  return (
    <group>
      <instancedMesh ref={wallRef} args={[undefined, wallMat, houses.length]} castShadow={SH} receiveShadow>
        <boxGeometry />
      </instancedMesh>
      {roofs.map((list, k) => (
        <RoofSet key={k} list={list} geo={unitRoof} mat={roofMats[k]} />
      ))}
      <HouseWindows houses={houses} mat={windows} />
    </group>
  );
}

function RoofSet({ list, geo, mat }: { list: House[]; geo: THREE.BufferGeometry; mat: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    list.forEach((h, i) => {
      o.position.set(h.x, h.h, h.z);
      o.rotation.set(0, h.ry, 0);
      // the unit roof is 1.3 × 1: scale so the eaves overhang the walls
      o.scale.set((h.w + 1.2) / 1.3, 1.6 + h.d * 0.06, h.d + 1.2);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [list]);
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow={SH} receiveShadow />;
}

/** Dark window openings on each house's long sides. */
function HouseWindows({ houses, mat }: { houses: House[]; mat: THREE.Material }) {
  const items = useMemo(() => {
    const out: { x: number; y: number; z: number; ry: number }[] = [];
    for (const h of houses)
      for (let f = 0; f < h.storeys; f++)
        for (let k = 0; k < Math.floor(h.w / 3); k++)
          for (const side of [-1, 1]) {
            const lx = -h.w / 2 + 1.5 + k * 3;
            const lz = side * (h.d / 2 + 0.02);
            const c = Math.cos(h.ry), s = Math.sin(h.ry);
            out.push({ x: h.x + lx * c + lz * s, y: 1.6 + f * 3.1, z: h.z - lx * s + lz * c, ry: h.ry });
          }
    return out;
  }, [houses]);
  const geo = useMemo(() => new THREE.BoxGeometry(1.1, 1.1, 0.06), []);
  return <Instances geo={geo} mat={mat} items={items} cast={false} />;
}

function Trees() {
  const geos = useMemo(() => [treeGeometry(1), treeGeometry(3)], []);
  const m = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []);
  const sets = useMemo(() => {
    const r = rand(99);
    const a: { x: number; y: number; z: number; ry: number; s: number }[] = [];
    const b: typeof a = [];
    // the big trees right behind the walls (photo 1) and scattered further out
    const near: [number, number][] = [[-30, 14], [-44, 18], [-52, -40], [22, 16], [48, 12], [-20, -54], [14, -56], [60, -34], [-60, 18]];
    near.forEach(([x, z], i) => (i % 2 ? a : b).push({ x, y: 0, z, ry: i, s: 1.3 + (i % 3) * 0.2 }));
    for (let i = 0; i < Q.trees; i++) {
      const ang = r() * Math.PI * 2, dist = 50 + r() * 160;
      const x = -10 + Math.cos(ang) * dist * 1.2, z = -18 + Math.sin(ang) * dist;
      if (x > ROAD.x0 - 4 && x < ROAD.x1 + 4) continue;
      if (x > FIELD.x0 - 3 && x < FIELD.x1 + 3 && z > FIELD.z0 - 3 && z < FIELD.z1 + 3) continue;
      (i % 2 ? a : b).push({ x, y: 0, z, ry: r() * 6, s: 0.8 + r() * 0.8 });
    }
    return [a, b];
  }, []);
  return (
    <>
      <Instances geo={geos[0]} mat={m} items={sets[0]} />
      <Instances geo={geos[1]} mat={m} items={sets[1]} />
    </>
  );
}

/** The yellow mosque with a green roof and two minarets, just beyond the south wall. */
function Mosque() {
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ map: render("#d8c05a", [3, 2], 71), roughness: 0.85 }), []);
  const green = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3e5a3a", roughness: 0.7, side: THREE.DoubleSide }), []);
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: "#efe6c4" }), []);
  const roof = useMemo(() => hipRoof(15, 11, 3.2), []);
  const windows = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a3138" }), []);
  return (
    <group position={[-10, 0, 32]} rotation-y={0.15}>
      <mesh position={[0, 4, 0]} material={wall} castShadow={SH} receiveShadow>
        <boxGeometry args={[14, 8, 10]} />
      </mesh>
      <mesh position={[0, 8.05, 0]} geometry={roof} material={green} castShadow={SH} />
      {[-4.5, -1.5, 1.5, 4.5].flatMap((x) =>
        [2, 5.5].map((y) => (
          <mesh key={`${x}${y}`} position={[x, y, -5.02]} material={windows}>
            <boxGeometry args={[1, 1.4, 0.05]} />
          </mesh>
        )),
      )}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 6.2, 0, -4.2]}>
          <mesh position-y={6} material={wall} castShadow={SH}>
            <cylinderGeometry args={[0.75, 0.85, 12, 10]} />
          </mesh>
          <mesh position-y={12.2} material={trim}>
            <cylinderGeometry args={[1, 1, 0.4, 12]} />
          </mesh>
          <mesh position-y={13.4} material={wall}>
            <cylinderGeometry args={[0.6, 0.6, 2.2, 10]} />
          </mesh>
          <mesh position-y={14.6} material={green}>
            <coneGeometry args={[0.75, 1.8, 10]} />
          </mesh>
          <mesh position-y={15.8}>
            <torusGeometry args={[0.25, 0.05, 6, 12, Math.PI * 1.4]} />
            <meshStandardMaterial color="#d9b44a" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A lattice telecom mast (photo 3 has one over the field). */
function Mast({ x, z }: { x: number; z: number }) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: "#9aa0a6", metalness: 0.6, roughness: 0.4 }), []);
  const H = 34;
  const legs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  return (
    <group position={[x, 0, z]}>
      {legs.map(([a, b], i) => (
        <mesh key={i} position={[a * 0.9, H / 2, b * 0.9]} rotation={[b * 0.03, 0, -a * 0.03]} material={m}>
          <cylinderGeometry args={[0.06, 0.1, H, 5]} />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[0, 2 + i * 2.7, 0]} material={m}>
          <boxGeometry args={[1.9 - i * 0.05, 0.06, 1.9 - i * 0.05]} />
        </mesh>
      ))}
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[Math.cos(k * 2.1) * 1.1, H - 2, Math.sin(k * 2.1) * 1.1]} rotation-y={-k * 2.1}>
          <boxGeometry args={[0.3, 2.2, 0.6]} />
          <meshStandardMaterial color="#e6e6e6" />
        </mesh>
      ))}
      <mesh position-y={H + 0.5}>
        <sphereGeometry args={[0.25, 8, 6]} />
        <meshStandardMaterial color="#ff2a2a" emissive="#ff2a2a" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

/** The football field: worn grass, two goalposts, the grey block wall, crates and a chair. */
function Field() {
  const g = useMemo(() => new THREE.MeshStandardMaterial({ map: grass([10, 10], "field"), roughness: 1 }), []);
  const blocks = useMemo(() => new THREE.MeshStandardMaterial({ map: blockWall([20, 1]), roughness: 1 }), []);
  const blocksShort = useMemo(() => new THREE.MeshStandardMaterial({ map: blockWall([10, 1]), roughness: 1 }), []);
  const white = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f0f0ea" }), []);
  const F = FIELD;
  const cz = (F.z0 + F.z1) / 2;
  const W = F.x1 - F.x0, D = F.z1 - F.z0;
  const wallH = 2.3;
  return (
    <group>
      <mesh position={[(F.x0 + F.x1) / 2, 0.0, cz]} rotation-x={-Math.PI / 2} material={g} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* the block wall round three sides (the side by the resort is open to the path) */}
      <mesh position={[(F.x0 + F.x1) / 2, wallH / 2, F.z0 - 0.2]} material={blocks} castShadow={SH} receiveShadow>
        <boxGeometry args={[W + 0.4, wallH, 0.25]} />
      </mesh>
      <mesh position={[(F.x0 + F.x1) / 2, wallH / 2, F.z1 + 0.2]} material={blocks} castShadow={SH} receiveShadow>
        <boxGeometry args={[W + 0.4, wallH, 0.25]} />
      </mesh>
      <mesh position={[F.x0 - 0.2, wallH / 2, cz]} material={blocksShort} castShadow={SH} receiveShadow>
        <boxGeometry args={[0.25, wallH, D]} />
      </mesh>
      {/* goals */}
      {[F.x0 + 6, F.x1 - 6].map((x, i) => (
        <group key={i} position={[x, 0, cz - 2]} rotation-y={i ? Math.PI : 0}>
          {[-1.6, 1.6].map((z) => (
            <mesh key={z} position={[0, 1.1, z]} material={white} castShadow={SH}>
              <cylinderGeometry args={[0.06, 0.06, 2.2, 8]} />
            </mesh>
          ))}
          <mesh position={[0, 2.2, 0]} rotation-x={Math.PI / 2} material={white}>
            <cylinderGeometry args={[0.06, 0.06, 3.3, 8]} />
          </mesh>
          <mesh position={[-0.6, 1.1, 0]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[3.2, 2.2]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.18} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* beer crates and a plastic chair on the touchline (as in the photo) */}
      {[
        ["#d9a24a", -70, 6],
        ["#f2c21b", -68.8, 6.2],
        ["#1b1b1b", -66.8, 6.1],
        ["#e0b92a", -64.6, 6.3],
      ].map(([c, x, z], i) => (
        <mesh key={i} position={[x as number, 0.3, z as number]} castShadow={SH}>
          <boxGeometry args={[0.6, 0.6, 0.45]} />
          <meshStandardMaterial color={c as string} roughness={0.7} />
        </mesh>
      ))}
      <group position={[-66, 0, 4.6]} rotation-y={Math.PI}>
        <mesh position-y={0.45}>
          <boxGeometry args={[0.55, 0.06, 0.5]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0, 0.8, -0.24]}>
          <boxGeometry args={[0.55, 0.7, 0.05]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      </group>
      {/* a white marker post */}
      <mesh position={[-58, 0.45, 5]} material={white}>
        <boxGeometry args={[0.22, 0.9, 0.22]} />
      </mesh>
    </group>
  );
}

export function Surroundings() {
  return (
    <group>
      <OuterGround />
      <Houses />
      <Trees />
      <Mosque />
      <Field />
      <Mast x={-104} z={-44} />
      {/* the road's edge walls (the houses across the road) sit at road height */}
      <mesh position={[ROAD.x1 + 0.2, TERRACE_Y + 0.9, (ROAD.z0 + ROAD.z1) / 2]}>
        <boxGeometry args={[0.3, 1.8, ROAD.z1 - ROAD.z0]} />
        <meshStandardMaterial color="#8f8a80" roughness={0.9} />
      </mesh>
    </group>
  );
}
