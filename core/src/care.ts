/**
 * Weight, bond, hide and seek, and tricks.
 *
 * All kept small on purpose so the basic game stays simple.
 */

import type { Stage } from "./life";
import { Random } from "./random";
import type { Game, PetState } from "./state";

// ---------- Weight (grams) ----------

export const IDEAL_WEIGHT: Record<Stage, number> = { egg: 20.0, baby: 20.0, child: 35.0, adult: 50.0 };
export const HEAVY = 1.3; // 30 % over the ideal: too heavy → tires faster, and it shows
export const LIGHT = 0.8; // 20 % under the ideal: too light → gets sick more easily
// Weight drifts back to the ideal by itself (half the difference per day).
// Meals, sweet things and exercise push it back and forth; only lots of honeycomb makes a
// pet too heavy, and only going hungry makes it too light. A round of play
// (or hide and seek, or training) burns off a meal's worth twice, so a
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

// ---------- Hide and seek ----------

export const HIDE_TRIES = 3; // tries to find it; one more for each other pet hiding too
export const GAME_TIMEOUT = 120; // this long without a guess → game over
export const GAME_ENERGY = 15; // minimum energy, same as playing
// Where a pet can hide: the edges and the tall grass are always there; the house, the plant and the
// decorations outside add their own (hidingSpots). "left" is the edge the house stands at.
export const SPOTS = ["left", "house", "plant", "grass", "deco1", "deco0", "right"] as const;
// Each line has a spot it likes best and goes for more often, so that one learns where to look
export const FAVORITE_SPOT: Record<string, string> = {
  blob: "plant", ember: "house", stone: "grass", fox: "house", cloud: "right", leaf: "plant", duck: "grass",
  hippo: "grass", beak: "deco0",
};
const FAVORITE_WEIGHT = 3;

/**
 * The spots there are right now, from left to right: the house takes the left edge, a plant takes
 * it too while there is no house, and the decorations take the right one.
 */
export function hidingSpots(state: PetState, outside: readonly string[]): string[] {
  const spots: string[] = [];
  if (state.house > 0) {
    spots.push("house");
  } else if (!state.plant) {
    spots.push("left");
  }
  if (state.plant) {
    spots.push("plant");
  }
  spots.push("grass");
  if (outside.length > 1) {
    spots.push("deco1");
  }
  spots.push(outside.length ? "deco0" : "right");
  return spots;
}

/**
 * The pet hides (and a guest with it, at another spot). Its own line's favorite spot comes up
 * more often, and never the spot it was found at last time.
 */
export function startGame(state: PetState, now: number, spots: readonly string[], line: string, guest = false): void {
  const rng = new Random(`hide:${now}`);
  const before = state.game?.spots?.[0];
  const choose = (from: readonly string[]) => rng.weighted([...from],
    from.map((spot) => spot === FAVORITE_SPOT[line] ? FAVORITE_WEIGHT : 1));
  const open = spots.filter((spot) => spot !== before);
  const hidden = [choose(open.length ? open : spots)];
  if (guest && spots.length > 1) {
    hidden.push(rng.choice(spots.filter((spot) => spot !== hidden[0])));
  }
  state.game = { round: 0, wins: 0, last: now, spots: hidden, found: [] };
}

export const PEEK_EVERY = [3, 7] as const; // seconds between peeks: the smarter it is, the longer it keeps still

/** Every how many seconds a hiding pet peeks out. */
export function peekEvery(state: PetState): number {
  const [quick, slow] = PEEK_EVERY;
  return quick + (slow - quick) * Math.min(1, (state.skills.smarts ?? 0) / 100);
}

/** How many tries a game has: one more for every pet hiding besides the first. */
export function tries(game: Game): number {
  return HIDE_TRIES + (game.spots?.length ?? 1) - 1;
}

/** Is a game going on (started, not finished, not fallen asleep)? */
export function gameActive(state: PetState, now: number): boolean {
  return !!state.game && state.game.round !== undefined && now - state.game.last < GAME_TIMEOUT;
}

/**
 * One look behind a spot. Returns who was there ("pet", "guest" or null) and whether the game is
 * over: everybody found, or no tries left.
 */
export function seek(state: PetState, spot: string, now: number): [string | null, boolean] {
  const game = state.game!;
  const hidden = game.spots ?? [];
  const at = hidden.indexOf(spot);
  const who = at < 0 || game.found!.includes(spot) ? null : at === 0 ? "pet" : "guest";
  game.round = game.round! + 1;
  game.last = now;
  if (who) {
    game.found!.push(spot);
    game.wins = game.found!.length;
  }
  return [who, game.found!.length >= hidden.length || game.round >= tries(game)];
}

// ---------- Tricks ----------

// Name: practice needed. One practice is worth 1 point, up to 1.5 with a strong
// bond; after each one the pet needs a break, longer the more it has practiced
// lately (model.REST_SECONDS), so learning takes a few days.
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
