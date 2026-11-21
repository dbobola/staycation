import { GUEST_NAMES } from "./guests";

// Room partners. A request goes to someone who's checked in (their id), or to a name from the
// crowd who hasn't checked in yet ("name:Nana Awaw"). When that person checks in, a request to
// their name is theirs: it pops up for them to accept or decline. Two people who've asked for
// each other are a match.

export type Request = { from: string; to: string };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Is this crowd name this person? (the same name, or the same first name) */
export function sameName(a: string, b: string) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  return x === y || x.split(" ")[0] === y.split(" ")[0];
}

/** Letters only, lower case, doubled letters once ("Khayy" → "khay", "Yhetty❤️" → "yhety"). */
const loose = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z ]/g, "")
    .replace(/(.)\1+/g, "$1")
    .trim()
    .replace(/\s+/g, " ");

function edits(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/**
 * The guest-list name someone who checked in most likely is, allowing for how they spelt it
 * ("Khayy" is Khay, "Yhetty" is Yetty): the one closest name, a letter or two out at most. Never
 * a guess between two names (Rofiat and Rodiat stay apart): an exact match wins, a tie is nobody.
 */
export function guestListName(name: string) {
  const me = loose(name);
  if (!me) return null;
  const first = me.split(" ")[0];
  const exact = GUEST_NAMES.find((g) => sameName(g.name, name) || loose(g.name) === me);
  if (exact) return exact.name;
  const allowed = first.length >= 5 ? 2 : 1;
  let best: string | null = null, bestD = Infinity, tie = false;
  for (const g of GUEST_NAMES) {
    const gl = loose(g.name);
    const d = Math.min(edits(gl, me), edits(gl.split(" ")[0], first));
    if (d < bestD) [best, bestD, tie] = [g.name, d, false];
    else if (d === bestD) tie = true;
  }
  return bestD <= allowed && !tie ? best : null;
}

type Who = { id: string; first: string; last?: string; listName?: string };

/** The guest-list name this person is: the one they picked when checking in, or else a guess from how they spelt it. */
export function listNameOf(person: Who) {
  return person.listName || guestListName(`${person.first} ${person.last ?? ""}`);
}

/** Does a request's `to` mean this person (by id, or by their name on the guest list)? */
export function isFor(to: string, person: Who) {
  if (to === person.id) return true;
  if (!to.startsWith("name:")) return false;
  const want = crowdName(to.slice(5));
  if (person.listName) return person.listName === want;
  const full = `${person.first} ${person.last ?? ""}`;
  return sameName(to.slice(5), full) || guestListName(full) === want;
}

/** Who has already checked in as this guest-list name, if anyone. */
export function claimedBy<P extends Who>(listName: string, people: P[]) {
  return people.find((p) => listNameOf(p) === listName);
}

/** A crowd name, if it's one of ours (as it's spelt in the list). */
export function crowdName(name: string) {
  return GUEST_NAMES.find((g) => norm(g.name) === norm(name))?.name ?? null;
}
