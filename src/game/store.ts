import { create } from "zustand";
import { PLAYER_AVATARS } from "./data/avatars";
import type { Person } from "./data/samples";
import type { Suggestion } from "./data/choices";
import type { SpotId } from "./world/layout";

/** loading → arrive (the car drives in) → setup (who are you?) → celebrate → walk; aerial any time. */
export type Phase = "loading" | "intro" | "arrive" | "setup" | "celebrate" | "aerial" | "walk";

/** This browser's check-in (kept on the device: your key card for everything else). */
export type Me = Person & { card: string; email?: string; phone?: string; at: number };

/** What everyone has shared so far (from /api/state). */
export type Shared = {
  people: Person[];
  /** movie id → votes */
  movies: Record<string, number>;
  /** game id → who joined (names) */
  games: Record<string, string[]>;
  /** award id → nominees, most nominations first */
  awards: Record<string, { id: string; name: string; count: number }[]>;
  /** room-partner requests: from someone's id → to someone's id, or a crowd name ("name:…") */
  roommates: { from: string; to: string }[];
  /** room-partner requests turned down: `by` said no to `from` */
  declines?: { by: string; from: string }[];
  /** guests' suggestions (movies, dishes, games, awards), now options for everyone */
  suggestions?: Suggestion[];
};

export type Prompt = { text: string; key: string } | null;

const ME_KEY = "silverdome:me";
const SEX_KEY = "silverdome:sex";
const DONE_KEY = "silverdome:done";
const PICKS_KEY = "silverdome:picks";
const NAME_KEY = "silverdome:name";
const SKIP_KEY = "silverdome:skipped";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function keep(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: kept for this visit only */
  }
}

/** Your own choices, remembered on this device so the panels show them again. */
export type Picks = {
  meals: Record<string, Record<string, string>>;
  movie?: string;
  games: string[];
  awards: Record<string, string>;
  roommate?: string;
};

type State = {
  phase: Phase;
  /** The panel open on screen. */
  panel: SpotId | null;
  /** From the aerial view: the spot the camera flies to while its panel is open. */
  focus: SpotId | null;
  evening: boolean;
  sex: "f" | "m";
  /** The name you gave when the car dropped you off (before checking in). */
  guestName: string;
  /** What you're wearing: a simple, elegant look, picked at random each time you arrive. */
  look: number;
  me: Me | null;
  picks: Picks;
  /** The trailer playing on the big screen (a movie id), or null. */
  nowShowing: string | null;
  /** Someone you picked as room partner before checking in: asked for as soon as you have your key card. */
  pendingRoommate: string | null;
  /** The weekend checklist (Sims-style goals). */
  done: Partial<Record<SpotId, boolean>>;
  /** Optional steps you've skipped (or walked past, like the Yearbook): not suggested again. */
  skipped: Partial<Record<SpotId, boolean>>;
  skip: (id: SpotId) => void;
  prompt: Prompt;
  seatedAt: string | null;
  swimming: boolean;
  shared: Shared;
  /** Bumped to send you back to the gate. */
  respawn: number;
  /** A short message at the top of the screen. */
  toast: string | null;
  set: (p: Partial<State>) => void;
  setSex: (s: "f" | "m") => void;
  setGuestName: (n: string) => void;
  checkIn: (me: Me) => void;
  setPicks: (p: Partial<Picks>) => void;
  markDone: (id: SpotId) => void;
  refresh: () => Promise<void>;
  /** Fetch your own saved choices from the server (another phone, cleared storage…). */
  restore: () => Promise<void>;
  say: (msg: string) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useGame = create<State>((set, get) => ({
  phase: "loading",
  panel: null,
  focus: null,
  // night by default (the Day / Evening switch changes it)
  evening: true,
  sex: load<"f" | "m">(SEX_KEY, "f"),
  guestName: load<string>(NAME_KEY, ""),
  look: Math.floor(Math.random() * 1000),
  me: load<Me | null>(ME_KEY, null),
  picks: load<Picks>(PICKS_KEY, { meals: {}, games: [], awards: {} }),
  pendingRoommate: null,
  nowShowing: null,
  done: load(DONE_KEY, {}),
  skipped: load(SKIP_KEY, {}),
  skip: (id) => {
    const skipped = { ...get().skipped, [id]: true };
    keep(SKIP_KEY, skipped);
    set({ skipped });
  },
  prompt: null,
  seatedAt: null,
  swimming: false,
  shared: { people: [], movies: {}, games: {}, awards: {}, roommates: [], declines: [] },
  respawn: 0,
  toast: null,
  set: (p) => set(p),
  setSex: (sex) => {
    keep(SEX_KEY, sex);
    set({ sex });
  },
  setGuestName: (guestName) => {
    keep(NAME_KEY, guestName);
    set({ guestName });
  },
  checkIn: (me) => {
    keep(ME_KEY, me);
    set({ me, sex: me.sex ?? get().sex });
    get().markDone("checkin");
  },
  setPicks: (p) => {
    const picks = { ...get().picks, ...p };
    keep(PICKS_KEY, picks);
    set({ picks });
  },
  markDone: (id) => {
    const done = { ...get().done, [id]: true };
    keep(DONE_KEY, done);
    set({ done });
  },
  refresh: async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.ok) set({ shared: await res.json() });
    } catch {
      /* offline: keep what we have */
    }
  },
  restore: async () => {
    if (!get().me) return;
    try {
      const r = await post<Picks & { roommate?: string }>("/api/mine", {});
      get().setPicks({ meals: r.meals ?? {}, movie: r.movie, games: r.games ?? [], awards: r.awards ?? {}, roommate: r.roommate });
      // and the checklist follows what's saved
      const done = { ...get().done };
      if (Object.keys(r.meals ?? {}).length) done.menu = true;
      if (r.movie) done.movie = true;
      if (r.games?.length) done.games = true;
      if (Object.keys(r.awards ?? {}).length) done.awards = true;
      if (r.roommate) done.roommate = true;
      keep(DONE_KEY, done);
      set({ done });
    } catch {
      /* the key card isn't known any more (or offline): keep what's on this phone */
    }
  },
  say: (toast) => {
    clearTimeout(toastTimer);
    set({ toast });
    toastTimer = setTimeout(() => set({ toast: null }), 3200);
  },
}));

export const avatarFor = (sex: "f" | "m") => PLAYER_AVATARS[sex];

/** POST to the API as this browser's key card holder. */
export async function post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const send = () => {
    const me = useGame.getState().me;
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, card: me?.card, by: me?.id }),
    });
  };
  let res = await send();
  // the server doesn't know this phone's key card (its records were reset, or it was issued
  // somewhere else): check in again with the same name and email, then try once more
  if (res.status === 401 && useGame.getState().me && (await checkInAgain())) res = await send();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Try again.");
  return data as T;
}

/** Check in again quietly with the name and email this phone already has. */
async function checkInAgain() {
  const me = useGame.getState().me;
  if (!me?.email) return false;
  try {
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${me.first} ${me.last}`.trim(), email: me.email, sex: me.sex ?? useGame.getState().sex }),
    });
    if (!res.ok) return false;
    useGame.getState().checkIn({ ...(await res.json()), at: Date.now() });
    return true;
  } catch {
    return false;
  }
}
