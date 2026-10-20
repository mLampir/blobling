/**
 * The second pet: a pet that stays at home at the back while another one is at the front.
 *
 * Brooding a new egg sends the pet that was at the front to the back instead of to the ancestors,
 * so a favorite can be kept while new forms are collected. Either one can come to the front at any
 * time (Pet.swap). Only the pet at the front has needs, goes on trips and makes friends; the one at
 * the back is looked after by it:
 *
 * - It keeps growing, but a child at the back counts as decently cared for, never as specially:
 *   what only a person gives (petting, trips, training) doesn't happen there, so the special
 *   adult forms need the pet at the front.
 * - Now and then it comes out (outWindow), like a friend's visit, and the two play. A pet that
 *   knows a trick shows it, and the other one copies it a little (teach), capped like practicing
 *   alone: it never learns a trick that way.
 * - At night it comes out too, and the two sleep side by side (inside, once there is a house).
 *
 * Coming out depends on nothing but the time, so it is the same whether anybody is looking or not.
 */

import * as care from "./care";
import * as idle from "./idle";
import * as life from "./life";
import { logEvent } from "./model";
import { Random } from "./random";
import type { PetState } from "./state";

export const OUT_EVERY = 4 * 3600; // once in this many seconds it comes out by day…
export const OUT_SECONDS = 15 * 60; // …for this long
export const BACK_CARE = 0.7; // a child at the back counts as cared for this part of the time
export const BACK_PLAYS = 0.5; // playing together counts as half a playtime in its diary
export const STAT_FLOOR = 60; // the pet at the front sees to it that nothing at the back drops below this
const PLAY_MOODS = ["normal", "happy"];

/** The time it is out by day in the block of OUT_EVERY seconds that `t` falls into: [start, end). */
export function outWindow(t: number): [number, number] {
  const block = Math.floor(t / OUT_EVERY);
  const start = block * OUT_EVERY + Math.floor(new Random(`companion:${block}`).random() * (OUT_EVERY - OUT_SECONDS));
  return [start, start + OUT_SECONDS];
}

/**
 * Is the pet at the back out right now, next to `front`? `friend`: a friend is visiting, which
 * comes first. Returns "awake", "asleep" (the two sleep side by side) or null.
 */
export function out(front: PetState, t: number, friend: boolean): "awake" | "asleep" | null {
  if (friend || front.trip || front.grandma || front.stage === "egg") {
    return null;
  }
  if (front.asleep) {
    return "asleep";
  }
  const [start, end] = outWindow(t);
  return start <= t && t < end ? "awake" : null;
}

/** The end of the next time it is out by day, after `t`. */
export function nextOutEnd(t: number): number {
  const [, end] = outWindow(t);
  return end > t ? end : outWindow((Math.floor(t / OUT_EVERY) + 1) * OUT_EVERY)[1];
}

/** The pet at the back from `back.updated_at` up to `now`: it grows, and nothing it needs runs low. */
export function rest(back: PetState, now: number): void {
  let from = back.updated_at;
  if (now <= from) {
    back.updated_at = Math.max(from, now);
    return;
  }
  for (;;) {
    const due = life.dueAt(back);
    const until = due !== null && due < now ? Math.max(from, due) : now;
    const minutes = (until - from) / 60;
    if (back.stage === "child" && minutes > 0) {
      back.diary.minutes += minutes;
      back.diary.good_minutes += minutes * BACK_CARE;
    }
    from = until;
    if (until >= now) {
      break;
    }
    const oldStage = back.stage;
    life.evolve(back, until);
    care.rescaleWeight(back, oldStage);
    logEvent(back, until, "evolve", "system", { item: `${back.stage}:${back.species}` });
  }
  for (const k of Object.keys(back.stats) as (keyof PetState["stats"])[]) {
    back.stats[k] = Math.max(back.stats[k], STAT_FLOOR);
  }
  Object.assign(back, {
    poops: 0, next_poop_at: null, sick: false, asleep: false, game: null, training: null, trip: null,
    activity: "idle", activity_until: 0, activity_item: "", updated_at: now,
  });
}

/**
 * The two have played together (a time out by day that has just ended): a child at the back
 * counts it in its diary, and each copies a trick the other one knows. Returns the tricks copied,
 * as [who copied it, trick].
 */
export function together(front: PetState, back: PetState): ["front" | "back", string][] {
  life.record(back, "plays", BACK_PLAYS);
  const copied: ["front" | "back", string][] = [];
  const toFront = teach(back, front);
  if (toFront) {
    copied.push(["front", toFront]);
  }
  const toBack = teach(front, back);
  if (toBack) {
    copied.push(["back", toBack]);
  }
  return copied;
}

/** Could the two play right now? Both up to it: the front pet awake and in a good mood. */
export function canPlay(front: PetState, mood: string): boolean {
  return !front.asleep && !front.sick && front.stage !== "egg" && PLAY_MOODS.includes(mood);
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
