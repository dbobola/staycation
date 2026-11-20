import { AWARDS, GAMES, MOVIES, type Award, type Game, type Movie } from "./activities";
import { COURSES, type Dish } from "./menu";

// Our lists plus what guests have suggested (each suggestion becomes an option everyone can
// vote for, pick, join or nominate under).

export type Suggestion = { id: string; kind: "movie" | "dish" | "game" | "award"; text: string; course?: string; name: string };
type WithSuggestions = { suggestions?: Suggestion[] };

const of = (shared: WithSuggestions, kind: Suggestion["kind"]) => (shared.suggestions ?? []).filter((s) => s.kind === kind);

export function allMovies(shared: WithSuggestions): (Movie & { by?: string })[] {
  return [...MOVIES, ...of(shared, "movie").map((s) => ({ id: s.id, title: s.text, year: 0, genre: `Suggested by ${s.name}`, color: "#4a5a6a", by: s.name }))];
}

export function allGames(shared: WithSuggestions): (Game & { by?: string })[] {
  return [...GAMES, ...of(shared, "game").map((s) => ({ id: s.id, name: s.text, where: `Suggested by ${s.name}`, icon: "💡", by: s.name }))];
}

export function allAwards(shared: WithSuggestions): (Award & { by?: string })[] {
  return [...AWARDS, ...of(shared, "award").map((s) => ({ id: s.id, title: s.text, blurb: `Suggested by ${s.name}`, by: s.name }))];
}

/** A course's dishes, with guests' suggestions for it at the end. */
export function dishesFor(course: string, shared: WithSuggestions): (Dish & { by?: string })[] {
  const ours = COURSES.find((c) => c.id === course)?.dishes ?? [];
  return [...ours, ...of(shared, "dish").filter((s) => (s.course ?? "mains") === course).map((s) => ({ id: s.id, name: s.text, note: `Suggested by ${s.name}`, by: s.name }))];
}

/** A dish's name (ours or suggested). */
export function dishName(id: string, shared: WithSuggestions) {
  for (const c of COURSES) {
    const d = c.dishes.find((x) => x.id === id);
    if (d) return d.name;
  }
  return of(shared, "dish").find((s) => s.id === id)?.text;
}
