/**
 * Life cycle: egg → baby → child → adult.
 *
 * Every stage lasts a fixed time, less what warmth takes off it (petting the egg, and the ember
 * stone of home.ts); after that the evolution is "due". It is triggered by hand in the app ("Hatch" / "Evolve"), so that you are watching and get to see the animation. If nobody
 * does that for a day, the pet evolves by itself (but only while awake and not at bedtime).
 *
 * Which adult form it becomes is decided by the care diary of the child stage (decideSpecies).
 *
 * There are several lines of pets. The egg decides which line a pet belongs to: the usual egg is
 * a slime, and a rare egg from a trip (home.EGGS) is something else. Until a pet has grown up,
 * its species is simply the name of its line.
 */

import type { PetState } from "./state";

export const STAGES = ["egg", "baby", "child", "adult"] as const;
export type Stage = (typeof STAGES)[number];
export const NEXT_STAGE: Partial<Record<Stage, Stage>> = { egg: "baby", baby: "child", child: "adult" };

// How long a stage lasts (seconds)
export const STAGE_SECONDS: Partial<Record<Stage, number>> = { egg: 3600, baby: 3 * 86400, child: 7 * 86400 };
export const EGG_WARMTH = 15 * 60; // petting warms the egg: it hatches this much sooner
export const AUTO_EVOLVE_AFTER = 24 * 3600; // due and nobody taps → it evolves by itself

// Line: its adult forms
export const LINES: Record<string, readonly string[]> = {
  blob: ["sneezle", "flicker", "cyclopuff", "grumpcap", "lumoth"],
  ember: ["lanternling", "flarelet"],
  stone: ["glimmerock", "bouldergrin"],
};
export const SPECIES = Object.entries(LINES).flatMap(([line, adults]) => [line, ...adults]);
// Every form there is, as "stage:species", in the album's order: per line its egg, baby, child
// and adult forms
export const FORMS = Object.entries(LINES).flatMap(([line, adults]) => [
  ...STAGES.slice(0, -1).map((stage) => `${stage}:${line}`), ...adults.map((adult) => `adult:${adult}`)]);

// Rules for the adult form (order = priority)
export const NEGLECT_CARE = 0.5; // care below this → grumpcap
export const LUMOTH_LOVE_PER_DAY = 8; // counted pettings per day → lumoth (secret; a starting value to try out)
export const FLICKER_PLAYS_PER_DAY = 3;
export const SNEEZLE_CARE = 0.85;
export const FLARELET_PLAYS_PER_DAY = 3; // the ember line: played with this often → flarelet, otherwise lanternling
export const GLIMMEROCK_LOVE_PER_DAY = 5; // the stone line: petting polishes it → glimmerock, otherwise bouldergrin
export const HINT_AFTER = 1440; // minutes in the diary before the child's lure shows where it is heading

// Character: factors on decay (awake) and on rewards. Small on purpose.
export const DECAY_FACTORS: Record<string, Record<string, number>> = {
  baby: { satiety: 1.3, energy: 1.2 }, // babies eat and sleep more
  flicker: { mood: 1.3 }, // wants to play all the time
  cyclopuff: { satiety: 1.15, energy: 0.9 }, // easy-going, loves food
  grumpcap: { satiety: 0.7, mood: 1.3 }, // needs little food, but lots of attention
  lumoth: { hygiene: 0.8 },
  lanternling: { mood: 0.8 }, // snug behind its glass
  flarelet: { satiety: 1.25, energy: 0.85 }, // burns through its food and hardly tires
  glimmerock: { hygiene: 0.7 }, // polished: dirt doesn't stick
  bouldergrin: { satiety: 1.2, mood: 0.8 }, // a heavy eater, and nothing wipes the grin off its face
};
export const BONUS_FACTORS: Record<string, Record<string, number>> = {
  flicker: { play: 1.25 },
  grumpcap: { pet: 2.0 },
  lumoth: { heart: 1.5 },
  sneezle: { sick: 0.5 }, // gets sick less often
  lanternling: { sick: 0.6 },
  glimmerock: { pet: 1.5 }, // loves being polished
};

export function newDiary(): Record<string, number> {
  return { minutes: 0, good_minutes: 0, meals: 0, snacks: 0, plays: 0, love: 0 };
}

/** The line a species belongs to. */
export function lineOf(species: string): string {
  const found = Object.entries(LINES).find(([line, adults]) => species === line || adults.includes(species));
  return found ? found[0] : "blob";
}

function key(state: PetState): string {
  return state.stage === "adult" ? state.species : state.stage;
}

/** The forms a pet of this stage and species has been so far, as "stage:species" (see FORMS). */
export function formsOf(stage: string, species: string): string[] {
  const reached = STAGES.indexOf(stage as Stage);
  if (reached < 0) {
    return [];
  }
  const line = lineOf(species);
  return STAGES.slice(0, reached + 1).map((s) => `${s}:${s === "adult" ? species : line}`)
    .filter((form) => FORMS.includes(form));
}

export function decayFactor(state: PetState, stat: string): number {
  return DECAY_FACTORS[key(state)]?.[stat] ?? 1.0;
}

export function bonusFactor(state: PetState, kind: string): number {
  return BONUS_FACTORS[key(state)]?.[kind] ?? 1.0;
}

/** When the next stage is due (null = adult). */
export function dueAt(state: PetState): number | null {
  const seconds = STAGE_SECONDS[state.stage];
  if (seconds === undefined) {
    return null;
  }
  return state.stage_since + seconds - state.egg_warmth;
}

export function isDue(state: PetState, now: number): boolean {
  const due = dueAt(state);
  return due !== null && now >= due;
}

/** Diary of the child stage: one minute, well cared for or not. */
export function recordMinute(state: PetState, good: boolean): void {
  if (state.stage === "child") {
    state.diary.minutes += 1;
    state.diary.good_minutes += good ? 1 : 0;
  }
}

export function record(state: PetState, kind: string, amount = 1): void {
  if (state.stage === "child") {
    state.diary[kind] = (state.diary[kind] ?? 0) + amount;
  }
}

export function decideSpecies(diary: Record<string, number>, line = "blob"): string {
  const minutes = diary.minutes ?? 0;
  const days = Math.max(1.0, minutes / 1440);
  if (line === "ember") {
    return (diary.plays ?? 0) / days >= FLARELET_PLAYS_PER_DAY ? "flarelet" : "lanternling";
  }
  if (line === "stone") {
    return (diary.love ?? 0) / days >= GLIMMEROCK_LOVE_PER_DAY ? "glimmerock" : "bouldergrin";
  }
  const care = minutes ? (diary.good_minutes ?? 0) / minutes : 1.0;
  if (care < NEGLECT_CARE) {
    return "grumpcap";
  }
  if ((diary.love ?? 0) / days >= LUMOTH_LOVE_PER_DAY) {
    return "lumoth";
  }
  if ((diary.plays ?? 0) / days >= FLICKER_PLAYS_PER_DAY) {
    return "flicker";
  }
  if (care >= SNEEZLE_CARE) {
    return "sneezle";
  }
  return "cyclopuff";
}

/** The adult form a child is heading for right now (null in its first day and at other stages). */
export function hint(state: PetState): string | null {
  if (state.stage !== "child" || (state.diary.minutes ?? 0) < HINT_AFTER) {
    return null;
  }
  return decideSpecies(state.diary, lineOf(state.species));
}

/** Next stage. Returns the old form as "stage:species" (for the animation). */
export function evolve(state: PetState, now: number): string {
  const old = `${state.stage}:${state.species}`;
  const next = NEXT_STAGE[state.stage];
  if (next === undefined) {
    throw new Error(`${state.stage} is the last stage`);
  }
  if (next === "baby") {
    state.born_at = now; // age counts from hatching
  }
  if (next === "child") {
    state.diary = newDiary();
  }
  if (next === "adult") {
    state.species = decideSpecies(state.diary, lineOf(state.species));
  }
  state.stage = next;
  state.stage_since = now;
  state.egg_warmth = 0.0;
  return old;
}
