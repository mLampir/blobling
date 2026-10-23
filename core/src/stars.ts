/**
 * Shooting stars: on clear evenings, between dusk and bedtime, now and then one falls.
 *
 * Nobody has to be awake for it. The pet sees it, looks up and makes a wish (if it is still up and
 * at home), and the next morning something lies in the garden, whether or not anybody watched:
 * mostly a seed, once a star shard that glows at night, and rarely an egg of a line the pet knows.
 *
 * From the second evening with a shooting star on, an owl sits on the roof at night and watches
 * with it; after the fifth, its egg lies there in the morning. Once for every pet, like a
 * guardian's egg: it waits for a later evening while there is no room for it.
 *
 * When a star falls is decided by the day alone (seeded), so catching up gives the same evenings.
 */

import * as grandma from "./grandma";
import * as home from "./home";
import * as keepsake from "./keepsake";
import { Random } from "./random";
import * as sky from "./sky";
import type { PetState } from "./state";
import { sunTimes, type Location } from "./sun";

export const CHANCE = 0.35; // a clear evening has a shooting star this often
export const CHANCE_UNKNOWN = 0.2; // without weather data every evening counts as clear, but has one less often
export const DUSK_AFTER = 15; // minutes after sunset from which it is dark enough
export const LATEST = 10; // minutes before bedtime: it falls no later than this
export const EARLIEST = 60; // in a long summer evening it still comes this long before bedtime
export const WISH_SECONDS = 8; // how long the pet looks up and wishes
export const SEEN_SECONDS = 4; // how long it streaks over the sky
export const MORNING_AFTER = 16 * 3600; // without a bedtime between, what it left lies there after this long
// What it leaves [thing, weight]: "seed" a seed of a plant, "shard" the star shard (once per home,
// afterwards a seed), "egg" an egg of a line the pet knows
export const GIFTS: readonly (readonly [string, number])[] = [["seed", 60], ["shard", 30], ["egg", 10]];
export const SHARD = "star_shard";
export const OWL_FROM = 2; // from this many evenings with a shooting star, the owl sits on the roof at night
export const OWL_EGG_AFTER = 5; // after this many, its egg lies there
export const OWL_EGG = "egg_owl";
export const LANTERN_AFTER = 10; // from this many evenings, the moon lantern lies there (once: decorations exist only once)
export const LANTERN = "moonlantern";

/** Minutes after midnight of `hhmm`. */
function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/** Midnight of the local day of t, and the number of that day (for the seed). */
function midnight(t: number): [number, number] {
  const date = new Date(t * 1000);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;
  return [start, Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000];
}

/**
 * When a shooting star would fall on the evening of the day that starts at `day` (local midnight),
 * if one falls at all: somewhere between dusk and a little before bedtime. Null if there is no
 * time for one (bedtime before dusk and before EARLIEST).
 */
export function candidate(day: number, bedStart: string, location: Location): number {
  const [, number] = midnight(day + 12 * 3600);
  const sunset = sunTimes(new Date((day + 12 * 3600) * 1000), location)[1];
  let bed = minutes(bedStart);
  if (bed < 12 * 60) {
    bed += 24 * 60; // bedtime after midnight
  }
  const from = Math.min(sunset + DUSK_AFTER, bed - EARLIEST);
  const to = bed - LATEST;
  const rng = new Random(`stars:${number}`);
  return day + Math.round(rng.uniform(from, Math.max(from, to))) * 60;
}

/** Does a shooting star fall on the evening of the day starting at `day`? Clear sky only. */
function falls(day: number, weather: sky.WeatherCode, more: number): boolean {
  if (sky.precipitation(weather) !== null || sky.clouds(weather)[0] >= 2) {
    return false; // rain, snow or a sky full of clouds
  }
  const [, number] = midnight(day + 12 * 3600);
  return new Random(`stars:${number}:falls`).random() < (weather === null ? CHANCE_UNKNOWN : CHANCE) * more;
}

/**
 * One minute ending at t. Returns true if a shooting star has just fallen. `night`: it is bedtime
 * now (what a star left lies there once the night is over).
 */
export function step(state: PetState, t: number, weather: sky.WeatherCode, bedStart: string, night: boolean,
    location: Location): boolean {
  const fallen = state.fallen;
  if (fallen && !fallen.lies) {
    if (night) {
      fallen.night = true;
    } else if (fallen.night || t - fallen.at >= MORNING_AFTER) {
      fallen.lies = true; // the morning after
    }
  }
  const [today] = midnight(t);
  // the evening of today, or of yesterday when bedtime is after midnight
  const day = [today, midnight(today - 12 * 3600)[0]].find((d) => {
    const when = candidate(d, bedStart, location);
    return t - 60 < when && when <= t;
  });
  if (day === undefined || !falls(day, weather, keepsake.factor(state, "stars"))) {
    return false;
  }
  fall(state, t);
  return true;
}

/** A shooting star falls at the time t: what it leaves waits for the morning. */
export function fall(state: PetState, t: number): void {
  const stars = state.stars;
  stars.evenings += 1;
  stars.at = t;
  if (state.fallen) {
    return; // what the last one left still lies there
  }
  const item = gift(state, new Random(`star:${Math.trunc(t)}`));
  if (item) {
    state.fallen = { item, at: t };
  }
}

/** What a shooting star leaves: the owl's egg after the fifth evening, the moon lantern after the tenth, otherwise from GIFTS. */
export function gift(state: PetState, rng: Random): string | null {
  if (state.stars.evenings >= OWL_EGG_AFTER && !state.counters.owl_egg && home.canAdd(state, OWL_EGG)) {
    return OWL_EGG;
  }
  if (state.stars.evenings >= LANTERN_AFTER && home.canAdd(state, LANTERN)) {
    return LANTERN;
  }
  const kind = rng.weighted(GIFTS.map(([item]) => item), GIFTS.map(([, weight]) => weight));
  if (kind === "shard" && home.canAdd(state, SHARD)) {
    return SHARD;
  }
  if (kind === "egg") {
    const egg = home.eggOf(rng.choice(grandma.knownLines(state)));
    if (home.canAdd(state, egg)) {
      return egg;
    }
  }
  return home.smallSeed(state, rng);
}

/** Is the owl sitting on the roof tonight (from the second evening, until it has left its egg)? */
export function owl(state: PetState): boolean {
  return state.stars.evenings >= OWL_FROM && !state.counters.owl_egg && state.fallen?.item !== OWL_EGG;
}

/** What lies in the garden from a shooting star, now that it is morning (or null). */
export function lying(state: PetState): string | null {
  return state.fallen?.lies ? state.fallen.item : null;
}

/** Pick up what a shooting star left: into the bag (a fruit that doesn't fit is eaten). Returns what it was. */
export function pickUp(state: PetState): string {
  const item = state.fallen!.item;
  state.fallen = null;
  if (item === OWL_EGG) {
    state.counters.owl_egg = 1;
  }
  home.receive(state, item);
  return item;
}
