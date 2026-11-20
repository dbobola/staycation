// The event's details in one place.

export const EVENT = {
  name: "WESCOSA Staycation",
  short: "WESCOSA",
  venue: "Silver Dome",
  city: "Ibadan",
  /** Shown under the title. */
  dates: "Dec 18–20",
  checkIn: "Fri 18 Dec, 12 noon",
  checkOut: "Sun 20 Dec",
  /** Nights of the stay, for the meal plan (Fri dinner, Sat breakfast, …). */
  nights: 2,
  /** The day names of the stay, first day first (Fri 18, Sat 19, Sun 20 Dec). */
  days: ["Fri 18", "Sat 19", "Sun 20"],
  /** Key card prefix for check-in codes. */
  cardPrefix: "SD",
};

/**
 * Example classmates fill the Yearbook, the room-partner list and the nominations until enough
 * real people have checked in (they're marked "sample"). Set to 0 to never show them.
 */
export const SAMPLES_UNTIL = 0;

/** The Yearbook isn't open yet: it says so, and asks people to put their name in for when it is. */
export const YEARBOOK_OPEN = false;
