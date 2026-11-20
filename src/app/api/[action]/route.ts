import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { rows, save } from "@/server/storage";
import { AWARDS, GAMES, MOVIES } from "@/game/data/activities";
import { DISHES, mealSlots } from "@/game/data/menu";
import { EVENT, SAMPLES_UNTIL } from "@/game/data/event";
import { SAMPLE_PEOPLE, type Person } from "@/game/data/samples";
import { crowdName, isFor } from "@/game/data/roommates";

// One small API for the whole resort:
//   GET  /api/state      everything people have shared (no emails, phones or key cards)
//   POST /api/checkin    check in: get your key card
//   POST /api/order      your meal for one slot
//   POST /api/movie      your movie-night vote
//   POST /api/games      the games you're joining
//   POST /api/award      a nomination
//   POST /api/roommate   who you'd like to share a room with (someone checked in, or a name from the crowd)
//   POST /api/decline    say no to someone's room-partner request
//   POST /api/mine       your own choices so far (to show them again on another phone)
//   POST /api/suggest    suggest a movie, a dish or drink, a game or an award: it joins the list

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

type PersonRow = Person & { card: string; email?: string; phone?: string };

/** The latest check-in per key card. */
async function people(): Promise<PersonRow[]> {
  const byCard = new Map<string, PersonRow>();
  for (const r of await rows("people")) byCard.set(String(r.card), r as unknown as PersonRow);
  return [...byCard.values()];
}

/** The latest entry per (person, key) in a table. */
async function latest(table: "orders" | "votes" | "games" | "awards" | "roommates" | "declines", key: (r: Record<string, unknown>) => string) {
  const m = new Map<string, Record<string, unknown>>();
  for (const r of await rows(table)) m.set(`${r.by}|${key(r)}`, r);
  return [...m.values()];
}

export type Suggestion = { id: string; kind: "movie" | "dish" | "game" | "award"; text: string; course?: string; by: string; name: string };
const KINDS = ["movie", "dish", "game", "award"] as const;
const COURSE_IDS = ["mains", "grill", "sides", "breakfast", "drinks"];

/** Everyone's suggestions (each once: the first person to suggest it gets the credit). */
async function suggestions(): Promise<Suggestion[]> {
  const out: Suggestion[] = [];
  for (const r of await rows("suggestions")) {
    const s = r as unknown as Suggestion;
    if (!out.some((o) => o.kind === s.kind && o.text.toLowerCase() === s.text.toLowerCase())) out.push(s);
  }
  return out;
}
const suggested = async (kind: Suggestion["kind"], id: unknown) => typeof id === "string" && (await suggestions()).some((s) => s.kind === kind && s.id === id);

async function whoIs(card: unknown, by: unknown) {
  if (typeof card !== "string" || !card) return null;
  const p = (await people()).find((x) => x.card === card);
  return p && p.id === by ? p : null;
}

async function newCard(taken: Set<string>) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    let id = `${EVENT.cardPrefix}-`;
    for (let i = 0; i < 6; i++) id += abc[randomInt(abc.length)];
    if (!taken.has(id)) return id;
  }
}

async function state() {
  const real = await people();
  const pub: Person[] = real.map(({ id, first, last, nickname, set, house, quote, sex }) => ({ id, first, last, nickname, set, house, quote, sex }));
  const everyone = real.length < SAMPLES_UNTIL ? [...pub, ...SAMPLE_PEOPLE] : pub;
  const name = (id: string) => {
    const p = everyone.find((x) => x.id === id);
    return p ? `${p.first} ${p.last}` : "Someone";
  };

  const movies: Record<string, number> = {};
  for (const v of await latest("votes", () => "movie")) movies[String(v.movie)] = (movies[String(v.movie)] ?? 0) + 1;

  const games: Record<string, string[]> = {};
  for (const g of await latest("games", () => "games"))
    for (const id of (g.games as string[]) ?? []) (games[id] ??= []).push(name(String(g.by)));

  const tally: Record<string, Map<string, number>> = {};
  for (const a of await latest("awards", (r) => String(r.award))) {
    const t = (tally[String(a.award)] ??= new Map());
    t.set(String(a.nominee), (t.get(String(a.nominee)) ?? 0) + 1);
  }
  const awards: Record<string, { id: string; name: string; count: number }[]> = {};
  for (const [award, t] of Object.entries(tally))
    awards[award] = [...t.entries()].map(([id, count]) => ({ id, name: name(id), count })).sort((a, b) => b.count - a.count);

  const roommates = (await latest("roommates", () => "room")).filter((r) => r.to).map((r) => ({ from: String(r.by), to: String(r.to) }));
  const declines = (await latest("declines", (r) => String(r.from))).filter((r) => r.no).map((r) => ({ by: String(r.by), from: String(r.from) }));
  return { people: everyone, movies, games, awards, roommates, declines, suggestions: (await suggestions()).map(({ id, kind, text, course, name }) => ({ id, kind, text, course, name })) };
}

export async function GET(_req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "state") return bad("Not found", 404);
  return NextResponse.json(await state());
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return bad("Send the form as JSON.");

  if (action === "checkin") {
    // just a name (what you'd like to be called) and an email
    const name = clean(body.name ?? `${clean(body.first, 40)} ${clean(body.last, 40)}`, 40);
    const email = clean(body.email, 120).toLowerCase();
    if (!name) return bad("Please tell us what you'd like to be called.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("That email doesn't look right.");
    const all = await people();
    // checking in again from a new device: the same email gets the same key card back
    const again = all.find((p) => p.email === email);
    const card = again?.card ?? (await newCard(new Set(all.map((p) => p.card))));
    const id = again?.id ?? `p-${card.slice(-6).toLowerCase()}`;
    const row: PersonRow = { id, card, first: name, last: "", sex: body.sex === "m" ? "m" : "f", email };
    await save("people", row);
    return NextResponse.json({ ...row, again: !!again });
  }

  const me = await whoIs(body.card, body.by);
  if (!me) return bad("Check in at the gate first: your key card isn't on this device.", 401);

  if (action === "order") {
    const slot = clean(body.slot, 30);
    if (!mealSlots(EVENT.nights).some((s) => s.id === slot)) return bad("Unknown meal.");
    const dishes = (body.dishes ?? {}) as Record<string, string>;
    for (const d of Object.values(dishes)) if (!DISHES.has(d) && !(await suggested("dish", d))) return bad("Unknown dish.");
    await save("orders", { by: me.id, name: `${me.first} ${me.last}`, slot, ...dishes, notes: clean(body.notes, 140) });
  } else if (action === "movie") {
    if (!MOVIES.some((m) => m.id === body.movie) && !(await suggested("movie", body.movie))) return bad("Unknown movie.");
    await save("votes", { by: me.id, movie: body.movie });
  } else if (action === "games") {
    const ours = new Set([...GAMES.map((g) => g.id), ...(await suggestions()).filter((s) => s.kind === "game").map((s) => s.id)]);
    const games = Array.isArray(body.games) ? body.games.filter((g) => ours.has(g)) : [];
    await save("games", { by: me.id, games });
  } else if (action === "award") {
    if (!AWARDS.some((a) => a.id === body.award) && !(await suggested("award", body.award))) return bad("Unknown award.");
    if (typeof body.nominee !== "string" || !body.nominee) return bad("Pick someone to nominate.");
    if (body.nominee === me.id) return bad("Nice try: nominate someone else!");
    if (!(await people()).some((p) => p.id === body.nominee)) return bad("They haven't checked in yet.");
    await save("awards", { by: me.id, award: body.award, nominee: body.nominee });
  } else if (action === "roommate") {
    let to = typeof body.to === "string" ? body.to : "";
    if (to.startsWith("name:")) {
      // someone from the crowd, not checked in yet: kept by name until they do
      const n = crowdName(to.slice(5));
      if (!n) return bad("We don't know that name.");
      to = `name:${n}`;
      if (isFor(to, me)) return bad("Pick someone other than yourself.");
    } else if (to) {
      if (to === me.id) return bad("Pick someone other than yourself.");
      if (!(await people()).some((p) => p.id === to)) return bad("They haven't checked in yet.");
    }
    await save("roommates", { by: me.id, to });
    // asking someone again clears any "no" you'd given them
    if (to && !to.startsWith("name:")) await save("declines", { by: me.id, from: to, no: false });
  } else if (action === "suggest") {
    const kind = KINDS.find((k) => k === body.kind);
    const text = clean(body.text, 60);
    if (!kind) return bad("Suggest what?");
    if (text.length < 2) return bad("Type your suggestion first.");
    const course = kind === "dish" ? (COURSE_IDS.includes(String(body.course)) ? String(body.course) : "mains") : undefined;
    // already on the list (ours or someone's suggestion): nothing new to add
    const known =
      (kind === "movie" && MOVIES.some((m) => m.title.toLowerCase() === text.toLowerCase())) ||
      (kind === "game" && GAMES.some((g) => g.name.toLowerCase() === text.toLowerCase())) ||
      (kind === "award" && AWARDS.some((a) => a.title.toLowerCase() === text.toLowerCase())) ||
      (kind === "dish" && [...DISHES.values()].some((d) => d.name.toLowerCase() === text.toLowerCase())) ||
      (await suggestions()).some((s) => s.kind === kind && s.text.toLowerCase() === text.toLowerCase());
    if (!known) await save("suggestions", { id: `s-${randomInt(36 ** 6).toString(36)}`, kind, text, course, by: me.id, name: me.first });
  } else if (action === "decline") {
    if (typeof body.from !== "string" || !body.from) return bad("Whose request?");
    await save("declines", { by: me.id, from: body.from, no: true });
  } else if (action === "mine") {
    // your latest answer to everything (so a new phone shows your choices again)
    const meals: Record<string, Record<string, string>> = {};
    for (const o of (await rows("orders")).filter((r) => r.by === me.id)) {
      // the dishes are the course fields (mains, sides, drinks…)
      const dishes: Record<string, string> = {};
      for (const [k, v] of Object.entries(o as Record<string, string>)) if (!["slot", "by", "name", "notes", "created_at"].includes(k)) dishes[k] = v;
      meals[String(o.slot)] = dishes;
    }
    const pick = <T,>(list: Record<string, unknown>[], f: (r: Record<string, unknown>) => T) => {
      const mine = list.filter((r) => r.by === me.id);
      return mine.length ? f(mine[mine.length - 1]) : undefined;
    };
    const awards: Record<string, string> = {};
    for (const a of (await rows("awards")).filter((r) => r.by === me.id)) awards[String(a.award)] = String(a.nominee);
    return NextResponse.json({
      meals,
      movie: pick(await rows("votes"), (r) => String(r.movie)),
      games: pick(await rows("games"), (r) => (r.games as string[]) ?? []) ?? [],
      awards,
      roommate: pick(await rows("roommates"), (r) => String(r.to)) || undefined,
    });
  } else return bad("Not found", 404);

  return NextResponse.json(await state());
}
