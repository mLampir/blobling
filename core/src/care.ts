/**
 * Weight, bond, snacks, the mini-game "Left or right?" and tricks.
 *
 * All kept small on purpose so the basic game stays simple.
 */

import type { Stage } from "./life";
import { Random } from "./random";
import type { PetState } from "./state";

// ---------- Weight (grams) ----------

export const IDEAL_WEIGHT: Record<Stage, number> = { egg: 20.0, baby: 20.0, child: 35.0, adult: 50.0 };
export const HEAVY = 1.3; // 30 % over the ideal: too heavy → tires faster, and it shows
export const LIGHT = 0.8; // 20 % under the ideal: too light → gets sick more easily
// Weight drifts back to the ideal by itself (half the difference per day).
// Meals, snacks and exercise push it back and forth; only lots of snacks make a
// pet too heavy, and only going hungry makes it too light. A round of play
// (or the guessing game, or training) burns off a meal's worth twice, so a
// heavy pet slims down again within a day or two of playing and trips.
export const DRIFT_PER_DAY = 0.5;
export const HUNGRY_LOSS_PER_HOUR = 0.5;
export const MEAL_WEIGHT = 1.0;
export const PLAY_WEIGHT = -2.0;
export const HIKE_WEIGHT = -0.5; // per station on a trip

export type WeightStatus = "heavy" | "light" | "ok";

export function ideal(state: PetState): number {
  return IDEAL_WEIGHT[state.stage];
}

export function weightStatus(state: PetState): WeightStatus {
  const ratio = state.weight / ideal(state);
  return ratio >= HEAVY ? "heavy" : ratio <= LIGHT ? "light" : "ok";
}

export function addWeight(state: PetState, grams: number): void {
  state.weight = Math.max(ideal(state) * 0.5, Math.min(ideal(state) * 2, state.weight + grams));
}

/** On evolving: same ratio to the ideal, new size. */
export function rescaleWeight(state: PetState, oldStage: Stage): void {
  state.weight = state.weight / IDEAL_WEIGHT[oldStage] * ideal(state);
}

export function driftWeight(state: PetState, minutes: number, hungry: boolean): void {
  state.weight -= (state.weight - ideal(state)) * DRIFT_PER_DAY * minutes / 1440;
  if (hungry) {
    state.weight -= HUNGRY_LOSS_PER_HOUR * minutes / 60;
  }
  state.weight = Math.max(ideal(state) * 0.5, state.weight);
}

export function energyFactor(state: PetState): number {
  return weightStatus(state) === "heavy" ? 1.2 : 1.0;
}

export function sickFactor(state: PetState): number {
  return weightStatus(state) === "light" ? 1.5 : 1.0;
}

// ---------- Bond (0–100) ----------

export const BOND_DECAY_PER_DAY = 0.5; // barely wears off
export const BOND_GAIN: Record<string, number> = {
  pet: 2.0, play: 1.0, game: 2.0, meal: 0.5, snack: 0.5, heart: 2.0, clean: 0.5, trick: 1.0, trip: 1.0,
  warm: 1.0,
};

export function addBond(state: PetState, kind: string, amount = 1): void {
  state.bond = Math.min(100.0, state.bond + (BOND_GAIN[kind] ?? 0) * amount);
}

/** A strong bond makes the mood drop more slowly (by up to 25 %). */
export function moodFactor(state: PetState): number {
  return 1.0 - 0.25 * state.bond / 100;
}

/** 0–5 hearts for the app. */
export function bondLevel(state: PetState): number {
  return Math.min(5, Math.floor(state.bond / 20));
}

// ---------- Snacks ----------

// Name: [satiety, mood, weight, health]
export const SNACKS: Record<string, readonly [number, number, number, number]> = {
  cookie: [5, 15, 2.5, 0],
  icecream: [5, 20, 3.0, 0],
  fruit: [10, 8, 0.5, 3],
};
export const FAVORITE: Record<string, string> = {
  blob: "icecream", sneezle: "fruit", flicker: "cookie", cyclopuff: "icecream", grumpcap: "fruit",
  lumoth: "cookie", ember: "cookie", lanternling: "icecream", flarelet: "fruit", stone: "fruit",
  glimmerock: "icecream", bouldergrin: "cookie", gemperor: "fruit", angloop: "icecream", purrloop: "cookie",
  fox: "fruit", roamtail: "fruit", filchfox: "cookie", cloud: "icecream", rumblefluff: "cookie", prismist: "icecream",
};
export const FAVORITE_BONUS = 1.5;

export function favorite(state: PetState): string {
  return FAVORITE[state.species] ?? "icecream";
}

// ---------- Mini-game ----------

export const GAME_ROUNDS = 5;
export const GAME_WIN = 3; // this many hits = won
export const GAME_TIMEOUT = 120; // this long without a guess → game over
export const GAME_ENERGY = 15; // minimum energy, same as playing
export const SIDES = ["left", "right"] as const;

export function startGame(state: PetState, now: number): void {
  state.game = { round: 0, wins: 0, last: now };
}

/** Is a game going on (started, not finished, not fallen asleep)? */
export function gameActive(state: PetState, now: number): boolean {
  return !!state.game && state.game.round !== undefined && now - state.game.last < GAME_TIMEOUT;
}

/** One round: which way does the pet jump? Returns [direction, hit, done]. */
export function guess(state: PetState, side: string, now: number): [string, boolean, boolean] {
  const game = state.game!;
  const jump = new Random(`${now}:${game.round}`).choice(SIDES);
  const hit = jump === side;
  game.round = game.round! + 1;
  game.wins = game.wins! + (hit ? 1 : 0);
  game.last = now;
  return [jump, hit, game.round >= GAME_ROUNDS];
}

// ---------- Tricks ----------

// Name: practice needed. One practice is worth 1 point, up to 1.5 with a strong
// bond; several in a row are worth less (as with playing), so learning takes a
// few days.
export const TRICKS: Record<string, number> = { bow: 3, spin: 5, dance: 7, flip: 10 };
export const TRICK_ENERGY = 15; // minimum energy, same as playing
export const TRICK_LUCK = 0.25; // how often it already works on the very first try

/** 0–1: how well it already knows the trick. */
export function trickProgress(state: PetState, trick: string): number {
  return Math.min(1.0, (state.tricks[trick] ?? 0.0) / TRICKS[trick]);
}

export function knows(state: PetState, trick: string): boolean {
  return trickProgress(state, trick) >= 1.0;
}

export function learned(state: PetState): string[] {
  return Object.keys(TRICKS).filter((trick) => knows(state, trick));
}

/** Practice once. Returns "ok", "fail" (didn't work yet) or "learned" (it knows the trick from now on). */
export function practice(state: PetState, trick: string, factor: number, now: number): "ok" | "fail" | "learned" {
  const before = trickProgress(state, trick);
  const ok = new Random(`${now}:${trick}`).random() < TRICK_LUCK + (1 - TRICK_LUCK) * before;
  state.tricks[trick] = (state.tricks[trick] ?? 0.0) + factor * (1 + 0.5 * state.bond / 100);
  if (knows(state, trick)) {
    return "learned";
  }
  return ok ? "ok" : "fail";
}
