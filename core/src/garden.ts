/**
 * Guests in the garden: what the pet and its home do draws a wild pet that no trip leads to.
 *
 * Every garden line has one thing that draws its guest (GUESTS): the plant bore all its fruits,
 * the pet played with you on most days of a week, a pond is set out and it rained lately, or a
 * pond and a woodpile are set out. Once that is so, the guest first peeks over the fence for a
 * while; then it is a friend like one from a trip (wild.ts), visits, plays and brings gifts, and
 * after VISITS_FOR_NEST visits that count an egg of its own line lies in the nest.
 *
 * A guest doesn't take the place of a friend from a trip (wild.looking leaves guests out), and
 * comes to a pet only once.
 */

import { Random } from "./random";
import type { PetState } from "./state";

// Line: its guest, the line's basic adult form (life.LINES)
export const GUESTS: Record<string, string> = {
  caterpillar: "mothmuff", dog: "digby", dragonfly: "rotorfly", beaver: "dambert",
};
export const PLAY_DAYS = 5; // the dog: days with a game together, out of the last WEEK
export const WEEK = 7 * 86400;
export const RAIN_LATELY = 7 * 86400; // the dragonfly: rain at home within this long
export const POND = "pond";
export const WOODPILE = "woodpile";
export const PEEK_SECONDS = [2 * 3600, 6 * 3600] as const; // how long it peeks over the fence before the first visit

/** A history entry to write: [action, item]. */
export type Happened = [string, string];

/** The local calendar day of the time t, as a number. */
function dayOf(t: number): number {
  const date = new Date(t * 1000);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

/** Somebody played a game with it (model: "play" and "game"): the day counts for the dog. */
export function notePlay(state: PetState, t: number): void {
  const day = dayOf(t);
  const days = state.garden.play_days.filter((d) => d > day - WEEK / 86400 && d !== day);
  state.garden.play_days = [...days, day];
}

/** One minute at home ending at t: it rains there right now. */
export function noteRain(state: PetState, t: number): void {
  state.garden.rain_at = t;
}

/** Does the guest of this line want to come right now? */
export function drawn(state: PetState, line: string, t: number): boolean {
  const set = (item: string) => state.deco.includes(item);
  switch (line) {
    case "caterpillar":
      return state.garden.plants_done > 0;
    case "dog":
      return state.garden.play_days.filter((d) => d > dayOf(t) - WEEK / 86400).length >= PLAY_DAYS;
    case "dragonfly":
      return set(POND) && t - state.garden.rain_at < RAIN_LATELY;
    case "beaver":
      return set(POND) && set(WOODPILE);
    default:
      return false;
  }
}

/** Has this guest already come to the pet (peeking or as a friend)? */
function came(state: PetState, species: string): boolean {
  return state.garden.peeking?.species === species || state.friends.some((f) => f.species === species);
}

/** The guest peeking over the fence right now, or null. */
export function peeking(state: PetState, t: number): string | null {
  const peek = state.garden.peeking;
  return peek && t < peek.until ? peek.species : null;
}

/**
 * One minute ending at t. `atHome`: the pet is there and awake. A guest that has peeked long
 * enough becomes a friend; and when something draws a new one, it starts peeking (one at a time).
 */
export function step(state: PetState, t: number, atHome: boolean): Happened[] {
  if (state.stage === "egg") {
    return [];
  }
  const peek = state.garden.peeking;
  if (peek) {
    if (t < peek.until) {
      return [];
    }
    state.garden.peeking = null;
    state.friends.push({ species: peek.species, visits: 0, next: t, guest: true });
    return [["guest", peek.species]];
  }
  if (!atHome) {
    return [];
  }
  const line = Object.keys(GUESTS).find((l) => !came(state, GUESTS[l]) && drawn(state, l, t));
  if (!line) {
    return [];
  }
  const rng = new Random(`peek:${Math.trunc(t)}`);
  state.garden.peeking = { species: GUESTS[line], until: t + Math.round(rng.uniform(...PEEK_SECONDS)) };
  return [["peek", GUESTS[line]]];
}

/** Is this friend a guest from the garden? */
export function isGuest(species: string): boolean {
  return Object.values(GUESTS).includes(species);
}
