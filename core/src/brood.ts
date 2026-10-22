/**
 * The pet's own egg: an adult that is close to its owner and has had good days lays an egg of its
 * own line.
 *
 * With a strong bond (BOND hearts or more), the adult counts its good days: a day counts if its
 * mood over the minutes it was awake at home that day was GOOD_MOOD or more on average. The days
 * need not follow each other. A day it spent at Grandma's or out on a trip all the time has no
 * such minutes, and doesn't count. After DAYS of them, the next morning it wakes up at home, an
 * egg of its own line lies in the nest (state.nest, the bed of moss a friend's egg lies in too;
 * wild.ts), with a part of its battle stats as its heirloom, the same part a friend's egg gets.
 * While the nest is taken, there is no room for another egg or an egg of its line is kept already,
 * it waits for a later morning.
 *
 * Then it rests (REST); after that the counting starts again from nothing.
 */

import * as care from "./care";
import * as home from "./home";
import { dayOf } from "./festival";
import * as life from "./life";
import type { Egg, PetState } from "./state";
import * as wild from "./wild";

export const BOND = 4; // bond hearts from which it counts
export const GOOD_MOOD = 60; // the day's average mood, awake and at home
export const MIN_MINUTES = 60; // a day with fewer minutes awake at home than this doesn't count
export const DAYS = 5; // good days for an egg
export const REST = 14 * 86400; // after an egg, this long before the days count again

/** Does it count its days at the time t? */
export function counting(state: PetState, t: number): boolean {
  return state.stage === "adult" && care.bondLevel(state) >= BOND && t >= state.brood.rest_until && !state.brood.ready;
}

/**
 * One minute ending at t (after the stats have changed). `atHome`: it is at home and awake.
 * A new day settles the one before.
 */
export function step(state: PetState, t: number, atHome: boolean): void {
  const brood = state.brood;
  const day = dayOf(t);
  if (day !== brood.day) {
    if (brood.minutes >= MIN_MINUTES && brood.mood / brood.minutes >= GOOD_MOOD) {
      brood.days += 1;
      brood.ready = brood.days >= DAYS;
    }
    Object.assign(brood, { day, minutes: 0, mood: 0 });
  }
  if (atHome && counting(state, t)) {
    brood.minutes += 1;
    brood.mood = Number((brood.mood + state.stats.mood).toFixed(3));
  }
}

/**
 * It has woken up at home in the morning, at the time t: after its good days the egg lies in the
 * nest, if there is room. Returns the egg, or null.
 */
export function wake(state: PetState, t: number): Egg | null {
  const brood = state.brood;
  if (!brood.ready || state.nest || !wild.roomForEgg(state) || home.hasEggOf(state, life.lineOf(state.species))) {
    return null;
  }
  state.nest = { line: life.lineOf(state.species), from: state.name, skills: wild.heirloom(state) };
  Object.assign(brood, { days: 0, ready: false, rest_until: t + REST, minutes: 0, mood: 0 });
  return state.nest;
}
