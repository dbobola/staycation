// Example classmates (not real people): they fill the Yearbook and lists until real check-ins
// arrive (see SAMPLES_UNTIL), and they're the names over the guests walking around the resort.

export type Person = {
  id: string;
  first: string;
  last: string;
  nickname?: string;
  set?: string;
  house?: string;
  quote?: string;
  sex?: "f" | "m";
  /** Their name on the organisers' list, picked when checking in (they may go by another). */
  listName?: string;
  sample?: boolean;
};

export const SAMPLE_PEOPLE: Person[] = [
  { id: "s1", first: "Adaeze", last: "Okafor", nickname: "Ada", set: "2008", house: "Blue", quote: "Still owes me ₦200 from SS2.", sex: "f" },
  { id: "s2", first: "Tunde", last: "Bakare", nickname: "TB", set: "2008", house: "Red", quote: "Captain of the 5-a-side, retired undefeated.", sex: "m" },
  { id: "s3", first: "Funmi", last: "Adeyemi", set: "2009", house: "Yellow", quote: "Here for the pool and the jollof.", sex: "f" },
  { id: "s4", first: "Kelechi", last: "Nwosu", nickname: "Kc", set: "2008", house: "Green", quote: "Who's on aux?", sex: "m" },
  { id: "s5", first: "Bisola", last: "Ogunleye", set: "2010", house: "Blue", quote: "Bringing the Ludo board.", sex: "f" },
  { id: "s6", first: "Seun", last: "Olatunji", set: "2009", house: "Red", quote: "Room partner wanted: no snoring.", sex: "m" },
  { id: "s7", first: "Ngozi", last: "Eze", set: "2008", house: "Yellow", quote: "Best dressed. Again.", sex: "f" },
  { id: "s8", first: "Femi", last: "Adebayo", nickname: "Fem", set: "2010", house: "Green", quote: "Suya first, questions later.", sex: "m" },
  { id: "s9", first: "Temi", last: "Akinola", set: "2009", house: "Blue", quote: "Karaoke queen since JSS1.", sex: "f" },
  { id: "s10", first: "Chidi", last: "Okonkwo", set: "2008", house: "Yellow", quote: "Ayo champion, come and try me.", sex: "m" },
  { id: "s11", first: "Ronke", last: "Salami", set: "2010", house: "Red", quote: "Here to rest. Do not wake me.", sex: "f" },
  { id: "s12", first: "Dayo", last: "Ige", set: "2009", house: "Green", quote: "Movie night: King of Boys, final answer.", sex: "m" },
  { id: "s13", first: "Halima", last: "Bello", set: "2008", house: "Blue", quote: "Pool volleyball MVP loading.", sex: "f" },
  { id: "s14", first: "Gbenga", last: "Oyelaran", set: "2010", house: "Yellow", quote: "First at the grill, last to leave.", sex: "m" },
  { id: "s15", first: "Ife", last: "Ojo", set: "2009", house: "Red", quote: "Let's take the class photo properly this time.", sex: "f" },
  { id: "s16", first: "Uche", last: "Obi", set: "2008", house: "Green", quote: "I brought the drums.", sex: "m" },
].map((p) => ({ ...p, sample: true }) as Person);
