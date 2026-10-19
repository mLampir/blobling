/**
 * Life cycle: egg → baby → child → adult.
 *
 * Every stage lasts a fixed time, less what warmth takes off it (petting the egg, and the ember
 * stone of home.ts); after that the evolution is "due". It is triggered by hand in the app ("Hatch" / "Evolve"), so that you are watching and get to see the animation. If nobody
 * does that for a day, the pet evolves by itself (but only while awake and not at bedtime).
 *
 * Which adult form it becomes is decided by the care diary of the child stage (decideSpecies), and
 * for the cloud line by the weather the moment it grows up.
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

// Line: its adult forms. The slime's first five forms grow no more (REFORMED); they stay here
// because they still live in the wild and in the ancestors' gallery.
export const LINES: Record<string, readonly string[]> = {
  blob: ["angloop", "gemperor", "purrloop", "sneezle", "flicker", "cyclopuff", "grumpcap", "lumoth"],
  ember: ["lanternling", "flarelet"],
  stone: ["glimmerock", "bouldergrin"],
  fox: ["roamtail", "filchfox"],
  cloud: ["prismist", "rumblefluff"],
};
/**
 * The language key for the name of a form: an adult's species, the child of its line (every line's
 * child has a name of its own, in `children` of the language files), or else the stage.
 */
export function formKey(stage: string, species: string): string {
  if (stage === "adult") {
    return `species.${species}`;
  }
  return stage === "child" ? `children.${species}` : `stages.${stage}`;
}
export const SPECIES = Object.entries(LINES).flatMap(([line, adults]) => [line, ...adults]);
// Every form there is, as "stage:species", in the album's order: per line its egg, baby, child
// and adult forms
export const FORMS = Object.entries(LINES).flatMap(([line, adults]) => [
  ...STAGES.slice(0, -1).map((stage) => `${stage}:${line}`), ...adults.map((adult) => `adult:${adult}`)]);

// Rules for the adult form (order = priority)
export const PURRLOOP_LOVE_PER_DAY = 8; // counted pettings per day → purrloop
export const GEMPEROR_CARE = 0.85; // well cared for this part of the time → gemperor, otherwise angloop
export const FLARELET_PLAYS_PER_DAY = 2.5; // the ember line: played with this often → flarelet, otherwise lanternling
export const GLIMMEROCK_LOVE_PER_DAY = 5; // the stone line: petting polishes it → glimmerock, otherwise bouldergrin
export const ROAMTAIL_TRIPS_PER_DAY = 1; // the fox line: a trip a day makes a wanderer → roamtail, otherwise filchfox
// The cloud line is decided by the weather when it grows up: in the rain → rumblefluff, otherwise prismist
export const HINT_AFTER = 1440; // minutes in the diary before the child's lure shows where it is heading

// Character: factors on decay (awake) and on rewards. Small on purpose.
export const DECAY_FACTORS: Record<string, Record<string, number>> = {
  baby: { satiety: 1.3, energy: 1.2 }, // babies eat and sleep more
  flicker: { mood: 1.3 }, // wants to play all the time
  cyclopuff: { satiety: 1.15, energy: 0.9 }, // easy-going, loves food
  grumpcap: { satiety: 0.7, mood: 1.3 }, // needs little food, but lots of attention
  lumoth: { hygiene: 0.8 },
  angloop: { satiety: 1.15 }, // a big mouth, always hungry
  purrloop: { hygiene: 0.8 }, // a cat keeps itself clean
  lanternling: { mood: 0.8 }, // snug behind its glass
  flarelet: { satiety: 1.25, energy: 0.85 }, // burns through its food and hardly tires
  glimmerock: { hygiene: 0.7 }, // polished: dirt doesn't stick
  bouldergrin: { satiety: 1.2, mood: 0.8 }, // a heavy eater, and nothing wipes the grin off its face
  roamtail: { energy: 0.85 }, // used to long roads: it hardly tires
  filchfox: { satiety: 1.15 }, // always after something to eat
  rumblefluff: { mood: 0.85 }, // grumpy anyway: a bad day hardly makes it worse
  prismist: { hygiene: 0.8 }, // light as air: dirt doesn't weigh it down
};
export const BONUS_FACTORS: Record<string, Record<string, number>> = {
  flicker: { play: 1.25 },
  grumpcap: { pet: 2.0 },
  lumoth: { heart: 1.5 },
  purrloop: { heart: 1.5 }, // loves being loved
  sneezle: { sick: 0.5 }, // gets sick less often
  gemperor: { sick: 0.5 }, // strong: gets sick less often
  lanternling: { sick: 0.6 },
  glimmerock: { pet: 1.5 }, // loves being polished
  filchfox: { play: 1.25 }, // up for any mischief
  prismist: { pet: 1.25 }, // fluffy, and it knows how nice that is
};

export function newDiary(): Record<string, number> {
  return { minutes: 0, good_minutes: 0, meals: 0, snacks: 0, plays: 0, love: 0, trips: 0 };
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

/**
 * The adult form the care diary and, for the cloud line, the weather lead to. `raining`: whether
 * it rains where the pet lives right now.
 */
export function decideSpecies(diary: Record<string, number>, line = "blob", raining = false): string {
  const minutes = diary.minutes ?? 0;
  const days = Math.max(1.0, minutes / 1440);
  if (line === "ember") {
    return (diary.plays ?? 0) / days >= FLARELET_PLAYS_PER_DAY ? "flarelet" : "lanternling";
  }
  if (line === "stone") {
    return (diary.love ?? 0) / days >= GLIMMEROCK_LOVE_PER_DAY ? "glimmerock" : "bouldergrin";
  }
  if (line === "fox") {
    return (diary.trips ?? 0) / days >= ROAMTAIL_TRIPS_PER_DAY ? "roamtail" : "filchfox";
  }
  if (line === "cloud") {
    return raining ? "rumblefluff" : "prismist";
  }
  const care = minutes ? (diary.good_minutes ?? 0) / minutes : 1.0;
  if ((diary.love ?? 0) / days >= PURRLOOP_LOVE_PER_DAY) {
    return "purrloop";
  }
  return care >= GEMPEROR_CARE ? "gemperor" : "angloop";
}

// The slime's first adult forms and what a pet of that form turns into when a save from before
// FORM_RULES 2 is loaded: the slime line was redrawn with fewer forms that look more like the
// slime. Only those saves: the old forms may come back as lines of their own.
export const FORM_RULES = 2;
export const REFORMED: Record<string, string> = {
  sneezle: "gemperor", lumoth: "purrloop", cyclopuff: "angloop", grumpcap: "angloop", flicker: "angloop",
};

/**
 * The adult form a child is heading for right now (null in its first day and at other stages).
 * `raining`: whether it rains right now (the cloud line).
 */
export function hint(state: PetState, raining = false): string | null {
  if (state.stage !== "child" || (state.diary.minutes ?? 0) < HINT_AFTER) {
    return null;
  }
  return decideSpecies(state.diary, lineOf(state.species), raining);
}

/**
 * Next stage. Returns the old form as "stage:species" (for the animation). `raining`: whether it
 * rains right now (the cloud line).
 */
export function evolve(state: PetState, now: number, raining = false): string {
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
    state.species = decideSpecies(state.diary, lineOf(state.species), raining);
  }
  state.stage = next;
  state.stage_since = now;
  state.egg_warmth = 0.0;
  return old;
}
