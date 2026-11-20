"use client";

import { Billboard, Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { Avatar, type AvatarHandle } from "../avatar/Avatar";
import type { Outfit } from "../avatar/outfit";
import { LITE, Q } from "../quality";
import { onThisDevice } from "../data/avatars";
import { useGame } from "../store";
import { ATTENDANTS, SPOTS, groundY, type Attendant } from "./layout";
import { player } from "./Player";

// The staff: one at every spot, in the Silver Dome polo. Walk up and they turn to you, wave, and
// tell you what they can do for you; the button in their bubble (or E) opens it.

const STAFF: Outfit = { kind: "staff", shirt: "#0e7c86", trousers: "#1d2a30" };

/** How far each member of staff is from you (only the nearest one talks). */
const distances = new Map<string, number>();

const turn = (a: number, b: number, k: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

function Staff({ a }: { a: Attendant }) {
  const g = useRef<THREE.Group>(null!);
  const av = useRef<AvatarHandle>(null);
  const heading = useRef(a.facing);
  const waveUntil = useRef(0);
  const greeted = useRef(false);
  const [near, setNear] = useState(false);
  const spot = SPOTS.find((s) => s.id === a.spot)!;
  const panel = useGame((s) => s.panel);
  const phase = useGame((s) => s.phase);
  const done = useGame((s) => s.done[a.spot]);
  const y = groundY(a.x, a.z);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    const t = clock.elapsedTime;
    const st = useGame.getState();
    const d = st.phase === "walk" ? Math.hypot(player.x - a.x, player.z - a.z) : 99;
    // turn to you as you come over; back to their post when you've gone
    const want = d < 7 ? Math.atan2(player.x - a.x, player.z - a.z) : a.facing;
    heading.current = turn(heading.current, want, Math.min(1, dt * 4));
    g.current.rotation.y = heading.current;
    if (d < 5 && !greeted.current) {
      greeted.current = true;
      waveUntil.current = t + 2.2;
    }
    if (d > 9) greeted.current = false;
    av.current?.play(t < waveUntil.current ? "wave" : "idle");
    distances.set(a.name, d);
    let nearest = true;
    for (const [n, other] of distances) if (n !== a.name && other < d) nearest = false;
    const isNear = d < 5 && nearest;
    if (isNear !== near) setNear(isNear);
  });
  return (
    <group position={[a.x, y, a.z]}>
      <group ref={g} rotation-y={a.facing}>
        <Suspense fallback={null}>
          <Avatar ref={av} avatarId={onThisDevice(a.avatar, Q.models)} outfit={STAFF} shadows={!LITE} offset={a.x % 1} />
        </Suspense>
      </group>
      {!near && (
        <Billboard position-y={2.05}>
          <mesh position-z={-0.01}>
            <planeGeometry args={[(a.name.length + a.role.length) * 0.075 + 0.6, 0.26]} />
            <meshBasicMaterial color="#0e7c86" transparent opacity={0.92} depthWrite={false} />
          </mesh>
          <Text fontSize={0.13} color="#ffffff" anchorX="center" anchorY="middle" fontWeight={800}>
            {`${a.name} · ${a.role}`}
          </Text>
        </Billboard>
      )}
      {near && phase === "walk" && !panel && (
        <Html position={[0, 2.35, 0]} center zIndexRange={[15, 5]}>
          <div className="staff-bubble">
            <div className="staff-name">
              {a.name} · {a.role}
            </div>
            <p>{done && a.spot === "checkin" ? "You're all checked in! Enjoy the weekend 🌴" : a.line}</p>
            <button className="btn mt-2 w-full px-3 py-2 text-[13px]" onClick={() => useGame.getState().set({ panel: a.spot })}>
              {spot.icon} {spot.button}
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

export function Attendants() {
  return (
    <group>
      {ATTENDANTS.map((a) => (
        <Staff key={a.name} a={a} />
      ))}
    </group>
  );
}
