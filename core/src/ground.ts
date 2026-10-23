/**
 * The training ground: a screen of its own along the street, after the houses and the yard. Every
 * home has one from the start: a running track where the pets train their battle stats (battle.ts).
 *
 * When somebody opens the training, the pet goes over (go) and stays while it is trained, until
 * the training is closed (leave) or STAYS after the last exercise; doing anything else with it
 * brings it home. The camera goes along, as it does to the yard.
 *
 * The equipment is found on trips, one piece for each stat (EQUIPMENT), and belongs to the home
 * like the yard's basin. With the piece for a stat, an exercise of that stat is worth EQUIPPED
 * times as much, and now and then a pet goes over by itself and practices a little on its own:
 * SOLO_STEP points, and no more than SOLO_LIMIT between two trainings together, like practicing a
 * trick alone (idle.ts).
 */

import * as battle from "./battle";
import type { PetState } from "./state";

// The equipment for each stat, found once on a trip (trip.FINDS)
export const EQUIPMENT: Record<battle.Skill, string> = { strength: "barbell", speed: "cones", smarts: "coach_board" };
export const EQUIPPED = 1.25; // a perfect exercise with the equipment: 5 points instead of 4
export const STAYS = 5 * 60; // seconds it stays over there after it went or after the last exercise
// Practicing alone: now and then, instead of something else it does by itself (idle.step)
export const SOLO_CHANCE = 0.3;
export const SOLO_STEP = 1.0;
export const SOLO_LIMIT = 2.0;
export const SOLO_MOOD = 2;
export const SOLO_ENERGY = 2;
export const SOLO_SECONDS = 60; // how long it is over there for it

/** Is the pet over at the training ground at the time `now`? */
export function there(state: PetState, now: number): boolean {
  return now < state.ground_until && !state.asleep && !state.trip && !state.grandma;
}

/** It goes over (or, being there, stays a while longer). */
export function go(state: PetState, now: number, seconds = STAYS): void {
  state.ground_until = Math.max(there(state, now) ? state.ground_until : 0, now + seconds);
}

/** It comes home. */
export function leave(state: PetState): void {
  state.ground_until = 0.0;
}

/** Has the home the equipment for this stat? */
export function equipped(items: Record<string, number>, skill: battle.Skill): boolean {
  return (items[EQUIPMENT[skill]] ?? 0) > 0;
}

/** The equipment the home has, as the scene draws it (in the order of battle.SKILLS). */
export function equipment(items: Record<string, number>): string[] {
  return battle.SKILLS.filter((skill) => equipped(items, skill)).map((skill) => EQUIPMENT[skill]);
}

/** What an exercise of this stat is worth, times its score. */
export function factor(state: PetState, skill: battle.Skill): number {
  return equipped(state.items, skill) ? EQUIPPED : 1.0;
}

/** The stats it could practice alone: the equipment is there, and it hasn't practiced alone too much. */
export function practicable(state: PetState): battle.Skill[] {
  return battle.SKILLS.filter((skill) => equipped(state.items, skill)
    && state.skills[skill] < battle.MAX_SKILL && (state.solo[skill] ?? 0.0) + SOLO_STEP <= SOLO_LIMIT);
}

/** It practices a stat on its own over there, at the time t. */
export function practiceAlone(state: PetState, skill: battle.Skill, t: number): void {
  state.skills[skill] = Math.min(battle.MAX_SKILL, state.skills[skill] + SOLO_STEP);
  state.solo[skill] = (state.solo[skill] ?? 0.0) + SOLO_STEP;
  state.stats.mood += SOLO_MOOD;
  state.stats.energy -= SOLO_ENERGY;
  go(state, t, SOLO_SECONDS);
}

/** It has been trained in this stat together with somebody: it may practice it alone again. */
export function trainedTogether(state: PetState, skill: battle.Skill): void {
  delete state.solo[skill];
}
