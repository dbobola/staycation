// How much this device is given to draw, worked out once when the site opens (as in The Feast):
//  - high: computers. Shadows, sharp textures, the full party (every guest, a full dinner table).
//  - mid:  modern phones and tablets (an iPhone 12+, a recent Android): the screen's own pixel
//          density, no shadows, fewer people, smaller textures, far-off people not animated.
//  - low:  older or low-memory phones: fewer again, and the lightest of everything.
// `?quality=low|mid|high` forces a level (for testing).

export type Tier = "high" | "mid" | "low";

function detect(): Tier {
  if (typeof window === "undefined") return "high";
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "high" || forced === "mid" || forced === "low") return forced;
  if (forced === "lite") return "mid";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (!touch && !ios && !android) {
    // a computer: only a weak one (few cores) steps down
    return (navigator.hardwareConcurrency || 8) <= 4 ? "mid" : "high";
  }
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency || 4;
  const shortSide = Math.min(window.screen.width, window.screen.height);
  if (memory !== undefined && memory <= 3) return "low";
  if (cores <= 4) return "low";
  // small older iPhones (SE, 8): a 375-wide screen at 2x
  if (ios && shortSide <= 375 && window.devicePixelRatio <= 2) return "low";
  return "mid";
}

export const TIER: Tier = detect();

const LEVELS = {
  high: {
    lite: false,
    /** Pixel ratio range for the 3D view. */
    dpr: [1, 1.75] as [number, number],
    /** People milling about, swimming, at tables (not the dinner). */
    guests: 1,
    /** How many of the 50 dinner seats are taken. */
    diners: 44,
    /** Different avatar models loaded (each ~1 MB). */
    models: 14,
    /** Beyond this distance people stop animating (and beyond 2× it, aren't drawn). */
    animateWithin: 70,
    /** Glowing particles (embers, fireworks). */
    particles: 140,
    /** Name tags over people. */
    tags: true,
    /** Houses and trees round the resort. */
    houses: 170,
    trees: 90,
    /** Texture size (canvas) for the big drawn textures. */
    tex: 1,
  },
  mid: { lite: true, dpr: [1, 1.25] as [number, number], guests: 0.65, diners: 18, models: 8, animateWithin: 32, particles: 70, tags: true, houses: 80, trees: 40, tex: 0.5 },
  low: { lite: true, dpr: [0.75, 1] as [number, number], guests: 0.4, diners: 10, models: 5, animateWithin: 22, particles: 40, tags: false, houses: 40, trees: 20, tex: 0.5 },
} as const;

/** This device's settings. */
export const Q = LEVELS[TIER];
export const LITE = Q.lite;
/** How many guests walk, swim, eat and play around the resort (not counting the dinner). */
export const GUEST_COUNT = Math.round(30 * Q.guests);
