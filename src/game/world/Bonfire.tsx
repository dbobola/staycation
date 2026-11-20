"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Q } from "../quality";
import { BONFIRE, BONFIRE_LOGS } from "./layout";

// The bonfire in the middle of the field: a ring of stones, logs stacked in a teepee, flames that
// flicker (glowing cones, no textures), embers drifting up, and the warm light it throws on the
// people round it. Log benches to sit on.

const flameMats = ["#ff4d0a", "#ff8a1a", "#ffd04a"].map(
  (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
);

export function Bonfire() {
  const flames = useRef<THREE.Group>(null!);
  const light = useRef<THREE.PointLight>(null!);
  const embers = useRef<THREE.Points>(null!);
  const N = Q.particles;
  const em = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const life = new Float32Array(N);
    for (let i = 0; i < N; i++) life[i] = Math.random() * 2.5;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { pos, life, g };
  }, [N]);
  const cone = useMemo(() => new THREE.ConeGeometry(1, 1, 8, 1, true).translate(0, 0.5, 0), []);
  const tongues = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        a: (i / 9) * Math.PI * 2,
        r: i % 3 === 0 ? 0 : 0.28 + (i % 2) * 0.12,
        h: 1.4 + (i % 4) * 0.35,
        w: 0.32 + (i % 3) * 0.08,
        m: flameMats[i % 3],
        ph: i * 1.7,
      })),
    [],
  );
  useFrame(({ clock }, raw) => {
    const t = clock.elapsedTime;
    const dt = Math.min(raw, 0.05);
    flames.current.children.forEach((c, i) => {
      const f = tongues[i];
      const k = 0.75 + Math.sin(t * 9 + f.ph) * 0.15 + Math.sin(t * 15.3 + f.ph * 2) * 0.1;
      c.scale.set(f.w * (1.1 - k * 0.2), f.h * k, f.w * (1.1 - k * 0.2));
      c.rotation.y = t * 0.6 + f.ph;
    });
    light.current.intensity = 26 + Math.sin(t * 11) * 4 + Math.sin(t * 23) * 3;
    // embers: up and out, fading
    for (let i = 0; i < N; i++) {
      em.life[i] -= dt;
      if (em.life[i] <= 0) {
        em.life[i] = 1.5 + Math.random() * 1.5;
        em.pos.set([BONFIRE.x + (Math.random() - 0.5) * 0.8, 0.6, BONFIRE.z + (Math.random() - 0.5) * 0.8], i * 3);
      }
      em.pos[i * 3] += Math.sin(t * 2 + i) * dt * 0.4;
      em.pos[i * 3 + 1] += dt * (1.4 + (i % 5) * 0.25);
      em.pos[i * 3 + 2] += Math.cos(t * 1.7 + i) * dt * 0.4;
    }
    em.g.attributes.position.needsUpdate = true;
  });
  return (
    <group>
      <group position={[BONFIRE.x, 0, BONFIRE.z]}>
        {/* the stone ring */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.sin(a) * 1.05, 0.12, Math.cos(a) * 1.05]} rotation-y={a} scale={[1, 0.7, 0.8]}>
              <dodecahedronGeometry args={[0.2, 0]} />
              <meshStandardMaterial color="#5d5850" roughness={1} flatShading />
            </mesh>
          );
        })}
        {/* the logs in a teepee */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.sin(a) * 0.35, 0.45, Math.cos(a) * 0.35]} rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}>
              <cylinderGeometry args={[0.07, 0.09, 1.1, 6]} />
              <meshStandardMaterial color="#3a2516" emissive="#ff5a10" emissiveIntensity={0.35} roughness={1} />
            </mesh>
          );
        })}
        {/* glowing embers in the pit */}
        <mesh position-y={0.05} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.85, 20]} />
          <meshBasicMaterial color="#ff5a10" toneMapped={false} />
        </mesh>
        <group ref={flames} position-y={0.15}>
          {tongues.map((f, i) => (
            <mesh key={i} geometry={cone} material={f.m} position={[Math.sin(f.a) * f.r, 0, Math.cos(f.a) * f.r]} />
          ))}
        </group>
        <pointLight ref={light} position={[0, 1.6, 0]} color="#ff9a3a" intensity={26} distance={16} decay={1.6} />
        {/* the warm pool of light on the grass */}
        <mesh position-y={0.03} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[6, 32]} />
          <meshBasicMaterial color="#ff7a20" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      <points ref={embers} geometry={em.g} frustumCulled={false}>
        <pointsMaterial size={0.08} color="#ffb04a" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
      {/* log benches */}
      {BONFIRE_LOGS.map((l, i) => (
        <mesh key={i} position={[l.x, 0.22, l.z]} rotation={[0, l.ry, Math.PI / 2]} castShadow={!Q.lite}>
          <cylinderGeometry args={[0.22, 0.24, 1.9, 9]} />
          <meshStandardMaterial color="#5a3b22" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
