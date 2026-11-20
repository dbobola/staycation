"use client";

import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Avatar, type AvatarHandle } from "../avatar/Avatar";
import type { Outfit } from "../avatar/outfit";
import { AVATARS, PLAYER_AVATARS, type AnimName } from "../data/avatars";
import { CHATTER, FLIRTS, FLIRT_LINES, GUEST_NAMES, HELLOS } from "../data/guests";
import { LITE, Q, TIER } from "../quality";
import { useGame } from "../store";
import { BONFIRE, POOL, SEATS, SWIM_FEET, TABLES, groundY, type Seat } from "./layout";
import { DRINKS, cocktailGeometry } from "./Dinner";
import { player } from "./Player";

// Everyone else at the staycation: swimming (in swimwear, knocking a beach ball about), lounging,
// playing Ayo and Ludo in the courtyard, eating, at the bar, walking about, chatting, and a proper
// 5-a-side on the field (two kits, keepers, goals and a scoreboard). People wave and say hi as you
// walk past.

// ---------------------------------------------------------------------------------------------
// Talking to the people round you (from the "at the table" card)

let everyone: Sim[] = [];
const names: string[] = [];
/** The scene's clock, for timing things asked for from outside a frame. */
let clockNow = 0;

/** The people near you who are sitting down (with their names). */
function nearbySeated(x: number, z: number, r: number) {
  return everyone.filter((s) => s.seat && names[s.i] && Math.hypot(s.x - x, s.z - z) < r);
}

/** The nearest person sitting with you (to gist with), or null. */
export function tableMate(x: number, z: number) {
  const near = nearbySeated(x, z, 3.2).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
  return near.length ? { i: near[0].i, name: names[near[0].i] } : null;
}

/** Someone says something (a bubble over their head). */
export function guestSay(i: number, text: string) {
  const s = everyone[i];
  if (s) s.say = text;
}

/** "Cheers!": everyone sitting round you raises their glass. Returns how many joined in. */
export function cheersAround(x: number, z: number) {
  const lines = ["Cheers! 🥂", "Oya cheers! 🥂", "To us! 🥂", "Up! 🥂", "Odogwu! 🥂"];
  const near = nearbySeated(x, z, 3.5);
  near.forEach((s, k) => {
    s.cheersUntil = clockNow + 1.8;
    s.say = lines[k % lines.length];
  });
  return near.length;
}

/** Seats people are sitting in (the player can't take these). */
export const takenSeats = new Set<string>();
/** Where every guest is (for the player to keep a polite distance). */
export const guestSpots: { x: number; z: number }[] = [];

type Role = "walk" | "swim" | "seat" | "chat" | "volley" | "swimchat" | "dance";

type Sim = {
  i: number;
  role: Role;
  x: number;
  z: number;
  y: number;
  heading: number;
  anim: AnimName;
  rate: number;
  outfit?: Outfit;
  path?: [number, number][];
  leg?: number;
  wait?: number;
  speed?: number;
  tx?: number;
  tz?: number;
  seat?: Seat;
  faceX?: number;
  faceZ?: number;
  next?: number;
  team?: 0 | 1;
  keeper?: boolean;
  home?: [number, number];
  hiUntil?: number;
  hiCool?: number;
  /** One of the three who flirt with you (if you're a lady). */
  flirt?: boolean;
  flirtCool?: number;
  /** Walking over to you (their own routine waits). */
  approach?: boolean;
  /** A cocktail in their right hand (its colour). */
  drink?: string;
  /** Raising their glass ("Cheers!") until this time. */
  cheersUntil?: number;
  /** Pool volleyball: which side of the net, and hitting the ball until this time. */
  side?: -1 | 1;
  hitUntil?: number;
  /** A diner: how far they've turned to talk to the person beside them. */
  look?: number;
  /** Something to say right now (from the table talk), shown as a bubble. */
  say?: string;
};

const PATHS: [number, number][][] = [
  [[-10, -8], [13.5, -8], [13.5, -20], [-4, -21.8], [-16, -18], [-16, -9]],
  [[-10.5, -5.1], [9.8, -5.1], [9.8, 4.75], [-10.5, 4.75]],
  [[-30, -27], [26, -27.6], [38, -28.2], [30, -27.2], [-12, -27.4]],
  [[-16, -12.6], [-44, -12.8], [-49, -12.8], [-44, -12.6], [-20, -12]],
  [[14, -9.6], [32, -10], [36, 0], [16, 6.2], [15.8, -4]],
];

const SWIM_COLORS = ["#e0457b", "#1f8fe0", "#f0a04b", "#7a3fd1", "#e23d3d", "#14a38b", "#f2d21f"];
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function takeSeat(ids: string[]) {
  const s = SEATS.find((x) => ids.includes(x.id) && !takenSeats.has(x.id));
  if (s) takenSeats.add(s.id);
  return s;
}
function freeSeat(r: () => number, kinds: Seat["kind"][]) {
  const free = SEATS.filter((s) => kinds.includes(s.kind) && !takenSeats.has(s.id));
  if (!free.length) return undefined;
  const s = free[Math.floor(r() * free.length)];
  takenSeats.add(s.id);
  return s;
}

type Plan = { role: Role; seat?: string[]; byId?: boolean; swimwear?: boolean; drink?: boolean };

/** Who's doing what (fewer people on phones). */
function cast(): Plan[] {
  const p: Plan[] = [];
  const add = (k: number, plan: Plan) => {
    for (let i = 0; i < k; i++) p.push(plan);
  };
  // this device's share of the party (at least one of each)
  const n = (full: number) => Math.max(1, Math.round(full * Q.guests));
  add(n(6), { role: "volley" });
  add(n(2), { role: "swimchat" });
  add(n(2), { role: "swim" });
  // round the bonfire: some on the logs, some up and dancing
  add(n(8), { role: "seat", seat: ["bonfire-0-0", "bonfire-0-1", "bonfire-1-0", "bonfire-1-1", "bonfire-2-0", "bonfire-2-1", "bonfire-3-0", "bonfire-3-1"], byId: true, drink: true });
  add(n(4), { role: "dance" });
  add(n(3), { role: "seat", seat: ["lounger"], swimwear: true });
  add(2, { role: "seat", seat: ["yard-a-0", "yard-a-2"], byId: true }); // Ayo
  add(n(3), { role: "seat", seat: ["yard-b-0", "yard-b-1", "yard-b-2", "yard-b-3"], byId: true }); // Ludo
  add(n(4), { role: "seat", seat: ["dining"] });
  add(n(2), { role: "seat", seat: ["bar"] });
  add(n(2), { role: "seat", seat: ["movie", "grill"] });
  add(n(5), { role: "walk" });
  add(n(4), { role: "chat", drink: true });
  // the poolside dinner: the long table filled from the west end (the seats by the buffet stay free
  // for you); on phones, a smaller party spread down the table
  const dinner = SEATS.filter((x) => x.kind === "dinner").map((x) => x.id);
  // spread down the table (as many as this device can take)
  const step = dinner.length / Q.diners;
  const diners = TIER === "high" ? dinner.slice(0, Q.diners) : Array.from({ length: Q.diners }, (_, k) => dinner[Math.floor(k * step)]);
  for (const id of diners) p.push({ role: "seat", seat: [id], byId: true, drink: true });
  return p;
}

function makeSims(): Sim[] {
  const r = rand(4242);
  takenSeats.clear();
  const sims: Sim[] = [];
  let pathN = 0;
  let chatN = 0;
  let volleyN = 0;
  let swimChatN = 0;
  let danceN = 0;
  const chatSpots: [number, number, number, number][] = [
    [-15, -16, -14, -16.4],
    [20, -29, 21, -28.6],
    [9, 6.3, 10, 6.4],
    [26, -27, 26.8, -27.6],
  ];
  const walker = (s: Sim) => {
    s.role = "walk";
    s.path = PATHS[pathN++ % PATHS.length];
    s.leg = Math.floor(r() * s.path.length);
    const [ax, az] = s.path[s.leg];
    const [bx, bz] = s.path[(s.leg + 1) % s.path.length];
    const t = r();
    s.x = ax + (bx - ax) * t;
    s.z = az + (bz - az) * t;
    s.speed = 1.05 + r() * 0.35;
    s.wait = 0;
  };
  cast().forEach((plan, i) => {
    const s: Sim = { i, role: plan.role, x: 0, z: 0, y: 0, heading: 0, anim: "idle", rate: 1, hiCool: 0, drink: plan.drink ? DRINKS[i % DRINKS.length] : undefined };
    if (plan.role === "walk") walker(s);
    else if (plan.role === "swim") {
      s.x = POOL.x0 + 1 + r() * (POOL.x1 - POOL.x0 - 2);
      s.z = POOL.z0 + 1 + r() * (POOL.z1 - POOL.z0 - 2);
      s.tx = s.x;
      s.tz = s.z;
      s.outfit = { kind: "swim", sex: "f", color: SWIM_COLORS[i % SWIM_COLORS.length] };
    } else if (plan.role === "volley") {
      // three a side across the net (the middle of the pool), facing it
      const k = volleyN++;
      s.side = k % 2 === 0 ? -1 : 1;
      const slot = Math.floor(k / 2);
      s.x = s.side * (1.9 + slot * 2.1);
      s.z = [-1.6, 1.8, 0][slot % 3];
      s.heading = s.side < 0 ? Math.PI / 2 : -Math.PI / 2;
      s.outfit = { kind: "swim", sex: "f", color: SWIM_COLORS[i % SWIM_COLORS.length] };
    } else if (plan.role === "swimchat") {
      // a pair chatting in the shallow end
      const me = swimChatN++ % 2 === 0;
      s.x = me ? 7.6 : 8.4;
      s.z = me ? -2.7 : -2.0;
      s.faceX = me ? 8.4 : 7.6;
      s.faceZ = me ? -2.0 : -2.7;
      s.next = 1 + r() * 4;
      s.outfit = { kind: "swim", sex: "f", color: SWIM_COLORS[(i + 2) % SWIM_COLORS.length] };
    } else if (plan.role === "dance") {
      // up and dancing round the fire, facing it
      const k = danceN++;
      const a = (k / 4) * Math.PI * 2;
      s.x = BONFIRE.x + Math.sin(a) * 2.3;
      s.z = BONFIRE.z + Math.cos(a) * 2.3;
      s.heading = a + Math.PI;
      s.next = r() * 2;
    } else if (plan.role === "seat") {
      s.seat = plan.byId ? takeSeat(plan.seat!) : freeSeat(r, plan.seat as Seat["kind"][]);
      if (!s.seat) walker(s);
      else {
        s.x = s.seat.x;
        s.z = s.seat.z;
        s.heading = s.seat.facing;
        if (plan.swimwear) s.outfit = { kind: "swim", sex: "f", color: SWIM_COLORS[(i + 3) % SWIM_COLORS.length] };
      }
    } else if (plan.role === "chat") {
      const c = chatSpots[Math.floor(chatN / 2) % chatSpots.length];
      const me = chatN % 2 === 0;
      s.x = me ? c[0] : c[2];
      s.z = me ? c[1] : c[3];
      s.faceX = me ? c[2] : c[0];
      s.faceZ = me ? c[3] : c[1];
      s.next = 2 + r() * 6;
      chatN++;
    }
    sims.push(s);
  });
  guestSpots.length = 0;
  for (const s of sims) guestSpots.push({ x: s.x, z: s.z });
  return sims;
}

// Night-out outfits: bold dresses for the ladies (some in Ankara prints), sharp shirts for the guys.
const DRESSES = ["#c3122f", "#0f6e4f", "#d4a017", "#1d3fa6", "#d6247c", "#f4efe6", "#111111", "#7b2fbf", "#e8642a"];
const PRINTS = ["#f2c21b", "#111111", "#ffffff", "#e8642a", "#1aa3b8"];
const SHIRTS = ["#f4f4f0", "#111214", "#2a4f8f", "#7d1a2a", "#e3d3b5", "#0f6e4f", "#d9a441"];
const TROUSERS = ["#1c1d22", "#c9b48a", "#f1ede4", "#2b3a4f"];
function partyOutfit(sex: "f" | "m", i: number): Outfit {
  const print = i % 3 === 0 ? PRINTS[i % PRINTS.length] : undefined;
  return sex === "f"
    ? { kind: "party", sex, main: DRESSES[i % DRESSES.length], print, shoes: i % 2 ? "#c9a227" : "#111111" }
    : { kind: "party", sex, main: SHIRTS[i % SHIRTS.length], print, bottom: TROUSERS[i % TROUSERS.length] };
}

/** The volleyball in the pool. */
const volley = { from: -1, to: -1, t: 1, x: 0, y: 0, z: 0, sx: 0, sy: 0, sz: 0 };

const turn = (a: number, b: number, k: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

function moveTo(s: Sim, tx: number, tz: number, speed: number, dt: number) {
  const dx = tx - s.x, dz = tz - s.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) return 0;
  const v = Math.min(d, speed * dt);
  s.x += (dx / d) * v;
  s.z += (dz / d) * v;
  s.heading = turn(s.heading, Math.atan2(dx, dz), Math.min(1, dt * 7));
  return d;
}

function step(s: Sim, dt: number, t: number, sims: Sim[]) {
  const r = Math.random;
  if (s.approach) return;
  if (s.role === "walk" && s.path) {
    if ((s.wait ?? 0) > 0) {
      s.wait! -= dt;
      s.anim = "idle";
      return;
    }
    const [tx, tz] = s.path[(s.leg! + 1) % s.path.length];
    const d = moveTo(s, tx, tz, s.speed!, dt);
    if (d < 0.3) {
      s.leg = (s.leg! + 1) % s.path.length;
      if (r() < 0.35) s.wait = 2 + r() * 5;
    }
    s.anim = "walk";
    s.rate = s.speed! / 1.25;
  } else if (s.role === "swim") {
    if (Math.hypot(s.tx! - s.x, s.tz! - s.z) < 0.3) {
      if ((s.wait ?? 0) > 0) {
        s.wait! -= dt;
        s.anim = "idle";
        s.rate = 0.8;
        // watch the volleyball
        s.heading = turn(s.heading, Math.atan2(volley.x - s.x, volley.z - s.z), Math.min(1, dt * 3));
        return;
      }
      s.tx = POOL.x0 + 0.8 + r() * (POOL.x1 - POOL.x0 - 1.6);
      s.tz = POOL.z0 + 0.8 + r() * (POOL.z1 - POOL.z0 - 1.6);
      s.wait = r() < 0.6 ? 3 + r() * 6 : 0;
      return;
    }
    moveTo(s, s.tx!, s.tz!, 0.6, dt);
    s.anim = "walk";
    s.rate = 0.5;
  } else if (s.role === "seat") {
    s.anim = "sit";
    if (s.seat?.kind === "dinner") {
      // at the dinner: turn to the person on one side, then the other, then back to the table;
      // now and then raise a glass
      s.next = (s.next ?? r() * 4) - dt;
      if (s.next < 0) {
        s.look = [0, 0.55, -0.55, 0.35, -0.35][Math.floor(r() * 5)];
        s.next = 2.5 + r() * 4;
        if (r() < 0.25) s.cheersUntil = t + 1.6;
      }
      s.heading = turn(s.heading, s.seat.facing + (s.look ?? 0), Math.min(1, dt * 2.5));
    }
  } else if (s.role === "volley") {
    // between hits, bobbing and watching the ball; a hand up to hit it
    s.anim = t < (s.hitUntil ?? 0) ? "wave" : "idle";
    s.rate = t < (s.hitUntil ?? 0) ? 1.6 : 0.8;
    s.heading = turn(s.heading, Math.atan2(volley.x - s.x, volley.z - s.z), Math.min(1, dt * 3));
  } else if (s.role === "swimchat" || s.role === "dance") {
    if (s.role === "swimchat") s.heading = turn(s.heading, Math.atan2(s.faceX! - s.x, s.faceZ! - s.z), Math.min(1, dt * 4));
    s.next! -= dt;
    if (s.next! < 0) {
      // the dancers keep going (clapping, hands up); the chatters gesture now and then
      if (s.role === "dance") s.anim = s.anim === "clap" ? "wave" : "clap";
      else s.anim = s.anim === "idle" ? (r() < 0.5 ? "wave" : "clap") : "idle";
      s.next = s.role === "dance" ? 1.6 + r() * 1.4 : s.anim === "idle" ? 2 + r() * 4 : 2;
    }
    s.rate = s.role === "dance" ? 1.25 : 1;
  } else if (s.role === "chat") {
    s.heading = turn(s.heading, Math.atan2(s.faceX! - s.x, s.faceZ! - s.z), Math.min(1, dt * 4));
    s.next! -= dt;
    if (s.next! < 0) {
      s.anim = s.anim === "idle" ? (r() < 0.5 ? "wave" : "clap") : "idle";
      s.next = s.anim === "idle" ? 3 + r() * 6 : 2.2;
    }
  }
  void sims;
}

/** A speech bubble over someone's head. */
export function Bubble({ text, y = 2.45 }: { text: string; y?: number }) {
  return (
    <Billboard position-y={y}>
      <mesh position-z={-0.01}>
        <planeGeometry args={[Math.max(0.7, text.length * 0.1 + 0.3), 0.34]} />
        <meshBasicMaterial color="#fff6e8" transparent opacity={0.96} depthWrite={false} />
      </mesh>
      <Text fontSize={0.17} color="#10282d" anchorX="center" anchorY="middle" fontWeight={800}>
        {text}
      </Text>
    </Billboard>
  );
}

function Guest({ sim, name, avatarId, tags, sims }: { sim: Sim; name: string; avatarId: string; tags: boolean; sims: Sim[] }) {
  const g = useRef<THREE.Group>(null!);
  const av = useRef<AvatarHandle>(null);
  const tag = useRef<THREE.Group>(null!);
  const [hello, setHello] = useState<string | null>(null);
  names[sim.i] = name;
  useFrame(({ camera, clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    const t = clock.elapsedTime;
    clockNow = t;
    step(sim, dt, t, sims);
    // something to say from the table talk
    if (sim.say) {
      setHello(sim.say);
      sim.hiUntil = t + 3.4;
      sim.hiCool = 15;
      sim.say = undefined;
    }
    // Bobo, Herjyy and Khay: if you're a lady, they come over and flirt
    const gs = useGame.getState();
    if (sim.flirt && !(gs.phase === "walk" && gs.sex === "f" && !gs.panel)) sim.approach = false;
    if (sim.flirt && gs.phase === "walk" && gs.sex === "f" && !gs.panel) {
      const pd = Math.hypot(player.x - sim.x, player.z - sim.z);
      sim.flirtCool = Math.max(0, (sim.flirtCool ?? 0) - dt);
      sim.approach = false;
      if (pd < 9 && sim.flirtCool === 0 && !sim.hiUntil) {
        if (pd > 1.7) {
          sim.approach = true;
          moveTo(sim, player.x, player.z, 1.6, dt);
          sim.anim = "walk";
          sim.rate = 1.2;
        } else {
          sim.hiUntil = t + 3.6;
          sim.flirtCool = 40 + Math.random() * 20;
          sim.hiCool = 20;
          setHello(FLIRT_LINES[Math.floor(Math.random() * FLIRT_LINES.length)]);
        }
      }
    }
    // saying hi: now and then someone near you turns, waves and says hello
    // diners talk among themselves (only when you're close enough to see it)
    if (sim.seat?.kind === "dinner" && gs.phase === "walk" && !sim.hiUntil && Math.random() < dt * 0.04 && Math.hypot(player.x - sim.x, player.z - sim.z) < 14) {
      sim.hiUntil = t + 3;
      sim.hiCool = 20;
      setHello(CHATTER[Math.floor(Math.random() * CHATTER.length)]);
    }
    if (sim.role !== "volley" && gs.phase === "walk") {
      const pd = Math.hypot(player.x - sim.x, player.z - sim.z);
      sim.hiCool = Math.max(0, (sim.hiCool ?? 0) - dt);
      if (pd < 4.5 && sim.seat?.kind !== "dinner" && !sim.hiUntil && sim.hiCool === 0 && !(sim.flirt && gs.sex === "f") && Math.random() < dt * 0.7) {
        sim.hiUntil = t + 2.8;
        sim.hiCool = 25 + Math.random() * 20;
        setHello(HELLOS[Math.floor(Math.random() * HELLOS.length)]);
      }
      if (sim.hiUntil) {
        if (t > sim.hiUntil) {
          sim.hiUntil = 0;
          setHello(null);
        } else {
          // (people sitting down stay in their seats: they just call out)
          if (sim.role !== "seat") sim.heading = turn(sim.heading, Math.atan2(player.x - sim.x, player.z - sim.z), Math.min(1, dt * 6));
          if (sim.role === "walk" || sim.role === "chat") sim.anim = "wave";
        }
      }
    }
    const swim = sim.role === "swim" || sim.role === "volley" || sim.role === "swimchat";
    const y = sim.seat ? sim.seat.y + (sim.seat.kind === "bar" ? 0.32 : 0) : swim ? SWIM_FEET : groundY(sim.x, sim.z);
    sim.y += (y - sim.y) * Math.min(1, dt * 8);
    g.current.position.set(sim.x, sim.y, sim.z);
    g.current.rotation.y = sim.heading;
    guestSpots[sim.i] = { x: sim.x, z: sim.z };
    const cd = camera.position.distanceTo(g.current.position);
    g.current.visible = cd < Q.animateWithin * 2.2;
    av.current?.setActive(cd < Q.animateWithin);
    av.current?.play(sim.anim);
    av.current?.setRate(sim.rate);
    if (tag.current) tag.current.visible = cd < 16;
  });
  const tagColor = "#0e3c45";
  return (
    <group ref={g}>
      <Suspense fallback={null}>
        <Avatar ref={av} avatarId={avatarId} anim={sim.anim} offset={(sim.i * 0.37) % 1} shadows={!LITE} outfit={sim.outfit} />
      </Suspense>
      {sim.drink && <Drink sim={sim} av={av} color={sim.drink} />}
      {tags && name && (
        <group ref={tag}>
          <Billboard position-y={sim.seat ? 1.65 : 2.05}>
            <mesh position-z={-0.01}>
              <planeGeometry args={[Math.max(0.5, name.length * 0.085 + 0.25), 0.24]} />
              <meshBasicMaterial color={tagColor} transparent opacity={0.82} depthWrite={false} />
            </mesh>
            <Text fontSize={0.14} color="#ffffff" anchorX="center" anchorY="middle" fontWeight={700}>
              {name}
            </Text>
          </Billboard>
        </group>
      )}
      {hello && (
        <Suspense fallback={null}>
          <Bubble text={hello} y={sim.seat ? 2.05 : 2.45} />
        </Suspense>
      )}
    </group>
  );
}

const glasses = new Map<string, THREE.BufferGeometry>();
const glassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.1 });
const _w = new THREE.Vector3();

/** A cocktail held in someone's right hand (kept upright, following the hand). */
function Drink({ sim, av, color }: { sim: Sim; av: React.RefObject<AvatarHandle | null>; color: string }) {
  const m = useRef<THREE.Mesh>(null!);
  const hand = useRef<THREE.Object3D | null>(null);
  const geo = useMemo(() => {
    if (!glasses.has(color)) glasses.set(color, cocktailGeometry(color));
    return glasses.get(color)!;
  }, [color]);
  useFrame(({ clock }) => {
    if (!hand.current) hand.current = av.current?.root.getObjectByName("Bip01_R_Hand") ?? null;
    const h = hand.current;
    if (!h || !m.current.parent) {
      if (m.current) m.current.visible = false;
      return;
    }
    h.getWorldPosition(_w);
    m.current.parent.worldToLocal(_w);
    // the glass's stem sits in the hand
    m.current.position.set(_w.x, _w.y - 0.07, _w.z);
    // "Cheers!": the glass goes up for a moment
    const left = (sim.cheersUntil ?? 0) - clock.elapsedTime;
    if (left > 0) m.current.position.y += 0.32 * Math.sin(Math.min(1, left / 1.6) * Math.PI);
    m.current.visible = !(sim.role === "swim");
  });
  return <mesh ref={m} geometry={geo} material={glassMat} visible={false} />;
}

/** Pool volleyball: a net across the middle of the pool, the ball going back and forth over it. */
function PoolVolleyball({ sims }: { sims: Sim[] }) {
  const m = useRef<THREE.Mesh>(null!);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d")!;
    ["#e23d3d", "#ffffff", "#1f8fe0", "#ffffff", "#f2d21f", "#ffffff"].forEach((col, i) => {
      g.fillStyle = col;
      g.fillRect((i * 256) / 6, 0, 256 / 6 + 1, 64);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const netTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3;
    g.strokeRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(30, 2.5);
    return t;
  }, []);
  const players = useMemo(() => sims.filter((s) => s.role === "volley"), [sims]);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    const t = clock.elapsedTime;
    if (players.length < 2) return;
    volley.t += dt / 1.35;
    if (volley.t >= 1) {
      // it's reached someone: they knock it back over the net to someone on the other side
      const from = volley.to < 0 ? players[0] : sims[volley.to];
      from.hitUntil = t + 0.7;
      const others = players.filter((p) => p.side !== from.side);
      const to = others[Math.floor(Math.random() * others.length)];
      volley.from = from.i;
      volley.to = to.i;
      Object.assign(volley, { sx: from.x, sy: SWIM_FEET + 1.9, sz: from.z, t: 0 });
    }
    const b = sims[volley.to];
    const e = volley.t;
    volley.x = THREE.MathUtils.lerp(volley.sx, b.x, e);
    volley.z = THREE.MathUtils.lerp(volley.sz, b.z, e);
    volley.y = volley.sy + Math.sin(e * Math.PI) * 2.4;
    m.current.position.set(volley.x, volley.y, volley.z);
    m.current.rotation.x += dt * 4;
    m.current.rotation.y += dt * 3;
  });
  if (players.length < 2) return null;
  return (
    <group>
      <mesh ref={m}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial map={tex} roughness={0.35} />
      </mesh>
      {/* the net across the pool, on two posts on the coping */}
      {[POOL.z0 - 0.25, POOL.z1 + 0.25].map((z) => (
        <mesh key={z} position={[0, 0.8, z]}>
          <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
          <meshStandardMaterial color="#e9e9e9" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 1.18, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[POOL.z1 - POOL.z0 + 0.5, 0.6]} />
        <meshBasicMaterial map={netTex} transparent alphaTest={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.03, 0.05, POOL.z1 - POOL.z0 + 0.5]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/** Ayo and Ludo on the courtyard tables, with pieces that move as people play. */
function BoardGames() {
  const ayoT = TABLES.find((t) => Math.hypot(t.x + 30, t.z + 18.5) < 0.1)!;
  const ludoT = TABLES.find((t) => Math.hypot(t.x + 25.5, t.z + 20.8) < 0.1)!;
  const seed = useRef<THREE.Mesh>(null!);
  const die = useRef<THREE.Mesh>(null!);
  const ludoTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fafafa";
    g.fillRect(0, 0, 256, 256);
    const q = [["#e23d3d", 0, 0], ["#1fae4e", 152, 0], ["#1f6fe0", 152, 152], ["#f2c21b", 0, 152]] as const;
    for (const [col, x, y] of q) {
      g.fillStyle = col;
      g.fillRect(x, y, 104, 104);
      g.fillStyle = "#fff";
      g.fillRect(x + 20, y + 20, 64, 64);
    }
    g.strokeStyle = "#bbb";
    for (let i = 0; i <= 6; i++) {
      g.strokeRect(104, i * 16, 48, 16);
      g.strokeRect(i * 16, 104, 16, 48);
      g.strokeRect(104, 152 + i * 16, 48, 16);
      g.strokeRect(152 + i * 16, 104, 16, 48);
    }
    g.fillStyle = "#444";
    g.beginPath();
    g.moveTo(104, 104);
    g.lineTo(152, 104);
    g.lineTo(128, 128);
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const pits = useMemo(() => Array.from({ length: 12 }, (_, i) => [-0.25 + (i % 6) * 0.1, i < 6 ? -0.05 : 0.05] as const), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // a seed hopping pit to pit round the Ayo board
    const k = Math.floor(t * 1.6) % 12;
    const f = (t * 1.6) % 1;
    const a = pits[k], b = pits[(k + 1) % 12];
    seed.current.position.set(ayoT.x + THREE.MathUtils.lerp(a[0], b[0], f), 0.84 + Math.sin(f * Math.PI) * 0.06, ayoT.z + THREE.MathUtils.lerp(a[1], b[1], f));
    // the Ludo die, rolled every few seconds
    const roll = t % 4;
    die.current.position.set(ludoT.x + 0.12, 0.8 + (roll < 0.6 ? Math.sin((roll / 0.6) * Math.PI) * 0.15 : 0), ludoT.z - 0.1);
    if (roll < 0.6) die.current.rotation.set(t * 9, t * 7, 0);
  });
  return (
    <group>
      <mesh position={[ayoT.x, 0.79, ayoT.z]}>
        <boxGeometry args={[0.66, 0.06, 0.22]} />
        <meshStandardMaterial color="#7a4a26" roughness={0.6} />
      </mesh>
      {pits.map(([x, z], i) => (
        <mesh key={i} position={[ayoT.x + x, 0.821, ayoT.z + z]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.038, 12]} />
          <meshStandardMaterial color="#3d220f" />
        </mesh>
      ))}
      <mesh ref={seed}>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshStandardMaterial color="#c9b48a" />
      </mesh>
      <mesh position={[ludoT.x, 0.765, ludoT.z]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial map={ludoTex} />
      </mesh>
      {["#e23d3d", "#1fae4e", "#1f6fe0", "#f2c21b"].map((c, i) => (
        <mesh key={c} position={[ludoT.x + (i % 2 ? 0.08 : -0.12), 0.79, ludoT.z + (i < 2 ? -0.08 : 0.12)]}>
          <coneGeometry args={[0.02, 0.05, 8]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      <mesh ref={die}>
        <boxGeometry args={[0.04, 0.04, 0.04]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export function Guests() {
  const sims = useMemo(() => makeSims(), []);
  everyone = sims;
  const guestName = useGame((s) => s.guestName);
  const myFirst = useGame((s) => s.me?.first ?? "");
  const people = useMemo(() => {
    const mine = new Set<string>(Object.values(PLAYER_AVATARS));
    const pool = AVATARS.slice(0, Q.models).filter((a) => !mine.has(a.id));
    const fem = pool.filter((a) => a.sex === "f");
    const mal = pool.filter((a) => a.sex === "m");
    // your own name is never on someone else in the crowd
    const yours = [guestName, myFirst].map((n) => n.trim().toLowerCase()).filter(Boolean);
    const isYours = (n: string) => yours.some((y) => n.toLowerCase() === y || n.toLowerCase().split(" ")[0] === y.split(" ")[0]);
    const left = {
      f: GUEST_NAMES.filter((n) => n.sex === "f" && !isYours(n.name)).map((n) => n.name),
      m: GUEST_NAMES.filter((n) => n.sex === "m" && !isYours(n.name) && !FLIRTS.includes(n.name)).map((n) => n.name),
    };
    const flirts = FLIRTS.filter((n) => !isYours(n));
    const used = { f: 0, m: 0 };
    return sims.map((s, i) => {
      // Bobo, Herjyy and Khay walk about (so they can come over)
      if ((s.role === "walk" || s.role === "chat") && flirts.length) {
        const name = flirts.shift()!;
        s.flirt = true;
        if (!s.outfit) s.outfit = partyOutfit("m", i);
        return { name, avatarId: mal[i % mal.length].id };
      }
      let want: "f" | "m" = s.outfit?.kind === "swim" ? (i % 4 === 3 ? "m" : "f") : left.f.length - used.f >= left.m.length - used.m ? "f" : "m";
      if (used[want] >= left[want].length) want = want === "f" ? "m" : "f";
      const name = left[want][used[want]++] ?? "";
      const set = want === "f" ? fem : mal;
      const a = set[used[want] % set.length] ?? pool[i % pool.length];
      if (s.outfit?.kind === "swim") s.outfit = { ...s.outfit, sex: want };
      // everyone else dressed for the night out
      if (!s.outfit) s.outfit = partyOutfit(want, i);
      return { name, avatarId: a.id };
    });
    // (avatars and outfits stay put; only a name that's now yours is swapped for a spare one)
  }, [sims, guestName, myFirst]);
  return (
    <group>
      {sims.map((s, i) => (
        <Guest key={i} sim={s} sims={sims} {...people[i]} tags={Q.tags && (TIER === "high" || i % 2 === 0)} />
      ))}
      <PoolVolleyball sims={sims} />
      <BoardGames />
    </group>
  );
}
