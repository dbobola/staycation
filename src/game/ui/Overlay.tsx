"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { EVENT } from "../data/event";
import { fireAction, input } from "../input";
import { post, useGame, type Shared } from "../store";
import { TrailerPlayer, useRoommates } from "./Panels";
import { allMovies } from "../data/choices";
import { trailerRect } from "../world/Trailer";
import { arrival } from "../world/Arrival";
import { STEPS, nextStep, stepTarget } from "../world/Guide";
import { SEATS, SPOTS } from "../world/layout";
import { player, walkTo } from "../world/Player";
import { cheersAround, guestSay, tableMate } from "../world/Guests";
import { GIST } from "../data/guests";

// Everything on screen over the 3D: the loading card, the title, the day/evening switch, your
// weekend checklist, the walk-in button, prompts, the on-screen pad on phones, and messages.

export function Loader() {
  const { active, progress } = useProgress();
  const phase = useGame((s) => s.phase);
  const set = useGame((s) => s.set);
  const shown = useRef(0);
  shown.current = Math.max(shown.current, progress);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (phase !== "loading") {
      const id = setTimeout(() => setGone(true), 700);
      return () => clearTimeout(id);
    }
    // nothing left to fetch (or everything came from the cache): a beat for the first frames to
    // compile, then the flight in starts
    if (active || (progress < 100 && progress > 0)) return;
    const id = setTimeout(() => set({ phase: "arrive" }), progress === 0 ? 2500 : 400);
    return () => clearTimeout(id);
  }, [active, progress, phase, set]);
  if (gone) return null;
  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b2328] transition-opacity duration-700 ${phase === "loading" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="eyebrow tracking-[0.5em]">{EVENT.short}</div>
      <div className="title mt-2 text-5xl text-[var(--cream)] sm:text-6xl">Staycation</div>
      <div className="mt-2 text-sm text-white/60">
        {EVENT.venue} · {EVENT.city}
      </div>
      <div className="mt-8 h-1 w-56 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-gradient-to-r from-[var(--sun)] to-[var(--pool)] transition-all" style={{ width: `${Math.max(4, shown.current)}%` }} />
      </div>
      <div className="mt-3 text-xs text-white/45">Filling the pool…</div>
    </div>
  );
}

/** In the car at the gate: lady or guy, and your name. Then you step out. */
function Setup() {
  const sex = useGame((s) => s.sex);
  const saved = useGame((s) => s.guestName);
  const me = useGame((s) => s.me);
  const [name, setName] = useState(me?.first || saved);
  const [pick, setPick] = useState<"f" | "m">(sex);
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!n) return;
    const st = useGame.getState();
    st.setGuestName(n);
    st.setSex(pick);
    // a new outfit every time you arrive
    st.set({ phase: "celebrate", respawn: st.respawn + 1, look: Math.floor(Math.random() * 1000) });
    // you step out and the car pulls away while you walk in
    setTimeout(() => (arrival.leaving = 0), 1200);
    setTimeout(() => {
      player.heading = -Math.PI / 2; // facing in through the gate
      useGame.getState().set({ phase: "walk" });
      useGame.getState().say(`Enjoy the weekend, ${n}! Check in with Ada at the desk 🔑`);
    }, 4600);
  };
  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex justify-center p-3 sm:inset-0 sm:items-center">
      <form onSubmit={go} className="panel w-full max-w-sm p-5 sm:rounded-2xl">
        <div className="eyebrow">You&apos;ve arrived 🌴</div>
        <h2 className="title mt-1 text-[28px] leading-tight">Welcome to {EVENT.venue}!</h2>
        <p className="mt-1 text-sm text-white/70">Before you step out of the car…</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["f", "m"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPick(s)}
              className={`rounded-xl border-2 px-3 py-3 text-center font-extrabold transition ${pick === s ? "border-[var(--sun)] bg-[var(--sun)] text-black" : "border-white/20 text-white/85"}`}
            >
              <div className="text-3xl">{s === "f" ? "💃🏾" : "🕺🏾"}</div>
              <div className="mt-1 text-sm uppercase tracking-wider">{s === "f" ? "Lady" : "Guy"}</div>
            </button>
          ))}
        </div>
        <label className="mt-4 block">
          <span className="label">What&apos;s your name?</span>
          <input className="input text-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="given-name" maxLength={24} required />
        </label>
        <button className="btn mt-4 w-full py-3.5 text-base" type="submit" disabled={!name.trim()}>
          Step out of the car 🎉
        </button>
      </form>
    </div>
  );
}

/** The welcome: your name in lights, confetti, fireworks over the resort. */
function Celebrate() {
  const name = useGame((s) => s.guestName);
  const bits = useState(() =>
    Array.from({ length: 70 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      dur: 2.2 + Math.random() * 1.8,
      color: ["#f0a04b", "#2ec4d6", "#e0457b", "#fff6e8", "#a44dff", "#f2c21b"][i % 6],
      rot: Math.random() * 360,
    })),
  )[0];
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {bits.map((b, i) => (
        <span key={i} className="confetti" style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, transform: `rotate(${b.rot}deg)` }} />
      ))}
      <div className="absolute inset-x-0 top-[18%] flex flex-col items-center px-4 text-center">
        <div className="eyebrow rise tracking-[0.3em] drop">{EVENT.name}</div>
        <div className="title rise mt-2 text-5xl text-white drop sm:text-7xl">Welcome, {name}! 🎉</div>
        <div className="rise mt-3 text-base font-semibold text-white/90 drop">The weekend starts now. Come on in!</div>
      </div>
    </div>
  );
}

/** What to do next: always on screen while walking. Tap it to do it straight away. */
function NextCard() {
  const done = useGame((s) => s.done);
  const skipped = useGame((s) => s.skipped);
  const step = nextStep(done, skipped);
  const [dist, setDist] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const s = nextStep(useGame.getState().done, useGame.getState().skipped);
      if (!s) return;
      const t = stepTarget(s.id);
      setDist(Math.round(Math.hypot(t.x - player.x, t.z - player.z)));
    }, 400);
    return () => clearInterval(id);
  }, []);
  const n = STEPS.filter((s) => done[s.id]).length;
  if (!step)
    return (
      <div className="next-card">
        <span className="text-lg">🎉</span>
        <div>
          <div className="next-k">{n === STEPS.length ? `All ${STEPS.length} done` : "You're all set"}</div>
          <div className="next-t">Enjoy the weekend!</div>
        </div>
      </div>
    );
  const icon = SPOTS.find((s) => s.id === step.id)!.icon;
  return (
    <button className="next-card pointer-events-auto" onClick={() => walkTo(step.id)}>
      <span className="text-xl">{icon}</span>
      <div className="min-w-0 text-left">
        <div className="next-k">
          {step.optional ? "Optional · " : "Next · "}
          {STEPS.indexOf(step) + 1} of {STEPS.length}
          {dist > 3 ? ` · ${dist} m` : " · here"}
        </div>
        <div className="next-t">{step.text}</div>
      </div>
      <span className="next-go">Go</span>
      {step.optional && (
        <span
          role="button"
          tabIndex={0}
          className="ml-1 shrink-0 text-[11px] font-bold text-white/60 underline"
          onClick={(e) => {
            e.stopPropagation();
            useGame.getState().skip(step.id);
          }}
        >
          Skip
        </span>
      )}
    </button>
  );
}

/**
 * Room-partner news, as it happens: "Nana wants to be your room partner" (accept / decline / not
 * now), and "It's a match" once you've both said yes. Each shows once.
 */
function RoommateNews() {
  const rm = useRoommates();
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("silverdome:rm-seen") ?? "[]");
    } catch {
      return [];
    }
  });
  const hide = (key: string) => {
    const next = [...seen, key];
    setSeen(next);
    try {
      sessionStorage.setItem("silverdome:rm-seen", JSON.stringify(next));
    } catch {
      /* fine */
    }
  };
  if (!rm) return null;
  const send = async (path: string, body: Record<string, unknown>) => {
    setBusy(true);
    try {
      useGame.getState().set({ shared: await post<Shared>(path, body) });
    } catch (e) {
      useGame.getState().say((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  // a match you haven't celebrated yet
  if (rm.partner) {
    const key = `match:${rm.partner}`;
    if (seen.includes(key)) return null;
    return (
      <div className="pointer-events-auto absolute inset-x-0 bottom-24 flex justify-center px-4">
        <div className="panel max-w-sm p-4 text-center sm:rounded-2xl">
          <div className="text-3xl">🎉🛏️</div>
          <div className="title mt-1 text-2xl">It&apos;s a match!</div>
          <p className="mt-1 text-white/80">You and {rm.label(rm.partner)} are room partners. Reception will put you together.</p>
          <button className="btn mt-3 w-full" onClick={() => hide(key)}>
            Yay! 🙌
          </button>
        </div>
      </div>
    );
  }
  const from = rm.wantsMe.find((id) => !seen.includes(`ask:${id}`));
  if (!from) return null;
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-24 flex justify-center px-4">
      <div className="panel max-w-sm p-4 sm:rounded-2xl">
        <div className="eyebrow">💌 Room partner request</div>
        <div className="title mt-1 text-xl leading-snug">{rm.label(from)} wants to be your room partner!</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            className="btn col-span-2"
            disabled={busy}
            onClick={async () => {
              await send("/api/roommate", { to: from });
              useGame.getState().setPicks({ roommate: from });
              useGame.getState().markDone("roommate");
            }}
          >
            Accept 🤝
          </button>
          <button className="btn-ghost" disabled={busy} onClick={() => hide(`ask:${from}`)}>
            Not now
          </button>
        </div>
        <button
          className="mt-2 w-full text-center text-xs text-white/55 underline"
          disabled={busy}
          onClick={async () => {
            await send("/api/decline", { from });
            hide(`ask:${from}`);
          }}
        >
          No thanks, decline
        </button>
      </div>
    </div>
  );
}

/**
 * Sitting down with people: the menu, a toast with everyone round you, or a bit of gist (they say
 * something, you pick a reply, they answer), and getting up again.
 */
function TableTalk() {
  const seatedAt = useGame((s) => s.seatedAt);
  const seat = SEATS.find((x) => x.id === seatedAt);
  const [gist, setGist] = useState<{ i: number; name: string; k: number; said?: string; back?: string } | null>(null);
  useEffect(() => setGist(null), [seatedAt]);
  if (!seat || seat.kind === "movie" || seat.kind === "lounger") return null;
  const startGist = () => {
    const mate = tableMate(player.x, player.z);
    if (!mate) {
      useGame.getState().say("Nobody right beside you: try a seat next to someone 🙂");
      return;
    }
    const k = Math.floor(Math.random() * GIST.length);
    setGist({ ...mate, k });
    guestSay(mate.i, GIST[k].line);
  };
  const reply = (you: string, them: string) => {
    if (!gist) return;
    setGist({ ...gist, said: you });
    setTimeout(() => {
      guestSay(gist.i, them);
      setGist((g) => (g ? { ...g, back: them } : g));
    }, 900);
  };
  const g = gist ? GIST[gist.k] : null;
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-4 flex justify-center px-3 sm:bottom-6">
      <div className="panel w-full max-w-md p-3 sm:rounded-2xl">
        {g && gist ? (
          <div className="mb-2 rounded-lg bg-white/5 p-2.5 text-sm">
            <div>
              <b className="text-[var(--sun)]">{gist.name}:</b> {g.line}
            </div>
            {gist.said && (
              <div className="mt-1 text-white/85">
                <b>You:</b> {gist.said}
              </div>
            )}
            {gist.back && (
              <div className="mt-1">
                <b className="text-[var(--sun)]">{gist.name}:</b> {gist.back}
              </div>
            )}
            {!gist.said && (
              <div className="mt-2 grid gap-1.5">
                {g.replies.map((r) => (
                  <button key={r.you} className="rounded-md border border-white/20 px-2.5 py-1.5 text-left text-[13px] hover:bg-white/10" onClick={() => reply(r.you, r.them)}>
                    {r.you}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-2 text-[12px] text-white/65">
            {seat.kind === "bonfire" ? "By the fire with everyone 🔥" : "You're at the table with everyone 🍽️"}
          </div>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          <button className="btn px-2 py-2 text-[12px]" onClick={() => useGame.getState().set({ panel: seat.kind === "grill" ? "grill" : "menu" })}>
            🍽️ Menu
          </button>
          <button
            className="btn-ghost px-2 py-2 text-[12px]"
            onClick={() => {
              const n = cheersAround(player.x, player.z);
              useGame.getState().say(n ? "Cheers! 🥂" : "Cheers to you! 🥂");
            }}
          >
            🥂 Cheers
          </button>
          <button className="btn-ghost px-2 py-2 text-[12px]" onClick={startGist}>
            💬 {gist?.back ? "More" : "Gist"}
          </button>
          <button className="btn-ghost px-2 py-2 text-[12px]" onClick={() => fireAction()}>
            ↩ Get up
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The trailer, playing on the big screen: a YouTube player laid exactly over the board's picture
 * (its position worked out from the 3D view each frame). Computers only: on a phone the movie
 * panel plays it instead.
 */
function TrailerOnScreen() {
  const nowShowing = useGame((s) => s.nowShowing);
  const shared = useGame((s) => s.shared);
  const box = useRef<HTMLDivElement>(null);
  const movie = allMovies(shared).find((m) => m.id === nowShowing && m.trailer);
  useEffect(() => {
    if (!movie) return;
    let id = 0;
    const tick = () => {
      const r = trailerRect.r;
      const el = box.current;
      if (el) {
        if (r && r.width > 40) {
          Object.assign(el.style, { display: "block", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
        } else el.style.display = "none";
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [movie]);
  if (!movie || (typeof window !== "undefined" && window.innerWidth < 640)) return null;
  return (
    <div ref={box} className="pointer-events-auto fixed z-20 overflow-hidden bg-black" style={{ display: "none" }}>
      <TrailerPlayer id={movie.trailer!} className="h-full w-full" />
    </div>
  );
}

/** Hold-to-walk arrows (phones and tablets). */
function Pad() {
  const hold = (k: "up" | "down" | "left" | "right", v: boolean) => (e: React.PointerEvent) => {
    e.preventDefault();
    input[k] = v;
  };
  const B = ({ k, label, className }: { k: "up" | "down" | "left" | "right"; label: string; className: string }) => (
    <button
      className={`pad-btn ${className}`}
      onPointerDown={hold(k, true)}
      onPointerUp={hold(k, false)}
      onPointerLeave={hold(k, false)}
      onPointerCancel={hold(k, false)}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={k}
    >
      {label}
    </button>
  );
  return (
    <div className="pointer-events-auto fixed bottom-5 right-4 z-20 grid grid-cols-3 grid-rows-3 gap-1.5" style={{ width: 168, height: 168 }}>
      <B k="up" label="▲" className="col-start-2 row-start-1" />
      <B k="left" label="◀" className="col-start-1 row-start-2" />
      <B k="right" label="▶" className="col-start-3 row-start-2" />
      <B k="down" label="▼" className="col-start-2 row-start-3" />
    </div>
  );
}

export function Overlay() {
  const phase = useGame((s) => s.phase);
  const panel = useGame((s) => s.panel);
  const sex = useGame((s) => s.sex);
  const prompt = useGame((s) => s.prompt);
  const toast = useGame((s) => s.toast);
  const swimming = useGame((s) => s.swimming);
  const me = useGame((s) => s.me);
  const set = useGame((s) => s.set);
  const setSex = useGame((s) => s.setSex);
  const [touch, setTouch] = useState(false);
  const seatedAt = useGame((s) => s.seatedAt);
  const seatKind = SEATS.find((x) => x.id === seatedAt)?.kind;
  // at a table, the "at the table" card takes the place of the prompt
  const atTable = !!seatKind && seatKind !== "movie" && seatKind !== "lounger";
  // phones and tablets (or any narrow screen) get the on-screen pad
  useEffect(() => {
    const check = () => setTouch(window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (phase === "loading") return null;
  const walk = phase === "walk";

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* title */}
      <div className="absolute left-4 top-4 sm:left-6 sm:top-5">
        <div className="eyebrow tracking-[0.35em] drop">{EVENT.short}</div>
        <div className="title text-2xl leading-none text-white drop sm:text-3xl">Staycation</div>
        <div className="mt-1 text-[10.5px] font-semibold text-white/80 drop">
          {EVENT.venue} · {EVENT.city} · {EVENT.dates}
        </div>
      </div>

      {/* the opening flight */}
      {phase === "intro" && (
        <div className="absolute inset-x-0 bottom-10 flex flex-col items-center text-center">
          <div className="title rise text-4xl text-white drop sm:text-6xl">Welcome to {EVENT.venue}</div>
          <div className="rise mt-2 text-sm text-white/85 drop">A weekend away for {EVENT.short}: pool, food, films, games and old friends</div>
          <button className="pointer-events-auto mt-5 text-xs uppercase tracking-[0.2em] text-white/80 underline-offset-4 hover:underline" onClick={() => set({ phase: "aerial" })}>
            Skip ›
          </button>
        </div>
      )}

      {/* from the air: pick your avatar, walk in */}
      {phase === "aerial" && !panel && (
        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-3 px-4">
          <div className="pointer-events-auto flex items-center gap-1 rounded-md bg-black/55 p-1 backdrop-blur">
            {(["f", "m"] as const).map((s) => (
              <button key={s} onClick={() => setSex(s)} className={`rounded px-4 py-2 text-xs font-bold uppercase tracking-wider ${sex === s ? "bg-[var(--sun)] text-black" : "text-white/75 hover:text-white"}`}>
                {s === "f" ? "♀ Female" : "♂ Male"}
              </button>
            ))}
          </div>
          <button className="btn pointer-events-auto px-7 py-3.5 text-sm shadow-xl" onClick={() => set({ phase: "walk", respawn: useGame.getState().respawn + 1 })}>
            {me ? `Walk in, ${me.first} →` : "Walk in through the gate →"}
          </button>
          <div className="text-center text-[11px] text-white/80 drop">Drag to look around · scroll to zoom · tap a button to check in, see the menu, vote and more</div>
        </div>
      )}

      {/* walking: what E does here */}
      {walk && !panel && prompt && !atTable && (
        <div className={`absolute inset-x-0 flex justify-center px-4 ${touch ? "bottom-[200px]" : "bottom-24"}`}>
          <button className="prompt pointer-events-auto" onClick={() => fireAction()}>
            {prompt.text}
          </button>
        </div>
      )}
      {walk && !panel && !touch && (
        <div className="absolute bottom-3 left-4 text-[10px] text-white/70 drop">
          <b>↑ ↓</b> walk · <b>← →</b> turn · <b>Shift</b> run · <b>E</b> talk, sit or open · drag to look all round you · scroll to zoom
          {swimming && " · you're swimming 🏊"}
        </div>
      )}
      {walk && !panel && touch && !seatedAt && <Pad />}
      {walk && !panel && (
        <div className="absolute inset-x-0 top-[86px] flex justify-center px-3 sm:top-4">
          <NextCard />
        </div>
      )}
      {walk && panel === "movie" && <TrailerOnScreen />}
      {walk && !panel && <RoommateNews />}
      {walk && !panel && <TableTalk />}
      {phase === "setup" && <Setup />}
      {phase === "celebrate" && <Celebrate />}
      {phase === "arrive" && (
        <div className="absolute inset-x-0 bottom-8 flex flex-col items-center text-center">
          <div className="title rise text-3xl text-white drop sm:text-5xl">Pulling up at {EVENT.venue}…</div>
          <div className="rise mt-1 text-sm text-white/85 drop">{EVENT.name} · {EVENT.city}</div>
        </div>
      )}

      {toast && (
        <div className="absolute inset-x-0 top-[150px] flex justify-center px-4 sm:top-24">
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  );
}
