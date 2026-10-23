/**
 * Wild pets: an adult meets one on a trip, and if its tricks impress it, the two are friends.
 *
 * The friend comes to visit at home now and then. After a few visits in a good mood it brings an
 * egg of its own family and entrusts it to the pet: it lays it in a bed of moss (the nest). The
 * egg carries the friend's gift, a few points in the battle stat its line is good at
 * (life.LINE_SKILL), more with every egg the friend has brought before; and the pet watches over
 * it and adds a small part of its own battle stats. The egg waits in the nest until it is
 * collected.
 *
 * The friend stays a friend after that. It comes less often, and only after a rest (NEST_REST)
 * do its visits count towards the next egg again, so that an egg stays something to look forward
 * to. Once every friend has brought an egg, the pet may make another one, up to MAX_FRIENDS; one
 * visits at a time. (The pet's own egg, laid in the same nest, is brood.ts.)
 *
 * Some visits bring a gift. It lies in one spot until somebody unwraps it, and no new one comes
 * while it is there. Mostly it is a fruit for the bag; rarely a seed.
 *
 * Lines whose egg one of the first five guardians gives (trip.GUARDIAN_EGGS) have no wild pets, so
 * that egg stays special. Behind the mountain it is the other way round: the octopus and the
 * gargoyle live where their guardian is, rarely, so that their lines can be found without it too.
 */

import * as care from "./care";
import * as home from "./home";
import * as keepsake from "./keepsake";
import * as life from "./life";
import { Random } from "./random";
import * as sky from "./sky";
import * as trail from "./trail";
import type { Egg, Friend, PetState } from "./state";

// Area: who lives there, as [adult form, weight, only in this weather]
export const WILD: Record<string, readonly (readonly [string, number, sky.Precipitation])[]> = {
  meadow: [["cyclopuff", 4, null], ["sneezle", 3, null], ["flicker", 3, null], ["grumpcap", 3, "rain"],
    ["lumoth", 1, null]],
  forest: [["filchfox", 3, null], ["roamtail", 1, null], ["twiggle", 2, null], ["needlenub", 1, null]],
  stream: [["bouldergrin", 3, null], ["glimmerock", 1, null], ["lillypot", 2, null], ["steamo", 1, null]],
  cave: [["umbrabat", 3, null], ["batbeat", 1, null]],
  mountain: [["rumblefluff", 3, "rain"], ["prismist", 1, null]], // the thundercloud only comes out in the rain
  coast: [["teacrab", 3, null], ["inkasso", 1, null]],
  ruins: [["sirthimble", 3, null], ["gargard", 1, null]], // the little knight is at home in the castle
};
export const MISSING_WEIGHT = 3; // a line the home has long been missing (state.missing_lines): its wild pets come this much more often
export const MEET_CHANCE = 0.2; // how often a wild pet is at a station, while the pet is looking for a friend
export const SHOW = 3; // tricks the pet shows
export const IMPRESS = 2; // this many have to work
export const BOND_SHOWS = 3; // from this many bond hearts on, it shows one trick more (the same IMPRESS still has to work)
export const GLUM = 40; // with its mood below this, a trick works only half as often
export const FIRST_VISIT = [1 * 3600, 3 * 3600] as const; // seconds from making friends to the first visit
export const VISIT_EVERY = [5 * 3600, 10 * 3600] as const; // from one visit to the next
export const OLD_VISIT_EVERY = [20 * 3600, 28 * 3600] as const; // the same, for a friend that has brought an egg
export const BETWEEN_VISITS = 3600; // when one friend leaves, the next comes no sooner than this
export const VISIT_SECONDS = 10 * 60;
export const VISIT_MOOD = 50; // a visit only counts if the pet is at least in this mood (and at home, and awake)
export const VISIT_CHEER = 5;
export const VISITS_FOR_NEST = 5;
export const NEST_REST = 14 * 86400; // after bringing an egg, this long before the visits count again
export const MAX_FRIENDS = 3;
// This line looks for a friend already as a child: it copies whom it meets (life.SECRET, mirrorleon)
export const CURIOUS = "chameleon";
export const HEIRLOOM = 0.25; // this part of each battle stat goes into the pet's own egg (brood.ts)
export const FRIEND_HEIRLOOM = 0.1; // this part of each battle stat goes into a friend's egg the pet watches over
export const FRIEND_SKILL = 5; // a friend's first egg: this many points in its line's stat; each later one this many more
export const FRIEND_SKILL_MAX = 20; // at most, from its fourth egg on
export const GIFT_CHANCE = 0.4; // how often a visit that counts brings something

/** What the tests turn: how often a wild pet is waiting. */
export const rules = { meetChance: MEET_CHANCE };

/** One trick shown to a wild pet: [trick, whether it worked]. */
export type Shown = [string, boolean];

/** A history entry to write: [action, item]. */
export type Happened = [string, string];

/**
 * Is the pet looking for a friend? Only an adult (or a child of the CURIOUS line) whose friends have all brought it an egg
 * (or that has none yet), with room for another friend.
 */
export function looking(state: PetState): boolean {
  const met = state.friends.filter((f) => !f.guest); // a guest from the garden doesn't take a friend's place
  const old = state.stage === "adult" || (state.stage === "child" && life.lineOf(state.species) === CURIOUS);
  return old && met.length < MAX_FRIENDS && met.every((f) => f.nests)
    && !state.nest;
}

/** Is there room for one more egg of this line among the eggs that are kept? */
export function roomForEgg(state: PetState, line: string): boolean {
  return home.canAdd(state, home.eggOf(line));
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
 * one try more. What it offers first from its backpack (trip.ts: "gift:<item>" for the wild pet's
 * favorite, "ball" for a game) comes before the tricks and counts as one that worked.
 */
export function show(state: PetState, species: string, rng: Random, now: number, offered: readonly string[] = []):
    { rounds: Shown[]; outcome: "friend" | "shrug" } {
  const tricks = Object.keys(care.TRICKS);
  const practiced = tricks.filter((trick) => care.trickProgress(state, trick) > 0);
  const known = practiced.length ? practiced : tricks;
  const factor = state.stats.mood < GLUM ? 0.5 : 1.0;
  const rounds: Shown[] = offered.map((thing): Shown => [thing, true]);
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

/** Has the friend brought an egg lately, so that its visits don't count towards the next one yet? */
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
  friend.next = t + Math.round(rng.uniform(...(friend.nests ? OLD_VISIT_EVERY : VISIT_EVERY)) / keepsake.factor(state, "friends"));
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
  // while the eggs of its line that are kept are as many as there may be, the egg waits for a later visit
  if (friend.visits >= VISITS_FOR_NEST && !state.nest && roomForEgg(state, life.lineOf(friend.species))) {
    // the friend brings an egg of its own family, and the pet watches over it
    const line = life.lineOf(friend.species);
    state.nest = {
      line,
      from: state.name,
      skills: fromFriend(state, line, friend.nests ?? 0),
    };
    // the friend stays, and comes less often from now on
    Object.assign(friend, {
      visits: 0, nests: (friend.nests ?? 0) + 1, rest_until: t + NEST_REST,
      next: t + Math.round(rng.uniform(...OLD_VISIT_EVERY) / keepsake.factor(state, "friends")),
    });
    return [["nest", line]];
  }
  // now and then it tells a story that points the way to a secret form (trail.ts)
  const told = trail.find(state, "friend", t);
  const happened: Happened[] = told ? [[trail.action("friend"), told]] : [];
  const gift = !state.gift && rng.random() < GIFT_CHANCE * keepsake.factor(state, "gifts") ? giftFrom(state, rng) : null;
  if (gift) {
    state.gift = gift;
    happened.push(["gift", friend.species]); // what is in it stays a surprise
  }
  return happened;
}

/** What the pet passes on to an egg: a part (HEIRLOOM, or another `part`) of each of its battle stats. */
export function heirloom(state: PetState, part = HEIRLOOM): Record<string, number> {
  return Object.fromEntries(Object.entries(state.skills).map(([skill, value]) => [skill, Number((value * part).toFixed(1))]));
}

/**
 * What a friend's egg carries: the points the friend gives in its line's stat, which grow with
 * the eggs it has brought before (`nests`), and the small part the pet adds (FRIEND_HEIRLOOM).
 */
export function fromFriend(state: PetState, line: string, nests: number): Record<string, number> {
  const skills = heirloom(state, FRIEND_HEIRLOOM);
  const skill = life.LINE_SKILL[line];
  if (skill) {
    skills[skill] = Number(((skills[skill] ?? 0) + Math.min(FRIEND_SKILL_MAX, FRIEND_SKILL * (nests + 1))).toFixed(1));
  }
  return skills;
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

/** Take the egg out of its bed of moss; from now on it is kept with the other eggs. Returns the egg. */
export function collect(state: PetState): Egg {
  const egg = state.nest!;
  state.nest = null;
  state.eggs.push(egg);
  return egg;
}
