/**
 * Battle stats, training, and the scuffles with opponents on trips.
 *
 * The pet always fights alone: what you can do is train it beforehand. A battle is decided in
 * one go when the pet meets an opponent (seeded like everything else on a trip); the scene then
 * plays the rounds back.
 */

import * as care from "./care";
import { Random } from "./random";
import * as sky from "./sky";
import type { PetState } from "./state";

// ---------- Battle stats (0–100) ----------

export const SKILLS = ["strength", "speed", "smarts"] as const;
export type Skill = (typeof SKILLS)[number];
export const MAX_SKILL = 100.0;
export const TRAIN_GAIN = 4.0; // points for a perfect session; several in a row are worth less
export const TRAIN_ENERGY = 15; // minimum energy, same as playing
export const TRAIN_COST = { energy: 8, satiety: 3 } as const;

export function newSkills(): Record<string, number> {
  return { strength: 0.0, speed: 0.0, smarts: 0.0 };
}

/** Add what a session was worth (score 0–1, already scaled for repeats). Returns the gain. */
export function train(state: PetState, skill: Skill, score: number): number {
  const before = state.skills[skill] ?? 0.0;
  state.skills[skill] = Number(Math.min(MAX_SKILL, before + TRAIN_GAIN * score).toFixed(3));
  return state.skills[skill] - before;
}

// ---------- Training ----------

// Strength needs no state: the app measures how hard the ball was thrown.
// Speed: the scene shows a signal after a random wait, and the time until the tap is stopped.
export const SIGNAL_DELAY = [2.0, 5.0] as const;
export const SIGNAL_WINDOW = 3.0; // this long after the signal a tap still counts
export const REACTION_BEST = 0.4; // seconds from the signal to the tap (including the way over Wi-Fi) for full marks
export const REACTION_WORST = 1.5;
// Smarts: the pet hops a sequence of directions, and you swipe them back.
export const DIRECTIONS = ["left", "right", "up", "down"];
export const SEQUENCE = [3, 6] as const; // hops; one more for every 25 points of smarts
export const SHOW_STEP = 1.0; // seconds per hop in the scene
export const ANSWER_SECONDS = 60; // this long after the show the answer still counts

export function sequenceLength(state: PetState): number {
  return Math.min(SEQUENCE[1], SEQUENCE[0] + Math.floor((state.skills.smarts ?? 0.0) / 25));
}

/** Begin a speed or smarts exercise. Returns what the scene has to show (the activity's item). */
export function start(state: PetState, kind: "speed" | "smarts", now: number): string {
  if (kind === "speed") {
    // two digits: the scene is told the same delay as the one that is kept
    const delay = Number(new Random(`signal:${now}`).uniform(...SIGNAL_DELAY).toFixed(2));
    state.training = { kind, at: now, delay };
    return delay.toFixed(2);
  }
  const rng = new Random(`sequence:${now}`);
  const steps = Array.from({ length: sequenceLength(state) }, () => rng.choice(DIRECTIONS));
  state.training = { kind, at: now, sequence: steps };
  return steps.join(",");
}

/** Is an exercise waiting for its tap or its answer? */
export function trainingActive(state: PetState, now: number, kind: "speed" | "smarts" | null = null): boolean {
  const training = state.training;
  if (!training || (kind && training.kind !== kind)) {
    return false;
  }
  if (training.kind === "speed") {
    return now < training.at + training.delay! + SIGNAL_WINDOW;
  }
  return now < training.at + training.sequence!.length * SHOW_STEP + ANSWER_SECONDS;
}

/** The tap of the reaction test. Returns [score 0–1, "early" or "ok"]. */
export function tap(state: PetState, now: number): [number, "early" | "ok"] {
  const reaction = now - state.training!.at - state.training!.delay!;
  state.training = null;
  if (reaction < 0) {
    return [0.0, "early"];
  }
  const score = (REACTION_WORST - reaction) / (REACTION_WORST - REACTION_BEST);
  return [Math.min(1.0, Math.max(0.1, score)), "ok"];
}

/** The sequence swiped back. Returns [score 0–1, hops that were right, hops in all]. */
export function answer(state: PetState, steps: readonly string[]): [number, number, number] {
  const sequence = state.training!.sequence!;
  state.training = null;
  const right = sequence.filter((step, i) => step === steps[i]).length;
  return [right / sequence.length, right, sequence.length];
}

// ---------- Opponents ----------

// The move an opponent makes -> the trick that answers it
export const MOVES: Record<string, string> = { pounce: "bow", charge: "flip", curl: "spin" };
/** When an opponent comes out: in some weather or at dusk (null = always). */
export type Comes = sky.Precipitation | "dusk";
// Name: [area, favorite move, hearts, only then]
export const FOES: Record<string, readonly [string, string, number, Comes]> = {
  bumblebop: ["meadow", "pounce", 3, null],
  diggle: ["meadow", "charge", 3, null],
  carrotnose: ["meadow", "curl", 3, "snow"],
  prickleroll: ["forest", "curl", 3, null],
  drizzleshell: ["forest", "charge", 4, "rain"],
  ribbop: ["stream", "pounce", 3, null],
  sidleclaw: ["stream", "charge", 3, null],
  puddlin: ["stream", "charge", 4, "rain"],
  echoflit: ["cave", "pounce", 4, null],
  glintbug: ["cave", "curl", 4, null],
  tumblesnow: ["mountain", "curl", 4, null],
  craghorn: ["mountain", "charge", 4, null],
  duskwisp: ["mountain", "pounce", 5, "dusk"],
  // Guardians: one per area, waiting at the end of the path. They get tougher from area to area.
  crowcomb: ["meadow", "pounce", 4, null],
  mosswart: ["forest", "curl", 5, null],
  ripplesprite: ["stream", "charge", 6, null],
  gloompeep: ["cave", "pounce", 7, null],
  frostfluff: ["mountain", "charge", 8, null],
};
// Area: its guardian. Only getting past it opens the way to the next area.
export const GUARDIANS: Record<string, string> = {
  meadow: "crowcomb", forest: "mosswart", stream: "ripplesprite", cave: "gloompeep", mountain: "frostfluff",
};
export const FAVORITE_MOVE = 0.6; // how often an opponent makes its favorite move
export const WEATHER_FOE = 2; // an opponent that only comes out in some weather or at dusk is this much more likely then

export function isGuardian(foe: string): boolean {
  return Object.values(GUARDIANS).includes(foe);
}

export function roundsOf(foe: string): number {
  return isGuardian(foe) ? GUARDIAN_ROUNDS : ROUNDS;
}

/**
 * Who the pet runs into in this area (or null if nobody lives there). The guardian is not among
 * them: it waits at the end of the path (trip.ts). `dusk`: the sun is setting (sun.isDusk).
 */
export function encounter(area: string, rng: Random, weather: sky.WeatherCode, dusk = false): string | null {
  const skyNow = sky.precipitation(weather);
  const options = Object.entries(FOES).filter(([name, [where, , , only]]) =>
    where === area && (only === null || only === skyNow || (only === "dusk" && dusk)) && !isGuardian(name));
  if (!options.length) {
    return null;
  }
  return rng.weighted(options.map(([name]) => name), options.map(([, foe]) => (foe[3] ? WEATHER_FOE : 1)));
}

// ---------- Battle ----------

export const ROUNDS = 5;
export const GUARDIAN_ROUNDS = 7; // a guardian doesn't lose interest as quickly
export const KNOCKS = 3; // knocked over this often, the pet gives up
export const PICK_SMARTS = 0.6; // smarts: picks the right trick more often (from one in three up to nearly always)
export const DODGE_BASE = 0.5; // speed: gets out of the way when its trick didn't work
export const DODGE_SPEED = 0.4;
export const STRONG_HIT = 0.7; // strength: how often a hit counts double
export const HEAVY = [1.25, 0.75] as const; // too heavy: more force, less speed (factors on strength and speed)
export const LIGHT = [0.8, 1.1] as const;
export const HOLD_BOND = 3; // from this many bond hearts on, it holds out once per battle
export const SPECIAL_CHARGE = 2; // tricks that worked until a pet that can dance lets its special move go

/** One round of a scuffle: [the opponent's move, the pet's trick, the result]. */
export type Round = [string, string, string];

export interface Fight {
  rounds: Round[];
  outcome: "win" | "lose" | "draw";
}

/** Strength, speed and smarts as they count in a battle (weight trades speed for force). */
export function battleStats(state: PetState): [number, number, number] {
  const status = care.weightStatus(state);
  const [strength, speed] = status === "heavy" ? HEAVY : status === "light" ? LIGHT : [1.0, 1.0];
  const skills = state.skills;
  return [Math.min(MAX_SKILL, (skills.strength ?? 0.0) * strength), Math.min(MAX_SKILL, (skills.speed ?? 0.0) * speed),
    skills.smarts ?? 0.0];
}

/**
 * Scuffle with an opponent.
 *
 * Result of a round: "hit", "strong" or "special" (the species' special move; both count double)
 * if the trick worked; otherwise "dodge", "ouch" (knocked over) or "hold" (held out, thanks to
 * the bond). Outcome: "win", "lose" or "draw" (nobody gave in).
 */
export function fight(state: PetState, foe: string, rng: Random): Fight {
  const [strength, speed, smarts] = battleStats(state);
  const favorite = FOES[foe][1];
  let hearts = FOES[foe][2];
  const others = Object.keys(MOVES).filter((move) => move !== favorite);
  const special = state.stage === "adult" && care.knows(state, "dance");
  let knocks = 0;
  let charge = 0;
  let canHold = care.bondLevel(state) >= HOLD_BOND;
  const rounds: Round[] = [];
  for (let i = roundsOf(foe); i > 0; i--) {
    const move = rng.random() < FAVORITE_MOVE ? favorite : rng.choice(others);
    const right = MOVES[move];
    let trick: string;
    if (rng.random() < 1 / 3 + PICK_SMARTS * smarts / MAX_SKILL) {
      trick = right;
    } else {
      trick = rng.choice(Object.values(MOVES).filter((t) => t !== right));
    }
    let result: string;
    // a trick works in battle as often as it has been learned
    if (trick === right && rng.random() < care.trickProgress(state, trick)) {
      charge += 1;
      if (special && charge >= SPECIAL_CHARGE) {
        result = "special";
        charge = 0;
      } else if (rng.random() < STRONG_HIT * strength / MAX_SKILL) {
        result = "strong";
      } else {
        result = "hit";
      }
      hearts -= damageOf(result);
    } else if (rng.random() < DODGE_BASE + DODGE_SPEED * speed / MAX_SKILL) {
      result = "dodge";
    } else if (canHold && knocks === KNOCKS - 1) {
      result = "hold";
      canHold = false;
    } else {
      result = "ouch";
      knocks += 1;
    }
    rounds.push([move, trick, result]);
    if (hearts <= 0 || knocks >= KNOCKS) {
      break;
    }
  }
  return { rounds, outcome: hearts <= 0 ? "win" : knocks >= KNOCKS ? "lose" : "draw" };
}

/** Hearts a round takes off the opponent (for the scene, which replays the rounds). */
export function damageOf(result: string): number {
  return result === "hit" ? 1 : result === "strong" || result === "special" ? 2 : 0;
}
