/**
 * A visit to Grandma's, on purpose: before a holiday or a busy week, somebody takes the pet there.
 *
 * It stays as it does when nobody came for a long time (model.goToGrandma): looked after, frozen,
 * until it is fetched. But a real visit is worth it: after a whole day there it comes home with
 * Grandma's things in its backpack, which there are nowhere else. A hat she knitted (one of three,
 * until it has them all), a slice of her cake, and now and then an old egg from her attic: the
 * first one is always the mouse's, later ones are of lines the pet already knows.
 *
 * So Grandma rewards a visit, not being forgotten: a pet that went to her because nobody came
 * brings nothing back.
 */

import * as home from "./home";
import * as life from "./life";
import type { Random } from "./random";
import type { PetState } from "./state";

export const GIFT_AFTER = 24 * 3600; // this long it has to stay for Grandma's things
export const GIFT_EVERY = 3 * 86400; // she has something new at most this often
export const HATS = ["earflap", "stripes", "cosy"]; // only Grandma knits these
export const CAKE = "cake";
export const ATTIC_CHANCE = 0.4; // an egg from the attic on a visit with gifts
export const ATTIC_SURE = 3; // on the third visit with gifts without one, there is one
export const ATTIC_FIRST = "mouse"; // the first egg from the attic is always the mouse's

/** Can it be taken to Grandma's now? null, or why not. */
export function canVisit(state: PetState): string | null {
  return state.stage === "egg" ? "egg" : state.grandma ? "at_grandmas" : state.trip ? "away"
    : state.asleep ? "asleep" : state.backpack.length ? "unpack_first" : null;
}

/** Will it bring something home if it is fetched now? */
export function giftsReady(state: PetState, now: number): boolean {
  return state.grandma_visit && now - state.grandma >= GIFT_AFTER
    && now - (state.counters.grandma_gifts_at ?? -Infinity) >= GIFT_EVERY;
}

/** What Grandma packs into its backpack: a hat it doesn't have yet, a slice of cake, maybe an egg. */
export function gifts(state: PetState, now: number, rng: Random): string[] {
  const c = state.counters;
  c.grandma_gifts_at = now;
  c.grandma_gifts = (c.grandma_gifts ?? 0) + 1;
  const packed: string[] = [];
  const hat = HATS.find((id) => !state.items[id] && state.hat !== id);
  if (hat) {
    packed.push(hat);
  }
  packed.push(CAKE);
  const misses = c.attic_misses ?? 0;
  if (state.eggs.length < home.MAX_EGGS && (misses + 1 >= ATTIC_SURE || rng.random() < ATTIC_CHANCE)) {
    const line = c.attic_eggs ? rng.choice(knownLines(state)) : ATTIC_FIRST;
    packed.push(home.eggOf(line));
    c.attic_eggs = (c.attic_eggs ?? 0) + 1;
    c.attic_misses = 0;
  } else {
    c.attic_misses = misses + 1;
  }
  return packed;
}

/** The lines the pet knows: its own, its friends', and the eggs it keeps. */
export function knownLines(state: PetState): string[] {
  const lines = [life.lineOf(state.species), ...state.friends.map((friend) => life.lineOf(friend.species)),
    ...state.eggs.map((egg) => egg.line), ATTIC_FIRST];
  return [...new Set(lines)].filter((line) => line in life.LINES);
}
