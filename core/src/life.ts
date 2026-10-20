/**
 * Life cycle: egg → baby → child → adult.
 *
 * Every stage lasts a fixed time, less what warmth takes off it (petting the egg, and the ember
 * stone of home.ts); after that the evolution is "due". It is triggered by hand in the app ("Hatch" / "Evolve"), so that you are watching and get to see the animation. If nobody
 * does that for a day, the pet evolves by itself (but only while awake and not at bedtime).
 *
 * Which adult form it becomes is decided by the care diary of the child stage (decideSpecies), and
 * for the cloud and the stone line by the world the moment it grows up (rain, night).
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
  blob: ["angloop", "gemperor", "purrloop"],
  ember: ["lanternling", "flarelet"],
  stone: ["glimmerock", "bouldergrin"],
  fox: ["roamtail", "filchfox"],
  cloud: ["prismist", "rumblefluff"],
  leaf: ["twiggle", "needlenub"],
  duck: ["quill", "drakwing"],
  hippo: ["lillypot", "steamo"],
  beak: ["parcelbeak", "rapierre"],
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
// The slime's first adult forms: the slime line was redrawn and they grow out of no egg any more,
// but they still live in the wild (wild.WILD). They may come back as lines of their own.
export const WILD_ONLY: readonly string[] = ["sneezle", "lumoth", "cyclopuff", "grumpcap", "flicker"];
export const SPECIES = [...Object.entries(LINES).flatMap(([line, adults]) => [line, ...adults]), ...WILD_ONLY];
// Every form there is, as "stage:species", in the album's order: per line its egg, baby, child
// and adult forms
export const FORMS = Object.entries(LINES).flatMap(([line, adults]) => [
  ...STAGES.slice(0, -1).map((stage) => `${stage}:${line}`), ...adults.map((adult) => `adult:${adult}`)]);

// Rules for the adult form (order = priority)
export const PURRLOOP_LOVE_PER_DAY = 8; // counted pettings per day → purrloop
export const GEMPEROR_CARE = 0.85; // well cared for this part of the time → gemperor, otherwise angloop
export const FLARELET_PLAYS_PER_DAY = 2.5; // the ember line: played with this often → flarelet, otherwise lanternling
export const ROAMTAIL_TRIPS_PER_DAY = 1; // the fox line: a trip a day makes a wanderer → roamtail, otherwise filchfox
// The cloud line is decided by the weather when it grows up: in the rain → rumblefluff, otherwise prismist
export const NEEDLENUB_LOVE_PER_DAY = 5; // the leaf line: a cactus that gets cuddled → needlenub, otherwise twiggle
export const DRAKWING_BATTLES_PER_DAY = 2; // the duck line: scuffles a day, won or not → drakwing, otherwise quill
export const STEAMO_BATHS_PER_DAY = 2; // the hippo line: bathed this often → steamo, otherwise lillypot
export const RAPIERRE_TRICKS_PER_DAY = 2; // the beak line: tricks practiced → rapierre, otherwise parcelbeak
export const MISSING_AFTER = 30; // days with pets before a line whose egg never came gets the quiet safety net (Pet.longMissing)
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
  twiggle: { energy: 0.85 }, // an old tree is patient
  drakwing: { satiety: 1.15 }, // a fire needs feeding
  steamo: { hygiene: 0.7 }, // always fresh from the sauna
  lillypot: { energy: 0.85 }, // half asleep in the pond anyway
  rapierre: { energy: 1.2, satiety: 1.15 }, // a hummingbird burns through everything
  parcelbeak: { mood: 0.85 }, // a letter for everyone: it is always in a good mood
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
  needlenub: { pet: 1.5 }, // a cactus that wants to be petted: nothing makes it happier
  quill: { play: 1.25 }, // an old sailor loves a good game
  steamo: { sick: 0.5 }, // the sauna keeps it healthy
};

/**
 * The care diary of a child. Besides these, it counts what a rule for an adult form may look at
 * one day (record): each food from the bag (`food_<name>`), fruits it picked off the plant itself
 * (`plant_fruits`), trips to each area (`trips_<area>`) and trips with rain on the way
 * (`rain_trips`), scuffles in which it was never knocked over (`clean_battles`), guardians it got
 * past for the first time (`guardians`), guessing games played and won (`games`, `games_won`),
 * evenings it was tucked in by hand (`tucked`) and minutes with its health below WEAK_HEALTH
 * (`weak_minutes`).
 */
export function newDiary(): Record<string, number> {
  return { minutes: 0, good_minutes: 0, meals: 0, snacks: 0, plays: 0, love: 0, trips: 0, battles: 0, baths: 0, tricks: 0 };
}
export const WEAK_HEALTH = 80;

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
    if (state.stats.health < WEAK_HEALTH) {
      record(state, "weak_minutes");
    }
  }
}

export function record(state: PetState, kind: string, amount = 1): void {
  if (state.stage === "child") {
    state.diary[kind] = (state.diary[kind] ?? 0) + amount;
  }
}

/**
 * The world where the pet lives at the moment it grows up: some lines go by it instead of the care
 * diary (the cloud by the rain, the stone by the night). Everything in it is real: the weather,
 * the clock, the sun and the moon where the pet lives.
 */
export interface World {
  /** It rains (or storms) right now. */
  raining?: boolean;
  /** It snows right now. */
  snowing?: boolean;
  /** A thunderstorm right now. */
  storm?: boolean;
  /** The temperature in °C, or null without weather data. */
  temp?: number | null;
  /** The sun is down. */
  dark?: boolean;
  /** The time of day, in minutes after midnight (local time). */
  minute?: number;
  /** Sunrise and sunset today, in minutes after midnight (local time). */
  sunrise?: number;
  sunset?: number;
  /** The moon is full (sun.isFullMoon). */
  fullMoon?: boolean;
}

/** How many days the child stage of this pet lasts: less what the ember stone took off it. */
export function childDays(state: PetState): number {
  return Math.max(1.0, (STAGE_SECONDS.child! - state.egg_warmth) / 86400);
}

/**
 * The adult form the care diary and, for the cloud and the stone line, the world lead to.
 *
 * A rule "so often per day" is a total for the whole child stage (`stageDays`): a day away is made
 * up on the others, and while the evolution waits for a tap the goal doesn't grow any more. Until
 * then the rule asks for the share of the days so far, so that the hint shows whether the child is
 * on its way.
 */
export function decideSpecies(diary: Record<string, number>, line = "blob", world: World = {},
    stageDays = STAGE_SECONDS.child! / 86400): string {
  const minutes = diary.minutes ?? 0;
  const days = Math.min(Math.max(1.0, minutes / 1440), stageDays);
  const enough = (kind: string, perDay: number) => (diary[kind] ?? 0) >= perDay * days;
  if (line === "ember") {
    return enough("plays", FLARELET_PLAYS_PER_DAY) ? "flarelet" : "lanternling";
  }
  if (line === "stone") {
    return world.dark ? "glimmerock" : "bouldergrin"; // its crystals light up at night
  }
  if (line === "fox") {
    return enough("trips", ROAMTAIL_TRIPS_PER_DAY) ? "roamtail" : "filchfox";
  }
  if (line === "cloud") {
    return world.raining ? "rumblefluff" : "prismist";
  }
  if (line === "leaf") {
    return enough("love", NEEDLENUB_LOVE_PER_DAY) ? "needlenub" : "twiggle";
  }
  if (line === "duck") {
    return enough("battles", DRAKWING_BATTLES_PER_DAY) ? "drakwing" : "quill";
  }
  if (line === "hippo") {
    return enough("baths", STEAMO_BATHS_PER_DAY) ? "steamo" : "lillypot";
  }
  if (line === "beak") {
    return enough("tricks", RAPIERRE_TRICKS_PER_DAY) ? "rapierre" : "parcelbeak";
  }
  const care = minutes ? (diary.good_minutes ?? 0) / minutes : 1.0;
  if (enough("love", PURRLOOP_LOVE_PER_DAY)) {
    return "purrloop";
  }
  return care >= GEMPEROR_CARE ? "gemperor" : "angloop";
}

/**
 * The adult form a child is heading for right now (null in its first day and at other stages).
 * `world`: the weather and the time of day right now (the cloud and the stone line).
 */
export function hint(state: PetState, world: World = {}): string | null {
  if (state.stage !== "child" || (state.diary.minutes ?? 0) < HINT_AFTER) {
    return null;
  }
  return decideSpecies(state.diary, lineOf(state.species), world, childDays(state));
}

/**
 * Next stage. Returns the old form as "stage:species" (for the animation). `world`: the weather
 * and the time of day right now (the cloud and the stone line).
 */
export function evolve(state: PetState, now: number, world: World = {}): string {
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
    state.species = decideSpecies(state.diary, lineOf(state.species), world, childDays(state));
  }
  state.stage = next;
  state.stage_since = now;
  state.egg_warmth = 0.0;
  return old;
}
