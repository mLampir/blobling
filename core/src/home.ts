/** Finds from trips and what they do at home: seeds and the plant, food, decorations, hats, eggs, warmth, the house. */

import * as keepsake from "./keepsake";
import * as life from "./life";
import type { Random } from "./random";
import type { PetState, Stat } from "./state";

export type ItemKind = "seed" | "fruit" | "food" | "deco" | "hat" | "egg" | "map" | "yard" | "ground" | "playground";

// Name: kind
export const ITEMS: Record<string, ItemKind> = {
  seed_berry: "seed",
  seed_sunflower: "seed",
  seed_cherry: "seed",
  seed_herb: "seed",
  fruit_berry: "fruit",
  fruit_sunflower: "fruit",
  fruit_cherry: "fruit",
  fruit_herb: "fruit",
  honeycomb: "food",
  hazelnut: "food",
  watercress: "food",
  glowberry: "food",
  pinenut: "food",
  bread: "food",
  mussel: "food",
  seagrass: "food",
  flag: "deco",
  windmill: "deco",
  lantern: "deco",
  glowshroom: "deco",
  snailshell: "deco",
  cattail: "deco",
  boat: "deco",
  crystal: "deco",
  cairn: "deco",
  snowman: "deco",
  emberstone: "deco",
  snowglobe: "deco",
  pond: "deco",
  woodpile: "deco",
  boot: "deco",
  lifering: "deco",
  sandcastle: "deco",
  bottle: "deco",
  banner: "deco",
  arch: "deco",
  bell: "deco",
  // they bring a moment for growing up (MOMENT_DECO)
  moonlantern: "deco",
  stormbottle: "deco",
  sunstone: "deco",
  daisy: "hat",
  leaf: "hat",
  cap: "hat",
  bobble: "hat",
  lily: "hat",
  batears: "hat",
  edelweiss: "hat",
  sailor: "hat",
  knight: "hat",
  // knitted by Grandma (grandma.ts)
  earflap: "hat",
  stripes: "hat",
  cosy: "hat",
  cake: "food",
  // from a shooting star (stars.ts), the trick festival (festival.ts) and digging (digging.ts)
  star_shard: "deco",
  ribbon_blue: "deco",
  ribbon_red: "deco",
  helmet: "hat",
  fossil: "deco",
  treasure_map: "map",
  // the keepsakes of the lines (keepsake.ts)
  ...Object.fromEntries(Object.values(keepsake.KEEPSAKES).map((item) => [item, "deco"])) as Record<string, ItemKind>,
  // for the yard (yard.ts): the water basin from the stream, and planks from the coast and the ruins
  // that make trough and basin bigger; they go there, not into the bag
  basin: "yard",
  rain_barrel: "yard",
  planks_coast: "yard",
  planks_ruins: "yard",
  // the equipment for the training ground (ground.ts): it stands there, not in the bag
  barbell: "ground",
  cones: "ground",
  coach_board: "ground",
  // the pieces of the playground (playground.ts)
  swing: "playground",
  sandpit: "playground",
  seesaw: "playground",
  egg_blob: "egg",
  egg_ember: "egg",
  egg_stone: "egg",
  egg_fox: "egg",
  egg_cloud: "egg",
  egg_leaf: "egg",
  egg_duck: "egg",
  egg_hippo: "egg",
  egg_beak: "egg",
  egg_caterpillar: "egg",
  egg_dog: "egg",
  egg_dragonfly: "egg",
  egg_beaver: "egg",
  egg_crab: "egg",
  egg_axolotl: "egg",
  egg_mouse: "egg",
  egg_bear: "egg",
  egg_penguin: "egg",
  egg_bat: "egg",
  egg_owl: "egg",
  egg_chameleon: "egg",
  egg_scarab: "egg",
  egg_kite: "egg",
  egg_octopus: "egg",
  egg_gargoyle: "egg",
  egg_magpie: "egg",
};
export const MAX_SEEDS = 9; // per kind; decorations, hats, the treasure map and what is for the yard, the training ground or the playground exist only once
export const MAX_FOOD = 3; // per kind: fruits and food from trips are kept in small numbers (food.ts)
export const MAX_EGGS = 3; // this many of each line are kept (the bag shows them as one, ×n)
// Egg: the line that hatches from it (life.LINES). An egg is kept in state.eggs, as {line: ...} plus
// what a pet has passed on to it (wild.ts), until it is brooded (model.nextPet).
export const EGGS: Record<string, string> = { egg_blob: "blob", egg_ember: "ember", egg_stone: "stone", egg_fox: "fox",
  egg_cloud: "cloud", egg_leaf: "leaf", egg_duck: "duck", egg_hippo: "hippo", egg_beak: "beak",
  egg_caterpillar: "caterpillar", egg_dog: "dog", egg_dragonfly: "dragonfly", egg_beaver: "beaver",
  egg_crab: "crab", egg_axolotl: "axolotl", egg_mouse: "mouse", egg_bear: "bear", egg_penguin: "penguin",
  egg_bat: "bat", egg_owl: "owl", egg_chameleon: "chameleon", egg_scarab: "scarab", egg_kite: "kite",
  egg_octopus: "octopus", egg_gargoyle: "gargoyle", egg_magpie: "magpie" };
export const MAX_DECO = 2; // this many spots the scene has outside

// Plant: [stat, effect of one fruit]
export const PLANTS: Record<string, readonly [Stat, number]> = {
  berry: ["satiety", 30],
  sunflower: ["energy", 30],
  cherry: ["mood", 25],
  herb: ["health", 30],
};
export const CURES = ["herb"]; // these fruits also cure a sickness
export const GROW_MINUTES = 24 * 60; // from seed to plant
export const RIPEN_MINUTES = 24 * 60; // per fruit, only ever one at a time
export const FRUITS = 3; // after that the plant wilts
export const RAIN_FACTOR = 2; // in real rain everything grows twice as fast
export const EAT_BELOW = 60; // below this value the pet eats a ripe fruit by itself: above the yard's GOES_AT, so it picks the fruit first

// Warmth: the ember stone glows from inside. Set out, it makes whatever is still growing grow
// faster. And when it is cold outside, the pet shivers for a while after waking up: a moment to
// rub it warm, not a state that costs anything. The ember stone, a woolly hat and a fire of its
// own keep it from shivering at all.
export const WARM_DECO = ["emberstone"];
export const WARM_HATS = ["bobble", "earflap", "stripes", "cosy"]; // wool
export const WARM_LINES = ["ember"];
export const GROWTH_SAVED = 0.3; // by the ember stone, a stage is over this much sooner
export const COLD_BELOW = 5; // °C: below this it wakes up shivering (a first guess)
export const COLD_SECONDS = 3600; // it shivers this long, unless somebody rubs it warm
export const RUB_MOOD = 5; // what rubbing it warm is worth

// Heat: on a hot afternoon the pet sweats and droops for a while, once a day. A moment, like the
// cold mornings: it costs nothing, a bath cools it down, and it passes by itself. A leaf for a
// sunshade and a fire of its own keep it from minding the heat.
export const COOL_HATS = ["leaf"];
export const COOL_LINES = ["ember"];
export const HOT_FROM = 28; // °C: from this on an afternoon is hot (a first guess)
export const HOT_HOURS = [13, 18] as const; // the afternoon, local time
export const HOT_SECONDS = 3600; // it sweats this long, unless somebody gives it a bath
export const COOL_MOOD = 5; // what cooling it down is worth

// The house: a hut, then a cabin, then the whole house (state.house, 0 = none yet). Every pet that
// gets past the mountain's guardian (trip.HOUSE_AREA) adds a step, so it grows from one pet to the
// next. The pet sleeps inside, and each step has room for more decorations.
export const HOUSE_STEPS = 3;
export const HOUSE_SPOTS = [0, 1, 2, 3]; // per step: spots for decorations inside
export const OUTDOOR_DECO = ["snowman", "pond", "sandcastle", "iceblock", "hippofountain"]; // would melt or crumble inside; water belongs in the garden
// The snow globe: set out at home, outside or in the house, it snows around the pet, and a pet of
// the cloud line that grows up then counts it as snow (life.decideSpecies).
export const SNOW_DECO = ["snowglobe"];
// Decorations that bring a moment for a child growing up (life.SECRET) while they are set out,
// without changing the weather: the full moon, a thunderstorm, the heat of a summer afternoon
export const MOMENT_DECO: Record<string, string> = { moonlantern: "moon", stormbottle: "storm", sunstone: "heat" };
export const GLOWING_DECO = ["lantern", "glowshroom", "crystal", "emberstone", "star_shard", "jellylamp", "brazier",
  "moonstone", "shelllamp"]; // they light up at night

export function kindOf(item: string): ItemKind {
  return ITEMS[item];
}

export function ids(kind: ItemKind): string[] {
  return Object.keys(ITEMS).filter((item) => ITEMS[item] === kind);
}

export function canAdd(state: PetState, item: string): boolean {
  if (kindOf(item) === "egg") {
    return eggsOf(state, EGGS[item]) < MAX_EGGS;
  }
  const most = kindOf(item) === "seed" ? MAX_SEEDS : kindOf(item) === "food" || kindOf(item) === "fruit" ? MAX_FOOD : 1;
  return (state.items[item] ?? 0) < most;
}

/** How many eggs of this line are kept. */
export function eggsOf(state: PetState, line: string): number {
  return state.eggs.filter((egg) => egg.line === line).length;
}

export function addItem(state: PetState, item: string): void {
  if (!canAdd(state, item)) {
    return;
  }
  if (kindOf(item) === "egg") {
    state.eggs.push({ line: EGGS[item] });
  } else {
    state.items[item] = (state.items[item] ?? 0) + 1;
  }
}

/** Use up one of a find. Returns whether there was one. */
export function takeItem(state: PetState, item: string): boolean {
  if (!state.items[item]) {
    return false;
  }
  state.items[item] -= 1;
  if (!state.items[item]) {
    delete state.items[item];
  }
  return true;
}

/** The egg a line hatches from, as a find. */
export function eggOf(line: string): string {
  const egg = Object.keys(EGGS).find((name) => EGGS[name] === line);
  if (egg === undefined) {
    throw new Error(`no egg for the line ${line}`);
  }
  return egg;
}

// ---------- Plant ----------

/** Plant a seed. Returns null, or the reason why it doesn't work. */
export function plantSeed(state: PetState, kind: string): string | null {
  const seed = `seed_${kind}`;
  if (!state.items[seed]) {
    return "no_item";
  }
  if (state.plant) {
    return "plant_busy";
  }
  takeItem(state, seed);
  state.plant = { kind, grown: 0.0, ripening: 0.0, left: FRUITS };
  return null;
}

export function grow(state: PetState, minutes: number, rain: boolean): void {
  const plant = state.plant;
  if (!plant) {
    return;
  }
  minutes *= (rain ? RAIN_FACTOR : 1) * keepsake.factor(state, "plant");
  if (plant.grown < GROW_MINUTES) {
    plant.grown = Math.min(GROW_MINUTES, plant.grown + minutes);
  } else {
    plant.ripening = Math.min(RIPEN_MINUTES, plant.ripening + minutes);
  }
}

export function ripe(state: PetState): boolean {
  return !!state.plant && state.plant.ripening >= RIPEN_MINUTES;
}

/** "sprout", "young" or "grown" (for the scene). */
export function plantStage(state: PetState): "sprout" | "young" | "grown" {
  const grown = state.plant!.grown / GROW_MINUTES;
  return grown < 0.5 ? "sprout" : grown < 1 ? "young" : "grown";
}

/** Is a ripe fruit hanging there, and does the pet need it right now? */
export function wantsFruit(state: PetState): boolean {
  if (!ripe(state)) {
    return false;
  }
  const kind = state.plant!.kind;
  return state.stats[PLANTS[kind][0]] < EAT_BELOW || (CURES.includes(kind) && state.sick);
}

/** Eat a fruit of a plant's kind (from the plant, or a gift). */
export function eat(state: PetState, kind: string): void {
  const [stat, amount] = PLANTS[kind];
  state.stats[stat] += amount * keepsake.factor(state, "fruit");
  if (CURES.includes(kind)) {
    state.sick = false;
  }
}

/** Eat the ripe fruit; after the last one the plant wilts. Returns the kind. */
export function eatFruit(state: PetState): string {
  const plant = state.plant!;
  eat(state, plant.kind);
  plant.left -= 1;
  plant.ripening = 0.0;
  if (plant.left <= 0) {
    state.plant = null;
    state.garden.plants_done += 1; // all its fruits, and it never wilted before: a caterpillar may come (garden.ts)
  }
  return plant.kind;
}

// ---------- Small things: a friend's gift, what the pet finds at home ----------

export const SEED_CHANCE = 0.15; // how often a small thing is a seed rather than a fruit

/** A small thing: "fruit_<plant>", or now and then "seed_<plant>" if there is room for it. */
export function smallThing(state: PetState, rng: Random): string {
  const kind = rng.choice(Object.keys(PLANTS));
  return rng.random() < SEED_CHANCE && canAdd(state, `seed_${kind}`) ? `seed_${kind}` : `fruit_${kind}`;
}

/** A seed of some plant if there is room for it, else that plant's fruit (eaten if that doesn't fit either). */
export function smallSeed(state: PetState, rng: Random): string {
  const kind = rng.choice(Object.keys(PLANTS));
  return canAdd(state, `seed_${kind}`) ? `seed_${kind}` : `fruit_${kind}`;
}

/** Take a small thing: it goes into the bag, and a fruit that doesn't fit any more is eaten. */
export function receive(state: PetState, thing: string): void {
  if (canAdd(state, thing)) {
    addItem(state, thing);
  } else if (thing.startsWith("fruit_")) {
    eat(state, thing.slice("fruit_".length));
  }
}

// ---------- Warmth ----------

/** Is something warm set out? */
export function warmDeco(state: PetState): boolean {
  return state.deco.some((item) => WARM_DECO.includes(item));
}

/** Seconds by which this much time next to the ember stone brings the next stage forward. */
export function growthBonus(state: PetState, seconds: number): number {
  return warmDeco(state) ? seconds * GROWTH_SAVED / (1 - GROWTH_SAVED) : 0;
}

/** It has just woken up: in the cold it shivers for a while. `temp`: °C, or null without weather data. */
export function wakeInCold(state: PetState, temp: number | null, now: number): void {
  state.cold_until = temp !== null && temp < COLD_BELOW ? now + COLD_SECONDS : 0.0;
}

/** Does it shiver? Only at home and awake, and never with something that keeps it warm. */
export function cold(state: PetState, now: number): boolean {
  return now < state.cold_until && state.stage !== "egg" && !state.asleep && !state.trip
    && !warmDeco(state) && !keepsake.has(state, "cold") && !WARM_HATS.includes(state.hat)
    && !WARM_LINES.includes(life.lineOf(state.species));
}

/** The local day of the time t, as a number (for "once a day"). */
function dayOf(t: number): number {
  const date = new Date(t * 1000);
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * One minute ending at t: on a hot afternoon, the heat gets to it once a day, as soon as it is
 * awake and at home. `temp`: °C, or null without weather data.
 */
export function noteHeat(state: PetState, temp: number | null, t: number): void {
  const hour = new Date(t * 1000).getHours();
  if (temp === null || temp < HOT_FROM || hour < HOT_HOURS[0] || hour >= HOT_HOURS[1]
      || state.stage === "egg" || state.asleep || state.trip || state.hot_day === dayOf(t)) {
    return;
  }
  state.hot_day = dayOf(t);
  state.hot_until = t + HOT_SECONDS;
}

/** Does it sweat? Only at home and awake, and never with something that keeps the heat off. */
export function hot(state: PetState, now: number): boolean {
  return now < state.hot_until && state.stage !== "egg" && !state.asleep && !state.trip
    && !keepsake.has(state, "heat") && !COOL_HATS.includes(state.hat) && !COOL_LINES.includes(life.lineOf(state.species));
}

/** A bath cools it down. */
export function coolDown(state: PetState): void {
  state.hot_until = 0.0;
}

/** Is something set out that makes it snow? */
export function snowDeco(state: PetState): boolean {
  return state.deco.some((item) => SNOW_DECO.includes(item));
}

/** Whether a decoration that brings this moment (MOMENT_DECO) is set out. */
export function momentDeco(state: PetState, moment: string): boolean {
  return state.deco.some((item) => MOMENT_DECO[item] === moment);
}

/**
 * What a find does besides looking nice (for the app). A fruit and its seed name the need the fruit
 * fills, and "cure" if it also cures a sickness.
 */
export function effects(item: string): string[] {
  const plant = item.replace(/^(fruit|seed)_/, "");
  if (plant !== item && plant in PLANTS) return [PLANTS[plant][0], ...(CURES.includes(plant) ? ["cure"] : [])];
  if (keepsake.isKeepsake(item)) return [`keep_${keepsake.EFFECTS[item][0]}`];
  return WARM_DECO.includes(item) ? ["growth"] : SNOW_DECO.includes(item) ? ["snow"]
    : MOMENT_DECO[item] ? [MOMENT_DECO[item]] : [];
}

/** Rub it warm. */
export function rubWarm(state: PetState): void {
  state.cold_until = 0.0;
}

// ---------- Hat and decorations ----------

/** Put on a hat ("none" takes it off; so does the same hat again). Returns null, or why not. */
export function wear(state: PetState, hat: string): string | null {
  if (hat !== "none" && !state.items[hat]) {
    return "no_item";
  }
  state.hat = hat === "none" || hat === state.hat ? "" : hat;
  return null;
}

/** How many decorations can be set out, outside and in the house. */
export function decoSpots(state: PetState): number {
  return MAX_DECO + HOUSE_SPOTS[state.house];
}

/**
 * Where the decorations that are set out stand: outside first, in the order they were set out,
 * and what doesn't fit outside goes into the house. What only belongs outside always goes there.
 */
export function placeDeco(state: PetState): { outside: string[]; inside: string[] } {
  const deco = state.deco.slice(-decoSpots(state));
  const outside = deco.filter((item) => OUTDOOR_DECO.includes(item)).slice(0, MAX_DECO);
  const inside: string[] = [];
  for (const item of deco) {
    if (outside.includes(item)) {
      continue;
    }
    (outside.length < MAX_DECO ? outside : inside).push(item);
  }
  return { outside: deco.filter((item) => outside.includes(item)), inside };
}

/** Set out a decoration or put it away; if no spot is free, the oldest one makes room. */
export function toggleDeco(state: PetState, item: string): string | null {
  if (!state.items[item]) {
    return "no_item";
  }
  const index = state.deco.indexOf(item);
  if (index >= 0) {
    state.deco.splice(index, 1);
  } else {
    state.deco.push(item);
    state.deco.splice(0, Math.max(0, state.deco.length - decoSpots(state)));
  }
  return null;
}

/** The pet has got past the mountain's guardian for the first time: the house grows by a step. Returns the new step, or null. */
export function buildHouse(state: PetState): number | null {
  if (state.house >= HOUSE_STEPS) {
    return null;
  }
  state.house += 1;
  return state.house;
}
