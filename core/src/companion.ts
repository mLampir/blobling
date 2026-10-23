/**
 * Neighbours: the pets that live at home, each in its own house, keep each other company.
 *
 * All of them are equal and live at the same time; switching between them only moves the
 * camera (Pet.select). Now and then two of them get together, like a friend's visit: a few times
 * a day for some minutes (outWindow), and at night they sleep side by side. Which two get
 * together is drawn from the time (pairs), so with three pets one of them is on its own now and
 * then. The pair shows in the house of either of them, whichever one is being looked at; once
 * the home has a playground, the first pair meets over there (playground.ts).
 *
 * When the two play, a pet that knows a trick shows it, and the other one copies it a little
 * (teach), capped like practicing alone: it never learns a trick that way. A child counts playing
 * together as half a playtime in its diary.
 *
 * Getting together depends on nothing but the time, so it is the same whether anybody is looking
 * or not.
 */

import * as care from "./care";
import * as idle from "./idle";
import * as life from "./life";
import { Random } from "./random";
import type { PetState } from "./state";

export const OUT_EVERY = 4 * 3600; // once in this many seconds two of them get together by day…
export const OUT_SECONDS = 15 * 60; // …for this long
export const PLAYS = 0.5; // playing together counts as half a playtime in a child's diary
const PLAY_MOODS = ["normal", "happy"];

/** The time two get together by day in the block of OUT_EVERY seconds that `t` falls into: [start, end). */
export function outWindow(t: number): [number, number] {
  const block = Math.floor(t / OUT_EVERY);
  const start = block * OUT_EVERY + Math.floor(new Random(`companion:${block}`).random() * (OUT_EVERY - OUT_SECONDS));
  return [start, start + OUT_SECONDS];
}

/** The end of the next time they get together by day, after `t`. */
export function nextOutEnd(t: number): number {
  const [, end] = outWindow(t);
  return end > t ? end : outWindow((Math.floor(t / OUT_EVERY) + 1) * OUT_EVERY)[1];
}

/**
 * Who keeps whom company at the time `t`: the pets (by their ids) drawn into pairs, a new draw for
 * every block of OUT_EVERY by day and one for each night. With an odd number, one is on its own.
 * Those in `away` (on a trip, at Grandma's) are left out: the pairs at home stay as drawn, and the
 * ones whose partner is away pair up among themselves, so nobody sleeps alone for nothing.
 */
export function pairs(ids: readonly string[], t: number, night: boolean, away: ReadonlySet<string> = new Set()): [string, string][] {
  const key = night ? `night:${Math.floor(t / 86400 - 0.5)}` : `pairs:${Math.floor(t / OUT_EVERY)}`;
  const rng = new Random(key);
  const order = [...ids].sort();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const result: [string, string][] = [];
  const left: string[] = [];
  for (let i = 0; i < order.length; i += 2) {
    const pair = order.slice(i, i + 2).filter((id) => !away.has(id));
    if (pair.length === 2) {
      result.push([pair[0], pair[1]]);
    } else {
      left.push(...pair);
    }
  }
  for (let i = 0; i + 1 < left.length; i += 2) {
    result.push([left[i], left[i + 1]]);
  }
  return result;
}

/** The one `id` keeps company with at the time `t`, among `pets`, or null. */
export function partner(pets: readonly PetState[], id: string, t: number, night: boolean): PetState | null {
  const hatched = pets.filter((pet) => pet.stage !== "egg");
  const pair = pairs(hatched.map((pet) => pet.id), t, night, awayFrom(hatched)).find((p) => p.includes(id));
  if (!pair) {
    return null;
  }
  const other = pair[0] === id ? pair[1] : pair[0];
  return hatched.find((pet) => pet.id === other) ?? null;
}

/** The ids of those not at home: on a trip or at Grandma's (pairs). */
export function awayFrom(pets: readonly PetState[]): Set<string> {
  return new Set(pets.filter((pet) => pet.trip || pet.grandma).map((pet) => pet.id));
}

/** Can it be with a neighbour at all: at home, hatched, not at Grandma's, no friend of its own visiting? */
function around(pet: PetState, friend: boolean): boolean {
  return !friend && !pet.trip && !pet.grandma && pet.stage !== "egg";
}

/**
 * Is `other` with `pet` right now? `friend`: whether a friend is visiting either of them, which
 * comes first. Returns "awake", "asleep" (the two sleep side by side) or null.
 */
export function out(pet: PetState, other: PetState, t: number, friend: boolean): "awake" | "asleep" | null {
  if (!around(pet, friend) || !around(other, false)) {
    return null;
  }
  if (pet.asleep || other.asleep) {
    return pet.asleep && other.asleep ? "asleep" : null;
  }
  const [start, end] = outWindow(t);
  return start <= t && t < end ? "awake" : null;
}

/**
 * The two have played together (a time together by day that has just ended): a child counts it
 * in its diary (`plays`: as how much of a playtime; more on the playground, playground.ts), and
 * each copies a trick the other one knows. Returns the tricks copied, as [who copied it, from
 * whom, trick].
 */
export function together(a: PetState, b: PetState, plays = PLAYS): [PetState, PetState, string][] {
  const copied: [PetState, PetState, string][] = [];
  for (const [learner, teacher] of [[a, b], [b, a]]) {
    life.record(learner, "plays", plays);
    const trick = teach(teacher, learner);
    if (trick) {
      copied.push([learner, teacher, trick]);
    }
  }
  return copied;
}

/** Is it up to playing right now: awake, well and in a good mood? */
export function canPlay(pet: PetState, mood: string): boolean {
  return !pet.asleep && !pet.sick && pet.stage !== "egg" && PLAY_MOODS.includes(mood);
}

/**
 * `learner` copies a trick `teacher` knows: a little practice, as much as practicing alone and
 * from the same allowance (idle.SOLO_LIMIT), so it never learns a trick this way. A baby is too
 * young. Returns the trick, or null.
 */
export function teach(teacher: PetState, learner: PetState): string | null {
  if (learner.stage === "egg" || learner.stage === "baby") {
    return null;
  }
  const trick = care.learned(teacher).find((name) => {
    const points = learner.tricks[name] ?? 0.0;
    return points + idle.PRACTICE_STEP < care.TRICKS[name]
      && (learner.solo[name] ?? 0.0) + idle.PRACTICE_STEP <= idle.SOLO_LIMIT;
  });
  if (trick === undefined) {
    return null;
  }
  learner.tricks[trick] = (learner.tricks[trick] ?? 0.0) + idle.PRACTICE_STEP;
  learner.solo[trick] = (learner.solo[trick] ?? 0.0) + idle.PRACTICE_STEP;
  return trick;
}
