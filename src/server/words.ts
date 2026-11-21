import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { rows, save } from "./storage";

// Code words: three easy words per guest ("mango drum kite"), shown when you check in so you can
// screenshot them. With your name they're how you log back in on another phone. They come from
// your key card and a secret kept only on the server (made once, the first time it's needed), so
// everyone already checked in has theirs too, and nobody can work them out from the app.

const WORDS = [
  "ant", "apple", "bag", "ball", "banana", "bead", "bean", "bear", "bee", "bell", "bike", "bird",
  "boat", "book", "boot", "bowl", "box", "bread", "brick", "brush", "bus", "cake", "camel", "candle",
  "cap", "car", "cart", "cat", "chair", "chalk", "cloud", "coat", "coin", "comb", "corn", "cow",
  "crab", "crown", "cup", "dog", "doll", "door", "drum", "duck", "egg", "fan", "farm", "feather",
  "fish", "flag", "flute", "fox", "frog", "gate", "goat", "gold", "grape", "guitar", "hat", "hen",
  "hill", "honey", "horse", "house", "jar", "kite", "key", "lamp", "leaf", "lemon", "lion", "mango",
  "map", "moon", "mouse", "nest", "net", "nut", "orange", "owl", "palm", "pear", "pen", "pepper",
  "piano", "pig", "pot", "radio", "rain", "ring", "river", "rock", "rope", "rose", "salt", "shoe",
  "sock", "spoon", "star", "stone", "sun", "table", "tea", "tiger", "tomato", "train", "tree", "truck",
  "drum", "violin", "watch", "whale", "wheel", "yam", "zebra", "plantain", "ice", "kettle", "ladder", "melon",
].filter((w, i, a) => a.indexOf(w) === i);

let cached: string | null = null;
async function secret() {
  if (cached) return cached;
  const first = (await rows("secrets"))[0];
  if (first?.value) return (cached = String(first.value));
  await save("secrets", { value: randomBytes(32).toString("hex") });
  // read back so two first-time requests at once still agree on the oldest one
  return (cached = String((await rows("secrets"))[0].value));
}

/** This key card's three code words. */
export async function wordsFor(card: string) {
  const h = createHmac("sha256", await secret()).update(card).digest();
  return [0, 1, 2].map((i) => WORDS[h.readUInt16BE(i * 2) % WORDS.length]).join(" ");
}

/**
 * This key card's device key: a long secret each phone gets when it checks in or logs back in,
 * and sends with everything it saves. Only the server can make it, so knowing someone's key card
 * (or anything else the app shows) isn't enough to act as them.
 */
export async function deviceKey(card: string) {
  return createHmac("sha256", await secret()).update(`device:${card}`).digest("hex").slice(0, 32);
}

/** Is this the right device key for this key card? */
export async function rightKey(typed: unknown, card: string) {
  if (typeof typed !== "string") return false;
  const a = Buffer.from(typed), b = Buffer.from(await deviceKey(card));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Do these typed words match? Any case, any order, any spaces or commas. */
export function sameWords(typed: unknown, real: string) {
  if (typeof typed !== "string") return false;
  const a = typed.toLowerCase().split(/[^a-z]+/).filter(Boolean).sort().join(" ");
  return a === real.split(" ").sort().join(" ");
}
