/**
 * Wild pets: an adult meets one on a trip, and if its tricks impress it, the two are friends.
 *
 * The friend comes to visit at home now and then. After a few visits in a good mood the two
 * build a nest, and an egg lies in it: of the pet's own line or of the friend's, and with a part
 * of the pet's battle stats as its heirloom. The egg waits in the nest until it is collected.
 *
 * The friend stays a friend after that. It comes less often, and only after a rest (NEST_REST)
 * do its visits count towards the next nest again, so that an egg stays something to look forward
 * to. Once every friend has built a nest, the pet may make another one, up to MAX_FRIENDS; one
 * visits at a time.
 *
 * Some visits bring a gift. It lies in one spot until somebody unwraps it, and no new one comes
 * while it is there. Mostly it is a fruit for the bag; rarely a seed.
 *
 * Lines whose egg a guardian gives (trip.GUARDIAN_EGGS) have no wild pets, so that egg stays
 * special.
 */

import * as care from "./care";
import * as home from "./home";
import * as life from "./life";
import { Random } from "./random";
import * as sky from "./sky";
import type { Egg, Friend, PetState } from "./state";

// Area: who lives there, as [adult form, weight, only in this weather]
export const WILD: Record<string, readonly (readonly [string, number, sky.Precipitation])[]> = {
  meadow: [["cyclopuff", 4, null], ["sneezle", 3, null], ["flicker", 3, null], ["grumpcap", 3, "rain"],
    ["lumoth", 1, null]],
  forest: [["filchfox", 3, null], ["roamtail", 1, null], ["twiggle", 2, null], ["needlenub", 1, null]],
  stream: [["bouldergrin", 3, null], ["glimmerock", 1, null], ["lillypot", 2, null], ["steamo", 1, null]],
  mountain: [["rumblefluff", 3, "rain"], ["prismist", 1, null]], // the thundercloud only comes out in the rain
};
export const MISSING_WEIGHT = 3; // a line the home has long been missing (state.missing_lines): its wild pets come this much more often
export const MEET_CHANCE = 0.2; // how often a wild pet is at a station, while the pet is looking for a friend
export const SHOW = 3; // tricks the pet shows
export const IMPRESS = 2; // this many have to work
export const BOND_SHOWS = 3; // from this many bond hearts on, it shows one trick more (the same IMPRESS still has to work)
export const GLUM = 40; // with its mood below this, a trick works only half as often
export const FIRST_VISIT = [1 * 3600, 3 * 3600] as const; // seconds from making friends to the first visit
export const VISIT_EVERY = [5 * 3600, 10 * 3600] as const; // from one visit to the next
export const OLD_VISIT_EVERY = [20 * 3600, 28 * 3600] as const; // the same, for a friend that has built a nest
export const BETWEEN_VISITS = 3600; // when one friend leaves, the next comes no sooner than this
export const VISIT_SECONDS = 10 * 60;
export const VISIT_MOOD = 50; // a visit only counts if the pet is at least in this mood (and at home, and awake)
export const VISIT_CHEER = 5;
export const VISITS_FOR_NEST = 5;
export const NEST_REST = 14 * 86400; // after a nest, this long before the visits count again
export const MAX_FRIENDS = 3;
export const HEIRLOOM = 0.25; // this part of each battle stat goes into the egg
export const GIFT_CHANCE = 0.4; // how often a visit that counts brings something

/** What the tests turn: how often a wild pet is waiting. */
export const rules = { meetChance: MEET_CHANCE };

/** One trick shown to a wild pet: [trick, whether it worked]. */
export type Shown = [string, boolean];

/** A history entry to write: [action, item]. */
export type Happened = [string, string];

/**
 * Is the pet looking for a friend? Only an adult whose friends have all built a nest with it
 * (or that has none yet), with room for another friend and another egg.
 */
export function looking(state: PetState): boolean {
  return state.stage === "adult" && state.friends.length < MAX_FRIENDS && state.friends.every((f) => f.nests)
    && !state.nest && roomForEgg(state);
}

function roomForEgg(state: PetState): boolean {
  return home.canAdd(state, home.eggOf(life.lineOf(state.species)));
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
  // the quiet safety net: a line the home has long been missing comes more often
  const weights = options.map(([species, weight]) =>
    weight * (state.missing_lines.includes(life.lineOf(species)) && !life.WILD_ONLY.includes(species) ? MISSING_WEIGHT : 1));
  return rng.weighted(options.map(([species]) => species), weights);
}

/**
 * The pet shows the wild pet its tricks. The outcome is "friend" or "shrug". A trick works as
 * often as it has been learned. A pet with a strong bond to its owner is sure of itself and gets
 * one try more.
 */
export function show(state: PetState, species: string, rng: Random, now: number):
    { rounds: Shown[]; outcome: "friend" | "shrug" } {
  const tricks = Object.keys(care.TRICKS);
  const practiced = tricks.filter((trick) => care.trickProgress(state, trick) > 0);
  const known = practiced.length ? practiced : tricks;
  const factor = state.stats.mood < GLUM ? 0.5 : 1.0;
  const rounds: Shown[] = [];
  const shows = SHOW + (care.bondLevel(state) >= BOND_SHOWS ? 1 : 0);
  for (let i = 0; i < shows; i++) {
    const trick = rng.choice(known);
    rounds.push([trick, rng.random() < care.trickProgress(state, trick) * factor]);
  }
  const friends = rounds.filter(([, worked]) => worked).length >= IMPRESS;
  if (friends) {
    state.friends.push({ species, visits: 0, next: now + Math.round(rng.uniform(...FIRST_VISIT)) });
  }
  return { rounds, outcome: friends ? "friend" : "shrug" };
}

/** The friend visiting right now, if one is. */
export function visitor(state: PetState, now: number): Friend | null {
  return state.friends.find((f) => now < (f.until ?? 0)) ?? null;
}

export function visiting(state: PetState, now: number): boolean {
  return visitor(state, now) !== null;
}

/** Has the friend built a nest lately, so that its visits don't count towards the next one yet? */
export function resting(friend: Friend, now: number): boolean {
  return now < (friend.rest_until ?? 0);
}

/**
 * One minute with the friends, ending at t. `atHome`: the pet is there and awake.
 * Returns what happened, for the history.
 */
export function step(state: PetState, t: number, atHome: boolean): Happened[] {
  const friend = state.friends.find((f) => f.until !== undefined);
  if (!friend) {
    const due = atHome ? state.friends.find((f) => t >= f.next) : undefined;
    if (due) {
      due.until = t + VISIT_SECONDS;
      return [["visit", due.species]];
    }
    return [];
  }
  if (t < friend.until!) {
    return [];
  }
  const rng = new Random(`visit:${Math.trunc(t)}`);
  delete friend.until;
  friend.next = t + Math.round(rng.uniform(...(friend.nests ? OLD_VISIT_EVERY : VISIT_EVERY)));
  for (const other of state.friends) {
    other.next = Math.max(other.next, t + BETWEEN_VISITS); // one at a time, and not straight after each other
  }
  if (!atHome || state.stats.mood < VISIT_MOOD) {
    return []; // nobody was in the mood: this one doesn't count
  }
  state.stats.mood += VISIT_CHEER;
  if (!resting(friend, t)) {
    friend.visits = Math.min(friend.visits + 1, VISITS_FOR_NEST);
  }
  if (friend.visits >= VISITS_FOR_NEST && !state.nest && roomForEgg(state)) {
    const line = rng.choice([life.lineOf(state.species), life.lineOf(friend.species)]);
    state.nest = {
      line,
      from: state.name,
      skills: Object.fromEntries(Object.entries(state.skills).map(([skill, value]) => [skill, Number((value * HEIRLOOM).toFixed(1))])),
    };
    // the friend stays, and comes less often from now on
    Object.assign(friend, {
      visits: 0, nests: (friend.nests ?? 0) + 1, rest_until: t + NEST_REST,
      next: t + Math.round(rng.uniform(...OLD_VISIT_EVERY)),
    });
    return [["nest", line]];
  }
  const gift = !state.gift && rng.random() < GIFT_CHANCE ? giftFrom(state, rng) : null;
  if (gift) {
    state.gift = gift;
    return [["gift", friend.species]]; // what is in it stays a surprise
  }
  return [];
}

/** What a friend brings: a small thing (home.smallThing), mostly a fruit and rarely a seed. */
export function giftFrom(state: PetState, rng: Random): string {
  return home.smallThing(state, rng);
}

/**
 * Unwrap the gift: it goes into the bag (home.receive). Returns what was in it.
 */
export function unwrap(state: PetState): string {
  const gift = state.gift!;
  state.gift = null;
  home.receive(state, gift);
  return gift;
}

/** Take the egg out of the nest; from now on it is kept with the other eggs. Returns the egg. */
export function collect(state: PetState): Egg {
  const egg = state.nest!;
  state.nest = null;
  state.eggs.push(egg);
  return egg;
}
