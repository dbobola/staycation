// The people: Microsoft Rocketbox avatars (MIT), the same cast The Feast uses.

export type Sex = "m" | "f";
export type AvatarDef = { id: string; file: string; sex: Sex };

export const AVATARS: AvatarDef[] = [
  { id: "f11", file: "/avatars/Female_Adult_11.glb", sex: "f" },
  { id: "m04", file: "/avatars/Male_Adult_04.glb", sex: "m" },
  { id: "f07", file: "/avatars/Female_Adult_07.glb", sex: "f" },
  { id: "m12", file: "/avatars/Male_Adult_12.glb", sex: "m" },
  { id: "fp01", file: "/avatars/Female_Party_01.glb", sex: "f" },
  { id: "m08", file: "/avatars/Male_Adult_08.glb", sex: "m" },
  { id: "f15", file: "/avatars/Female_Adult_15.glb", sex: "f" },
  { id: "m14", file: "/avatars/Male_Adult_14.glb", sex: "m" },
  { id: "bf01", file: "/avatars/Business_Female_01.glb", sex: "f" },
  { id: "bm05", file: "/avatars/Business_Male_05.glb", sex: "m" },
  { id: "f05", file: "/avatars/Female_Adult_05.glb", sex: "f" },
  { id: "m18", file: "/avatars/Male_Adult_18.glb", sex: "m" },
  { id: "bf04", file: "/avatars/Business_Female_04.glb", sex: "f" },
  { id: "bm02", file: "/avatars/Business_Male_02.glb", sex: "m" },
];

/** Your own avatar: female or male, picked at the bottom of the screen. */
export const PLAYER_AVATARS = { f: "f11", m: "m04" } as const;

/** Warm skin tints multiplied over the avatars' own skin (white leaves it as it is). */
export const SKIN_TONES = ["#b07a5a", "#9a6648", "#8a573c", "#c08a68", "#7d4e36"];

export type AnimName = "idle" | "walk" | "run" | "sit" | "wave" | "cheer" | "clap";

export function animFile(sex: Sex, name: AnimName) {
  const clip = {
    idle: "idle_neutral_01",
    walk: "walk_neutral_01",
    run: "run_neutral_01",
    sit: "sit_chair_idle_neutral_01",
    cheer: "cheer_01",
    wave: "wave_01",
    clap: "claphands_01",
  }[name];
  return `/avatars/anims/${sex}_${clip}.glb`;
}

/**
 * The avatar to use on this device: phones only download a few models (see quality.ts), so
 * someone whose model isn't among them (the staff, the host, the chauffeur) wears one of those
 * instead, of the same sex. Computers get everyone's own.
 */
export function onThisDevice(id: string, models: number) {
  const i = AVATARS.findIndex((a) => a.id === id);
  if (i < 0 || i < models) return id;
  const sex = AVATARS[i].sex;
  const mine = new Set<string>(Object.values(PLAYER_AVATARS));
  const pool = AVATARS.slice(0, models).filter((a) => a.sex === sex && !mine.has(a.id));
  return (pool.length ? pool[i % pool.length] : AVATARS[0]).id;
}
