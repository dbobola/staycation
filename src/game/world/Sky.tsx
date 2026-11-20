"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LITE } from "../quality";
import { useGame } from "../store";

// Ibadan's sky as in the photos: big grey-white rain clouds with blue between by day; at 6:50pm a
// heavy blue-grey ceiling with a band of orange low in the west. The light follows it.

const vert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w; // always at the far plane
  }
`;

const frag = /* glsl */ `
  uniform float uEvening;
  uniform float uTime;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
  void main() {
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    // day: pale blue to a hazy horizon; evening: slate blue with orange at the western horizon
    vec3 dayTop = vec3(0.36, 0.55, 0.78), dayHor = vec3(0.82, 0.86, 0.88);
    // night: deep navy overhead, a little city glow low down
    vec3 eveTop = vec3(0.008, 0.014, 0.045), eveHor = vec3(0.07, 0.07, 0.15);
    vec3 top = mix(dayTop, eveTop, uEvening), hor = mix(dayHor, eveHor, uEvening);
    vec3 col = mix(hor, top, pow(h, 0.55));
    // warm city glow on the horizon all round, a touch of magenta from the party
    col += uEvening * vec3(0.16, 0.07, 0.10) * (1.0 - smoothstep(0.0, 0.18, h));
    // stars
    vec2 sg = floor(d.xz / (d.y + 0.3) * 160.0);
    float star = step(0.9965, hash(sg)) * smoothstep(0.08, 0.4, h);
    col += uEvening * star * vec3(0.9, 0.92, 1.0) * (0.5 + 0.5 * sin(uTime * 2.0 + hash(sg) * 30.0));
    // the moon
    vec3 moonDir = normalize(vec3(-0.45, 0.55, 0.7));
    float md = dot(d, moonDir);
    col += uEvening * (smoothstep(0.9993, 0.9996, md) * vec3(0.95, 0.95, 0.88) + pow(max(md, 0.0), 300.0) * vec3(0.25, 0.27, 0.35));
    // clouds on a dome
    vec2 uv = d.xz / (d.y + 0.18) * 1.3 + vec2(uTime * 0.004, uTime * 0.002);
    float c = fbm(uv * 1.2);
    float cover = mix(0.42, 0.52, uEvening);
    float cl = smoothstep(cover, cover + 0.32, c);
    float shade = fbm(uv * 1.2 + vec2(0.15, 0.1));
    vec3 cloudLit = mix(vec3(0.97, 0.97, 0.96), vec3(0.12, 0.13, 0.2), uEvening);
    vec3 cloudDark = mix(vec3(0.52, 0.55, 0.60), vec3(0.04, 0.045, 0.08), uEvening);
    vec3 cloud = mix(cloudLit, cloudDark, smoothstep(0.35, 0.8, shade));
    col = mix(col, cloud, cl * smoothstep(0.0, 0.12, h) * 0.95);
    // below the horizon: haze
    if (d.y < 0.0) col = hor * 0.9;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function Sky() {
  const evening = useGame((s) => s.evening);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uEvening: { value: 0 }, uTime: { value: 0 } },
      }),
    [],
  );
  const sun = useRef<THREE.DirectionalLight>(null!);
  const hemi = useRef<THREE.HemisphereLight>(null!);
  const amb = useRef<THREE.AmbientLight>(null!);
  const { scene, camera } = useThree();
  const dome = useRef<THREE.Mesh>(null!);
  const e = useRef(0);

  useEffect(() => {
    scene.fog = new THREE.Fog("#c9d2d6", 140, 430);
  }, [scene]);

  useFrame((_, dt) => {
    e.current += ((evening ? 1 : 0) - e.current) * Math.min(1, dt * 1.5);
    const k = e.current;
    mat.uniforms.uEvening.value = k;
    mat.uniforms.uTime.value += dt;
    if (!dome.current || !sun.current || !hemi.current || !amb.current) return;
    dome.current.position.copy(camera.position);
    // by night the "sun" is the moon: cool and dim; the party lights do the rest
    sun.current.intensity = THREE.MathUtils.lerp(2.6, 0.55, k);
    sun.current.color.set("#fff4e2").lerp(new THREE.Color("#9fb4ff"), k);
    hemi.current.intensity = THREE.MathUtils.lerp(1.25, 0.6, k);
    hemi.current.color.set("#dfe9f2").lerp(new THREE.Color("#5b6ea8"), k);
    hemi.current.groundColor.set("#6b5a44").lerp(new THREE.Color("#2a2030"), k);
    amb.current.intensity = THREE.MathUtils.lerp(0.25, 0.28, k);
    (scene.fog as THREE.Fog).color.set("#cdd5d8").lerp(new THREE.Color("#0c1022"), k);
  });

  return (
    <>
      <mesh ref={dome} material={mat} frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[500, 32, 16]} />
      </mesh>
      <hemisphereLight ref={hemi} args={["#dfe9f2", "#6b5a44", 1.2]} />
      <ambientLight ref={amb} intensity={0.25} />
      <directionalLight
        ref={sun}
        position={[60, 90, 40]}
        intensity={2.6}
        castShadow={!LITE}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={10}
        shadow-camera-far={260}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      >
        <object3D attach="target" position={[-6, 0, -16]} />
      </directionalLight>
    </>
  );
}
