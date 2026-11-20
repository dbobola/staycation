"use client";

import { Billboard, Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Avatar, type AvatarHandle } from "../avatar/Avatar";
import type { Outfit } from "../avatar/outfit";
import { LITE, Q } from "../quality";
import { onThisDevice } from "../data/avatars";
import { useGame } from "../store";
import { ATTENDANTS, AWARDS, BUFFET, CHECKIN_DESK, RECEPTION, SPOTS, YEARBOOK, groundY, type SpotId } from "./layout";
import { player, walkTo } from "./Player";

// Making it obvious what to do, without getting in the way:
//  - Tolu, your host, waits just inside the gate facing you and welcomes you; once you've
//    walked past her she follows you (behind). Each time there's
//    something new to do, she tells you (and her button takes you straight there).
//  - a soft glowing marker over the person you should see next
//  - a faint arrow at your feet pointing the way
// (the "Next" card on screen is in the overlay)

export const STEPS: { id: SpotId; text: string; short: string; optional?: boolean }[] = [
  { id: "checkin", text: "Check in with Ada at the welcome desk", short: "Check in" },
  { id: "yearbook", text: "Put your name in the Yearbook (Kunle)", short: "Yearbook", optional: true },
  { id: "roommate", text: "Pick your room partner with Bisi at reception", short: "Room partner" },
  { id: "menu", text: "Dinner by the pool: pick your food with Funke at the buffet", short: "Food menu" },
  { id: "movie", text: "Choose the movie on the big screen by the dinner", short: "Movie night", optional: true },
  { id: "games", text: "Sign up for games with Coach Bayo by the bonfire", short: "Games", optional: true },
  { id: "awards", text: "Nominate a classmate with Tobi", short: "Awards", optional: true },
  { id: "pool", text: "Last one: jump in the pool! 🏊🏾", short: "Pool", optional: true },
];

/**
 * Where to stand for each spot when you're walked there (in front of the counter or the person),
 * whom to face, and who it is.
 */
export function approachFor(id: SpotId): { x: number; z: number; face: { x: number; z: number } | null; who: string | null } | null {
  const staff = ATTENDANTS.find((a) => a.spot === id);
  const at = (x: number, z: number) => ({ x, z, face: staff ? { x: staff.x, z: staff.z } : null, who: staff?.name ?? null });
  switch (id) {
    case "checkin":
      return at(CHECKIN_DESK.x, CHECKIN_DESK.z + 1.3);
    case "yearbook":
      return at(YEARBOOK.x - 0.5, YEARBOOK.z + 1.8);
    case "roommate":
      return at(RECEPTION.x, -29.0);
    case "menu":
      return at(BUFFET.x, BUFFET.z0 - 0.9);
    case "games":
      return staff ? at(staff.x - 1.6, staff.z) : null;
    case "movie":
      return staff ? at(staff.x + 1.5, staff.z) : null;
    case "awards":
      return at(AWARDS.x, AWARDS.z + 1.6);
    case "pool":
      return { x: 0, z: -2.2, face: { x: 0, z: 2 }, who: null };
    default:
      return null;
  }
}

/** The next thing to do, in order (optional ones you've skipped or walked past are left behind). */
export function nextStep(done: Partial<Record<SpotId, boolean>>, skipped: Partial<Record<SpotId, boolean>> = {}) {
  return STEPS.find((s) => !done[s.id] && !(s.optional && skipped[s.id])) ?? null;
}

/** Where to go for a step: its attendant, or the spot itself. */
export function stepTarget(id: SpotId) {
  const a = ATTENDANTS.find((x) => x.spot === id);
  if (a) return { x: a.x, z: a.z, person: true };
  const s = SPOTS.find((x) => x.id === id)!;
  return { x: s.x, z: s.z, person: false };
}

/** Where Tolu waits to welcome you: just inside the gate, in your path. */
const WELCOME = { x: 39.6, z: -29.2 };

const HOST: Outfit = { kind: "staff", shirt: "#0e7c86", trousers: "#1d2a30" };

const turn = (a: number, b: number, k: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

/** Tolu, your host: welcomes you inside the gate, follows once you're past her, and points you to the next thing. */
function Host() {
  const done = useGame((s) => s.done);
  const skipped = useGame((s) => s.skipped);
  const panel = useGame((s) => s.panel);
  const name = useGame((s) => s.guestName);
  const walking = useGame((s) => s.phase === "walk");
  const step = nextStep(done, skipped);
  const g = useRef<THREE.Group>(null!);
  const av = useRef<AvatarHandle>(null);
  const tag = useRef<THREE.Group>(null);
  const me = useRef({ x: player.x + 1.5, z: player.z + 1.5, heading: 0, y: 0 });
  const [talk, setTalk] = useState(true);
  // say something new each time the next step changes
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (!walking) return;
    const id = step?.id ?? "done";
    if (shown.current === id) return;
    shown.current = id;
    setTalk(true);
    const t = setTimeout(() => setTalk(false), 7000);
    return () => clearTimeout(t);
  }, [step?.id, walking]);
  // Tolu waits just inside the gate, facing you, and welcomes you in. Only once you've walked past
  // her does she follow you (a step or two behind).
  const met = useRef(false);
  useEffect(() => {
    Object.assign(me.current, { x: WELCOME.x, z: WELCOME.z, heading: Math.PI / 2 });
  }, []);
  useFrame(({ camera }, raw) => {
    const dt = Math.min(raw, 0.05);
    const h = player.heading;
    const m = me.current;
    // her name only from a little way off (up close it would fill the screen)
    if (tag.current) {
      const cd = camera.position.distanceTo(g.current.position);
      tag.current.visible = cd > 6 && cd < 18;
    }
    // passed her (or somewhere else entirely): from now on she follows
    if (!met.current && (player.x < WELCOME.x - 0.4 || Math.hypot(player.x - WELCOME.x, player.z - WELCOME.z) > 30)) met.current = true;
    let tx: number, tz: number;
    if (!met.current) {
      tx = WELCOME.x;
      tz = WELCOME.z;
    } else {
      // a step behind you and well off to the right (out of the camera's way)
      tx = player.x - Math.sin(h) * 1.1 - Math.cos(h) * 1.6;
      tz = player.z - Math.cos(h) * 1.1 + Math.sin(h) * 1.6;
    }
    const d = Math.hypot(tx - m.x, tz - m.z);
    if (d > 16) Object.assign(m, { x: tx, z: tz });
    let anim: "idle" | "walk" | "run" = "idle";
    if (d > (met.current ? 0.5 : 0.15)) {
      const v = Math.min(d, (d > 4 ? 4.6 : 2.6) * dt);
      m.x += ((tx - m.x) / d) * v;
      m.z += ((tz - m.z) / d) * v;
      m.heading = turn(m.heading, Math.atan2(tx - m.x, tz - m.z), Math.min(1, dt * 6));
      anim = d > 4 ? "run" : "walk";
    } else m.heading = turn(m.heading, Math.atan2(player.x - m.x, player.z - m.z), Math.min(1, dt * 3));
    m.y += (groundY(m.x, m.z) - m.y) * Math.min(1, dt * 8);
    g.current.position.set(m.x, m.y, m.z);
    g.current.rotation.y = m.heading;
    av.current?.play(talk && anim === "idle" ? "wave" : anim);
  });
  const spot = step ? SPOTS.find((s) => s.id === step.id)! : null;
  const line = !step
    ? `You've done everything${name ? `, ${name}` : ""}! Enjoy the weekend 🎉`
    : step.id === "checkin"
      ? `Hi${name ? ` ${name}` : ""}! I'm Tolu, your host 👋 First, let's get you checked in with Ada.`
      : step.optional
        ? `If you like (it's optional): ${step.text}.`
        : `Nice one! Next: ${step.text}.`;
  return (
    <group ref={g}>
      <Suspense fallback={null}>
        <Avatar ref={av} avatarId={onThisDevice("f05", Q.models)} outfit={HOST} shadows={!LITE} />
      </Suspense>
      {(!talk || panel || !walking) && (
        <Billboard ref={tag} position-y={2.05}>
          <mesh position-z={-0.01}>
            <planeGeometry args={[1.5, 0.26]} />
            <meshBasicMaterial color="#0e7c86" transparent opacity={0.92} depthWrite={false} />
          </mesh>
          <Text fontSize={0.13} color="#ffffff" anchorX="center" anchorY="middle" fontWeight={800}>
            Tolu · Your host
          </Text>
        </Billboard>
      )}
      {talk && !panel && walking && (
        <Html position={[0, 2.35, 0]} center zIndexRange={[14, 4]}>
          <div className="staff-bubble">
            <div className="staff-name">Tolu · Your host</div>
            <p>{line}</p>
            {spot && (
              <button className="btn mt-2 w-full px-3 py-2 text-[13px]" onClick={() => {
                  setTalk(false);
                  walkTo(step!.id);
                }}>
                {spot.icon} {step!.id === "pool" ? "Take me to the pool" : `${step!.short} now`}
              </button>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

/** A soft beam and a bobbing chevron over whoever you should see next. */
function Marker() {
  const done = useGame((s) => s.done);
  const skipped = useGame((s) => s.skipped);
  const panel = useGame((s) => s.panel);
  const step = nextStep(done, skipped);
  const g = useRef<THREE.Group>(null!);
  const chev = useRef<THREE.Mesh>(null!);
  const beam = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!step || !g.current) return;
    const t = clock.elapsedTime;
    const tg = stepTarget(step.id);
    g.current.position.set(tg.x, groundY(tg.x, tg.z), tg.z);
    chev.current.position.y = (tg.person ? 2.75 : 1.6) + Math.sin(t * 3) * 0.12;
    chev.current.rotation.y = t * 1.5;
    (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(t * 2.4) * 0.04;
  });
  if (!step || panel) return null;
  return (
    <group ref={g}>
      <mesh ref={chev} rotation-x={Math.PI}>
        <coneGeometry args={[0.2, 0.36, 4]} />
        <meshBasicMaterial color="#f0a04b" toneMapped={false} />
      </mesh>
      <mesh ref={beam} position-y={3}>
        <cylinderGeometry args={[0.45, 0.6, 6, 16, 1, true]} />
        <meshBasicMaterial color="#f0a04b" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position-y={0.03} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.6, 0.78, 32]} />
        <meshBasicMaterial color="#f0a04b" transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** A faint arrow on the ground at your feet, pointing to the next thing to do. */
function FootArrow() {
  const done = useGame((s) => s.done);
  const skipped = useGame((s) => s.skipped);
  const panel = useGame((s) => s.panel);
  const seated = useGame((s) => s.seatedAt);
  const step = nextStep(done, skipped);
  const g = useRef<THREE.Group>(null!);
  const shape = useRef(
    (() => {
      const s = new THREE.Shape();
      s.moveTo(0, 1.25);
      s.lineTo(0.32, 0.8);
      s.lineTo(0.12, 0.8);
      s.lineTo(0.12, 0.45);
      s.lineTo(-0.12, 0.45);
      s.lineTo(-0.12, 0.8);
      s.lineTo(-0.32, 0.8);
      s.closePath();
      return new THREE.ShapeGeometry(s);
    })(),
  );
  useFrame(() => {
    if (!step || !g.current) return;
    const tg = stepTarget(step.id);
    const d = Math.hypot(tg.x - player.x, tg.z - player.z);
    g.current.visible = d > 4;
    g.current.position.set(player.x, player.y + 0.04, player.z);
    g.current.rotation.y = Math.atan2(tg.x - player.x, tg.z - player.z);
  });
  if (!step || panel || seated) return null;
  return (
    <group ref={g}>
      {/* the shape is drawn pointing +y; laid flat it points +z, then turned towards the target */}
      <mesh geometry={shape.current} rotation-x={Math.PI / 2}>
        <meshBasicMaterial color="#f0a04b" transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function Guide() {
  const phase = useGame((s) => s.phase);
  // Tolu is already there, waiting inside the gate, as you step out and walk in
  if (phase !== "walk" && phase !== "celebrate") return null;
  return (
    <group>
      <Host />
      {phase === "walk" && (
        <>
          <Marker />
          <FootArrow />
        </>
      )}
    </group>
  );
}
