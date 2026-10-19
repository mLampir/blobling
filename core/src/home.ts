/** Finds from trips and what they do at home: seeds and the plant, decorations, hats, eggs, warmth. */

import * as life from "./life";
import type { PetState, Stat } from "./state";

export type ItemKind = "seed" | "deco" | "hat" | "egg";

// Name: kind
export const ITEMS: Record<string, ItemKind> = {
  seed_berry: "seed",
  seed_sunflower: "seed",
  seed_cherry: "seed",
  seed_herb: "seed",
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
  daisy: "hat",
  leaf: "hat",
  cap: "hat",
  bobble: "hat",
  lily: "hat",
  batears: "hat",
  edelweiss: "hat",
  egg_blob: "egg",
  egg_ember: "egg",
  egg_stone: "egg",
  egg_fox: "egg",
  egg_cloud: "egg",
};
export const MAX_SEEDS = 9; // per kind; decorations and hats exist only once
export const MAX_EGGS = 9; // this many are kept
// Egg: the line that hatches from it (life.LINES). An egg is kept in state.eggs, as {line: ...} plus
// what a pet has passed on to it (wild.ts), until it is brooded (model.nextPet).
export const EGGS: Record<string, string> = { egg_blob: "blob", egg_ember: "ember", egg_stone: "stone", egg_fox: "fox",
  egg_cloud: "cloud" };
export const MAX_DECO = 2; // this many spots the scene has

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
export const EAT_BELOW = 40; // below this value the pet eats a ripe fruit by itself

// Warmth: the ember stone glows from inside. Set out, it makes whatever is still growing grow
// faster. And when it is cold outside, the pet shivers for a while after waking up: a moment to
// rub it warm, not a state that costs anything. The ember stone, the bobble hat and a fire of its
// own keep it from shivering at all.
export const WARM_DECO = ["emberstone"];
export const WARM_HATS = ["bobble"];
export const WARM_LINES = ["ember"];
export const GROWTH_SAVED = 0.3; // by the ember stone, a stage is over this much sooner
export const COLD_BELOW = 5; // °C: below this it wakes up shivering (a first guess)
export const COLD_SECONDS = 3600; // it shivers this long, unless somebody rubs it warm
export const RUB_MOOD = 5; // what rubbing it warm is worth

export function kindOf(item: string): ItemKind {
  return ITEMS[item];
}

export function ids(kind: ItemKind): string[] {
  return Object.keys(ITEMS).filter((item) => ITEMS[item] === kind);
}

export function canAdd(state: PetState, item: string): boolean {
  if (kindOf(item) === "egg") {
    return state.eggs.length < MAX_EGGS;
  }
  return (state.items[item] ?? 0) < (kindOf(item) === "seed" ? MAX_SEEDS : 1);
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
  minutes *= rain ? RAIN_FACTOR : 1;
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
  state.stats[stat] += amount;
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
  }
  return plant.kind;
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
    && !warmDeco(state) && !WARM_HATS.includes(state.hat) && !WARM_LINES.includes(life.lineOf(state.species));
}

/** What a find does besides looking nice (for the app). */
export function effects(item: string): string[] {
  return WARM_DECO.includes(item) ? ["growth"] : [];
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
    state.deco.splice(0, Math.max(0, state.deco.length - MAX_DECO));
  }
  return null;
}
