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

/** Does a request's `to` mean this person (by id, or by their name)? */
export function isFor(to: string, person: { id: string; first: string; last?: string }) {
  if (to === person.id) return true;
  return to.startsWith("name:") && sameName(to.slice(5), `${person.first} ${person.last ?? ""}`);
}

/** A crowd name, if it's one of ours (as it's spelt in the list). */
export function crowdName(name: string) {
  return GUEST_NAMES.find((g) => norm(g.name) === norm(name))?.name ?? null;
}
