/**
 * Digging for treasure: a treasure map from a trip, and a red cross in the garden.
 *
 * Now and then a trip brings home a treasure map, never more than one at a time; the first comes
 * for sure on the pet's third trip, so that what lies under the cross is there for every pet.
 * While the map is in the bag, a small red cross shows in the garden. Dragged onto the pet, the
 * map sends it over to the cross to dig (it costs energy like playing).
 *
 * The first time, every pet digs up the scarab's egg. After that it finds seeds, and things that
 * are only ever dug up: a digging helmet to wear and a fossil to set out, each once per home.
 * Some lines are diggers by nature (DIGGERS): they are done sooner and find a seed more.
 */

import * as home from "./home";
import * as life from "./life";
import { Random } from "./random";
import type { PetState, Trip } from "./state";

export const MAP = "treasure_map";
export const MAP_CHANCE = 0.1; // a trip brings a map this often
export const MAP_SURE = 3; // the pet's first map comes for sure on this trip of its own (or the next it can)
export const FIRST = "egg_scarab"; // the first time, for every pet
export const ONLY_HERE = ["helmet", "fossil"]; // found nowhere else, each once per home
export const ONLY_HERE_CHANCE = 0.3; // a dig brings one of them, while the home doesn't have both
export const DIG_ENERGY = 15; // minimum energy, same as playing
export const COST = { energy: 10, satiety: 5 } as const; // like playing
export const WALK_SECONDS = 2.5; // over to the cross
export const DIG_SECONDS = 8; // digging
export const SHOW_SECONDS = 4; // holding up what it found
// Line: how much quicker it digs (a part of DIG_SECONDS), and how many seeds more it finds
export const DIGGERS: Record<string, { speed: number; seeds: number }> = {
  dog: { speed: 0.5, seeds: 1 },
  beaver: { speed: 0.5, seeds: 1 },
};

/** The way of digging of the pet's line, if it is a digger by nature. */
function digger(state: PetState): { speed: number; seeds: number } | undefined {
  return DIGGERS[life.lineOf(state.species)];
}

/** Is there a map, nothing waiting to be brought home or unpacked besides? (At most one at a time.) */
function hasMap(state: PetState, trip: Trip | null = null): boolean {
  return (state.items[MAP] ?? 0) > 0 || state.backpack.includes(MAP) || !!trip?.found.includes(MAP);
}

/**
 * Does the trip `trip` (the pet's `trips`-th, counted from 1) bring a map home? Asked where it finds
 * something, so that it finds the map by the path along with it, and once more at the end, if it
 * found nothing on the way. Seeded by when it set off, so the answer is the same all trip long.
 */
export function mapFrom(state: PetState, trip: Trip, trips: number): boolean {
  if (hasMap(state, trip) || !home.canAdd(state, MAP)) {
    return false;
  }
  const sure = !state.counters.maps && trips >= MAP_SURE;
  if (!sure && new Random(`map:${Math.trunc(trip.start)}`).random() >= MAP_CHANCE) {
    return false;
  }
  state.counters.maps = (state.counters.maps ?? 0) + 1;
  return true;
}

/** Can it dig now? null, or why not. */
export function canDig(state: PetState): string | null {
  return !state.items[MAP] ? "no_map" : state.asleep ? "asleep" : state.stats.energy < DIG_ENERGY ? "tired" : null;
}

/** How long it digs (seconds). */
export function seconds(state: PetState): number {
  return DIG_SECONDS * (digger(state)?.speed ?? 1);
}

/**
 * It digs at the cross: the map is used up, and what it finds goes into the bag. Returns what it
 * found. The scarab's egg the first time (once there is room for it), else a seed, and now and then
 * a thing that is only dug up; a digger by nature finds a seed more.
 */
export function dig(state: PetState, rng: Random): string[] {
  home.takeItem(state, MAP);
  const c = state.counters;
  c.digs = (c.digs ?? 0) + 1;
  const found: string[] = [];
  if (!c.dug_egg && home.canAdd(state, FIRST)) {
    c.dug_egg = 1;
    found.push(FIRST);
  } else {
    const rare = ONLY_HERE.filter((item) => home.canAdd(state, item));
    found.push(rare.length && rng.random() < ONLY_HERE_CHANCE ? rng.choice(rare) : home.smallSeed(state, rng));
  }
  for (let i = 0; i < (digger(state)?.seeds ?? 0); i++) {
    found.push(home.smallSeed(state, rng));
  }
  for (const item of found) {
    home.receive(state, item);
  }
  return found;
}
