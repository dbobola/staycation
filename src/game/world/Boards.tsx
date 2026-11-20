"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { allAwards, allMovies } from "../data/choices";
import { EVENT, YEARBOOK_OPEN } from "../data/event";
import type { Person } from "../data/samples";
import { useGame } from "../store";
import { AWARDS as AWARDS_SPOT, FILM_BOARD, GATE, SCREEN, TERRACE_Y, YEARBOOK, groundY } from "./layout";

// The boards that show live data: the welcome sign over the gate, the 3D Yearbook on its little
// billboard (its pages turn by themselves), the awards board and the movie screen.

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Manrope, Arial, sans-serif";

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, prev?: THREE.CanvasTexture) {
  const c = (prev?.image as HTMLCanvasElement) ?? document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, w, h);
  draw(g);
  const t = prev ?? new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

const frameMat = new THREE.MeshStandardMaterial({ color: "#1a1c1f", roughness: 0.5, metalness: 0.5 });

// ---------------------------------------------------------------------------------------------

/** The welcome sign: a beam across the gate, readable from the road and from the air. */
export function GateSign() {
  const t = useMemo(
    () =>
      canvasTexture(1400, 360, (g) => {
        const grd = g.createLinearGradient(0, 0, 1400, 0);
        grd.addColorStop(0, "#0e5d6b");
        grd.addColorStop(1, "#127a86");
        g.fillStyle = grd;
        g.fillRect(0, 0, 1400, 360);
        g.fillStyle = "#e07a45";
        g.fillRect(0, 300, 1400, 16);
        g.textAlign = "center";
        g.fillStyle = "#fff6e8";
        g.font = `700 150px ${SERIF}`;
        g.fillText(EVENT.short.toUpperCase(), 700, 165);
        g.font = `600 64px ${SANS}`;
        g.fillStyle = "#ffd9a8";
        g.fillText(`STAYCATION · ${EVENT.venue.toUpperCase()} · ${EVENT.city.toUpperCase()}`, 700, 260, 1320);
      }),
    [],
  );
  const span = GATE.z1 - GATE.z0 + 1.6;
  return (
    <group position={[GATE.x, TERRACE_Y + 4.6, (GATE.z0 + GATE.z1) / 2]}>
      <mesh material={frameMat}>
        <boxGeometry args={[0.3, 1.9, span + 0.2]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.16, 0, 0]} rotation-y={(s * Math.PI) / 2}>
          <planeGeometry args={[span, 1.75]} />
          <meshStandardMaterial map={t} emissiveMap={t} emissive="#ffffff" emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

function initials(p: Person) {
  return ((p.first?.[0] ?? "") + (p.last?.[0] ?? "")).toUpperCase();
}
const HUES = [12, 190, 32, 280, 150, 350, 210, 45];
function hue(p: Person) {
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/** Two classmates on one yearbook page. */
function drawPage(g: CanvasRenderingContext2D, people: (Person | undefined)[], side: "l" | "r", pageNo: number) {
  const W = 512, H = 680;
  g.fillStyle = "#f7f0e1";
  g.fillRect(0, 0, W, H);
  const grd = g.createLinearGradient(side === "l" ? W : 0, 0, side === "l" ? W - 60 : 60, 0);
  grd.addColorStop(0, "rgba(0,0,0,0.18)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#0e5d6b";
  g.font = `600 18px ${SANS}`;
  g.textAlign = "center";
  g.fillText(`${EVENT.short.toUpperCase()} YEARBOOK`, W / 2, 40);
  people.forEach((p, i) => {
    const y0 = 70 + i * 300;
    if (!p) return;
    const h = hue(p);
    g.fillStyle = `hsl(${h}, 55%, 48%)`;
    g.fillRect(40, y0, 170, 200);
    g.fillStyle = "#fff";
    g.font = `700 78px ${SERIF}`;
    g.fillText(initials(p), 125, y0 + 125);
    g.strokeStyle = "#2a2a2a";
    g.lineWidth = 3;
    g.strokeRect(40, y0, 170, 200);
    g.textAlign = "left";
    g.fillStyle = "#1d1d1d";
    g.font = `700 34px ${SERIF}`;
    g.fillText(p.first, 230, y0 + 42, 260);
    g.fillText(p.last, 230, y0 + 80, 260);
    g.fillStyle = "#c0643a";
    g.font = `700 20px ${SANS}`;
    const meta = [p.nickname && `“${p.nickname}”`, p.set && `Class of ${p.set}`].filter(Boolean).join(" · ");
    g.fillText(meta, 230, y0 + 116, 260);
    if (p.house) {
      g.fillStyle = "#555";
      g.font = `500 18px ${SANS}`;
      g.fillText(`${p.house} House`, 230, y0 + 144, 260);
    }
    if (p.quote) {
      g.fillStyle = "#333";
      g.font = `italic 22px ${SERIF}`;
      wrap(g, p.quote, 40, y0 + 238, 430, 28, 2);
    }
    g.textAlign = "center";
  });
  g.fillStyle = "#888";
  g.font = `500 16px ${SANS}`;
  g.fillText(String(pageNo), W / 2, H - 22);
}

/** The Yearbook before it opens: "coming soon" on the left, "put your name in" on the right. */
function drawSoon(g: CanvasRenderingContext2D, side: "l" | "r", names: number) {
  const W = 512, H = 680;
  g.fillStyle = "#f7f0e1";
  g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  g.fillStyle = "#0e5d6b";
  g.font = `600 18px ${SANS}`;
  g.fillText(`${EVENT.short.toUpperCase()} YEARBOOK`, W / 2, 40);
  if (side === "l") {
    g.font = "110px serif";
    g.fillText("📖", W / 2, 260);
    g.fillStyle = "#1d1d1d";
    g.font = `700 54px ${SERIF}`;
    g.fillText("Not available", W / 2, 380);
    g.fillText("yet", W / 2, 440);
    g.fillStyle = "#555";
    g.font = `500 24px ${SANS}`;
    g.fillText("The Yearbook opens soon.", W / 2, 510);
  } else {
    g.fillStyle = "#c0643a";
    g.font = `800 30px ${SANS}`;
    g.fillText("PUT YOUR NAME IN", W / 2, 200);
    g.fillStyle = "#1d1d1d";
    g.font = `italic 28px ${SERIF}`;
    g.textAlign = "left";
    wrap(g, "Check in at the welcome desk and you'll be on these pages when it opens.", 60, 270, 400, 38, 4);
    g.textAlign = "center";
    g.fillStyle = "#0e5d6b";
    g.font = `700 64px ${SERIF}`;
    g.fillText(String(names), W / 2, 500);
    g.font = `600 22px ${SANS}`;
    g.fillText(names === 1 ? "name in so far" : "names in so far", W / 2, 540);
  }
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, lh: number, max: number) {
  const words = text.split(" ");
  let line = "";
  let n = 0;
  for (const word of words) {
    const t = line ? line + " " + word : word;
    if (g.measureText(t).width > w && line) {
      g.fillText(line, x, y + n * lh);
      line = word;
      if (++n >= max) return;
    } else line = t;
  }
  g.fillText(line, x, y + n * lh);
}

/** The Yearbook: an open book on a small billboard by the stairs. Its pages turn every few seconds. */
export function Yearbook3D() {
  const people = useGame((s) => s.shared.people);
  const me = useGame((s) => s.me);
  const set = useGame((s) => s.set);
  const phase = useGame((s) => s.phase);
  const list = useMemo(() => {
    const all = me ? [me, ...people.filter((p) => p.id !== me.id)] : people;
    return all.length ? all : [];
  }, [people, me]);
  const spreads = YEARBOOK_OPEN ? Math.max(1, Math.ceil(list.length / 4)) : 1;
  const [spread, setSpread] = useState(0);
  const texL = useRef<THREE.CanvasTexture | undefined>(undefined);
  const texR = useRef<THREE.CanvasTexture | undefined>(undefined);
  const texFlipFront = useRef<THREE.CanvasTexture | undefined>(undefined);
  const texFlipBack = useRef<THREE.CanvasTexture | undefined>(undefined);
  const flip = useRef<THREE.Group>(null!);
  const flipT = useRef(-1);
  const [, redraw] = useState(0);

  const page = (k: number, side: "l" | "r", prev?: THREE.CanvasTexture) => {
    const s = ((k % spreads) + spreads) % spreads;
    const base = s * 4 + (side === "r" ? 2 : 0);
    if (!YEARBOOK_OPEN) return canvasTexture(512, 680, (g) => drawSoon(g, side, list.length), prev);
    return canvasTexture(512, 680, (g) => drawPage(g, [list[base], list[base + 1]], side, s * 2 + (side === "r" ? 2 : 1)), prev);
  };

  // the open spread
  texL.current = page(spread, "l", texL.current);
  texR.current = page(spread, "r", texR.current);

  useEffect(() => {
    if (spreads < 2) return;
    const id = setInterval(() => {
      // the turning page: front is this spread's right page, back is the next spread's left page
      texFlipFront.current = page(spread, "r", texFlipFront.current);
      texFlipBack.current = page(spread + 1, "l", texFlipBack.current);
      flipT.current = 0;
      redraw((n) => n + 1);
    }, 5200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread, spreads, list]);

  useFrame((_, dt) => {
    if (flipT.current < 0 || !flip.current) return;
    flipT.current += dt / 1.1;
    const t = Math.min(1, flipT.current);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    flip.current.visible = true;
    flip.current.rotation.y = -e * Math.PI;
    flip.current.position.y = Math.sin(e * Math.PI) * 0.04;
    if (t === 1) {
      flipT.current = -1;
      flip.current.visible = false;
      setSpread((s) => s + 1);
    }
  });

  const PW = 0.82, PH = 1.05;
  const paper = useMemo(() => new THREE.MeshStandardMaterial({ color: "#efe6d2" }), []);
  const cover = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0e5d6b", roughness: 0.6 }), []);
  const head = useMemo(
    () =>
      canvasTexture(1024, 256, (g) => {
        g.fillStyle = "#0e5d6b";
        g.fillRect(0, 0, 1024, 256);
        g.fillStyle = "#e07a45";
        g.fillRect(0, 210, 1024, 12);
        g.fillStyle = "#fff6e8";
        g.textAlign = "center";
        g.font = `700 92px ${SERIF}`;
        g.fillText("THE YEARBOOK", 512, 118);
        g.font = `600 40px ${SANS}`;
        g.fillStyle = "#ffd9a8";
        g.fillText(YEARBOOK_OPEN ? "WHO'S COMING · TAP TO FLIP THROUGH" : "COMING SOON · PUT YOUR NAME IN", 512, 182);
      }),
    [],
  );
  const open = () => set({ panel: "yearbook", focus: phase === "aerial" ? "yearbook" : null });

  return (
    <group position={[YEARBOOK.x, groundY(YEARBOOK.x, YEARBOOK.z + 1), YEARBOOK.z]}>
      {/* the little billboard: two posts, the header board */}
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} position={[x, 1.4, -0.12]} material={frameMat} castShadow>
          <boxGeometry args={[0.1, 2.8, 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, 2.45, -0.1]} onClick={open}>
        <boxGeometry args={[2.3, 0.62, 0.06]} />
        <meshStandardMaterial attach="material-4" map={head} emissiveMap={head} emissive="#fff" emissiveIntensity={0.3} />
        <meshStandardMaterial attach="material-0" color="#1a1c1f" />
        <meshStandardMaterial attach="material-1" color="#1a1c1f" />
        <meshStandardMaterial attach="material-2" color="#1a1c1f" />
        <meshStandardMaterial attach="material-3" color="#1a1c1f" />
        <meshStandardMaterial attach="material-5" color="#1a1c1f" />
      </mesh>
      {/* the shelf the book lies open on, tilted towards you */}
      <group position={[0, 1.4, 0.05]} rotation-x={-0.45} onClick={open}>
        <mesh position={[0, 0, -0.03]} material={frameMat}>
          <boxGeometry args={[2.0, 1.25, 0.05]} />
        </mesh>
        <mesh position={[0, 0, 0.005]} material={cover}>
          <boxGeometry args={[PW * 2 + 0.08, PH + 0.06, 0.03]} />
        </mesh>
        <mesh position={[0, 0, 0.022]} material={paper}>
          <boxGeometry args={[PW * 2, PH, 0.02]} />
        </mesh>
        <mesh position={[-PW / 2, 0, 0.034]}>
          <planeGeometry args={[PW, PH]} />
          <meshStandardMaterial map={texL.current} roughness={0.9} />
        </mesh>
        <mesh position={[PW / 2, 0, 0.034]}>
          <planeGeometry args={[PW, PH]} />
          <meshStandardMaterial map={texR.current} roughness={0.9} />
        </mesh>
        {/* the page being turned, hinged at the spine */}
        <group ref={flip} position={[0, 0, 0.036]} visible={false}>
          <mesh position={[PW / 2, 0, 0.001]}>
            <planeGeometry args={[PW, PH]} />
            <meshStandardMaterial map={texFlipFront.current ?? texR.current} side={THREE.FrontSide} />
          </mesh>
          <mesh position={[PW / 2, 0, -0.001]} rotation-y={Math.PI}>
            <planeGeometry args={[PW, PH]} />
            <meshStandardMaterial map={texFlipBack.current ?? texL.current} side={THREE.FrontSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

/** The awards board in the courtyard: every category and who's leading. */
export function AwardsBoard() {
  const awards = useGame((s) => s.shared.awards);
  const tex = useRef<THREE.CanvasTexture | undefined>(undefined);
  tex.current = canvasTexture(
    1024,
    720,
    (g) => {
      g.fillStyle = "#14161a";
      g.fillRect(0, 0, 1024, 720);
      g.fillStyle = "#e0a943";
      g.textAlign = "center";
      g.font = `700 64px ${SERIF}`;
      g.fillText("🏆 THE AWARDS", 512, 82);
      g.font = `600 24px ${SANS}`;
      g.fillStyle = "#c9c2b5";
      g.fillText("NOMINATE YOUR CLASSMATES · WINNERS ON THE LAST NIGHT", 512, 122);
      allAwards(useGame.getState().shared).slice(0, 10).forEach((a, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 60 + col * 480, y = 182 + row * 106;
        g.textAlign = "left";
        g.fillStyle = "#fff6e8";
        g.font = `700 30px ${SERIF}`;
        g.fillText(a.title, x, y, 440);
        const lead = awards[a.id]?.[0];
        g.font = `500 24px ${SANS}`;
        g.fillStyle = lead ? "#7fd3d9" : "#7c776e";
        g.fillText(lead ? `Leading: ${lead.name} (${lead.count})` : "No nominations yet", x, y + 36, 440);
      });
    },
    tex.current,
  );
  const set = useGame((s) => s.set);
  const phase = useGame((s) => s.phase);
  return (
    <group position={[AWARDS_SPOT.x, 0, AWARDS_SPOT.z]}>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 1.25, 0]} material={frameMat} castShadow>
          <boxGeometry args={[0.1, 2.5, 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, 1.65, 0.02]} onClick={() => set({ panel: "awards", focus: phase === "aerial" ? "awards" : null })}>
        <boxGeometry args={[3.1, 2.15, 0.08]} />
        <meshStandardMaterial attach="material-4" map={tex.current} emissiveMap={tex.current} emissive="#fff" emissiveIntensity={0.35} />
        <meshStandardMaterial attach="material-0" color="#1a1c1f" />
        <meshStandardMaterial attach="material-1" color="#1a1c1f" />
        <meshStandardMaterial attach="material-2" color="#1a1c1f" />
        <meshStandardMaterial attach="material-3" color="#1a1c1f" />
        <meshStandardMaterial attach="material-5" color="#1a1c1f" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

/** The white screen on the cinema block's roof: tonight's film and the vote so far. */
export function MovieScreen() {
  const votes = useGame((s) => s.shared.movies);
  const evening = useGame((s) => s.evening);
  const tex = useRef<THREE.CanvasTexture | undefined>(undefined);
  const shared = useGame((s) => s.shared);
  const ranked = useMemo(() => [...allMovies(shared)].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0)), [votes, shared]);
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  tex.current = canvasTexture(
    1280,
    720,
    (g) => {
      g.fillStyle = "#f4f2ee";
      g.fillRect(0, 0, 1280, 720);
      const lead = ranked[0];
      const grd = g.createLinearGradient(0, 0, 1280, 720);
      grd.addColorStop(0, lead.color);
      grd.addColorStop(1, "#141414");
      g.fillStyle = grd;
      g.fillRect(40, 40, 1200, 640);
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.textAlign = "left";
      g.font = `700 34px ${SANS}`;
      g.fillText(total ? "MOVIE NIGHT · LEADING THE VOTE" : "MOVIE NIGHT · VOTE FOR TONIGHT'S FILM", 90, 120);
      g.fillStyle = "#fff";
      g.font = `700 96px ${SERIF}`;
      g.fillText(total ? lead.title : "Your pick?", 90, 240, 1100);
      g.font = `500 34px ${SANS}`;
      g.fillStyle = "rgba(255,255,255,0.8)";
      if (total) g.fillText(`${lead.year} · ${lead.genre}`, 90, 296);
      ranked.slice(0, 4).forEach((m, i) => {
        const v = votes[m.id] ?? 0;
        const y = 380 + i * 70;
        g.fillStyle = "rgba(255,255,255,0.15)";
        g.fillRect(90, y, 1000, 46);
        g.fillStyle = m.color;
        g.fillRect(90, y, total ? (1000 * v) / Math.max(1, total) : 0, 46);
        g.fillStyle = "#fff";
        g.font = `600 28px ${SANS}`;
        g.fillText(m.title, 106, y + 33, 760);
        g.textAlign = "right";
        g.fillText(`${v} vote${v === 1 ? "" : "s"}`, 1076, y + 33);
        g.textAlign = "left";
      });
    },
    tex.current,
  );
  const set = useGame((s) => s.set);
  const phase = useGame((s) => s.phase);
  return (
    <group position={[SCREEN.x, SCREEN.y0, SCREEN.z]}>
      {[-SCREEN.w / 2 + 0.3, SCREEN.w / 2 - 0.3].map((x) => (
        <mesh key={x} position={[x, SCREEN.h / 2, -0.4]} material={frameMat}>
          <boxGeometry args={[0.15, SCREEN.h + 0.4, 0.15]} />
        </mesh>
      ))}
      <mesh position={[0, SCREEN.h / 2, -0.25]} material={frameMat}>
        <boxGeometry args={[SCREEN.w + 0.3, SCREEN.h + 0.3, 0.12]} />
      </mesh>
      <mesh position={[0, SCREEN.h / 2, -0.18]} onClick={() => set({ panel: "movie", focus: phase === "aerial" ? "movie" : null })}>
        <planeGeometry args={[SCREEN.w, SCREEN.h]} />
        <meshStandardMaterial map={tex.current} emissiveMap={tex.current} emissive="#ffffff" emissiveIntensity={evening ? 0.9 : 0.25} toneMapped={!evening} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

/**
 * The big screen at the west end of the dinner table, facing down it: a "now showing" reel of
 * the films in the vote (the most-voted first), playing on a loop. Tap it to watch trailers and
 * choose tonight's film.
 */
export function FilmBoard() {
  const votes = useGame((s) => s.shared.movies);
  const evening = useGame((s) => s.evening);
  const set = useGame((s) => s.set);
  const phase = useGame((s) => s.phase);
  const shared = useGame((s) => s.shared);
  const ranked = useMemo(() => [...allMovies(shared)].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0)), [votes, shared]);
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const tex = useRef<THREE.CanvasTexture | undefined>(undefined);
  const acc = useRef(0);
  const draw = (t: number) => {
    const m = ranked[Math.floor(t / 6) % Math.min(4, ranked.length)];
    const f = (t % 6) / 6;
    tex.current = canvasTexture(
      768,
      432,
      (g) => {
        // a moving gradient in the film's colour, like a trailer playing
        const grd = g.createLinearGradient(0, 0, 768, 432);
        grd.addColorStop(0, m.color);
        grd.addColorStop(0.5 + Math.sin(t * 0.8) * 0.3, "#0b0b10");
        grd.addColorStop(1, m.color);
        g.fillStyle = grd;
        g.fillRect(0, 0, 768, 432);
        for (let i = 0; i < 40; i++) {
          g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
          g.fillRect(Math.random() * 768, Math.random() * 432, 2 + Math.random() * 40, 1);
        }
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.fillRect(0, 0, 768, 40);
        g.fillRect(0, 392, 768, 40);
        g.fillStyle = "#f0a04b";
        g.textAlign = "left";
        g.font = `800 22px ${SANS}`;
        g.fillText("● NOW SHOWING · MOVIE NIGHT", 28, 27);
        g.fillStyle = "#fff";
        g.font = `700 64px ${SERIF}`;
        g.fillText(m.title, 40, 200, 690);
        g.font = `500 26px ${SANS}`;
        g.fillStyle = "rgba(255,255,255,0.85)";
        const v = votes[m.id] ?? 0;
        g.fillText(`${m.year} · ${m.genre} · ${v} vote${v === 1 ? "" : "s"}${total && m === ranked[0] && v ? " · leading" : ""}`, 40, 246);
        // the play bar
        g.fillStyle = "rgba(255,255,255,0.25)";
        g.fillRect(40, 300, 688, 6);
        g.fillStyle = "#f0a04b";
        g.fillRect(40, 300, 688 * f, 6);
        g.fillStyle = "#fff";
        g.font = `800 24px ${SANS}`;
        g.fillText("▶  TAP TO WATCH TRAILERS & CHOOSE THE FILM", 40, 360);
      },
      tex.current,
    );
  };
  if (!tex.current) draw(0);
  useFrame(({ clock }, dt) => {
    // redrawn a few times a second (it's a canvas): enough for the reel to feel alive
    acc.current += dt;
    if (acc.current < 0.2) return;
    acc.current = 0;
    draw(clock.elapsedTime);
  });
  const open = () => set({ panel: "movie", focus: phase === "aerial" ? "movie" : null });
  return (
    <group position={[FILM_BOARD.x, 0, FILM_BOARD.z]} rotation-y={Math.PI / 2}>
      {[-FILM_BOARD.w / 2 + 0.2, FILM_BOARD.w / 2 - 0.2].map((x) => (
        <mesh key={x} position={[x, (FILM_BOARD.y0 + FILM_BOARD.h) / 2, -0.12]} material={frameMat} castShadow>
          <boxGeometry args={[0.14, FILM_BOARD.y0 + FILM_BOARD.h, 0.14]} />
        </mesh>
      ))}
      <mesh position={[0, FILM_BOARD.y0 + FILM_BOARD.h / 2, -0.06]} material={frameMat}>
        <boxGeometry args={[FILM_BOARD.w + 0.2, FILM_BOARD.h + 0.2, 0.1]} />
      </mesh>
      <mesh position={[0, FILM_BOARD.y0 + FILM_BOARD.h / 2, 0]} onClick={open}>
        <planeGeometry args={[FILM_BOARD.w, FILM_BOARD.h]} />
        <meshStandardMaterial map={tex.current} emissiveMap={tex.current} emissive="#ffffff" emissiveIntensity={evening ? 1 : 0.4} toneMapped={!evening} />
      </mesh>
    </group>
  );
}
