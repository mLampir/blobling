/**
 * What the pet eats from the bag: fruits of the plant's kinds and food from trips.
 *
 * Apart from the meal, which is always there, nothing to eat comes out of thin air: a fruit is a
 * friend's gift, something the pet found at home or a find from a trip, and food from trips is
 * one kind per area (trip.FINDS). All of it is kept in small numbers (home.MAX_FOOD), so finding
 * out what a pet likes takes trying things with what there is.
 *
 * Every form has one favorite, which cheers it up a lot, and one thing it won't eat. A fruit
 * works like one from the plant. Food from trips fills it up a little and leaves a boost that
 * waits until it is used, such as one more heart on the next trip. A boost doesn't add up: while
 * one is waiting, the same food is refused.
 */

import * as care from "./care";
import * as home from "./home";
import * as life from "./life";
import type { PetState } from "./state";

// Food from trips: what it does
// - trick: the next trick practiced together counts double (model)
// - train: the next exercise counts double (model)
// - heart: packed for a trip, it sets off with one more heart (trip.begin)
// - finder: packed for a trip, it finds something at every stop where nothing else happens
// - fresh: packed for a trip, it doesn't get tired or hungry, and finds as much as on the first of the day
// - comfort: Grandma's cake (grandma.ts) fills it up well and cheers it up all the way, at once
// The first two are eaten at home and leave a boost until it is used; heart, finder and fresh work
// from the backpack (PACKED) and are plain food at home.
export const FOODS: Record<string, string> = {
  honeycomb: "heart",
  hazelnut: "trick",
  watercress: "train",
  glowberry: "finder",
  pinenut: "fresh",
  // caught when fishing (fishing.ts)
  mussel: "heart",
  seagrass: "trick",
  // from Grandma's (grandma.ts)
  cake: "comfort",
};
export const PACKED: Record<string, string> = { honeycomb: "heart", glowberry: "finder", pinenut: "fresh", mussel: "heart" };
export const FRUITS = Object.keys(home.PLANTS).map((kind) => `fruit_${kind}`);
export const EDIBLE = [...FRUITS, ...Object.keys(FOODS)];
export const SATIETY = 10; // food from trips
export const FRUIT_MOOD = 5;
export const FAVORITE_MOOD = 20;
// Grams: the honeycomb is the sweet one
export const WEIGHT: Record<string, number> = { honeycomb: 2.5, cake: 3 };
export const CAKE_SATIETY = 40; // Grandma's cake, and it cheers it up all the way
export const FRUIT_WEIGHT = 0.5;

// Form (or line, as baby and child): its favorite and what it won't eat. A baby can't go on trips
// yet, so a line likes and dislikes fruits.
export const TASTES: Record<string, readonly [string, string]> = {
  blob: ["fruit_berry", "fruit_herb"],
  ember: ["fruit_sunflower", "fruit_berry"],
  stone: ["fruit_cherry", "fruit_sunflower"],
  fox: ["fruit_berry", "fruit_cherry"],
  angloop: ["glowberry", "pinenut"],
  gemperor: ["honeycomb", "fruit_herb"],
  purrloop: ["fruit_cherry", "watercress"],
  lanternling: ["honeycomb", "watercress"],
  flarelet: ["fruit_sunflower", "watercress"],
  glimmerock: ["glowberry", "fruit_cherry"],
  bouldergrin: ["hazelnut", "fruit_berry"],
  roamtail: ["pinenut", "honeycomb"],
  filchfox: ["honeycomb", "fruit_herb"],
  cloud: ["fruit_cherry", "fruit_sunflower"],
  rumblefluff: ["hazelnut", "glowberry"],
  prismist: ["glowberry", "pinenut"],
  leaf: ["fruit_herb", "fruit_cherry"],
  twiggle: ["watercress", "honeycomb"],
  needlenub: ["honeycomb", "watercress"], // a cactus: water is the last thing it wants
  duck: ["fruit_berry", "fruit_herb"],
  drakwing: ["pinenut", "watercress"],
  quill: ["hazelnut", "glowberry"],
  hippo: ["fruit_cherry", "fruit_herb"],
  steamo: ["honeycomb", "pinenut"],
  lillypot: ["watercress", "hazelnut"],
  beak: ["fruit_sunflower", "fruit_berry"],
  rapierre: ["honeycomb", "hazelnut"], // nectar
  parcelbeak: ["hazelnut", "glowberry"],
  // the special forms
  salamber: ["glowberry", "watercress"], // where it all started
  lunarock: ["hazelnut", "honeycomb"],
  foxfire: ["fruit_cherry", "hazelnut"],
  flurrbleat: ["pinenut", "fruit_sunflower"], // a mountain food
  sakurin: ["watercress", "fruit_cherry"], // it won't eat its own kind
  bubblehelm: ["watercress", "honeycomb"],
  hippula: ["fruit_berry", "fruit_herb"], // berry juice, and no garlicky herbs
  acewing: ["pinenut", "honeycomb"],
  // the garden's lines
  caterpillar: ["fruit_herb", "fruit_berry"], // leaves first
  mothmuff: ["glowberry", "hazelnut"], // drawn to the light
  sunflutter: ["fruit_sunflower", "pinenut"],
  jesterwing: ["fruit_cherry", "watercress"],
  dog: ["fruit_sunflower", "fruit_cherry"],
  digby: ["hazelnut", "glowberry"], // dug up
  barrelbard: ["honeycomb", "watercress"],
  pawdini: ["honeycomb", "fruit_herb"], // a treat after the show
  dragonfly: ["fruit_berry", "fruit_sunflower"],
  rotorfly: ["pinenut", "honeycomb"],
  jewelwing: ["watercress", "hazelnut"],
  prismfly: ["glowberry", "pinenut"], // light
  beaver: ["fruit_herb", "fruit_cherry"],
  dambert: ["watercress", "glowberry"],
  timberjack: ["pinenut", "honeycomb"], // from the forest
  archibeaver: ["hazelnut", "fruit_berry"],
  // the lines caught when fishing
  crab: ["fruit_berry", "fruit_herb"],
  teacrab: ["honeycomb", "mussel"], // something sweet with the tea, and never its own kind
  lightclaw: ["glowberry", "seagrass"],
  castlecrab: ["mussel", "pinenut"],
  axolotl: ["fruit_cherry", "fruit_sunflower"],
  mossolotl: ["seagrass", "honeycomb"],
  medilotl: ["watercress", "honeycomb"], // healthy
  axodrake: ["mussel", "seagrass"],
  mouse: ["hazelnut", "fruit_herb"],
  sirthimble: ["hazelnut", "seagrass"], // a nut, like its shield
  cogsqueak: ["pinenut", "fruit_cherry"],
  woolwhisk: ["cake", "watercress"], // Grandma's
  // the lines from the trips
  bear: ["fruit_berry", "fruit_herb"],
  hivebear: ["honeycomb", "watercress"], // honey, of course
  snorbear: ["hazelnut", "glowberry"], // fattening up for the winter, and nothing that keeps it awake
  ursastra: ["glowberry", "pinenut"], // a little starlight
  penguin: ["fruit_cherry", "fruit_herb"],
  tuxwaddle: ["mussel", "hazelnut"], // dinner from the sea
  glidepin: ["pinenut", "honeycomb"], // a mountain food; honey would stick to its blades
  aurorapin: ["seagrass", "fruit_sunflower"], // the polar sea; it lives in the night
  bat: ["fruit_cherry", "fruit_sunflower"], // a fruit bat
  umbrabat: ["watercress", "fruit_sunflower"], // it grows in the rain
  batbeat: ["honeycomb", "watercress"], // energy for the dance floor
  lunaflap: ["fruit_cherry", "glowberry"], // it has light enough
  // the old slime forms, which live on as wild pets
  sneezle: ["fruit_herb", "pinenut"],
  flicker: ["honeycomb", "watercress"],
  cyclopuff: ["watercress", "glowberry"],
  grumpcap: ["watercress", "honeycomb"],
  lumoth: ["glowberry", "hazelnut"],
};

export function isFood(item: string): boolean {
  return item in FOODS;
}

export function edible(item: string): boolean {
  return EDIBLE.includes(item);
}

function tastes(state: PetState): readonly [string, string] {
  return TASTES[state.species] ?? TASTES[life.lineOf(state.species)] ?? TASTES.blob;
}

export function favorite(state: PetState): string {
  return tastes(state)[0];
}

export function disliked(state: PetState): string {
  return tastes(state)[1];
}

/** What it is known to like and dislike: only once it has been tried, for this form. */
export function known(state: PetState): { favorite: string | null; disliked: string | null } {
  const c = state.counters;
  return {
    favorite: c[`favorite_${state.species}`] ? favorite(state) : null,
    disliked: c[`disliked_${state.species}`] ? disliked(state) : null,
  };
}

/** Give it something from the bag. Returns null, or why not. */
export function give(state: PetState, item: string): string | null {
  if (state.asleep) {
    return "asleep";
  }
  if (!state.items[item]) {
    return "no_item";
  }
  if (item === disliked(state)) {
    state.counters[`disliked_${state.species}`] = 1; // from now on the app shows it
    return "dislikes";
  }
  const boost = PACKED[item] || FOODS[item] === "comfort" ? null : FOODS[item];
  if (boost && state.boosts.includes(boost)) {
    return "boost_waiting";
  }
  home.takeItem(state, item);
  if (boost) {
    state.boosts.push(boost);
  }
  if (FOODS[item] === "comfort") {
    state.stats.satiety += CAKE_SATIETY;
    state.stats.mood = 100;
  } else if (isFood(item)) {
    state.stats.satiety += SATIETY;
  } else {
    home.eat(state, item.slice("fruit_".length));
    state.stats.mood += FRUIT_MOOD;
  }
  care.addWeight(state, WEIGHT[item] ?? (isFood(item) ? 0 : FRUIT_WEIGHT));
  if (item === favorite(state)) {
    state.stats.mood += FAVORITE_MOOD;
    state.counters[`favorite_${state.species}`] = 1;
  }
  return null;
}

/** Is this boost waiting? */
export function waiting(state: PetState, boost: string): boolean {
  return state.boosts.includes(boost);
}

/** Use the boost up. Returns whether it was waiting. */
export function use(state: PetState, boost: string): boolean {
  if (!waiting(state, boost)) {
    return false;
  }
  state.boosts = state.boosts.filter((b) => b !== boost);
  return true;
}

/** What a find does besides being there (for the app). */
export function effects(item: string): string[] {
  return isFood(item) ? [FOODS[item]] : [];
}
