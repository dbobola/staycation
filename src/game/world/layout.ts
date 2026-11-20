import { YEARBOOK_OPEN } from "../data/event";

// Silver Dome, Ibadan: the resort's layout, in metres. One source of truth for the 3D scene, the
// walking rules (where you can go, how high the ground is) and every interactive spot.
//
// Axes: x runs east, z runs south (so north is −z), y is up. Taken from the photos in /references:
//  - the pool runs east–west in the middle, the perimeter wall and palms along its south side
//  - the black-grid glass bar pavilion (pergola, marble bar, purple LED) at the pool's west end
//  - north of the pool: turf, a black mesh fence, then the paved courtyard
//  - the hotel (three storeys, cream with brown pilasters, terracotta hip roofs) up a flight of
//    stairs on a raised terrace to the north, the graffiti mural wall beside the stairs, and the
//    little pyramid-roofed building behind the mural
//  - the plain single-storey block north-east with the white movie screen on its roof
//  - the grill shelter in the courtyard; the football field through the west wall

/** A rectangle on the ground; `h` (as a solid) is how tall it is, for the camera (default: tall). */
export type Rect = { x0: number; x1: number; z0: number; z1: number; h?: number };

export const inRect = (r: Rect, x: number, z: number, pad = 0) =>
  x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;

/** The terrace the hotel stands on is this much higher than the courtyard and pool. */
export const TERRACE_Y = 1.5;
/** The terrace's south edge (its retaining wall). */
export const TERRACE_EDGE = -25;

export const POOL: Rect = { x0: -9, x1: 9, z0: -4, z1: 4 };
export const WATER_Y = -0.22;
export const POOL_FLOOR = -1.45;
/** Where a person's feet are while they wade (water at about chest height). */
export const SWIM_FEET = -1.2;

/** The pool deck (stone flags) around the water. */
export const DECK: Rect = { x0: -11, x1: 15, z0: -6.2, z1: 7.2 };
/** The perimeter wall. */
export const COMPOUND: Rect = { x0: -45, x1: 42, z0: -48, z1: 9.5 };

export const STAIRS: Rect = { x0: -14, x1: -6, z0: TERRACE_EDGE, z1: -21 };

export const PAVILION: Rect = { x0: -23, x1: -11.6, z0: -6, z1: 8 };
export const PAVILION_FLOOR = 0.15;

export const HOTEL = { x0: -34, x1: 12, front: -33, back: -45, floors: 3, floorH: 3.2 };
/** The central bay steps forward and carries the entrance porch. */
export const HOTEL_BAY = { x0: -15, x1: -3, front: -31.6 };
export const PORCH = { x0: -12, x1: -6, front: -29.2 };

export const MURAL = { x0: -27, x1: -15.5, z: -25.25, h: 3.8 };
export const GAZEBO = { x: -23, z: -28.8, w: 5 };

export const CINEMA = { x0: 15, x1: 31, z0: -23, z1: -12, h: 4.4 };
/** The white movie screen on the cinema block's roof, facing the courtyard (south). */
export const SCREEN = { x: 23, z: -12.25, w: 9, h: 5, y0: 5.3 };

export const GRILL = { x: 4.5, z: -15.5 };
/**
 * The poolside dinner: one long dressed table for 50 (25 a side) between the pool and the grill,
 * and the buffet across its east end.
 */
export const DINNER = { x0: -8.6, x1: 8.6, z: -10.7, w: 1.2, seats: 25 };
export const BUFFET = { x: 10.7, z0: -12.6, z1: -8.8, w: 0.95 };
/** The big screen at the west end of the dinner table: watch and choose the movie. */
export const FILM_BOARD = { x: -11.4, z: -11.4, w: 4.6, h: 2.6, y0: 1.5 };
/** The bonfire in the middle of the field, with log benches round it. */
export const BONFIRE = { x: -75, z: -12, logR: 3.6 };

/** The awards board: at the foot of the stairs, where everyone comes down into the courtyard. */
export const AWARDS = { x: -2.2, z: -19.6 };
/** The Yearbook: on the terrace just past check-in, so the first thing you see is who's coming. */
export const YEARBOOK = { x: 30.5, z: -34.6 };
export const RECEPTION = { x: -9, z: -30.2 };
/** The welcome desk inside the gate, where an attendant checks you in. */
export const CHECKIN_DESK = { x: 36.5, z: -33.4, w: 2.4 };
/** The marble bar counter, along the pavilion's west wall. */
export const BAR = { x: -21.4, z0: -4.6, z1: 5.2, w: 1.3 };

/** The main gate on the east wall at terrace level, and the road outside it. */
export const GATE = { x: COMPOUND.x1, z0: -32, z1: -26 };
/**
 * The street outside the gate: a long two-way road running north–south past the resort, at the
 * terrace's height. Pavement on the gate side, a parking lane at the kerb (where the limo pulls
 * up), two lanes southbound, two northbound, and a far pavement.
 */
export const ROAD: Rect = { x0: 42, x1: 59.5, z0: -230, z1: 150 };
export const STREET = {
  /** the pavement on the gate side, and its kerb */
  walk: { x0: 42, x1: 44.6 },
  /** the asphalt */
  road: { x0: 44.6, x1: 57.6 },
  /** lane centres */
  park: 45.9,
  southSlow: 48.6,
  southFast: 51.3,
  northFast: 54.1,
  northSlow: 56.4,
};
export const PAVEMENT: Rect = { x0: STREET.walk.x0, x1: STREET.walk.x1, z0: ROAD.z0, z1: ROAD.z1 };

/** The football field, through a gap in the west wall. */
export const FIELD: Rect = { x0: -98, x1: -52, z0: -34, z1: 10 };
export const FIELD_GAP = { z0: -15, z1: -10.5 };
export const FIELD_PATH: Rect = { x0: -52.5, x1: -44, z0: FIELD_GAP.z0, z1: FIELD_GAP.z1 };

/** Ground height at a point (the terrace, the stairs, the pool, the bar's floor, the road). */
export function groundY(x: number, z: number): number {
  if (inRect(POOL, x, z)) return SWIM_FEET;
  if (inRect(STAIRS, x, z)) return TERRACE_Y * (1 - (z - STAIRS.z0) / (STAIRS.z1 - STAIRS.z0));
  if (z <= TERRACE_EDGE && inRect(COMPOUND, x, z)) return TERRACE_Y;
  if (inRect(PAVEMENT, x, z)) return TERRACE_Y + 0.15;
  if (inRect(ROAD, x, z)) return TERRACE_Y;
  if (inRect(PAVILION, x, z)) return PAVILION_FLOOR;
  return 0;
}

// ---------------------------------------------------------------------------------------------
// Walking: places you can be, and things in the way

/** Everywhere a person may walk (the inside of the compound, the road outside, the field). */
export const WALKABLE: Rect[] = [
  { x0: COMPOUND.x0 + 0.5, x1: COMPOUND.x1 - 0.4, z0: COMPOUND.z0 + 0.5, z1: COMPOUND.z1 - 0.5 },
  { x0: GATE.x - 1, x1: STREET.walk.x1, z0: GATE.z0, z1: GATE.z1 },
  // the pavement (the road itself is for cars)
  PAVEMENT,
  FIELD_PATH,
  FIELD,
];

/** Solid boxes (walls, buildings, counters). Circles are below. */
export const BLOCKS: Rect[] = [
  // terrace retaining wall (both sides of the stairs) and the stairs' cheeks
  { x0: COMPOUND.x0, x1: STAIRS.x0, z0: TERRACE_EDGE - 0.3, z1: TERRACE_EDGE + 0.3, h: 2.2 },
  { x0: STAIRS.x1, x1: COMPOUND.x1, z0: TERRACE_EDGE - 0.3, z1: TERRACE_EDGE + 0.3, h: 2.2 },
  { x0: STAIRS.x0 - 0.3, x1: STAIRS.x0, z0: STAIRS.z0, z1: STAIRS.z1, h: 0.6 },
  { x0: STAIRS.x1, x1: STAIRS.x1 + 0.3, z0: STAIRS.z0, z1: STAIRS.z1, h: 0.6 },
  // hotel, bay and the porch's columns are handled as circles
  { x0: HOTEL.x0, x1: HOTEL.x1, z0: HOTEL.back, z1: HOTEL.front },
  { x0: HOTEL_BAY.x0, x1: HOTEL_BAY.x1, z0: HOTEL.front, z1: HOTEL_BAY.front },
  // gazebo
  { x0: GAZEBO.x - GAZEBO.w / 2, x1: GAZEBO.x + GAZEBO.w / 2, z0: GAZEBO.z - GAZEBO.w / 2, z1: GAZEBO.z + GAZEBO.w / 2 },
  // cinema block
  { x0: CINEMA.x0, x1: CINEMA.x1, z0: CINEMA.z0, z1: CINEMA.z1 },
  // pavilion's walls: west, south; north wall with a door (x −19…−16.5); east glass with a door (z −1…2)
  { x0: PAVILION.x0, x1: PAVILION.x0 + 0.25, z0: PAVILION.z0, z1: PAVILION.z1 },
  { x0: PAVILION.x0, x1: PAVILION.x1, z0: PAVILION.z1 - 0.25, z1: PAVILION.z1 },
  { x0: PAVILION.x0, x1: -19, z0: PAVILION.z0, z1: PAVILION.z0 + 0.25 },
  { x0: -16.5, x1: PAVILION.x1, z0: PAVILION.z0, z1: PAVILION.z0 + 0.25 },
  { x0: PAVILION.x1 - 0.25, x1: PAVILION.x1, z0: PAVILION.z0, z1: -1 },
  { x0: PAVILION.x1 - 0.25, x1: PAVILION.x1, z0: 2, z1: PAVILION.z1 },
  // marble bar counter along the west wall
  { x0: BAR.x - BAR.w / 2, x1: BAR.x + BAR.w / 2, z0: BAR.z0, z1: BAR.z1, h: 1.2 },
  // reception desk under the porch, and the welcome desk inside the gate
  { x0: -10.6, x1: -7.4, z0: -30.9, z1: -30.1, h: 1.2 },
  { x0: CHECKIN_DESK.x - CHECKIN_DESK.w / 2 - 0.1, x1: CHECKIN_DESK.x + CHECKIN_DESK.w / 2 + 0.1, z0: CHECKIN_DESK.z - 0.45, z1: CHECKIN_DESK.z + 0.45, h: 1.2 },
  // pool fence along the courtyard, with two gates (x −2…0.5 and 11…13)
  { x0: -11.6, x1: -2, z0: -6.35, z1: -6.15, h: 1.6 },
  { x0: 0.5, x1: 11, z0: -6.35, z1: -6.15, h: 1.6 },
  { x0: 13, x1: 15.2, z0: -6.35, z1: -6.15, h: 1.6 },
  // the long dinner table and the buffet
  { x0: DINNER.x0 - 0.1, x1: DINNER.x1 + 0.1, z0: DINNER.z - DINNER.w / 2, z1: DINNER.z + DINNER.w / 2, h: 1 },
  { x0: BUFFET.x - BUFFET.w / 2, x1: BUFFET.x + BUFFET.w / 2, z0: BUFFET.z0, z1: BUFFET.z1, h: 1.2 },
  // grill counter
  { x0: GRILL.x - 2.2, x1: GRILL.x + 2.2, z0: GRILL.z - 0.5, z1: GRILL.z + 0.5, h: 1.2 },
  // planters along the south wall
  { x0: -11, x1: 15, z0: 7.3, z1: 8.6, h: 1 },
  // perimeter walls (the gate and the field gap stay open)
  { x0: COMPOUND.x0 - 0.3, x1: COMPOUND.x1 + 0.3, z0: COMPOUND.z1 - 0.15, z1: COMPOUND.z1 + 0.25, h: 2.9 },
  { x0: COMPOUND.x0 - 0.3, x1: COMPOUND.x1 + 0.3, z0: COMPOUND.z0 - 0.25, z1: COMPOUND.z0 + 0.15, h: 2.9 },
  { x0: COMPOUND.x0 - 0.25, x1: COMPOUND.x0 + 0.15, z0: COMPOUND.z0, z1: FIELD_GAP.z0, h: 2.9 },
  { x0: COMPOUND.x0 - 0.25, x1: COMPOUND.x0 + 0.15, z0: FIELD_GAP.z1, z1: COMPOUND.z1, h: 2.9 },
  { x0: COMPOUND.x1 - 0.15, x1: COMPOUND.x1 + 0.25, z0: COMPOUND.z0, z1: GATE.z0, h: 2.9 },
  { x0: COMPOUND.x1 - 0.15, x1: COMPOUND.x1 + 0.25, z0: GATE.z1, z1: COMPOUND.z1, h: 2.9 },
  // awards board and yearbook stand
  { x0: AWARDS.x - 1.6, x1: AWARDS.x + 1.6, z0: AWARDS.z - 0.25, z1: AWARDS.z + 0.25, h: 2.8 },
  { x0: YEARBOOK.x - 1.1, x1: YEARBOOK.x + 1.1, z0: YEARBOOK.z - 0.3, z1: YEARBOOK.z + 0.3, h: 2.8 },
];

export type Circle = { x: number; z: number; r: number };

// ---------------------------------------------------------------------------------------------
// Furniture: tables and the seats around them (people can sit on any free seat)

export type SeatKind = "dining" | "bar" | "lounger" | "movie" | "courtyard" | "grill" | "dinner" | "bonfire";
export type Seat = { id: string; x: number; z: number; y: number; facing: number; kind: SeatKind };
export type Table = { x: number; z: number; y: number; r: number; kind: "round" | "square" | "high" };

export const TABLES: Table[] = [];
export const SEATS: Seat[] = [];

function tableWithChairs(id: string, x: number, z: number, y: number, kind: SeatKind, n = 4, r = 0.85, tk: Table["kind"] = "round", rot = 0) {
  TABLES.push({ x, z, y, r: tk === "high" ? 0.35 : 0.45, kind: tk });
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const sx = x + Math.sin(a) * r;
    const sz = z + Math.cos(a) * r;
    // facing the table: the seat's back is away from it
    SEATS.push({ id: `${id}-${i}`, x: sx, z: sz, y, facing: a + Math.PI, kind });
  }
}

// inside the pavilion: four dining tables
tableWithChairs("pav-a", -18.2, -2.6, PAVILION_FLOOR, "dining", 4, 0.85, "square", Math.PI / 4);
tableWithChairs("pav-b", -14.6, -2.6, PAVILION_FLOOR, "dining", 4, 0.85, "square", Math.PI / 4);
tableWithChairs("pav-c", -18.2, 2.2, PAVILION_FLOOR, "dining", 4, 0.85, "square", Math.PI / 4);
tableWithChairs("pav-d", -14.6, 2.2, PAVILION_FLOOR, "dining", 4, 0.85, "square", Math.PI / 4);
tableWithChairs("pav-e", -16.4, 5.9, PAVILION_FLOOR, "dining", 4, 0.85, "square", Math.PI / 4);
// bar stools in front of the counter
for (let i = 0; i < 6; i++) {
  SEATS.push({ id: `bar-${i}`, x: -19.9, z: -3.6 + i * 1.6, y: PAVILION_FLOOR, facing: -Math.PI / 2, kind: "bar" });
}
// poolside: white metal tables on the deck (as in the photos)
tableWithChairs("deck-a", -5.5, 5.6, 0, "dining", 2, 0.75, "round", Math.PI / 2);
tableWithChairs("deck-b", 1.5, 5.6, 0, "dining", 2, 0.75, "round", Math.PI / 2);
tableWithChairs("deck-c", 12.2, -4.5, 0, "dining", 3, 0.75);
// courtyard tables by the fence
// courtyard tables on the west side (Ayo and Ludo are played here)
tableWithChairs("yard-a", -30, -18.5, 0, "courtyard", 4, 0.8);
tableWithChairs("yard-b", -25.5, -20.8, 0, "courtyard", 4, 0.8, "round", 0.4);
// high tables by the grill
TABLES.push({ x: 0.8, z: -13.6, y: 0, r: 0.35, kind: "high" });
TABLES.push({ x: 8.6, z: -14.2, y: 0, r: 0.35, kind: "high" });

{
  const step = (DINNER.x1 - DINNER.x0) / DINNER.seats;
  for (let i = 0; i < DINNER.seats; i++) {
    const x = DINNER.x0 + step * (i + 0.5);
    SEATS.push({ id: `dinner-n-${i}`, x, z: DINNER.z - 0.92, y: 0, facing: 0, kind: "dinner" });
    SEATS.push({ id: `dinner-s-${i}`, x, z: DINNER.z + 0.92, y: 0, facing: Math.PI, kind: "dinner" });
  }
}

// sun loungers on the east deck and along the south deck, facing the water / screen
export const LOUNGERS: { x: number; z: number; facing: number }[] = [
  { x: 11, z: 1.2, facing: -Math.PI / 2 },
  { x: 11, z: 3.6, facing: -Math.PI / 2 },
  { x: 13.4, z: 1.2, facing: -Math.PI / 2 },
  { x: 13.4, z: 3.6, facing: -Math.PI / 2 },
  { x: -8, z: 5.9, facing: Math.PI },
  { x: 5, z: 5.9, facing: Math.PI },
  { x: 8, z: 5.9, facing: Math.PI },
];
LOUNGERS.forEach((l, i) => SEATS.push({ id: `lounger-${i}`, x: l.x, z: l.z, y: 0.28, facing: l.facing, kind: "lounger" }));

// movie night: rows of chairs in front of the cinema block, facing the screen (north)
/** The little lawn the movie chairs stand on, facing the roof screen. */
export const MOVIE_LAWN: Rect = { x0: 16.5, x1: 30.5, z0: -4.5, z1: 1.8 };
export const MOVIE_ROWS = 3;
export const MOVIE_COLS = 6;
for (let r = 0; r < MOVIE_ROWS; r++)
  for (let c = 0; c < MOVIE_COLS; c++)
    SEATS.push({ id: `movie-${r}-${c}`, x: 18.5 + c * 1.6 + (r % 2) * 0.4, z: MOVIE_LAWN.z0 + 1.1 + r * 1.7, y: 0, facing: Math.PI, kind: "movie" });

/** Round things in the way: tables, palms, columns, chairs (people stop just short of them). */
export const CIRCLES: Circle[] = [
  ...TABLES.map((t) => ({ x: t.x, z: t.z, r: t.r + 0.1 })),
  // the porch's columns
  { x: PORCH.x0 + 0.3, z: PORCH.front + 0.3, r: 0.3 },
  { x: PORCH.x1 - 0.3, z: PORCH.front + 0.3, r: 0.3 },
];

// ---------------------------------------------------------------------------------------------
// Interactive spots: walking up to one offers its action; from the aerial view their buttons float

export type SpotId = "checkin" | "yearbook" | "roommate" | "menu" | "grill" | "movie" | "games" | "awards" | "pool";
export type Spot = { id: SpotId; x: number; z: number; r: number; label: string; button: string; icon: string; y: number; aerial?: boolean };

export const SPOTS: Spot[] = [
  { id: "checkin", x: CHECKIN_DESK.x, z: CHECKIN_DESK.z + 1.7, r: 2.4, label: "Check in at the gate", button: "Check in", icon: "🔑", y: TERRACE_Y + 5.5 },
  { id: "roommate", x: RECEPTION.x, z: RECEPTION.z + 1.4, r: 2.6, label: "Reception: choose your room partner", button: "Room partner", icon: "🛏️", y: TERRACE_Y + 4.6 },
  { id: "yearbook", x: YEARBOOK.x, z: YEARBOOK.z + 1.8, r: 2.4, label: "Open the Yearbook: who's coming", button: "Yearbook", icon: "📖", y: TERRACE_Y + 4.2 },
  { id: "menu", x: -19.2, z: 0.6, r: 2.4, label: "The bar: see the menu", button: "Food menu", icon: "🍽️", y: 5 },
  { id: "grill", x: GRILL.x, z: GRILL.z + 1.6, r: 2.6, label: "The grill: suya, chicken, fish", button: "Grill", icon: "🔥", y: 4.6 },
  { id: "movie", x: SCREEN.x, z: -5.6, r: 3.2, label: "Movie night: pick the film", button: "Movie night", icon: "🎬", y: SCREEN.y0 + SCREEN.h + 1.6 },
  { id: "movie", x: FILM_BOARD.x + 2.2, z: FILM_BOARD.z, r: 2.4, label: "The big screen: watch and choose the movie", button: "Movie night", icon: "🎬", y: FILM_BOARD.y0 + FILM_BOARD.h + 1, aerial: false },
  { id: "games", x: -75, z: -12, r: 9, label: "The field: pick your games", button: "Games", icon: "⚽", y: 4 },
  { id: "awards", x: AWARDS.x, z: AWARDS.z + 1.6, r: 2.4, label: "Awards board: nominate someone", button: "Nominate", icon: "🏆", y: 4.4 },
  { id: "pool", x: 0, z: 0, r: 0, label: "The pool", button: "Pool", icon: "🏊", y: 3 },
];

/** Where you appear: outside the gate, on the road, facing in. */
export const SPAWN = { x: 43.6, z: -29, heading: -Math.PI / 2 };
/** The aerial view's centre. */
export const AERIAL_CENTRE = { x: -6, y: 0, z: -14 };

// ---------------------------------------------------------------------------------------------
// The people who work here: each stands at their spot, turns to greet you and talks you through it

export type Attendant = { spot: SpotId; x: number; z: number; facing: number; avatar: string; name: string; role: string; line: string };

export const ATTENDANTS: Attendant[] = [
  { spot: "checkin", x: CHECKIN_DESK.x, z: CHECKIN_DESK.z - 0.85, facing: 0, avatar: "bf01", name: "Ada", role: "Welcome desk", line: "Welcome to Silver Dome! 👋 Let me check you in and get you your key card." },
  { spot: "yearbook", x: YEARBOOK.x - 1.7, z: YEARBOOK.z + 0.9, facing: 0.5, avatar: "m12", name: "Kunle", role: "Yearbook", line: YEARBOOK_OPEN ? "Have you seen who's coming? Have a flip through the Yearbook!" : "The Yearbook isn't out yet, but put your name in now and you'll be on its pages! ✍️" },
  { spot: "roommate", x: RECEPTION.x, z: -31.25, facing: 0, avatar: "f07", name: "Bisi", role: "Reception", line: "Hello! Ready to choose who you're sharing a room with?" },
  { spot: "menu", x: BUFFET.x + 0.95, z: (BUFFET.z0 + BUFFET.z1) / 2, facing: -Math.PI / 2, avatar: "bf04", name: "Funke", role: "Buffet", line: "Dinner is served! 🍽️ Grab a seat at the long table, and pick your meals for the weekend here." },
  { spot: "menu", x: BAR.x - 0.95, z: 0.6, facing: Math.PI / 2, avatar: "m08", name: "Segun", role: "The bar", line: "What are we having today? Here's the menu." },
  { spot: "grill", x: GRILL.x - 0.8, z: GRILL.z - 1.05, facing: 0, avatar: "m08", name: "Chef Tayo", role: "The grill", line: "Suya's on the fire! 🔥 Pick what you want for grill night." },
  { spot: "movie", x: FILM_BOARD.x + 1.3, z: FILM_BOARD.z - FILM_BOARD.w / 2 - 0.5, facing: Math.PI / 2, avatar: "fp01", name: "Kemi", role: "Movie night", line: "Movie night! 🎬 Watch the trailers on the big screen and pick tonight's film." },
  { spot: "games", x: -55, z: -12.6, facing: -Math.PI / 2, avatar: "bm05", name: "Coach Bayo", role: "Games", line: "The bonfire's lit! 🔥 Fancy a game tomorrow? Football, tug of war, Ayo… sign up and I'll sort the teams." },
  { spot: "awards", x: AWARDS.x + 2, z: AWARDS.z + 0.7, facing: 0, avatar: "f15", name: "Tobi", role: "Awards", line: "Who's the best dressed this weekend? Come and nominate them!" },
];

/** Roll-up banners: at the welcome desk, the foot of the stairs, the bar, the pool and the field. */
export type Banner = { x: number; z: number; ry: number; design: "welcome" | "staycation" | "party" };
export const BANNERS: Banner[] = [
  { x: CHECKIN_DESK.x - 2.1, z: CHECKIN_DESK.z - 0.3, ry: 0.15, design: "welcome" },
  { x: CHECKIN_DESK.x + 2.1, z: CHECKIN_DESK.z - 0.3, ry: -0.15, design: "staycation" },
  { x: STAIRS.x0 - 1.2, z: STAIRS.z1 + 0.6, ry: 0.4, design: "party" },
  { x: -20.2, z: -6.9, ry: 0, design: "staycation" },
  { x: 14.2, z: 6.3, ry: -0.7, design: "party" },
  { x: 30.9, z: -3.6, ry: -Math.PI / 2, design: "party" },
  { x: -46.4, z: -16.2, ry: Math.PI / 2, design: "staycation" },
];

/** Parked cars (solid: you walk round them). */
export const CARS: { x: number; z: number; ry: number; color: string; kind: "sedan" | "suv" }[] = [
  { x: 18, z: -41, ry: 0, color: "#e8e8e8", kind: "suv" },
  { x: 21, z: -41, ry: 0, color: "#1c2a44", kind: "sedan" },
  { x: 24, z: -41, ry: Math.PI, color: "#8a1f1f", kind: "sedan" },
  { x: 27, z: -41, ry: 0, color: "#6a7a52", kind: "suv" },
  { x: 30, z: -41, ry: Math.PI, color: "#c9c9c9", kind: "sedan" },
  { x: 33, z: -41, ry: 0, color: "#2b2b2b", kind: "suv" },
  { x: 5, z: -29.6, ry: Math.PI / 2, color: "#f2f2f2", kind: "sedan" },
];

/** Palms: along the planters on the south wall, round the yard and on the terrace. */
export const PALMS: { x: number; y: number; z: number; ry: number; s: number; v: 0 | 1 }[] = (() => {
  const out: { x: number; y: number; z: number; ry: number; s: number; v: 0 | 1 }[] = [];
  let k = 0;
  for (let x = -9; x <= 14; x += 4.6) out.push({ x, y: 0.5, z: 8, ry: x, s: 0.9 + (k % 3) * 0.1, v: (k++ % 2) as 0 | 1 });
  for (const [x, z] of [[-40, -20], [-40, 4], [-30, 6], [36, 4], [38, -18], [28, 6], [-38, -6], [36, -6]]) out.push({ x, y: 0, z, ry: x * z, s: 1.05, v: (k++ % 2) as 0 | 1 });
  for (const [x, z] of [[-40, -40], [-38, -30], [30, -46], [20, -46], [38, -38]]) out.push({ x, y: TERRACE_Y, z, ry: x, s: 1.1, v: (k++ % 2) as 0 | 1 });
  return out;
})();

// the bonfire: four logs round it, two places on each, facing the fire
export const BONFIRE_LOGS: { x: number; z: number; ry: number }[] = [];
for (let k = 0; k < 4; k++) {
  const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
  const x = BONFIRE.x + Math.sin(a) * BONFIRE.logR, z = BONFIRE.z + Math.cos(a) * BONFIRE.logR;
  BONFIRE_LOGS.push({ x, z, ry: a });
  for (const off of [-0.55, 0.55]) {
    const sx = x + Math.cos(a) * off, sz = z - Math.sin(a) * off;
    SEATS.push({ id: `bonfire-${k}-${off > 0 ? 1 : 0}`, x: sx, z: sz, y: 0, facing: Math.atan2(BONFIRE.x - sx, BONFIRE.z - sz), kind: "bonfire" });
  }
  CIRCLES.push({ x, z, r: 0.5 });
}
CIRCLES.push({ x: BONFIRE.x, z: BONFIRE.z, r: 1.3 });
// the big screen's two legs
for (const dz of [-FILM_BOARD.w / 2 + 0.2, FILM_BOARD.w / 2 - 0.2]) CIRCLES.push({ x: FILM_BOARD.x, z: FILM_BOARD.z + dz, r: 0.25 });

// everything above is solid too
for (const c of CARS) {
  const along = Math.abs(Math.sin(c.ry)) > 0.5;
  BLOCKS.push(along ? { x0: c.x - 2.35, x1: c.x + 2.35, z0: c.z - 0.95, z1: c.z + 0.95, h: 1.7 } : { x0: c.x - 0.95, x1: c.x + 0.95, z0: c.z - 2.35, z1: c.z + 2.35, h: 1.7 });
}
for (const p of PALMS) CIRCLES.push({ x: p.x, z: p.z, r: p.y > 0.2 && p.y < 1 ? 0.2 : 0.3 });
for (const b of BANNERS) CIRCLES.push({ x: b.x, z: b.z, r: 0.45 });
for (const a of ATTENDANTS) CIRCLES.push({ x: a.x, z: a.z, r: 0.35 });
for (const l of LOUNGERS) for (const k of [-0.55, 0.55]) CIRCLES.push({ x: l.x + Math.sin(l.facing) * k, z: l.z + Math.cos(l.facing) * k, r: 0.4 });
CIRCLES.push({ x: CINEMA.x0 + 1, z: CINEMA.z1 + 1.4, r: 0.45 });

/** Green barricades where it looks open but isn't (the road's ends, round the field and its path). */
export const BARRICADES: { x0: number; z0: number; x1: number; z1: number; y: number }[] = [
  // the pavement's far ends, well out of the way
  { x0: STREET.walk.x0, z0: ROAD.z0 + 1, x1: STREET.walk.x1, z1: ROAD.z0 + 1, y: TERRACE_Y },
  { x0: STREET.walk.x0, z0: ROAD.z1 - 1, x1: STREET.walk.x1, z1: ROAD.z1 - 1, y: TERRACE_Y },
  { x0: FIELD_PATH.x0, z0: FIELD_PATH.z0, x1: FIELD_PATH.x1, z1: FIELD_PATH.z0, y: 0 },
  { x0: FIELD_PATH.x0, z0: FIELD_PATH.z1, x1: FIELD_PATH.x1, z1: FIELD_PATH.z1, y: 0 },
  { x0: FIELD.x1, z0: FIELD.z0, x1: FIELD.x1, z1: FIELD_PATH.z0, y: 0 },
  { x0: FIELD.x1, z0: FIELD_PATH.z1, x1: FIELD.x1, z1: FIELD.z1, y: 0 },
];
