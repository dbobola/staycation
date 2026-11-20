// The Silver Dome menu for the weekend (placeholder dishes and descriptions, to confirm with the kitchen).

export type Dish = { id: string; name: string; note: string; tag?: "veg" | "spicy" | "chef" | "alcohol" };
export type Course = { id: string; label: string; dishes: Dish[] };

export const COURSES: Course[] = [
  {
    id: "mains",
    label: "Mains",
    dishes: [
      { id: "jollof", name: "Party jollof rice", note: "Smoky, firewood style", tag: "chef" },
      { id: "fried", name: "Nigerian fried rice", note: "With liver and prawns" },
      { id: "ofada", name: "Ofada rice & ayamase", note: "Green pepper stew, assorted meat", tag: "spicy" },
      { id: "amala", name: "Amala, ewedu & gbegiri", note: "Ibadan's own, with assorted", tag: "chef" },
      { id: "poundo", name: "Pounded yam & egusi", note: "With goat meat or fish" },
      { id: "pasta", name: "Stir-fry spaghetti", note: "Chicken and vegetables" },
      { id: "salad", name: "Garden salad bowl", note: "Grilled vegetables, avocado", tag: "veg" },
    ],
  },
  {
    id: "grill",
    label: "Grill",
    dishes: [
      { id: "chicken", name: "Grilled chicken", note: "Quarter, peppered and charred", tag: "chef" },
      { id: "suya", name: "Beef suya", note: "Yaji, onions and tomato", tag: "spicy" },
      { id: "fish", name: "Whole grilled croaker", note: "With pepper sauce", tag: "spicy" },
      { id: "asun", name: "Asun", note: "Spicy smoked goat", tag: "spicy" },
      { id: "corn", name: "Roasted corn & ube", note: "In season", tag: "veg" },
    ],
  },
  {
    id: "sides",
    label: "Sides",
    dishes: [
      { id: "dodo", name: "Dodo", note: "Fried ripe plantain", tag: "veg" },
      { id: "moimoi", name: "Moi moi", note: "Steamed bean pudding", tag: "veg" },
      { id: "coleslaw", name: "Coleslaw", note: "", tag: "veg" },
      { id: "chips", name: "Yam or potato chips", note: "", tag: "veg" },
      { id: "peppersoup", name: "Goat meat pepper soup", note: "Hot, for the evening", tag: "spicy" },
    ],
  },
  {
    id: "breakfast",
    label: "Breakfast",
    dishes: [
      { id: "akara", name: "Akara & pap", note: "With custard or ogi", tag: "veg" },
      { id: "yamegg", name: "Boiled yam & egg sauce", note: "" },
      { id: "english", name: "Full English", note: "Eggs, sausage, beans, toast" },
      { id: "pancakes", name: "Pancakes & fruit", note: "", tag: "veg" },
      { id: "plantainegg", name: "Plantain & omelette", note: "", tag: "veg" },
    ],
  },
  {
    id: "drinks",
    label: "Drinks",
    dishes: [
      { id: "chapman", name: "Chapman", note: "The classic" },
      { id: "zobo", name: "Zobo", note: "Chilled, ginger and pineapple" },
      { id: "mojito", name: "Virgin mojito", note: "" },
      { id: "smoothie", name: "Tropical smoothie", note: "Mango, pineapple, banana" },
      { id: "soft", name: "Soft drink or malt", note: "Coke, Fanta, Sprite, Maltina" },
      { id: "water", name: "Water", note: "" },
      // the bar
      { id: "champagne", name: "Champagne", note: "A flute of bubbly", tag: "alcohol" },
      { id: "wine-red", name: "Red wine", note: "By the glass", tag: "alcohol" },
      { id: "wine-white", name: "White or rosé wine", note: "Chilled, by the glass", tag: "alcohol" },
      { id: "beer", name: "Cold beer", note: "Star, Gulder, Trophy or Heineken", tag: "alcohol" },
      { id: "stout", name: "Guinness stout", note: "", tag: "alcohol" },
      { id: "smirnoff", name: "Smirnoff Ice", note: "", tag: "alcohol" },
      { id: "cognac", name: "Hennessy or cognac", note: "Neat or on the rocks", tag: "alcohol" },
      { id: "whisky", name: "Whisky", note: "Neat, on the rocks, or with soda", tag: "alcohol" },
      { id: "cocktail", name: "House cocktail", note: "Ask Segun: mojito, sex on the beach, margarita", tag: "alcohol" },
      { id: "palmwine", name: "Fresh palm wine", note: "In a calabash", tag: "alcohol" },
    ],
  },
];

export const DISHES = new Map(COURSES.flatMap((c) => c.dishes.map((d) => [d.id, d] as const)));

/** The meals over the stay (each one: a main, a side and a drink; breakfast has its own list). */
export function mealSlots(nights: number) {
  const slots: { id: string; label: string; courses: string[] }[] = [];
  for (let n = 1; n <= nights; n++) {
    if (n > 1) {
      slots.push({ id: `d${n}-breakfast`, label: `Day ${n} · Breakfast`, courses: ["breakfast", "drinks"] });
      slots.push({ id: `d${n}-lunch`, label: `Day ${n} · Lunch`, courses: ["mains", "sides", "drinks"] });
    }
    slots.push({ id: `d${n}-dinner`, label: n === nights ? `Night ${n} · Grill night` : `Night ${n} · Dinner`, courses: n === nights ? ["grill", "sides", "drinks"] : ["mains", "sides", "drinks"] });
  }
  slots.push({ id: `d${nights + 1}-breakfast`, label: `Day ${nights + 1} · Breakfast`, courses: ["breakfast", "drinks"] });
  return slots;
}
