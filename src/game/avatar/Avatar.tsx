"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { AVATARS, animFile, type AnimName, type Sex } from "../data/avatars";
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
};

export const Avatar = forwardRef<AvatarHandle, Props>(function Avatar({ avatarId, anim = "idle", skin, offset = 0, shadows = true, outfit = null, ...group }, ref) {
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

  // outfits: swap the body's material for one wearing it (and back again)
  const gl = useThree((s) => s.gl);
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
    const skinColor = skinFrom(gl, def.id, (head as THREE.MeshStandardMaterial | null)?.map ?? null);
    bodies.forEach((b, i) => (b.material = outfitMaterial(originals[i], outfit, skinColor, height)));
    return () => {
      bodies.forEach((b, i) => {
        (b.material as THREE.Material).dispose();
        b.material = originals[i];
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, outfitKey, gl, def.id]);

  useEffect(() => {
    if (!skin) return;
    scene.traverse((o) => {
      const m = (o as THREE.SkinnedMesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && /_head$|_body$/.test(m.name)) m.color.set(skin);
    });
  }, [scene, skin]);

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
