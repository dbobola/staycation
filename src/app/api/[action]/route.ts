import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { rows, save } from "@/server/storage";
import { AWARDS, GAMES, MOVIES } from "@/game/data/activities";
import { DISHES, mealSlots } from "@/game/data/menu";
import { EVENT, SAMPLES_UNTIL } from "@/game/data/event";
import { SAMPLE_PEOPLE, type Person } from "@/game/data/samples";
import { claimedBy, crowdName, isFor } from "@/game/data/roommates";
import { deviceKey, rightKey, sameWords, wordsFor } from "@/server/words";

// One small API for the whole resort:
//   GET  /api/state      everything people have shared (no emails, phones or key cards)
//   POST /api/checkin    check in: get your key card
//   POST /api/login      back again: who you are + your three code words → you (nothing is saved)
//   POST /api/words      your code words (shown on your key card, to screenshot)
//   POST /api/key        a phone checked in before device keys existed gets its key, by its email
// Everything that saves something needs this phone's key card, id and device key (`key`).
//   POST /api/order      your meal for one slot
//   POST /api/movie      your movie-night vote
//   POST /api/games      the games you're joining
//   POST /api/award      a nomination
//   POST /api/roommate   who you'd like to share a room with (someone checked in, or a name from the crowd)
//   POST /api/decline    say no to someone's room-partner request
//   POST /api/mine       your own choices so far (to show them again on another phone)
//   POST /api/suggest    suggest a movie, a dish or drink, a game or an award: it joins the list
//   POST /api/admin      the organisers' view: everyone, emails, key cards, meals, votes, games,
//                        nominations, room partners, history (needs the admin password). Reads
//                        only, except `cancelRoommate: <id>` cancels that person's room request

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

type PersonRow = Person & { card: string; email?: string; phone?: string };

/**
 * Check-ins the organisers took off (kept in storage, just left out everywhere):
 * SD-SGZQ5N was a second "Bobo" with a mistyped email (bobniches@gmail.copm) that never did anything.
 */
const REMOVED = new Set(["SD-SGZQ5N"]);

/** Every check-in row, the removed ones left out. */
async function checkIns() {
  return (await rows("people")).filter((r) => !REMOVED.has(String(r.card)));
}

/** The latest check-in per key card. */
async function people(): Promise<PersonRow[]> {
  const byCard = new Map<string, PersonRow>();
  for (const r of await checkIns()) byCard.set(String(r.card), r as unknown as PersonRow);
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

/** The person this phone is: its key card and id, proved by the device key only the server can make. */
async function whoIs(card: unknown, by: unknown, key: unknown) {
  if (typeof card !== "string" || !card) return null;
  const p = (await people()).find((x) => x.card === card);
  return p && p.id === by && (await rightKey(key, p.card)) ? p : null;
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
  const pub: Person[] = real.map(({ id, first, last, nickname, set, house, quote, sex, listName }) => ({ id, first, last, nickname, set, house, quote, sex, listName }));
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
    // your name on the organisers' list (if you're on it), what you'd like to be called, and an email
    const name = clean(body.name ?? `${clean(body.first, 40)} ${clean(body.last, 40)}`, 40);
    const email = clean(body.email, 120).toLowerCase();
    if (!name) return bad("Please tell us what you'd like to be called.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("That email doesn't look right.");
    const listName = typeof body.listName === "string" && body.listName ? crowdName(body.listName) : null;
    if (body.listName && !listName) return bad("We can't find that name on the list.");
    const all = await people();
    // this phone's own check-in (changing your name or email) keeps its key card
    const own = (await whoIs(body.card, body.by, body.key)) ?? undefined;
    const removed = (await rows("people")).some((r) => REMOVED.has(String(r.card)) && (r.card === body.card || r.email === email));
    if (removed && !own) return bad("This check-in was removed by the organisers. Check in with your own name and email.", 409);
    const sameEmail = all.find((p) => p.email === email && p.id !== own?.id);
    if (sameEmail)
      return bad(`"${`${sameEmail.first} ${sameEmail.last}`.trim()}" already checked in with this email. If that's you, tap "Log back in" and use your code words.`, 409);
    const keep = listName ?? (own ? own.listName : undefined);
    const taken = keep ? claimedBy(keep, all.filter((p) => p.id !== own?.id)) : undefined;
    if (taken)
      return bad(`${keep} is already checked in (as "${`${taken.first} ${taken.last}`.trim()}"). If that's you, tap "Log back in" and use your code words.`, 409);
    const card = own?.card ?? (await newCard(new Set((await rows("people")).map((p) => String(p.card)))));
    // a fresh id, not taken from the key card, so the key card can't be worked out from the app
    const id = own?.id ?? `p-${randomInt(36 ** 8).toString(36)}`;
    const row: PersonRow = { id, card, first: name, last: "", sex: body.sex === "m" ? "m" : "f", email, ...(keep ? { listName: keep } : {}) };
    await save("people", row);
    return NextResponse.json({ ...row, words: await wordsFor(card), key: await deviceKey(card), again: false });
  }

  if (action === "admin") {
    if (!isAdmin(body.key)) return bad("Wrong password.", 401);
    // organisers can cancel someone's room partner request (the request stays in History)
    if (typeof body.cancelRoommate === "string") {
      const p = (await people()).find((x) => x.id === body.cancelRoommate);
      if (!p) return bad("No one checked in with that id.", 404);
      await save("roommates", { by: p.id, to: "", byOrganisers: true });
    }
    return NextResponse.json(await adminView());
  }

  if (action === "login") {
    // you pick yourself from everyone who's checked in, then type your three code words
    const p = (await people()).find((x) => x.id === body.id);
    if (!p) return bad("Pick your name from the list first.");
    const words = await wordsFor(p.card);
    if (!sameWords(body.words, words)) return bad("Those code words don't match. Check your screenshot, or ask an organiser.", 401);
    const { phone: _phone, ...row } = p;
    void _phone;
    return NextResponse.json({ ...row, words, key: await deviceKey(p.card), again: true });
  }


  if (action === "key") {
    // a phone checked in before device keys existed: its key card, id and the email it checked in
    // with (kept on that phone, never shown to anyone else) get it its key
    const p = (await people()).find((x) => x.card === body.card && x.id === body.by);
    const email = clean(body.email, 120).toLowerCase();
    if (!p || !email || p.email !== email) return bad("Log back in with your name and code words.", 401);
    return NextResponse.json({ key: await deviceKey(p.card) });
  }

  const me = await whoIs(body.card, body.by, body.key);
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
  } else if (action === "words") {
    return NextResponse.json({ words: await wordsFor(me.card) });
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

// ---------------------------------------------------------------------------------------------
// The organisers' view. Reads everything and changes nothing.

/** The admin password's SHA-256 (ADMIN_KEY in the site's environment, if set, is used instead). */
const ADMIN_HASH = "abe1088f1664e294674f72644f34bb7fd246adda9d61cde31e1153650d19c4b4";

function isAdmin(key: unknown) {
  if (typeof key !== "string" || !key) return false;
  const want = process.env.ADMIN_KEY ? createHash("sha256").update(process.env.ADMIN_KEY).digest() : Buffer.from(ADMIN_HASH, "hex");
  const got = createHash("sha256").update(key).digest();
  return want.length === got.length && timingSafeEqual(want, got);
}

async function adminView() {
  const all = await people();
  const sugg = await suggestions();
  const nameOf = (id: string) => {
    const p = all.find((x) => x.id === id);
    return p ? `${p.first} ${p.last ?? ""}`.trim() : id.startsWith("name:") ? `${id.slice(5)} (not checked in)` : id;
  };
  const label = (kind: Suggestion["kind"], id: string) =>
    (kind === "movie" ? MOVIES.find((m) => m.id === id)?.title : kind === "game" ? GAMES.find((g) => g.id === id)?.name : kind === "award" ? AWARDS.find((a) => a.id === id)?.title : DISHES.get(id)?.name) ??
    sugg.find((x) => x.id === id)?.text ??
    id;
  const firstSeen = new Map<string, string>();
  for (const r of await checkIns()) if (!firstSeen.has(String(r.card))) firstSeen.set(String(r.card), String(r.created_at ?? ""));

  const guests = await Promise.all(all.map(async (p) => ({ name: `${p.first} ${p.last ?? ""}`.trim(), listName: p.listName ?? "", email: p.email ?? "", card: p.card, words: await wordsFor(p.card), sex: p.sex === "m" ? "Guy" : "Lady", checkedIn: firstSeen.get(p.card) ?? "", id: p.id })));

  const slots = mealSlots(EVENT.nights);
  const meals = (await latest("orders", (r) => String(r.slot))).map((o) => {
    const dishes = Object.entries(o)
      .filter(([k]) => !["slot", "by", "name", "notes", "created_at"].includes(k))
      .map(([course, id]) => `${course}: ${label("dish", String(id))}`);
    return { name: nameOf(String(o.by)), meal: slots.find((s) => s.id === o.slot)?.label ?? String(o.slot), dishes: dishes.join("; "), notes: String(o.notes ?? ""), at: String(o.created_at ?? "") };
  });

  const movies = (await latest("votes", () => "movie")).map((v) => ({ name: nameOf(String(v.by)), movie: label("movie", String(v.movie)), at: String(v.created_at ?? "") }));
  const games = (await latest("games", () => "games")).map((g) => ({ name: nameOf(String(g.by)), games: ((g.games as string[]) ?? []).map((id) => label("game", id)).join(", "), at: String(g.created_at ?? "") }));
  const awards = (await latest("awards", (r) => String(r.award))).map((a) => ({ name: nameOf(String(a.by)), award: label("award", String(a.award)), nominee: nameOf(String(a.nominee)), at: String(a.created_at ?? "") }));

  const reqs = (await latest("roommates", () => "room")).filter((r) => r.to).map((r) => ({ from: String(r.by), to: String(r.to), at: String(r.created_at ?? "") }));
  const personOf = (id: string) => all.find((p) => p.id === id);
  const declined = (await latest("declines", (r) => String(r.from))).filter((d) => d.no);
  const roommates = reqs.map((r) => {
    const a = personOf(r.from);
    const back = a && reqs.find((x) => x.from !== r.from && personOf(x.from) && isFor(r.to, personOf(x.from)!) && isFor(x.to, a));
    const no = declined.find((d) => d.from === r.from && personOf(String(d.by)) && isFor(r.to, personOf(String(d.by))!));
    return { from: nameOf(r.from), to: back ? nameOf(back.from) : nameOf(r.to), status: back ? "Matched 🤝" : no ? "Declined" : "Waiting", at: r.at };
  });

  // Every entry ever saved, newest first: nothing is ever overwritten, so this is the full story
  // (each check-in with the name typed that time, every room request, change, cancel and decline).
  const at = (r: Record<string, unknown>) => String(r.created_at ?? "");
  const history: { at: string; who: string; what: string; detail: string }[] = [];
  const seenCard = new Set<string>();
  for (const r of await checkIns()) {
    const card = String(r.card);
    history.push({ at: at(r), who: nameOf(String(r.id)), what: seenCard.has(card) ? "Checked in again" : "Checked in", detail: `as "${`${String(r.first ?? "")} ${String(r.last ?? "")}`.trim()}"${r.listName ? ` (${String(r.listName)} on the list)` : ""} · ${card} · ${r.sex === "m" ? "Guy" : "Lady"}` });
    seenCard.add(card);
  }
  for (const r of await rows("roommates"))
    history.push({ at: at(r), who: nameOf(String(r.by)), what: r.to ? "Room partner request" : "Cancelled room partner request", detail: r.to ? `→ ${nameOf(String(r.to))}` : r.byOrganisers ? "by the organisers" : "" });
  // (a "no: false" entry is written automatically with every request, so only real declines show)
  for (const r of await rows("declines"))
    if (r.no) history.push({ at: at(r), who: nameOf(String(r.by)), what: "Declined request", detail: `from ${nameOf(String(r.from))}` });
  for (const r of await rows("orders"))
    history.push({ at: at(r), who: nameOf(String(r.by)), what: "Meal order", detail: slots.find((s) => s.id === r.slot)?.label ?? String(r.slot) });
  for (const r of await rows("votes")) history.push({ at: at(r), who: nameOf(String(r.by)), what: "Movie vote", detail: label("movie", String(r.movie)) });
  for (const r of await rows("games"))
    history.push({ at: at(r), who: nameOf(String(r.by)), what: "Games", detail: ((r.games as string[]) ?? []).map((id) => label("game", id)).join(", ") });
  for (const r of await rows("awards"))
    history.push({ at: at(r), who: nameOf(String(r.by)), what: "Nomination", detail: `${label("award", String(r.award))}: ${nameOf(String(r.nominee))}` });
  for (const r of await rows("suggestions")) history.push({ at: at(r), who: String(r.name ?? ""), what: "Suggestion", detail: `${String(r.kind)}: ${String(r.text)}` });
  history.sort((a, b) => b.at.localeCompare(a.at));

  return {
    guests,
    meals,
    movies,
    games,
    awards,
    roommates,
    history,
    suggestions: sugg.map((x) => ({ kind: x.kind, text: x.text, by: x.name })),
    event: { name: EVENT.name, dates: EVENT.dates, checkIn: EVENT.checkIn, checkOut: EVENT.checkOut },
  };
}
