"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { AVATARS, animFile, toneFor, type AnimName, type Sex } from "../data/avatars";
import { withKTX2 } from "./ktx2";
import { outfitMaterial, skinFrom, type Outfit } from "./outfit";

// A person: a Rocketbox avatar (as in The Feast) with its walk, idle, sit, run and wave clips.

const ANIMS: AnimName[] = ["idle", "walk", "run", "sit", "wave", "clap"];

export function preloadPeople(ids: string[]) {
  for (const id of ids) {
    const a = AVATARS.find((x) => x.id === id);
    if (a) useGLTF.preload(a.file, true, true, withKTX2);
  }
  for (const sex of ["f", "m"] as Sex[]) for (const n of ANIMS) useGLTF.preload(animFile(sex, n));
}

/** All clips for one sex, renamed and made in-place (gameplay moves people, not the clip). */
function useClips(sex: Sex) {
  const gltfs = useGLTF(ANIMS.map((n) => animFile(sex, n))) as unknown as { animations: THREE.AnimationClip[] }[];
  return useMemo(() => {
    const clips = new Map<AnimName, THREE.AnimationClip>();
    gltfs.forEach((g, i) => {
      const clip = g.animations[0].clone();
      clip.name = ANIMS[i];
      clip.tracks = clip.tracks.filter((t) => !/^(Bip01_Footsteps|MotionExtractionHelper)\./.test(t.name));
      for (const track of clip.tracks)
        if (track.name === "Bip01.position") {
          const v = track.values;
          const x0 = v[0], z0 = v[2];
          for (let k = 0; k < v.length; k += 3) {
            v[k] = x0;
            v[k + 2] = z0;
          }
        }
      clips.set(ANIMS[i], clip);
    });
    return clips;
  }, [gltfs]);
}

export type AvatarHandle = {
  root: THREE.Group;
  play: (name: AnimName, fade?: number) => void;
  setRate: (r: number) => void;
  /** Off: the pose freezes (far away people cost nothing to animate). */
  setActive: (on: boolean) => void;
};

type Props = ThreeElements["group"] & {
  avatarId: string;
  anim?: AnimName;
  skin?: string;
  /** Start the clip at a random point so a crowd doesn't move in step. */
  offset?: number;
  shadows?: boolean;
  /** Swimwear, a football kit or the staff polo, painted over the avatar's own clothes. */
  outfit?: Outfit | null;
  /** Skin tone (an African tone from SKIN_TONES; by default one picked for the model). */
  tone?: string;
  /** Dreadlocks, in this tip colour (the roots are black). */
  dreads?: string | null;
};

export const Avatar = forwardRef<AvatarHandle, Props>(function Avatar({ avatarId, anim = "idle", skin, offset = 0, shadows = true, outfit = null, dreads = null, tone, ...group }, ref) {
  const def = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
  const gltf = useGLTF(def.file, true, true, withKTX2);
  const clips = useClips(def.sex);
  const groupRef = useRef<THREE.Group>(null!);

  const scene = useMemo(() => {
    const s = cloneSkinned(gltf.scene) as THREE.Object3D;
    s.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      m.castShadow = shadows;
      m.receiveShadow = false;
      m.frustumCulled = false;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mm) => (mm as THREE.MeshStandardMaterial).clone());
      m.material = mats.length === 1 ? mats[0] : mats;
    });
    return s;
  }, [gltf.scene, shadows]);

  // everyone's skin an African tone, and light hair a natural black-brown
  const gl = useThree((s) => s.gl);
  const toneHex = tone ?? toneFor(AVATARS.indexOf(def) * 3 + 1);
  const toneColor = useMemo(() => new THREE.Color(toneHex), [toneHex]);
  useEffect(() => {
    let head: THREE.MeshStandardMaterial | null = null;
    scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh && /_head$/.test((m.material as THREE.Material).name)) head = m.material as THREE.MeshStandardMaterial;
    });
    const ref = skinFrom(gl, def.id, (head as THREE.MeshStandardMaterial | null)?.map ?? null);
    scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
        if (/_head$|_body$/.test(mat.name)) recolourSkin(mat, ref, toneColor);
        else if (/_opacity$/.test(mat.name)) mat.color.set("#3a2a20"); // hair cards and lashes
      }
    });
  }, [scene, gl, def.id, toneColor]);

  // outfits: swap the body's material for one wearing it (and back again)
  const outfitKey = outfit ? JSON.stringify(outfit) : "";
  useEffect(() => {
    let head: THREE.MeshStandardMaterial | null = null;
    const bodies: THREE.SkinnedMesh[] = [];
    let height = 1.75;
    scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (/_head$/.test(mat.name)) {
        head = mat;
        m.geometry.computeBoundingBox();
        height = m.geometry.boundingBox!.max.z;
      }
      if (/_body$/.test(mat.name)) bodies.push(m);
    });
    const originals = bodies.map((b) => b.material as THREE.MeshStandardMaterial);
    if (!outfit) return;
    const skinColor = toneColor;
    void head;
    bodies.forEach((b, i) => (b.material = outfitMaterial(originals[i], outfit, skinColor, height)));
    return () => {
      bodies.forEach((b, i) => {
        (b.material as THREE.Material).dispose();
        b.material = originals[i];
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, outfitKey, gl, def.id, toneColor]);

  useEffect(() => {
    if (!skin) return;
    scene.traverse((o) => {
      const m = (o as THREE.SkinnedMesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && /_head$|_body$/.test(m.name)) m.color.set(skin);
    });
  }, [scene, skin]);

  // dreadlocks: built round the head as it is in the model, then hung on the head bone so they move with it
  useEffect(() => {
    if (!dreads) return;
    let headMesh: THREE.SkinnedMesh | null = null;
    scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh && /_head$/.test((m.material as THREE.Material).name)) headMesh = m;
    });
    const hm = headMesh as THREE.SkinnedMesh | null;
    if (!hm) return;
    const bi = hm.skeleton.bones.findIndex((b) => /Head$/.test(b.name));
    if (bi < 0) return;
    const bone = hm.skeleton.bones[bi];
    const geo = dreadlocks(hm.geometry, dreads);
    geo.applyMatrix4(hm.bindMatrix).applyMatrix4(hm.skeleton.boneInverses[bi]);
    const mesh = new THREE.Mesh(geo, DREAD_MAT);
    mesh.castShadow = shadows;
    mesh.frustumCulled = false;
    bone.add(mesh);
    return () => {
      bone.remove(mesh);
      geo.dispose();
    };
  }, [scene, dreads, shadows]);

  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const current = useRef<THREE.AnimationAction | null>(null);
  const rate = useRef(1);
  const active = useRef(true);

  const play = (name: AnimName, fade = 0.3) => {
    const clip = clips.get(name);
    if (!clip) return;
    const next = mixer.clipAction(clip);
    if (current.current === next) return;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (!current.current && offset) next.time = offset * clip.duration;
    current.current?.fadeOut(fade);
    current.current = next;
  };

  useEffect(() => {
    play(anim);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, mixer]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useImperativeHandle(ref, () => ({ root: groupRef.current, play, setRate: (r) => (rate.current = r), setActive: (on) => (active.current = on) }), [clips, mixer]);

  useFrame((_, dt) => {
    if (active.current) mixer.update(Math.min(dt, 0.05) * rate.current);
  });

  return (
    <group ref={groupRef} {...group}>
      <primitive object={scene} />
    </group>
  );
});

const DREAD_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });

/**
 * Dreadlocks for a head (in the model's own space: Z up, metres, facing -Y): a close cap over the
 * scalp, and locks from the crown falling round the back and sides to the shoulders, clear of the face.
 */
function dreadlocks(head: THREE.BufferGeometry, tip: string) {
  const p = head.attributes.position;
  let top = -Infinity;
  for (let i = 0; i < p.count; i++) top = Math.max(top, p.getZ(i));
  // the skull: everything in the top 12 cm
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < p.count; i++)
    if (p.getZ(i) > top - 0.12) {
      x0 = Math.min(x0, p.getX(i));
      x1 = Math.max(x1, p.getX(i));
      y0 = Math.min(y0, p.getY(i));
      y1 = Math.max(y1, p.getY(i));
    }
  const rx = (x1 - x0) / 2 + 0.012, ry = (y1 - y0) / 2 + 0.012, rz = 0.115;
  const c = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2 + 0.006, top - rz + 0.012);
  const root = new THREE.Color("#140d09"), end = new THREE.Color(tip);
  const parts: THREE.BufferGeometry[] = [];
  const paint = (g: THREE.BufferGeometry, from: THREE.Color, to: THREE.Color, z0: number, z1: number) => {
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const t = THREE.MathUtils.clamp((z0 - g.attributes.position.getZ(i)) / Math.max(0.001, z0 - z1), 0, 1);
      tmp.copy(from).lerp(to, t * t);
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.deleteAttribute("uv");
    return g;
  };
  // the cap
  const cap = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52).rotateX(Math.PI / 2);
  cap.scale(rx, ry, rz);
  parts.push(paint(cap, root, root, 0, 1));
  // the locks
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const up = new THREE.Vector3(0, 1, 0);
  for (let ring = 0; ring < 4; ring++) {
    const phi = 0.35 + ring * 0.33; // from the crown down
    const count = 9 + ring * 4;
    for (let k = 0; k < count; k++) {
      const th = (k / count) * Math.PI * 2 + ring * 0.4; // 0 = +X, -PI/2 = front (-Y)
      const sx = Math.sin(phi) * Math.cos(th), sy = Math.sin(phi) * Math.sin(th);
      // keep the face clear: nothing hangs in front, the front ones are swept back
      const front = -sy / Math.max(0.001, Math.sin(phi));
      if (front > 0.4) continue;
      const a = new THREE.Vector3(rx * sx, ry * sy, rz * Math.cos(phi));
      const out = new THREE.Vector3(sx, sy, 0).normalize();
      const len = (front > 0 ? 0.16 : 0.26) + rnd() * 0.1;
      const b = a.clone().addScaledVector(out, 0.05 + ring * 0.01).add(new THREE.Vector3(0, front > 0.2 ? 0.05 : 0.02, -len));
      const dir = b.clone().sub(a);
      const L = dir.length();
      const lock = new THREE.CylinderGeometry(0.012, 0.009, L, 5, 3);
      lock.translate(0, -L / 2, 0); // hangs from its root
      lock.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up.clone().negate(), dir.normalize()));
      lock.translate(a.x, a.y, a.z);
      parts.push(paint(lock, root, end, a.z, b.z));
    }
  }
  // tipped back a little: the hairline sits up off the brow and the locks fall behind the shoulders
  const g = mergeGeometries(parts.map((x) => x.toNonIndexed()))!;
  g.rotateX(-0.32).translate(c.x, c.y + 0.012, c.z + 0.012);
  g.computeVertexNormals();
  parts.forEach((x) => x.dispose());
  return g;
}

/**
 * Recolour the skin in a head or body texture to `tone`, keeping its shading: a pixel counts as
 * skin when its hue is close to the face's own average skin colour (`ref`), so the whites of the
 * eyes, teeth, brows and most clothes are left alone. Light hair painted on the scalp goes dark.
 */
function recolourSkin(mat: THREE.MeshStandardMaterial, ref: THREE.Color, tone: THREE.Color) {
  const u = { uRef: { value: new THREE.Vector3(ref.r, ref.g, ref.b) }, uTone: { value: new THREE.Vector3(tone.r, tone.g, tone.b) } };
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uRef;\nuniform vec3 uTone;").replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      {
        vec3 c = diffuseColor.rgb;
        float sc = c.r + c.g + c.b + 1e-4, sr = uRef.r + uRef.g + uRef.b + 1e-4;
        float d = distance(c / sc, uRef / sr);
        float skin = 1.0 - smoothstep(0.08, 0.2, d);
        float l = dot(c, vec3(0.3, 0.59, 0.11)) / max(1e-4, dot(uRef, vec3(0.3, 0.59, 0.11)));
        vec3 toned = uTone * clamp(l, 0.0, 1.2);
        // pale, yellowish hair (blonde) on the scalp: a natural dark brown
        // (blonde: yellow, with red and green about equal; skin is clearly redder than it is green)
        float blond = step(0.18, dot(c, vec3(0.3, 0.59, 0.11))) * step(c.b * 1.5, c.g) * step(c.r - c.g, 0.12 * c.r + 0.02);
        diffuseColor.rgb = mix(mix(c, toned, skin), vec3(0.03, 0.02, 0.015) * (0.6 + l * 0.2), blond);
      }`,
    );
  };
  mat.customProgramCacheKey = () => "african-skin";
  mat.needsUpdate = true;
}
