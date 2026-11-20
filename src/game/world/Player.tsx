"use client";

import { Billboard, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Avatar, type AvatarHandle } from "../avatar/Avatar";
import type { Outfit } from "../avatar/outfit";
import { type AnimName } from "../data/avatars";
import { axes, bindKeyboard, input, onAction } from "../input";
import { LITE } from "../quality";
import { avatarFor, useGame } from "../store";
import { greetSeated, guestSpots, takenSeats } from "./Guests";
import { DROP_OFF, WALK_IN_TO, arrival } from "./Arrival";
import { findPath, free } from "./nav";
import { trailerRect, updateTrailerRect } from "./Trailer";
import { approachFor } from "./Guide";
import {
  AERIAL_CENTRE,
  FILM_BOARD,
  BARRICADES,
  ATTENDANTS,
  BLOCKS,
  POOL,
  SCREEN,
  ROAD,
  SEATS,
  SPAWN,
  STREET,
  YEARBOOK,
  TERRACE_Y,
  SPOTS,
  groundY,
  inRect,
  type Seat,
  type SpotId,
} from "./layout";

// You: walking the resort (WASD / arrows / the on-screen pad), sitting on any free seat (E),
// wading into the pool, and opening whatever spot you're standing at. Plus the camera, which flies
// in over Ibadan, circles the resort from the air, then follows you (drag to look around, scroll
// or pinch to zoom).

export const player = { x: SPAWN.x, z: SPAWN.z, y: 1.5, heading: SPAWN.heading, speed: 0, moving: false };


function nearestSeat(x: number, z: number): [Seat | null, number] {
  let best: Seat | null = null;
  let bd = 1e9;
  for (const s of SEATS) {
    if (takenSeats.has(s.id)) continue;
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return [best, bd];
}

function nearestSpot(x: number, z: number): [SpotId | null, number, string] {
  let best: SpotId | null = null;
  let bd = 1e9;
  let label = "";
  // the staff first: walk up to one and E talks to them
  for (const a of ATTENDANTS) {
    const d = Math.hypot(a.x - x, a.z - z);
    if (d < 2.6 && d < bd) {
      bd = d;
      best = a.spot;
      label = `Talk to ${a.name} (${a.role})`;
    }
  }
  if (best) return [best, bd, label];
  for (const s of SPOTS) {
    if (!s.r) continue;
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < s.r && d < bd) {
      bd = d;
      best = s.id;
      label = s.label;
    }
  }
  return [best, bd, label];
}

// Simple, elegant outfits for you: plain colours, one picked at random each time you arrive.
const GOWNS = ["#111111", "#f4efe6", "#7b1e2b", "#1d3fa6", "#0f6e4f", "#c9a27a", "#b9a3d6", "#c3122f"];
const HEELS = ["#111111", "#c9a227", "#d8b9a0"];
const SHIRTS = ["#f6f6f2", "#111214", "#1f2f55", "#a9c6e8", "#5a6342", "#6d1f2c", "#e8dcc4"];
const TROUSERS = ["#111214", "#c9b48a", "#2b3a4f", "#5c5f66"];
function elegant(sex: "f" | "m", look: number): Outfit {
  return sex === "f"
    ? { kind: "party", sex, main: GOWNS[look % GOWNS.length], shoes: HEELS[Math.floor(look / 7) % HEELS.length] }
    : { kind: "party", sex, main: SHIRTS[look % SHIRTS.length], bottom: TROUSERS[Math.floor(look / 7) % TROUSERS.length], shoes: "#2a1c14" };
}

/**
 * Walking you somewhere by yourself (after you tap "Go", "Check in now", …): the way there, the
 * spot whose panel opens on arrival, and whom to face. Any key or the pad takes back control.
 */
export const autopilot: { path: [number, number][]; spot: SpotId | null; face: { x: number; z: number } | null; stuck: number; last: number } = {
  path: [],
  spot: null,
  face: null,
  stuck: 0,
  last: 0,
};

/** Walk to a spot and open it there (or just open it if you're already close / there's no way). */
export function walkTo(spot: SpotId) {
  const st = useGame.getState();
  const a = approachFor(spot);
  if (st.phase !== "walk" || !a) {
    st.set({ panel: spot });
    return;
  }
  const d = Math.hypot(a.x - player.x, a.z - player.z);
  if (d < 2.2) {
    st.set({ panel: spot === "pool" ? null : spot });
    return;
  }
  const path = findPath(player.x, player.z, a.x, a.z);
  if (!path) {
    st.set({ panel: spot === "pool" ? null : spot });
    return;
  }
  Object.assign(autopilot, { path, spot, face: a.face, stuck: 0, last: d });
  st.set({ seatedAt: null, panel: null });
  st.say(a.who ? `Walking you over to ${a.who}…` : "On your way…");
}

/** Your walking speed (m/s): brisk, twice a stroll. Running is 9. */
const WALK = 6.2;

/** The respawn last carried out (a remount of the scene doesn't put you back at the gate). */
let appliedRespawn = -1;

const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const KEY = touch ? "Tap" : "Press E";

export function Player() {
  const phase = useGame((s) => s.phase);
  const sex = useGame((s) => s.sex);
  const me = useGame((s) => s.me);
  const guestName = useGame((s) => s.guestName);
  const respawn = useGame((s) => s.respawn);
  const swimming = useGame((s) => s.swimming);
  const look = useGame((s) => s.look);
  const g = useRef<THREE.Group>(null!);
  const av = useRef<AvatarHandle>(null);
  const seat = useRef<Seat | null>(null);
  const anim = useRef<AnimName>("idle");
  const target = useRef<{ seat: Seat | null; spot: SpotId | null }>({ seat: null, spot: null });
  const lastPrompt = useRef("");

  useEffect(() => bindKeyboard(), []);
  useEffect(() => {
    if (respawn === appliedRespawn) return;
    appliedRespawn = respawn;
    const at = useGame.getState().phase === "celebrate" || arrival.leaving >= 0 ? DROP_OFF : SPAWN;
    Object.assign(player, { x: at.x, z: at.z, y: groundY(at.x, at.z), heading: at.heading });
    seat.current = null;
    useGame.getState().set({ seatedAt: null });
  }, [respawn]);

  // E: stand up, sit down, or open the spot you're at
  useEffect(
    () =>
      onAction(() => {
        const st = useGame.getState();
        if (st.phase !== "walk" || st.panel) return;
        if (seat.current) {
          seat.current = null;
          st.set({ seatedAt: null });
          return;
        }
        const { seat: s, spot } = target.current;
        if (s) {
          seat.current = s;
          Object.assign(player, { x: s.x, z: s.z, heading: s.facing });
          st.set({ seatedAt: s.id });
          cam.off = 0;
          // at a table you join the people there (the "at the table" card has the menu, a toast and gist)
          if (s.kind === "movie") st.set({ panel: "movie" });
          else if (s.kind === "bonfire") st.say("Warm by the bonfire 🔥");
          else if (s.kind !== "lounger") {
            st.say("You've joined them 🙌");
            greetSeated(s.x, s.z, st.sex);
          }
          else st.say("Ahh. Lounging by the pool 🌴");
          return;
        }
        if (spot) st.set({ panel: spot });
      }),
    [],
  );

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const st = useGame.getState();
    const walking = st.phase === "walk";
    // stood up from outside (the aerial view, a respawn)
    if (seat.current && st.seatedAt !== seat.current.id) seat.current = null;
    let want: AnimName = "idle";
    let rate = 1;
    let moving = false;
    if (!walking || st.panel) autopilot.spot = null;
    if (walking && !st.panel && !seat.current) {
      // as in The Feast: left / right turn you (and the camera behind you), up / down walk you
      // forward and back. Turning goes all the way round.
      const { x, y } = axes();
      // touching the controls takes back control from the autopilot
      if ((x || y) && autopilot.spot) autopilot.spot = null;
      if (autopilot.spot && autopilot.path.length) {
        const [tx, tz] = autopilot.path[0];
        const dx = tx - player.x, dz = tz - player.z;
        const d = Math.hypot(dx, dz);
        const last = autopilot.path.length === 1;
        if (d < (last ? 0.35 : 0.3)) autopilot.path.shift();
        else {
          // turn towards the next point, and walk (run if it's a long way)
          let turnBy = Math.atan2(dx, dz) - player.heading;
          while (turnBy > Math.PI) turnBy -= Math.PI * 2;
          while (turnBy < -Math.PI) turnBy += Math.PI * 2;
          player.heading += turnBy * Math.min(1, dt * 8);
          const remaining = autopilot.path.reduce((acc, p, k) => acc + (k === 0 ? d : Math.hypot(p[0] - autopilot.path[k - 1][0], p[1] - autopilot.path[k - 1][1])), 0);
          const runIt = remaining > 14;
          const speed = (inRect(POOL, player.x, player.z) ? 2.2 : runIt ? 9 : WALK) * (Math.abs(turnBy) > 1.2 ? 0.4 : 1);
          const nx = player.x + (dx / d) * Math.min(d, speed * dt), nz = player.z + (dz / d) * Math.min(d, speed * dt);
          // (if you're somewhere tight, e.g. just up from a chair, you can always walk out)
          if (free(nx, nz) || !free(player.x, player.z)) [player.x, player.z] = [nx, nz];
          else if (free(nx, player.z)) player.x = nx;
          else if (free(player.x, nz)) player.z = nz;
          // stuck against something for a while near the end: close enough, open it
          autopilot.stuck = d < autopilot.last - 0.01 ? 0 : autopilot.stuck + dt;
          autopilot.last = d;
          // snagged on something: move on to the next point (at the last one, close enough is there)
          if (autopilot.stuck > 0.6) {
            autopilot.stuck = 0;
            if (last) autopilot.path.length = 0;
            else autopilot.path.shift();
          }
          moving = true;
          want = runIt ? "run" : "walk";
          rate = runIt ? 1.6 : 2;
        }
        if (!autopilot.path.length) {
          // arrived: face them, open their panel
          if (autopilot.face) player.heading = Math.atan2(autopilot.face.x - player.x, autopilot.face.z - player.z);
          const spot = autopilot.spot;
          autopilot.spot = null;
          if (spot && spot !== "pool") st.set({ panel: spot });
        }
      }
      if (x) player.heading -= x * 3.2 * dt;
      moving = !!(x || y);
      if (y) {
        const swim = inRect(POOL, player.x, player.z);
        const speed = (swim ? 2.2 : input.run ? 9 : WALK) * (y < 0 ? 0.55 : 1);
        const nx = player.x + Math.sin(player.heading) * y * speed * dt;
        const nz = player.z + Math.cos(player.heading) * y * speed * dt;
        // slide along walls: try both axes, then each one
        // (if you're somewhere tight, e.g. just up from a chair, you can always walk out)
        if (free(nx, nz) || !free(player.x, player.z)) [player.x, player.z] = [nx, nz];
        else if (free(nx, player.z)) player.x = nx;
        else if (free(player.x, nz)) player.z = nz;
        want = swim ? "walk" : input.run && y > 0 ? "run" : "walk";
        rate = swim ? 0.9 : y < 0 ? -1.6 : input.run ? 1.6 : 2;
      } else if (x) {
        want = "walk";
        rate = 1.2;
      }
    }
    player.moving = moving;
    if (seat.current) want = "sit";
    // being welcomed: you walk in through the gate by yourself
    if (st.phase === "celebrate") {
      const dx = WALK_IN_TO.x - player.x, dz = WALK_IN_TO.z - player.z;
      const d = Math.hypot(dx, dz);
      player.heading = -Math.PI / 2;
      if (d > 0.1) {
        const v = Math.min(d, 1.3 * dt);
        player.x += (dx / d) * v;
        player.z += (dz / d) * v;
        want = "walk";
      }
    }
    const s = seat.current;
    const gy = s ? s.y + (s.kind === "bar" ? 0.32 : 0) : groundY(player.x, player.z);
    player.y += (gy - player.y) * Math.min(1, dt * 10);
    if (g.current) {
      g.current.position.set(player.x, player.y, player.z);
      g.current.rotation.y = player.heading;
    }
    if (want !== anim.current) {
      anim.current = want;
      av.current?.play(want, 0.25);
    }
    av.current?.setRate(rate);

    // the Yearbook is optional: once you're checked in and have walked on past it (further into
    // the resort, or away from it), it's left behind and the next step comes up
    if (walking && st.done.checkin && !st.done.yearbook && !st.skipped.yearbook && (player.x < YEARBOOK.x - 1 || Math.hypot(player.x - YEARBOOK.x, player.z - YEARBOOK.z) > 10)) st.skip("yearbook");

    // the pool
    const swim = inRect(POOL, player.x, player.z);
    if (walking && swim !== st.swimming) {
      st.set({ swimming: swim });
      if (swim) {
        st.say("Splash! 💦 You're in the pool");
        st.markDone("pool");
      }
    }

    // what E would do here
    if (!walking) return;
    let text = "";
    if (seat.current) {
      target.current = { seat: null, spot: null };
      text = `${KEY} to stand up`;
    } else {
      const [ns, sd] = nearestSeat(player.x, player.z);
      const [sp, pd, spLabel] = nearestSpot(player.x, player.z);
      const seatOk = ns && sd < 1.0 && !guestSpots.some((p) => Math.hypot(p.x - ns.x, p.z - ns.z) < 0.3);
      if (seatOk && (!sp || sd < pd)) {
        target.current = { seat: ns, spot: null };
        text = `${KEY} to sit${ns!.kind === "dinner" ? " and join the dinner" : ns!.kind === "bonfire" ? " by the bonfire" : ns!.kind === "dining" || ns!.kind === "bar" || ns!.kind === "courtyard" || ns!.kind === "grill" ? " and join them" : ns!.kind === "movie" ? " for movie night" : ""}`;
      } else if (sp) {
        target.current = { seat: null, spot: sp };
        // done already: no asking again, just a way back in to change it
        text = st.done[sp!] ? `${KEY}: ${spLabel.split(":")[0]} ✓ (change)` : `${KEY}: ${spLabel}`;
      } else target.current = { seat: null, spot: null };
    }
    if (text !== lastPrompt.current) {
      lastPrompt.current = text;
      st.set({ prompt: text ? { text, key: KEY } : null });
    }
  });

  if (phase !== "walk" && phase !== "celebrate") return null;
  const tagName = me?.first || guestName || "You";
  return (
    <group ref={g} position={[player.x, player.y, player.z]}>
      <Suspense fallback={null}>
        <Avatar key={sex} ref={av} avatarId={avatarFor(sex)} shadows={!LITE} outfit={swimming ? { kind: "swim", sex, color: sex === "f" ? "#e0457b" : "#1f8fe0" } : elegant(sex, look)} />
      </Suspense>
      {/* your name, the same size as everyone else's (in orange, so you can find yourself) */}
      <Billboard position-y={2.05}>
        <mesh position-z={-0.01}>
          <planeGeometry args={[Math.max(0.34, tagName.length * 0.058 + 0.16), 0.16]} />
          <meshBasicMaterial color="#f0a04b" transparent opacity={0.92} depthWrite={false} />
        </mesh>
        <Text fontSize={0.095} color="#1b0f08" anchorX="center" anchorY="middle" fontWeight={800}>
          {tagName}
        </Text>
      </Billboard>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

/** The camera's own state (drag / zoom), shared with the movement code. */
/**
 * The camera's own state. Walking, it sits behind you (`off` = 0); dragging swings it round you
 * by `off` (all the way, to see your front), and it eases back behind you once you walk on.
 */
export const cam = { off: 0, pitch: 0.32, dist: 6.5, aerialYaw: 0.55, aerialPitch: 0.9, aerialDist: 95, lastInput: 0, dragging: false };

/** Where the camera looks at each spot from, when its panel is opened from the air. */
function spotView(id: SpotId) {
  const s = SPOTS.find((x) => x.id === id)!;
  const look = new THREE.Vector3(s.x, Math.max(1, s.y - 2.5), s.z);
  // look at it from the south-east, close
  const dir = new THREE.Vector3(0.45, 0.55, 1).normalize();
  const dist = id === "games" ? 30 : id === "movie" ? 18 : 11;
  if (id === "checkin") dir.set(1, 0.5, 0.15).normalize();
  if (id === "menu") dir.set(1, 0.5, 0.2).normalize();
  return { pos: look.clone().add(dir.multiplyScalar(dist)), look };
}

const INTRO_FROM = new THREE.Vector3(170, 110, 190);
const INTRO_LOOK_FROM = new THREE.Vector3(0, 0, -10);
const INTRO_SECONDS = 7.5;

export function CameraRig() {
  const { camera, gl } = useThree();
  const look = useRef(new THREE.Vector3(AERIAL_CENTRE.x, 0, AERIAL_CENTRE.z));
  const introT = useRef(0);

  // drag to look around, scroll / pinch to zoom
  useEffect(() => {
    const el = gl.domElement;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const down = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cam.dragging = true;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const st = useGame.getState();
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        zoom((pinch - d) * 0.01);
        pinch = d;
        return;
      }
      cam.lastInput = performance.now();
      if (st.phase === "walk") {
        cam.off -= dx * 0.006;
        cam.pitch = THREE.MathUtils.clamp(cam.pitch + dy * 0.004, -0.1, 1.3);
      } else if (st.phase === "aerial" && !st.focus) {
        cam.aerialYaw -= dx * 0.005;
        cam.aerialPitch = THREE.MathUtils.clamp(cam.aerialPitch + dy * 0.003, 0.35, 1.35);
      }
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (!pts.size) cam.dragging = false;
      cam.lastInput = performance.now();
    };
    const zoom = (k: number) => {
      const st = useGame.getState();
      cam.lastInput = performance.now();
      if (st.phase === "walk") cam.dist = THREE.MathUtils.clamp(cam.dist * (1 + k), 2.5, 16);
      else if (st.phase === "aerial") cam.aerialDist = THREE.MathUtils.clamp(cam.aerialDist * (1 + k), 25, 170);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const st = useGame.getState();
      // a trackpad's sideways swipe turns the view; pinch (ctrl) and the mouse wheel zoom
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        cam.lastInput = performance.now();
        if (st.phase === "walk") cam.off -= e.deltaX * 0.004;
        else if (st.phase === "aerial" && !st.focus) cam.aerialYaw -= e.deltaX * 0.003;
        return;
      }
      zoom(e.deltaY * (e.ctrlKey ? 0.01 : 0.0012));
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  // starting to walk: the camera settles in behind you, looking into the gate
  const phase = useGame((s) => s.phase);
  useEffect(() => {
    if (phase === "walk") {
      cam.off = 0;
      cam.pitch = 0.32;
      cam.dist = 6.5;
    }
  }, [phase]);

  const pos = useRef(new THREE.Vector3());
  const wantPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3();

  const shift = useRef(0);
  const lastShot = useRef(-1);
  useFrame(({ size }, raw) => {
    const dt = Math.min(raw, 0.05);
    const st = useGame.getState();
    // the swing round you eases back behind you once you're walking again (as in The Feast)
    if (!cam.dragging && player.moving && performance.now() - cam.lastInput > 1800) {
      cam.off = Math.atan2(Math.sin(cam.off), Math.cos(cam.off)) * Math.exp(-dt * 1.6);
    }
    // with a panel open on the right (computers), centre the 3D in the space left of it
    const want = st.panel && size.width >= 640 ? Math.min(300, size.width * 0.22) : 0;
    shift.current += (want - shift.current) * Math.min(1, dt * 6);
    const cam3 = camera as THREE.PerspectiveCamera;
    if (Math.abs(shift.current) > 0.5) cam3.setViewOffset(size.width, size.height, shift.current, 0, size.width, size.height);
    else if (cam3.view?.enabled) cam3.clearViewOffset();
    let k = 2.2;
    if (st.phase === "loading" || st.phase === "arrive") {
      // the drive in, as a drone film: three shots, cut between (as long as the drive itself)
      const t = arrival.t;
      const cx = arrival.x, cz = arrival.z, cy = TERRACE_Y;
      const shot = t < 0.4 ? 0 : t < 0.75 ? 1 : 2;
      if (shot === 0) {
        // from the top: high over the street, following it down, the resort lit up beside it
        const u = t / 0.4;
        wantPos.set(cx - 7, cy + 34 - u * 6, cz - 10 + u * 3);
        wantLook.set(cx - 3, cy, cz + 8);
      } else if (shot === 1) {
        // from the front: down on the road ahead as it glides towards you, traffic going by
        wantPos.set(STREET.southSlow - 1.3, cy + 1.05, -16);
        wantLook.set(cx, cy + 0.9, cz);
      } else {
        // from the side: across the street as it pulls in to the kerb, the gate behind it
        const u = (t - 0.75) / 0.25;
        wantPos.set(ROAD.x1 - 1.2, cy + 1.9 + u * 0.4, -25.5 - u * 1.5);
        wantLook.set(cx - 0.5, cy + 1.1, cz);
      }
      // a hard cut between shots, smooth within one
      if (shot !== lastShot.current || st.phase === "loading") {
        lastShot.current = shot;
        pos.current.copy(wantPos);
        look.current.copy(wantLook);
      }
      k = 8;
    } else if (st.phase === "setup") {
      // pulled up at the kerb: the limo side-on, the gate and its sign behind
      wantPos.set(ROAD.x1 - 1, TERRACE_Y + 2.6, -24);
      wantLook.set(44.5, TERRACE_Y + 1.8, -29.5);
      k = 1.6;
    } else if (st.phase === "celebrate") {
      // out of the car and walking in: behind you, looking in through the gate at the resort and
      // the fireworks over it
      wantPos.set(player.x + 4.2, player.y + 2.4, player.z + 0.8);
      wantLook.set(player.x - 10, player.y + 3.2, player.z - 1.2);
      k = 2.6;
    } else if (st.phase === "intro") {
      if (st.phase === "intro") introT.current += dt;
      const t = Math.min(1, introT.current / INTRO_SECONDS);
      const e = 1 - Math.pow(1 - t, 3);
      const a = aerialPose();
      wantPos.lerpVectors(INTRO_FROM, a.pos, e);
      // a slow sweep round as it comes in
      const sweep = (1 - e) * 0.9;
      wantPos.sub(a.look).applyAxisAngle(new THREE.Vector3(0, 1, 0), sweep).add(a.look);
      wantLook.lerpVectors(INTRO_LOOK_FROM, a.look, e);
      camera.position.copy(wantPos);
      look.current.copy(wantLook);
      camera.lookAt(look.current);
      pos.current.copy(camera.position);
      if (t >= 1 && st.phase === "intro") st.set({ phase: "aerial" });
      return;
    } else if (st.phase === "aerial") {
      if (st.focus) {
        const v = spotView(st.focus);
        wantPos.copy(v.pos);
        wantLook.copy(v.look);
        k = 2.5;
      } else {
        // a slow drift round the resort when nobody's touching it
        if (performance.now() - cam.lastInput > 6000) cam.aerialYaw += dt * 0.025;
        const a = aerialPose();
        wantPos.copy(a.pos);
        wantLook.copy(a.look);
      }
    } else {
      const sat = st.seatedAt ? SEATS.find((x) => x.id === st.seatedAt) : null;
      // choosing the film by the big screen: face it, so the trailer plays right there
      if (st.panel === "movie" && Math.hypot(player.x - FILM_BOARD.x, player.z - FILM_BOARD.z) < 25) {
        wantPos.set(FILM_BOARD.x + 6.2, FILM_BOARD.y0 + FILM_BOARD.h / 2 + 0.4, FILM_BOARD.z);
        wantLook.set(FILM_BOARD.x, FILM_BOARD.y0 + FILM_BOARD.h / 2, FILM_BOARD.z);
        const f2 = 1 - Math.exp(-4 * dt);
        pos.current.lerp(wantPos, f2);
        look.current.lerp(wantLook, f2);
        camera.position.copy(pos.current);
        camera.lookAt(look.current);
        updateTrailerRect(camera, size.width, size.height);
        return;
      }
      trailerRect.r = null;
      if (sat?.kind === "movie" && !st.panel) {
        // in your seat for the film: look up at the screen over everyone's heads
        wantLook.set(SCREEN.x, SCREEN.y0 + SCREEN.h * 0.45, SCREEN.z);
        wantPos.set(player.x + Math.sin(sat.facing) * -2.2, player.y + 2.1, player.z + Math.cos(sat.facing) * -2.2);
        const f2 = 1 - Math.exp(-4 * dt);
        pos.current.lerp(wantPos, f2);
        look.current.lerp(wantLook, f2);
        camera.position.copy(pos.current);
        camera.lookAt(look.current);
        return;
      }
      // following you
      const tx = player.x, tz = player.z, ty = player.y + (useGame.getState().seatedAt ? 1.1 : 1.5);
      wantLook.set(tx, ty, tz);
      wantPos.set(
        tx + Math.sin(player.heading + Math.PI + cam.off) * Math.cos(cam.pitch) * cam.dist,
        ty + Math.sin(cam.pitch) * cam.dist,
        tz + Math.cos(player.heading + Math.PI + cam.off) * Math.cos(cam.pitch) * cam.dist,
      );
      wantPos.y = Math.max(wantPos.y, 0.35);
      // pull in in front of walls and buildings between you and the camera
      const steps = Math.ceil(cam.dist / 0.2);
      for (let i = 3; i <= steps; i++) {
        const f = i / steps;
        const px = tx + (wantPos.x - tx) * f, pz = tz + (wantPos.z - tz) * f, py = ty + (wantPos.y - ty) * f;
        if (cameraBlocked(px, py, pz)) {
          const k = Math.max(0.15, (i - 2) / steps);
          wantPos.set(tx + (wantPos.x - tx) * k, ty + (wantPos.y - ty) * k, tz + (wantPos.z - tz) * k);
          break;
        }
      }
      k = 9;
      // catching up from the air: slower
      if (pos.current.distanceTo(wantPos) > 20) k = 2.4;
    }
    const f = 1 - Math.exp(-k * dt);
    pos.current.lerp(wantPos, f);
    look.current.lerp(wantLook, f);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });
  return null;
}

/** Thin barricade panels, as boxes the camera can bump into. */
const BARRICADE_BOXES = BARRICADES.map((b) => ({ x0: Math.min(b.x0, b.x1) - 0.1, x1: Math.max(b.x0, b.x1) + 0.1, z0: Math.min(b.z0, b.z1) - 0.1, z1: Math.max(b.z0, b.z1) + 0.1, top: b.y + 1.5 }));

/** Is this point inside a wall, a building or a barricade? (Low fences only up to their height.) */
function cameraBlocked(x: number, y: number, z: number) {
  for (const b of BLOCKS) {
    if (x < b.x0 - 0.15 || x > b.x1 + 0.15 || z < b.z0 - 0.15 || z > b.z1 + 0.15) continue;
    // low things (fences, counters, cars, the terrace edge) only block a camera lower than they are
    if (b.h !== undefined && y > groundY(x, z) + b.h) continue;
    return true;
  }
  for (const b of BARRICADE_BOXES) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y < b.top) return true;
  return false;
}

function aerialPose() {
  const look = new THREE.Vector3(AERIAL_CENTRE.x, 0, AERIAL_CENTRE.z);
  // a tall phone screen sees less across: pull back so the whole resort fits
  const aspect = typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 1.6;
  const d = cam.aerialDist * (aspect < 1 ? Math.min(2.4, 1.1 / aspect) : 1);
  const pos = new THREE.Vector3(
    look.x + Math.sin(cam.aerialYaw) * Math.cos(cam.aerialPitch) * d,
    Math.sin(cam.aerialPitch) * d,
    look.z + Math.cos(cam.aerialYaw) * Math.cos(cam.aerialPitch) * d,
  );
  return { pos, look };
}
