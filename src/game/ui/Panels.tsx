"use client";

import { useEffect, useMemo, useState } from "react";
import { EVENT, YEARBOOK_OPEN } from "../data/event";
import { COURSES, mealSlots } from "../data/menu";
import type { Person } from "../data/samples";
import { GUEST_NAMES } from "../data/guests";
import { allAwards, allGames, allMovies, dishName, dishesFor } from "../data/choices";
import { isFor, sameName } from "../data/roommates";
import { post, useGame, type Me, type Shared } from "../store";
import type { SpotId } from "../world/layout";

// The panels each spot opens: check-in, the Yearbook, room partners, the menu, movie night, games
// and the awards. On a computer they slide in from the right (the camera has flown to the spot on
// the left); on a phone they're a sheet from the bottom.

const fullName = (p: Person) => `${p.first} ${p.last}`;

function Shell({ kicker, title, children, wide }: { kicker: string; title: string; children: React.ReactNode; wide?: boolean }) {
  const set = useGame((s) => s.set);
  const close = () => set({ panel: null, focus: null });
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-end justify-center sm:items-start sm:justify-end">
      <div className="absolute inset-0 bg-black/25 sm:bg-transparent pointer-events-auto sm:pointer-events-none" onClick={close} />
      <section
        className={`panel pointer-events-auto relative flex max-h-[88dvh] w-full flex-col sm:m-4 sm:max-h-[calc(100dvh-2rem)] ${wide ? "sm:w-[560px]" : "sm:w-[440px]"}`}
        role="dialog"
        aria-label={title}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 pb-4 pt-5">
          <div>
            <div className="eyebrow">{kicker}</div>
            <h2 className="title mt-1 text-3xl">{title}</h2>
          </div>
          <button onClick={close} className="close" aria-label="Close">
            ✕
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-sm text-white/85">{children}</div>
      </section>
    </div>
  );
}

/** Most things need your key card: this sends you to check in first. */
function NeedCheckIn({ what }: { what: string }) {
  const set = useGame((s) => s.set);
  const focus = useGame((s) => s.focus);
  return (
    <div className="card mt-1 p-4">
      <p>
        Check in first to {what}. It takes a minute and gives you your <b>key card</b> for the weekend.
      </p>
      <button className="btn mt-3 w-full" onClick={() => set({ panel: "checkin", focus: focus ? "checkin" : null })}>
        🔑 Check in
      </button>
    </div>
  );
}

function useSend() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const send = async (path: string, body: Record<string, unknown>) => {
    setBusy(true);
    setErr("");
    try {
      const shared = await post<Shared>(path, body);
      useGame.getState().set({ shared });
      return true;
    } catch (e) {
      setErr((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, err, send };
}

/**
 * Suggest something new (a movie, a dish or drink, a game, an award): it's saved and joins the
 * list for everyone. `extra` is an optional select (e.g. which course a dish is for).
 */
function SuggestBox({ kind, placeholder, extra }: { kind: "movie" | "dish" | "game" | "award"; placeholder: string; extra?: { value: string; options: { id: string; label: string }[] } }) {
  const me = useGame((s) => s.me);
  const [text, setText] = useState("");
  const [course, setCourse] = useState(extra?.value ?? "");
  useEffect(() => {
    if (extra) setCourse(extra.value);
  }, [extra?.value]); // eslint-disable-line react-hooks/exhaustive-deps
  const { busy, err, send } = useSend();
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) {
      useGame.getState().set({ panel: "checkin" });
      return;
    }
    if (await send("/api/suggest", { kind, text, course })) {
      useGame.getState().say(`Thanks! “${text.trim()}” is on the list for everyone 💡`);
      setText("");
    }
  };
  return (
    <form onSubmit={go} className="card mt-3 p-3">
      <div className="eyebrow">💡 Suggest one</div>
      <div className="mt-2 flex gap-2">
        <input className="input min-w-0 flex-1 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={60} />
        {extra && (
          <select className="input w-auto text-sm" value={course} onChange={(e) => setCourse(e.target.value)}>
            {extra.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        <button className="btn shrink-0 px-3 text-sm" disabled={busy || text.trim().length < 2}>
          Add
        </button>
      </div>
      <div className="mt-1 text-[11px] text-white/45">{me ? "It's added to the list and everyone can choose it." : "You'll check in first (name and email)."}</div>
      {err && <p className="mt-1 text-[12px] text-[#ff9b7a]">{err}</p>}
    </form>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-white/45">{hint}</span>}
    </label>
  );
}

function Avatar({ p, size = 44 }: { p: Person; size?: number }) {
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = [12, 190, 32, 280, 150, 350, 210, 45][h % 8];
  return (
    <div
      className="flex shrink-0 items-center justify-center font-[family-name:var(--font-serif)] font-bold text-white"
      style={{ width: size, height: size, background: `hsl(${hue} 55% 45%)`, borderRadius: 6, fontSize: size * 0.4 }}
    >
      {(p.first[0] + (p.last[0] ?? "")).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function CheckIn() {
  const me = useGame((s) => s.me);
  const sex = useGame((s) => s.sex);
  const set = useGame((s) => s.set);
  const [editing, setEditing] = useState(!me);
  const [name, setName] = useState(me ? `${me.first} ${me.last}`.trim() : useGame.getState().guestName);
  const [email, setEmail] = useState(me?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, sex }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't check you in. Try again.");
      const next: Me = { ...(data as Me), at: Date.now() };
      useGame.getState().checkIn(next);
      useGame.getState().setGuestName(next.first);
      await useGame.getState().refresh();
      // checking in again (same email, maybe another phone): bring back what you chose before
      if (data.again) await useGame.getState().restore();
      // a room partner picked before checking in: ask for them now, and go back to that panel
      const pending = useGame.getState().pendingRoommate;
      if (pending) {
        try {
          const shared = await post<Shared>("/api/roommate", { to: pending });
          useGame.getState().set({ shared, pendingRoommate: null, panel: "roommate" });
          useGame.getState().setPicks({ roommate: pending });
          useGame.getState().markDone("roommate");
        } catch {
          useGame.getState().set({ pendingRoommate: null });
        }
      }
      useGame.getState().say(data.again ? `Welcome back, ${next.first}! Same key card as before 🔑` : `You're checked in, ${next.first}! 🔑`);
      setEditing(false);
    } catch (x) {
      setError((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (me && !editing)
    return (
      <Shell kicker="Welcome desk" title="Your key card">
        <div className="keycard p-5">
          <div className="flex items-center justify-between">
            <div className="eyebrow !text-[#0e3c45]">{EVENT.name}</div>
            <div className="text-xs font-bold text-[#0e3c45]/70">{EVENT.venue.toUpperCase()}</div>
          </div>
          <div className="mt-6 font-[family-name:var(--font-serif)] text-3xl font-bold text-[#10282d]">{`${me.first} ${me.last}`.trim()}</div>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#10282d]/60">Key card</div>
              <div className="font-mono text-xl font-bold tracking-wider text-[#10282d]">{me.card}</div>
            </div>
            <div className="text-4xl">🔑</div>
          </div>
        </div>
        <p className="mt-4 text-white/70">That&apos;s it, you&apos;re in! Checking in again with the same email on another phone gives you the same card.</p>
        <button className="btn mt-4 w-full py-3" onClick={() => set({ panel: null, focus: null })}>
          Let&apos;s go 🌴
        </button>
        <button className="mt-3 text-xs text-white/50 underline" onClick={() => setEditing(true)}>
          Change my name or email
        </button>
      </Shell>
    );

  return (
    <Shell kicker="Welcome desk" title="Get your key card">
      <p className="text-white/70">Just two things and you&apos;re in.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Field label="What would you like to be called?">
          <input className="input text-base" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={40} />
        </Field>
        <Field label="Your email">
          <input className="input text-base" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        </Field>
        {error && <p className="text-[#ff9b7a]">{error}</p>}
        <button className="btn w-full py-3 text-base" type="submit" disabled={busy}>
          {busy ? "Checking you in…" : "Get my key card 🔑"}
        </button>
      </form>
    </Shell>
  );
}

// ---------------------------------------------------------------------------------------------

function Yearbook() {
  const people = useGame((s) => s.shared.people);
  const me = useGame((s) => s.me);
  const set = useGame((s) => s.set);
  const focus = useGame((s) => s.focus);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const list = useMemo(() => {
    const all = me ? [me as Person, ...people.filter((p) => p.id !== me.id)] : people;
    const k = q.trim().toLowerCase();
    return k ? all.filter((p) => `${p.first} ${p.last} ${p.nickname ?? ""} ${p.set ?? ""} ${p.house ?? ""}`.toLowerCase().includes(k)) : all;
  }, [people, me, q]);
  const per = 4;
  const pages = Math.max(1, Math.ceil(list.length / per));
  const p = Math.min(page, pages - 1);
  useEffect(() => useGame.getState().markDone("yearbook"), []);
  if (!YEARBOOK_OPEN)
    return (
      <Shell kicker="The Yearbook" title="Not available yet">
        <div className="book text-center text-[#1d1d1d]">
          <div className="text-5xl">📖</div>
          <p className="mt-3 font-[family-name:var(--font-serif)] text-xl font-bold">The Yearbook opens soon</p>
          <p className="mt-2 text-[13px] text-[#444]">
            Put your name in now and you&apos;ll be on its pages, with your set, house and a line about you, the day it opens.
          </p>
          <p className="mt-4 text-[13px] font-bold text-[#0e5d6b]">
            {people.length} {people.length === 1 ? "name" : "names"} in so far
          </p>
        </div>
        {me ? (
          <div className="card mt-4 p-4">
            <div className="eyebrow">You&apos;re in ✓</div>
            <div className="mt-1 font-bold">
              {me.first} {me.last}
              {me.set ? ` · Class of ${me.set}` : ""}
            </div>
            {me.quote && <div className="mt-1 text-[13px] italic text-white/70">“{me.quote}”</div>}
          </div>
        ) : (
          <button className="btn mt-4 w-full py-3" onClick={() => set({ panel: "checkin", focus: focus ? "checkin" : null })}>
            ✍️ Put my name in
          </button>
        )}
      </Shell>
    );
  return (
    <Shell kicker="The Yearbook" title="Who's coming" wide>
      <input className="input" placeholder="Search a name, set or house" value={q} onChange={(e) => (setQ(e.target.value), setPage(0))} />
      <div className="book mt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {list.slice(p * per, p * per + per).map((x) => (
            <article key={x.id} className="page-card p-3">
              <div className="flex gap-3">
                <Avatar p={x} size={56} />
                <div className="min-w-0">
                  <div className="font-[family-name:var(--font-serif)] text-lg font-bold leading-tight text-[#1d1d1d]">{fullName(x)}</div>
                  <div className="text-[12px] font-bold text-[#c0643a]">{[x.nickname && `“${x.nickname}”`, x.set && `Class of ${x.set}`].filter(Boolean).join(" · ")}</div>
                  {x.house && <div className="text-[12px] text-[#555]">{x.house} House</div>}
                </div>
              </div>
              {x.quote && <p className="mt-2 font-[family-name:var(--font-serif)] text-[13px] italic text-[#333]">{x.quote}</p>}
              <div className="mt-2 flex items-center gap-2">
                {x.sample && <span className="tag">sample</span>}
                {me?.id === x.id && <span className="tag !bg-[#e07a45] !text-black">you</span>}
              </div>
            </article>
          ))}
        </div>
        {!list.length && <p className="p-6 text-center text-[#555]">Nobody matches that yet.</p>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button className="btn-ghost px-4" disabled={p === 0} onClick={() => setPage(p - 1)}>
          ← Prev
        </button>
        <span className="text-xs text-white/55">
          Page {p + 1} of {pages} · {list.length} {list.length === 1 ? "person" : "people"}
        </span>
        <button className="btn-ghost px-4" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>
          Next →
        </button>
      </div>
      {!me && (
        <button className="btn mt-4 w-full" onClick={() => set({ panel: "checkin", focus: focus ? "checkin" : null })}>
          Add yourself to the Yearbook
        </button>
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------------------------

/** Who's asked to room with you (not turned down), who you've asked, and whether it's a match. */
export function useRoommates() {
  const me = useGame((s) => s.me);
  const shared = useGame((s) => s.shared);
  return useMemo(() => {
    if (!me) return null;
    const person = (id: string) => shared.people.find((p) => p.id === id);
    const label = (to: string) => (to.startsWith("name:") ? to.slice(5) : person(to) ? fullName(person(to)!) : "Someone");
    const declined = new Set((shared.declines ?? []).filter((d) => d.by === me.id).map((d) => d.from));
    const mine = shared.roommates.find((r) => r.from === me.id)?.to;
    const wantsMe = shared.roommates.filter((r) => r.from !== me.id && isFor(r.to, me) && !declined.has(r.from)).map((r) => r.from);
    // a match: I asked them (by id or by their name) and they asked me
    const partner = mine ? wantsMe.find((id) => person(id) && isFor(mine, person(id)!)) : undefined;
    return { me, mine, wantsMe, partner, label, person };
  }, [me, shared]);
}

function Roommate() {
  const me = useGame((s) => s.me);
  const shared = useGame((s) => s.shared);
  const guestName = useGame((s) => s.guestName);
  const rm = useRoommates();
  const { busy, err, send } = useSend();
  const [q, setQ] = useState("");
  // (before you've checked in you can still look through everyone and pick: the request goes as
  // soon as you have your key card)
  const mine = rm?.mine ?? (useGame.getState().pendingRoommate || undefined);
  const wantsMe = rm?.wantsMe ?? [];
  const partner = rm?.partner;
  const label = rm?.label ?? ((to: string) => (to.startsWith("name:") ? to.slice(5) : "Someone"));
  // everyone you could pick: people who've checked in, and the rest of the crowd by name
  const registered = shared.people.filter((p) => !p.sample && p.id !== me?.id);
  const myName = me ? `${me.first} ${me.last}` : guestName;
  // the crowd: everyone on the list who hasn't checked in (and isn't you); matched by full name
  const crowd = GUEST_NAMES.filter((g) => !registered.some((p) => fullName(p).toLowerCase() === g.name.toLowerCase()) && !(myName && sameName(g.name, myName)));
  const k = q.trim().toLowerCase();
  const options = [
    ...registered.map((p) => ({ key: p.id, name: fullName(p), here: true, p })),
    ...crowd.map((g) => ({ key: `name:${g.name}`, name: g.name, here: false, p: null as Person | null })),
  ]
    .filter((o) => !k || o.name.toLowerCase().includes(k))
    .sort((a, b) => a.name.localeCompare(b.name));
  const choose = async (to: string) => {
    if (!me) {
      // not checked in yet: check in first, then the request goes
      useGame.getState().set({ pendingRoommate: to, panel: "checkin" });
      useGame.getState().say(`Get your key card first, then we'll ask ${label(to)} for you 🔑`);
      return;
    }
    if (await send("/api/roommate", { to })) {
      useGame.getState().setPicks({ roommate: to });
      useGame.getState().markDone("roommate");
      useGame.getState().say(to ? `Request sent to ${label(to)} 🛏️` : "Room partner cleared");
    }
  };
  const decline = async (from: string) => {
    if (await send("/api/decline", { from })) useGame.getState().say("Declined");
  };
  return (
    <Shell kicker="Reception" title="Room partner">
      <p className="text-white/70">Pick anyone coming, even if they haven&apos;t checked in yet. They&apos;ll see your request when they arrive; when they accept, you&apos;re room partners.</p>
      {!me && <p className="mt-2 text-[12px] text-[var(--sun)]">You&apos;ll check in (name and email) when you choose: it only takes a moment.</p>}
      {partner ? (
        <div className="card mt-3 border-[#7fd3d9]/50 p-4">
          <div className="eyebrow">It&apos;s a match 🎉</div>
          <div className="mt-1 text-lg font-bold">You and {label(partner)} are room partners</div>
          <div className="text-xs text-white/55">Reception will put you together.</div>
        </div>
      ) : mine ? (
        <div className="card mt-3 p-4">
          <div className="eyebrow">Your request</div>
          <div className="mt-1 font-bold">{label(mine)}</div>
          <div className="text-xs text-white/55">{mine.startsWith("name:") ? "Not here yet: they'll see it when they arrive." : "Waiting for them to accept."}</div>
          <button className="mt-2 text-xs text-white/60 underline" onClick={() => choose("")} disabled={busy}>
            Cancel my request
          </button>
        </div>
      ) : null}
      {!partner && wantsMe.length > 0 && (
        <div className="card mt-3 p-4">
          <div className="eyebrow">💌 They want to room with you</div>
          {wantsMe.map((id) => (
            <div key={id} className="mt-2 flex items-center justify-between gap-2">
              <span className="font-bold">{label(id)}</span>
              <span className="flex gap-1.5">
                <button className="btn px-3 py-1.5 text-xs" onClick={() => choose(id)} disabled={busy}>
                  Accept 🤝
                </button>
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => decline(id)} disabled={busy}>
                  Decline
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      <input className="input mt-4" placeholder={`Search ${registered.length + crowd.length} people coming`} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      <ul className="mt-2 divide-y divide-white/10">
        {options.map((o) => (
          <li key={o.key} className="flex items-center gap-3 py-2.5">
            <Avatar p={o.p ?? { id: o.key, first: o.name, last: "" }} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{o.name}</div>
              <div className="text-[11px] text-white/50">{o.here ? "Checked in" : "Not checked in yet"}</div>
            </div>
            {mine === o.key ? (
              <span className="text-xs text-[var(--sun)]">Requested</span>
            ) : (
              <button className="btn-ghost px-3 py-1.5 text-xs" disabled={busy} onClick={() => choose(o.key)}>
                Choose
              </button>
            )}
          </li>
        ))}
        {!options.length && <li className="py-4 text-center text-white/55">Nobody by that name.</li>}
      </ul>
      {err && <p className="mt-2 text-[#ff9b7a]">{err}</p>}
    </Shell>
  );
}

// ---------------------------------------------------------------------------------------------

function Menu({ grill }: { grill?: boolean }) {
  const me = useGame((s) => s.me);
  const shared = useGame((s) => s.shared);
  const picks = useGame((s) => s.picks);
  const slots = useMemo(() => mealSlots(EVENT.nights), []);
  const grillSlot = slots.find((s) => s.courses.includes("grill"))!;
  const [slot, setSlot] = useState(grill ? grillSlot.id : slots[0].id);
  const cur = slots.find((s) => s.id === slot)!;
  const [sel, setSel] = useState<Record<string, string>>(picks.meals[slot] ?? {});
  useEffect(() => setSel(useGame.getState().picks.meals[slot] ?? {}), [slot]);
  const { busy, err, send } = useSend();
  const save = async () => {
    if (await send("/api/order", { slot, dishes: sel })) {
      useGame.getState().setPicks({ meals: { ...useGame.getState().picks.meals, [slot]: sel } });
      useGame.getState().markDone("menu");
      useGame.getState().say(`${cur.label}: saved 🍽️`);
    }
  };
  return (
    <Shell kicker={grill ? "The grill" : "The bar & dining room"} title={grill ? "Grill night" : "The menu"} wide>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-2">
        {slots.map((s) => (
          <button key={s.id} className={`chip shrink-0 ${s.id === slot ? "chip-on" : ""}`} onClick={() => setSlot(s.id)}>
            {s.label}
            {picks.meals[s.id] && " ✓"}
          </button>
        ))}
      </div>
      {cur.courses.map((cid) => {
        const c = COURSES.find((x) => x.id === cid)!;
        return (
          <div key={cid} className="mt-4">
            <div className="eyebrow">{c.label}</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {dishesFor(cid, shared).map((d) => {
                const on = sel[cid] === d.id;
                return (
                  <button key={d.id} onClick={() => setSel({ ...sel, [cid]: d.id })} className={`dish text-left ${on ? "dish-on" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{d.name}</span>
                      {"by" in d && d.by && <span className="tag">💡 suggested</span>}
                      {d.tag && <span className={`tag ${d.tag === "alcohol" ? "!bg-[#5b2a4a]/60 !text-[#f6b7dc]" : ""}`}>{d.tag === "chef" ? "chef's pick" : d.tag === "alcohol" ? "🍷 alcohol" : d.tag}</span>}
                    </div>
                    {d.note && <div className="mt-0.5 text-[12px] opacity-70">{d.note}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <SuggestBox
        kind="dish"
        placeholder="Suggest a dish or drink (e.g. Nkwobi)"
        extra={{ value: cur.courses[0], options: cur.courses.map((id) => ({ id, label: COURSES.find((c) => c.id === id)!.label })) }}
      />
      <div className="sticky bottom-0 -mx-5 mt-4 border-t border-white/10 bg-[var(--panel)] px-5 pt-3">
        {me ? (
          <button className="btn w-full py-3" onClick={save} disabled={busy || !Object.keys(sel).length}>
            {busy ? "Saving…" : `Save ${cur.label.toLowerCase()}`}
          </button>
        ) : (
          <NeedCheckIn what="save your meal choices" />
        )}
        {err && <p className="mt-2 text-[#ff9b7a]">{err}</p>}
        <p className="pb-3 pt-2 text-[11px] text-white/45">
          Your picks:{" "}
          {Object.values(sel)
            .map((id) => dishName(id, shared))
            .filter(Boolean)
            .join(" · ") || "nothing yet"}
        </p>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------------------------

/** A trailer playing (YouTube), muted sound handled by the player itself. */
export function TrailerPlayer({ id, className = "" }: { id: string; className?: string }) {
  return (
    <iframe
      key={id}
      className={className}
      src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
      title="Trailer"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

function MovieNight() {
  const me = useGame((s) => s.me);
  const shared = useGame((s) => s.shared);
  const votes = shared.movies;
  const mine = useGame((s) => s.picks.movie);
  const nowShowing = useGame((s) => s.nowShowing);
  const small = typeof window !== "undefined" && window.innerWidth < 640;
  const { busy, err, send } = useSend();
  const movies = allMovies(shared);
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const playing = movies.find((m) => m.id === nowShowing && m.trailer);
  // stop the trailer when the panel closes
  useEffect(() => () => useGame.getState().set({ nowShowing: null }), []);
  const vote = async (id: string) => {
    if (await send("/api/movie", { movie: id })) {
      useGame.getState().setPicks({ movie: id });
      useGame.getState().markDone("movie");
      useGame.getState().say(`Voted: ${movies.find((m) => m.id === id)?.title ?? "your pick"} 🎬`);
    }
  };
  const watch = (m: (typeof movies)[number]) => {
    if (m.trailer) useGame.getState().set({ nowShowing: m.id });
    else window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.title} official trailer`)}`, "_blank", "noopener");
  };
  return (
    <Shell kicker="Movie night · the big screen" title="Pick the film">
      {/* on a phone the panel covers the screen: the trailer plays here instead */}
      {playing && small && <TrailerPlayer id={playing.trailer!} className="mb-3 aspect-video w-full rounded-lg" />}
      {playing && !small && (
        <div className="card mb-3 flex items-center justify-between p-2.5 text-sm">
          <span>
            ▶ Now on the big screen: <b>{playing.title}</b>
          </span>
          <button className="text-xs underline text-white/60" onClick={() => useGame.getState().set({ nowShowing: null })}>
            Stop
          </button>
        </div>
      )}
      <p className="text-white/70">Watch the trailers on the big screen, then vote (one vote each; you can change it). Don&apos;t see your film? Suggest it below.</p>
      {!me && <NeedCheckIn what="vote" />}
      <div className="mt-4 space-y-2">
        {[...movies]
          .sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0))
          .map((m) => {
            const v = votes[m.id] ?? 0;
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                aria-disabled={!me || busy}
                onClick={() => me && !busy && vote(m.id)}
                onKeyDown={(e) => e.key === "Enter" && me && !busy && vote(m.id)}
                className={`movie w-full cursor-pointer text-left ${mine === m.id ? "movie-on" : ""} ${!me ? "opacity-85" : ""}`}
              >
                <div className="absolute inset-y-0 left-0 opacity-35" style={{ width: `${total ? (v / total) * 100 : 0}%`, background: m.color }} />
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">{m.title}</div>
                    <div className="text-[11px] opacity-65">{m.year ? `${m.year} · ${m.genre}` : m.genre}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold hover:bg-white/10 ${nowShowing === m.id ? "border-[var(--sun)] text-[var(--sun)]" : "border-white/30"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        watch(m);
                      }}
                    >
                      ▶ {nowShowing === m.id ? "Playing" : "Trailer"}
                    </button>
                    <div className="text-right text-xs">
                      <div className="font-bold">{v}</div>
                      <div className="opacity-60">{mine === m.id ? "your vote" : "votes"}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
      <SuggestBox kind="movie" placeholder="Suggest a movie (e.g. The Notebook)" />
      {err && <p className="mt-2 text-[#ff9b7a]">{err}</p>}
    </Shell>
  );
}

// ---------------------------------------------------------------------------------------------

function Games() {
  const me = useGame((s) => s.me);
  const shared = useGame((s) => s.shared);
  const joined = useGame((s) => s.shared.games);
  const mine = useGame((s) => s.picks.games);
  const [sel, setSel] = useState<string[]>(mine);
  const { busy, err, send } = useSend();
  const save = async () => {
    if (await send("/api/games", { games: sel })) {
      useGame.getState().setPicks({ games: sel });
      useGame.getState().markDone("games");
      useGame.getState().say(sel.length ? `You're in for ${sel.length} game${sel.length > 1 ? "s" : ""} ⚽` : "Games cleared");
    }
  };
  return (
    <Shell kicker="The field, the pool, the courtyard" title="Games" wide>
      <p className="text-white/70">Tick everything you want to play. Teams and times go up once everyone&apos;s in.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {allGames(shared).map((g) => {
          const on = sel.includes(g.id);
          const who = joined[g.id] ?? [];
          return (
            <button key={g.id} onClick={() => setSel(on ? sel.filter((x) => x !== g.id) : [...sel, g.id])} className={`dish text-left ${on ? "dish-on" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">
                  {g.icon} {g.name}
                </span>
                <span className="text-lg">{on ? "☑" : "☐"}</span>
              </div>
              <div className="mt-0.5 text-[12px] opacity-70">
                {g.where} · {who.length ? `${who.length} in: ${who.slice(0, 3).join(", ")}${who.length > 3 ? "…" : ""}` : "be the first"}
              </div>
            </button>
          );
        })}
      </div>
      <SuggestBox kind="game" placeholder="Suggest a game (e.g. Monopoly Deal)" />
      <div className="sticky bottom-0 -mx-5 mt-4 border-t border-white/10 bg-[var(--panel)] px-5 py-3">
        {me ? (
          <button className="btn w-full py-3" onClick={save} disabled={busy}>
            {busy ? "Saving…" : `Count me in (${sel.length})`}
          </button>
        ) : (
          <NeedCheckIn what="join games" />
        )}
        {err && <p className="mt-2 text-[#ff9b7a]">{err}</p>}
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------------------------

function Awards() {
  const me = useGame((s) => s.me);
  const shared = useGame((s) => s.shared);
  const picks = useGame((s) => s.picks.awards);
  const { busy, err, send } = useSend();
  const [open, setOpen] = useState<string | null>(null);
  const nominate = async (award: string, nominee: string) => {
    if (await send("/api/award", { award, nominee })) {
      useGame.getState().setPicks({ awards: { ...useGame.getState().picks.awards, [award]: nominee } });
      useGame.getState().markDone("awards");
      const p = shared.people.find((x) => x.id === nominee);
      useGame.getState().say(`Nominated ${p ? p.first : "them"} 🏆`);
      setOpen(null);
    }
  };
  // (the sample classmates can't be nominated: only people who've really checked in)
  const others = shared.people.filter((p) => p.id !== me?.id && !p.sample);
  return (
    <Shell kicker="The awards board" title="Nominate" wide>
      <p className="text-white/70">One nomination per award (change it any time). Winners are announced on the last night.</p>
      {!me && <NeedCheckIn what="nominate people" />}
      <div className="mt-4 space-y-2">
        {allAwards(shared).map((a) => {
          const lead = shared.awards[a.id] ?? [];
          const mine = picks[a.id];
          const minePerson = shared.people.find((p) => p.id === mine);
          return (
            <div key={a.id} className="card p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-[family-name:var(--font-serif)] text-lg font-bold">{a.title}</div>
                  <div className="text-[12px] text-white/55">{a.blurb}</div>
                </div>
                <button className="btn-ghost shrink-0 px-3 py-1.5 text-xs" disabled={!me} onClick={() => setOpen(open === a.id ? null : a.id)}>
                  {mine ? "Change" : "Nominate"}
                </button>
              </div>
              {(lead.length > 0 || minePerson) && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
                  {lead.slice(0, 3).map((l, i) => (
                    <span key={l.id} className="tag !normal-case">
                      {["🥇", "🥈", "🥉"][i]} {l.name} · {l.count}
                    </span>
                  ))}
                  {minePerson && <span className="text-white/55">Your pick: {minePerson.first}</span>}
                </div>
              )}
              {open === a.id && !others.length && <p className="mt-3 text-white/55">Nobody else has checked in yet. Share the link!</p>}
              {open === a.id && (
                <div className="mt-3 grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
                  {others.map((p) => (
                    <button key={p.id} disabled={busy} onClick={() => nominate(a.id, p.id)} className={`flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10 ${mine === p.id ? "bg-white/10" : ""}`}>
                      <Avatar p={p} size={26} />
                      <span className="truncate">{fullName(p)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <SuggestBox kind="award" placeholder="Suggest an award (e.g. Best Laugh)" />
      {err && <p className="mt-2 text-[#ff9b7a]">{err}</p>}
    </Shell>
  );
}

export function Panels() {
  const panel = useGame((s) => s.panel);
  const id = panel as SpotId | null;
  switch (id) {
    case "checkin":
      return <CheckIn />;
    case "yearbook":
      return <Yearbook />;
    case "roommate":
      return <Roommate />;
    case "menu":
      return <Menu />;
    case "grill":
      return <Menu grill />;
    case "movie":
      return <MovieNight />;
    case "games":
      return <Games />;
    case "awards":
      return <Awards />;
    default:
      return null;
  }
}
