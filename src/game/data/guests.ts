// The names over the people at the resort (the organisers' list, each name once). Ladies get a
// female avatar, guys a male one. ("Me" on the list is left out: that's whoever is playing.)

export const GUEST_NAMES: { name: string; sex: "f" | "m" }[] = [
  { name: "Nana Awaw", sex: "f" },
  { name: "Lolade", sex: "f" },
  { name: "Esther", sex: "f" },
  { name: "Precious Arogundari", sex: "f" },
  { name: "Dunni", sex: "f" },
  { name: "Felicia Ogedengbe", sex: "f" },
  { name: "Rodiat", sex: "f" },
  { name: "Rofiat", sex: "f" },
  { name: "Nike", sex: "f" },
  { name: "TMO", sex: "f" },
  { name: "Deola", sex: "f" },
  { name: "Aminat", sex: "f" },
  { name: "Kaosarat", sex: "f" },
  { name: "Fathia", sex: "f" },
  { name: "Oyinade", sex: "f" },
  { name: "Seun Bams", sex: "f" },
  { name: "Uswat", sex: "f" },
  { name: "Oyinkan", sex: "f" },
  { name: "Fakayode Mayowa", sex: "f" },
  { name: "Motorire", sex: "f" },
  { name: "Saidat", sex: "f" },
  { name: "Future", sex: "f" },
  { name: "Oyajumo Janet Mayor", sex: "f" },
  { name: "Oladele Anuoluwapo", sex: "f" },
  { name: "Phoebe", sex: "f" },
  { name: "Oke Racheal", sex: "f" },
  { name: "Shade", sex: "f" },
  { name: "Yetty", sex: "f" },
  { name: "Sarat", sex: "f" },
  { name: "Ife", sex: "f" },
  { name: "Abake", sex: "f" },
  { name: "Jummy", sex: "f" },
  { name: "Adediwura", sex: "f" },
  { name: "MK", sex: "m" },
  { name: "Ajadi", sex: "m" },
  { name: "Hotman", sex: "m" },
  { name: "Abdulhi", sex: "m" },
  { name: "Tbest", sex: "m" },
  { name: "Aji", sex: "m" },
  { name: "Bobo", sex: "m" },
  { name: "Herjyy", sex: "m" },
  { name: "Khay", sex: "m" },
  { name: "Bhayo", sex: "m" },
  { name: "Teeto", sex: "m" },
  { name: "Mayor Adegoke", sex: "m" },
  { name: "Akin Sax", sex: "m" },
  { name: "Dolly Pizzle", sex: "m" },
  { name: "Victor", sex: "m" },
  { name: "Adio", sex: "m" },
  { name: "Boluwatito", sex: "m" },
  { name: "Emex", sex: "m" },
  { name: "Jhay B", sex: "m" },
  { name: "Forlan", sex: "m" },
  { name: "Ceeza Gold", sex: "m" },
  { name: "Holla", sex: "m" },
  { name: "Huncho", sex: "m" },
];

/** These three come over and flirt when you're a lady. */
export const FLIRTS = ["Bobo", "Herjyy", "Khay"];
export const FLIRT_LINES = [
  "Fine girl, how you dey? 😍",
  "Omo! Who be this one? 😏",
  "You too fine o, abeg 🔥",
  "My crush don land! 😉",
  "You go dance with me tonight? 💃🏾",
  "Abeg drop your number make I call you 😄",
  "Na you I dey wait for since 😘",
  "Come siddon with me for pool side 🌴",
];

/** What the people at the dinner table say to each other. */
export const CHATTER = [
  "Oya cheers! 🥂",
  "Hahaha 😂",
  "Remember SS3? 😂",
  "Pass the jollof abeg",
  "Na lie! 😂",
  "This chicken 🔥",
  "To old friends 🥂",
  "E don tey o!",
  "Na wa o 😂",
  "Correct food 😋",
];

/** What people say as you walk past. */
export const HELLOS = [
  "How far? 👋",
  "Wetin dey sup?",
  "Ah! E don tey!",
  "You don land! 🙌",
  "Long time no see o!",
  "Hello o!",
  "Na you be this? 😄",
  "Omo, you don fresh!",
  "Hi! Welcome o",
  "Enjoy yourself o!",
];

/**
 * Gist when you sit down with people: someone says something, you pick a reply, they answer.
 * Mostly Pidgin, the way everyone talks here.
 */
export const GIST: { line: string; replies: { you: string; them: string }[] }[] = [
  {
    line: "Ah! Na you be this? You don fresh o! 😄",
    replies: [
      { you: "Thank you o! You sef no small 😎", them: "Abeg! We dey try 😂" },
      { you: "Na God o 🙏", them: "Amen! God dey 🙌" },
      { you: "Who you be again? 😅", them: "Haaa! You don forget me?! 😂" },
    ],
  },
  {
    line: "You remember that time for hostel when light no dey for one week? 😂",
    replies: [
      { you: "Omo, I no fit forget! 😂", them: "We dey read with torchlight like say na exam hall 😂" },
      { you: "Na that time we start to dey sleep for class 😴", them: "Hahaha! Na true talk 😂" },
      { you: "I no dey that hostel o", them: "Lie! I see you with my two eye 👀😂" },
    ],
  },
  {
    line: "Oya, which one you chop: jollof or fried rice? 🍛",
    replies: [
      { you: "Jollof all the way! 🔥", them: "Correct person! Party jollof na baba 😋" },
      { you: "Fried rice, abeg 😌", them: "Hmm, I go allow you today 😂" },
      { you: "Na amala I dey find 😂", them: "Ibadan person for real! 😂" },
    ],
  },
  {
    line: "Who go win the awards tonight? I dey vote for myself 😂",
    replies: [
      { you: "You no go win o 😂", them: "Hater! 😂😂" },
      { you: "I don nominate you already 😉", them: "My person! Thank you o 🙏" },
      { you: "Na me go carry Best Dressed 💅🏾", them: "Hmm, I no go argue that one 😂" },
    ],
  },
  {
    line: "So wetin you dey do now? Where you dey stay? 🤔",
    replies: [
      { you: "I dey Lagos, dey hustle 💼", them: "Lagos no easy o! God go do am 🙏" },
      { you: "I dey abroad now ✈️", them: "Japa person! You go remember us o 😂" },
      { you: "Small small, we dey manage 😅", them: "Na so we all dey o, cheers to that 🥂" },
    ],
  },
  {
    line: "Make we snap picture before the night finish 📸",
    replies: [
      { you: "Oya smile! 📸", them: "Make I fix my face first 😂" },
      { you: "Send am give me o", them: "I go post am, tag you 😉" },
      { you: "I no snap without filter 😂", them: "Hahaha! Na the light, no filter needed 💡" },
    ],
  },
];
