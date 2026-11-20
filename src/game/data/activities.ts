// Movie night picks, the games on offer, and the award categories (all placeholders to edit).

/** trailer: the YouTube video id of the official trailer (it plays on the big screen). */
export type Movie = { id: string; title: string; year: number; genre: string; color: string; trailer?: string };
export const MOVIES: Movie[] = [
  // college life and school days
  { id: "pitch-perfect", title: "Pitch Perfect", year: 2012, genre: "College · Comedy", color: "#e85d75", trailer: "8dItOM6eYXY" },
  { id: "21-jump-street", title: "21 Jump Street", year: 2012, genre: "School · Comedy", color: "#3f7fd8", trailer: "Oj55KinxZx4" },
  { id: "social-network", title: "The Social Network", year: 2010, genre: "College · Drama", color: "#2f5f8f", trailer: "lB95KLmpLR4" },
  { id: "mean-girls", title: "Mean Girls", year: 2004, genre: "School · Comedy", color: "#d6247c", trailer: "oDU84nmSDZY" },
  { id: "stomp-the-yard", title: "Stomp the Yard", year: 2007, genre: "College · Dance", color: "#7f5bd6", trailer: "jA6RTM9NE8s" },
  // big nights out
  { id: "the-hangover", title: "The Hangover", year: 2009, genre: "Comedy", color: "#d4a13a", trailer: "TZc39afdeXU" },
  { id: "bad-boys", title: "Bad Boys for Life", year: 2020, genre: "Action · Comedy", color: "#b8862f", trailer: "jKCj3XuPG8M" },
  { id: "top-gun", title: "Top Gun: Maverick", year: 2022, genre: "Action", color: "#5b7fa6", trailer: "qSqVVswa420" },
  { id: "spider-verse", title: "Spider-Man: Across the Spider-Verse", year: 2023, genre: "Animation · Action", color: "#c2412d", trailer: "cqGjhVJWtEg" },
  { id: "black-panther", title: "Black Panther", year: 2018, genre: "Action", color: "#6b3fa0", trailer: "xjDjIWPwcPU" },
  { id: "crazy-rich-asians", title: "Crazy Rich Asians", year: 2018, genre: "Romantic comedy", color: "#c9a227", trailer: "ZQ-YX-5bAs0" },
  { id: "barbie", title: "Barbie", year: 2023, genre: "Comedy", color: "#e86aa6", trailer: "pBk4NYhWNMM" },
  { id: "endgame", title: "Avengers: Endgame", year: 2019, genre: "Action", color: "#5a3f8a", trailer: "TcMBFSGVi1c" },
  // a couple of Nollywood favourites
  { id: "wedding-party", title: "The Wedding Party", year: 2016, genre: "Nollywood · Comedy", color: "#e8642a", trailer: "M8XaN1DtI7E" },
  { id: "tribe-judah", title: "A Tribe Called Judah", year: 2023, genre: "Nollywood · Comedy drama", color: "#0f6e4f", trailer: "pEUZVfeCU94" },
];

export type Game = { id: string; name: string; where: string; icon: string };
export const GAMES: Game[] = [
  { id: "football", name: "5-a-side football", where: "The field", icon: "⚽" },
  { id: "pool-volley", name: "Pool volleyball", where: "The pool", icon: "🏐" },
  { id: "tug", name: "Tug of war", where: "The field", icon: "🪢" },
  { id: "relay", name: "Sack & relay races", where: "The field", icon: "🏃" },
  { id: "ayo", name: "Ayò Ọlọ́pọ́n", where: "The courtyard", icon: "🟤" },
  { id: "whot", name: "Whot! card game", where: "The bar", icon: "🃏" },
  { id: "ludo", name: "Ludo", where: "The courtyard", icon: "🎲" },
  { id: "chess", name: "Chess & draughts", where: "The courtyard", icon: "♟️" },
  { id: "scrabble", name: "Scrabble", where: "The bar", icon: "🔤" },
  { id: "charades", name: "Charades", where: "Movie lawn", icon: "🎭" },
  { id: "karaoke", name: "Karaoke night", where: "The bar", icon: "🎤" },
  { id: "trivia", name: "School days trivia", where: "The bar", icon: "🧠" },
];

export type Award = { id: string; title: string; blurb: string };
export const AWARDS: Award[] = [
  { id: "best-dressed", title: "Best Dressed", blurb: "Came to slay, every single day" },
  { id: "life-party", title: "Life of the Party", blurb: "The reason we stayed up late" },
  { id: "unchanged", title: "Still Looks Exactly the Same", blurb: "Did they even age?" },
  { id: "glow-up", title: "Biggest Glow-up", blurb: "Who is this?!" },
  { id: "dancer", title: "Best Dancer", blurb: "Owned the floor" },
  { id: "swimmer", title: "Pool Champion", blurb: "Never left the water" },
  { id: "foodie", title: "Chief Foodie", blurb: "Third plate of jollof" },
  { id: "clown", title: "Class Clown, Still", blurb: "Some things never change" },
  { id: "generous", title: "Most Generous", blurb: "Bought the round" },
  { id: "sleeper", title: "First to Sleep", blurb: "Gone by 9pm" },
];
