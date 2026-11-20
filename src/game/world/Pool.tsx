"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useGame } from "../store";
import { POOL, POOL_FLOOR, WATER_Y } from "./layout";
import { flagstone, poolTiles } from "./textures";

// The pool: tiled walls and floor, sandstone coping, chrome ladders, lights under the water for the
// evening, and the water itself (a shader: turquoise over the tiles, moving caustics and glints).

const W = POOL.x1 - POOL.x0;
const D = POOL.z1 - POOL.z0;
const CX = (POOL.x0 + POOL.x1) / 2;
const CZ = (POOL.z0 + POOL.z1) / 2;

const waterVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const waterFrag = /* glsl */ `
  uniform float uTime;
  uniform float uEvening;
  uniform vec3 uSun;
  varying vec2 vUv;
  varying vec3 vWorld;

  float h(vec2 p) {
    return sin(p.x * 1.7 + uTime * 0.9) * 0.5 + sin(p.y * 2.3 - uTime * 0.7) * 0.5
         + sin((p.x + p.y) * 3.1 + uTime * 1.3) * 0.25 + sin((p.x - p.y) * 4.3 - uTime * 1.1) * 0.2;
  }
  // a cheap caustic net: bright where two wave fields cross
  float caustic(vec2 p) {
    float c = 0.0;
    vec2 q = p;
    for (int i = 0; i < 3; i++) {
      q = vec2(q.x + sin(q.y * 1.3 + uTime * 0.6), q.y + cos(q.x * 1.1 - uTime * 0.5));
      c += 1.0 / (1.0 + 30.0 * abs(sin(q.x * 1.9) * sin(q.y * 1.9)));
    }
    return c / 3.0;
  }
  void main() {
    vec2 p = vWorld.xz;
    float e = 0.05;
    vec3 n = normalize(vec3(h(p + vec2(e, 0.0)) - h(p - vec2(e, 0.0)), 6.0, h(p + vec2(0.0, e)) - h(p - vec2(0.0, e))));
    vec3 view = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(view, n), 0.0), 3.0);
    // deeper (more saturated) towards the middle, as in the photos
    float edge = min(min(vUv.x, 1.0 - vUv.x) * ${W.toFixed(1)}, min(vUv.y, 1.0 - vUv.y) * ${D.toFixed(1)});
    float depth = smoothstep(0.0, 2.5, edge);
    vec3 shallow = mix(vec3(0.35, 0.82, 0.86), vec3(0.2, 0.45, 0.85), uEvening);
    vec3 deep = mix(vec3(0.05, 0.55, 0.72), vec3(0.06, 0.2, 0.55), uEvening);
    vec3 col = mix(shallow, deep, depth);
    col += caustic(p * 1.4) * mix(0.16, 0.12, uEvening) * mix(vec3(1.0), vec3(0.8, 0.6, 1.0), uEvening);
    vec3 sky = mix(vec3(0.75, 0.85, 0.92), vec3(0.2, 0.22, 0.3), uEvening);
    col = mix(col, sky, fres * 0.55);
    vec3 hv = normalize(normalize(uSun) + view);
    col += pow(max(dot(n, hv), 0.0), 180.0) * (1.0 - uEvening) * 1.6;
    // evening: lit from the pool lights under the water
    col += uEvening * vec3(0.05, 0.12, 0.3) * (1.0 - depth * 0.5);
    gl_FragColor = vec4(col, 0.9 - fres * 0.1);
    #include <colorspace_fragment>
  }
`;

export function Water() {
  const evening = useGame((s) => s.evening);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: waterVert,
        fragmentShader: waterFrag,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uEvening: { value: 0 }, uSun: { value: new THREE.Vector3(0.4, 0.8, 0.3) } },
      }),
    [],
  );
  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt;
    const target = evening ? 1 : 0;
    mat.uniforms.uEvening.value += (target - mat.uniforms.uEvening.value) * Math.min(1, dt * 2);
  });
  return (
    <mesh position={[CX, WATER_Y, CZ]} rotation-x={-Math.PI / 2} material={mat} renderOrder={2}>
      <planeGeometry args={[W, D, 1, 1]} />
    </mesh>
  );
}

function Ladder({ x, z, facing }: { x: number; z: number; facing: number }) {
  const chrome = useMemo(() => new THREE.MeshStandardMaterial({ color: "#dfe4e8", metalness: 0.9, roughness: 0.2 }), []);
  return (
    <group position={[x, 0, z]} rotation-y={facing}>
      {[-0.28, 0.28].map((s) => (
        <group key={s} position-x={s}>
          <mesh position={[0, -0.6, 0.12]} material={chrome}>
            <cylinderGeometry args={[0.025, 0.025, 1.6, 8]} />
          </mesh>
          <mesh position={[0, 0.35, -0.12]} rotation-x={Math.PI / 2} material={chrome}>
            <torusGeometry args={[0.24, 0.025, 6, 12, Math.PI]} />
          </mesh>
        </group>
      ))}
      {[-0.3, -0.65, -1.0].map((y) => (
        <mesh key={y} position={[0, y, 0.14]} material={chrome}>
          <boxGeometry args={[0.56, 0.03, 0.08]} />
        </mesh>
      ))}
    </group>
  );
}

export function Pool() {
  const evening = useGame((s) => s.evening);
  const tiles = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: poolTiles([W / 2, D / 2]), roughness: 0.3 });
    return m;
  }, []);
  const wallTiles = useMemo(() => new THREE.MeshStandardMaterial({ map: poolTiles([W / 2, 1]), roughness: 0.3 }), []);
  const endTiles = useMemo(() => new THREE.MeshStandardMaterial({ map: poolTiles([D / 2, 1]), roughness: 0.3 }), []);
  const coping = useMemo(() => new THREE.MeshStandardMaterial({ map: flagstone([4, 0.3]), color: "#d9b48c", roughness: 0.85 }), []);
  const depth = -POOL_FLOOR;
  const C = 0.45; // coping width
  return (
    <group>
      {/* floor and walls */}
      <mesh position={[CX, POOL_FLOOR, CZ]} rotation-x={-Math.PI / 2} material={tiles} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh position={[CX, -depth / 2, POOL.z0]} material={wallTiles}>
        <planeGeometry args={[W, depth]} />
      </mesh>
      <mesh position={[CX, -depth / 2, POOL.z1]} rotation-y={Math.PI} material={wallTiles}>
        <planeGeometry args={[W, depth]} />
      </mesh>
      <mesh position={[POOL.x0, -depth / 2, CZ]} rotation-y={Math.PI / 2} material={endTiles}>
        <planeGeometry args={[D, depth]} />
      </mesh>
      <mesh position={[POOL.x1, -depth / 2, CZ]} rotation-y={-Math.PI / 2} material={endTiles}>
        <planeGeometry args={[D, depth]} />
      </mesh>
      {/* the coping: a raised sandstone lip with a rounded terracotta edge */}
      {[
        [CX, POOL.z0 - C / 2, W + C * 2, C],
        [CX, POOL.z1 + C / 2, W + C * 2, C],
        [POOL.x0 - C / 2, CZ, C, D],
        [POOL.x1 + C / 2, CZ, C, D],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.04, z]} material={coping} receiveShadow castShadow>
          <boxGeometry args={[w, 0.1, d]} />
        </mesh>
      ))}
      <Ladder x={-6} z={POOL.z0} facing={0} />
      <Ladder x={6} z={POOL.z0} facing={0} />
      <Ladder x={POOL.x1} z={2} facing={-Math.PI / 2} />
      {/* lights in the pool walls */}
      {[-6, -2, 2, 6].flatMap((x) => [POOL.z0 + 0.02, POOL.z1 - 0.02].map((z) => (
        <mesh key={`${x}${z}`} position={[x, -0.75, z]} rotation-y={z < 0 ? 0 : Math.PI}>
          <circleGeometry args={[0.14, 16]} />
          <meshBasicMaterial color={evening ? "#d9c8ff" : "#e9f4f6"} toneMapped={!evening} />
        </mesh>
      )))}
      {/* (by night the pool is lit in drifting colours: see Nightlife) */}
      <Water />
    </group>
  );
}
