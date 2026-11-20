// The event's details in one place. Dates, the association's full name and anything marked TBC
// are placeholders to confirm with the organisers.

export const EVENT = {
  name: "WESCOSA Staycation",
  short: "WESCOSA",
  venue: "Silver Dome",
  city: "Ibadan",
  /** Shown under the title; replace with the real dates. */
  dates: "Dates TBC",
  /** Nights of the stay, for the meal plan (Night 1 dinner, Day 2 breakfast, …). */
  nights: 2,
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
