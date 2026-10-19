/**
 * Wild pets: an adult meets one on a trip, and if its tricks impress it, the two are friends.
 *
 * The friend comes to visit at home now and then. After a few visits in a good mood the two
 * build a nest, and an egg lies in it: of the pet's own line or of the friend's, and with a part
 * of the pet's battle stats as its heirloom. The egg waits in the nest until it is collected.
 *
 * Some visits bring a gift. It lies in one spot until somebody unwraps it, and no new one comes
 * while it is there. Mostly it is a fruit the pet eats straight away; rarely a seed.
 *
 * Lines whose egg a guardian gives (trip.GUARDIAN_EGGS) have no wild pets, so that egg stays
 * special.
 */

import * as care from "./care";
import * as home from "./home";
import * as life from "./life";
import { Random } from "./random";
import * as sky from "./sky";
import type { Egg, PetState } from "./state";

// Area: who lives there, as [adult form, weight, only in this weather]
export const WILD: Record<string, readonly (readonly [string, number, sky.Precipitation])[]> = {
  meadow: [["cyclopuff", 4, null], ["sneezle", 3, null], ["flicker", 3, null], ["grumpcap", 3, "rain"],
    ["lumoth", 1, null]],
  forest: [["filchfox", 3, null], ["roamtail", 1, null]],
  stream: [["bouldergrin", 3, null], ["glimmerock", 1, null]],
};
export const MEET_CHANCE = 0.2; // how often a wild pet is at a station, while the pet is looking for a friend
export const SHOW = 3; // tricks the pet shows
export const IMPRESS = 2; // this many have to work
export const GLUM = 40; // with its mood below this, a trick works only half as often
export const FIRST_VISIT = [1 * 3600, 3 * 3600] as const; // seconds from making friends to the first visit
export const VISIT_EVERY = [5 * 3600, 10 * 3600] as const; // from one visit to the next
export const VISIT_SECONDS = 10 * 60;
export const VISIT_MOOD = 50; // a visit only counts if the pet is at least in this mood (and at home, and awake)
export const VISIT_CHEER = 5;
export const VISITS_FOR_NEST = 5;
export const HEIRLOOM = 0.25; // this part of each battle stat goes into the egg
export const GIFT_CHANCE = 0.4; // how often a visit that counts brings something
export const SEED_CHANCE = 0.15; // how often that is a seed rather than a fruit

/** What the tests turn: how often a wild pet is waiting. */
export const rules = { meetChance: MEET_CHANCE };

/** One trick shown to a wild pet: [trick, whether it worked]. */
export type Shown = [string, boolean];

/** A history entry to write: [action, item]. */
export type Happened = [string, string];

/** Is the pet looking for a friend? Only an adult without one, and with room for another egg. */
export function looking(state: PetState): boolean {
  return state.stage === "adult" && !state.friend && !state.nest
    && home.canAdd(state, home.eggOf(life.lineOf(state.species)));
}

/** The wild pet waiting at the station reached at `at`, or null. */
export function meet(state: PetState, area: string, at: number, weather: sky.WeatherCode): string | null {
  const skyNow = sky.precipitation(weather);
  const options = (WILD[area] ?? []).filter(([, , only]) => only === null || only === skyNow);
  if (!options.length || !looking(state)) {
    return null;
  }
  const rng = new Random(`wild:${Math.trunc(at)}`);
  if (rng.random() >= rules.meetChance) {
    return null;
  }
  return rng.weighted(options.map(([species]) => species), options.map(([, weight]) => weight));
}

/**
 * The pet shows the wild pet its tricks. The outcome is "friend" or "shrug". A trick works as
 * often as it has been learned.
 */
export function show(state: PetState, species: string, rng: Random, now: number):
    { rounds: Shown[]; outcome: "friend" | "shrug" } {
  const tricks = Object.keys(care.TRICKS);
  const practiced = tricks.filter((trick) => care.trickProgress(state, trick) > 0);
  const known = practiced.length ? practiced : tricks;
  const factor = state.stats.mood < GLUM ? 0.5 : 1.0;
  const rounds: Shown[] = [];
  for (let i = 0; i < SHOW; i++) {
    const trick = rng.choice(known);
    rounds.push([trick, rng.random() < care.trickProgress(state, trick) * factor]);
  }
  const friends = rounds.filter(([, worked]) => worked).length >= IMPRESS;
  if (friends) {
    state.friend = { species, visits: 0, next: now + Math.round(rng.uniform(...FIRST_VISIT)) };
  }
  return { rounds, outcome: friends ? "friend" : "shrug" };
}

export function visiting(state: PetState, now: number): boolean {
  return !!state.friend && now < (state.friend.until ?? 0);
}

/**
 * One minute with a friend, ending at t. `atHome`: the pet is there and awake.
 * Returns what happened, for the history.
 */
export function step(state: PetState, t: number, atHome: boolean): Happened[] {
  const friend = state.friend!;
  if (friend.until === undefined) {
    if (atHome && t >= friend.next) {
      friend.until = t + VISIT_SECONDS;
      return [["visit", friend.species]];
    }
    return [];
  }
  if (t < friend.until) {
    return [];
  }
  const rng = new Random(`visit:${Math.trunc(t)}`);
  delete friend.until;
  friend.next = t + Math.round(rng.uniform(...VISIT_EVERY));
  if (!atHome || state.stats.mood < VISIT_MOOD) {
    return []; // nobody was in the mood: this one doesn't count
  }
  friend.visits += 1;
  state.stats.mood += VISIT_CHEER;
  if (friend.visits < VISITS_FOR_NEST) {
    const gift = !state.gift && rng.random() < GIFT_CHANCE ? giftFrom(state, rng) : null;
    if (gift) {
      state.gift = gift;
      return [["gift", friend.species]]; // what is in it stays a surprise
    }
    return [];
  }
  const line = rng.choice([life.lineOf(state.species), life.lineOf(friend.species)]);
  state.nest = {
    line,
    from: state.name,
    skills: Object.fromEntries(Object.entries(state.skills).map(([skill, value]) => [skill, Number((value * HEIRLOOM).toFixed(1))])),
  };
  state.friend = null; // the friend moves on; the pet can look for another one once the egg is collected
  return [["nest", line]];
}

/** What a friend brings: "fruit_<plant>", or now and then "seed_<plant>" if there is room for it. */
export function giftFrom(state: PetState, rng: Random): string {
  const kind = rng.choice(Object.keys(home.PLANTS));
  return rng.random() < SEED_CHANCE && home.canAdd(state, `seed_${kind}`) ? `seed_${kind}` : `fruit_${kind}`;
}

/**
 * Unwrap the gift: a fruit is eaten straight away, a seed is kept with the finds. Returns what
 * was in it.
 */
export function unwrap(state: PetState): string {
  const gift = state.gift!;
  state.gift = null;
  if (gift.startsWith("seed_")) {
    home.addItem(state, gift);
  } else {
    home.eat(state, gift.slice("fruit_".length));
  }
  return gift;
}

/** Take the egg out of the nest; from now on it is kept with the other eggs. Returns the egg. */
export function collect(state: PetState): Egg {
  const egg = state.nest!;
  state.nest = null;
  state.eggs.push(egg);
  return egg;
}
