/**
 * The state of a pet: everything that is saved.
 *
 * The object is saved as it is (pet.json on the Pi, the browser's storage in the app), which is
 * why its fields keep the names of the save file.
 */

import * as battle from "./battle";
import * as care from "./care";
import * as life from "./life";

export const STATS = ["satiety", "mood", "energy", "hygiene", "health"] as const;
export type Stat = (typeof STATS)[number];

/** Mini-game in progress (round, wins), or the result of the last one for the app. */
export interface Game {
  round?: number;
  wins?: number;
  result?: number;
  last: number;
}

/** An exercise waiting for its tap or answer (battle.start). */
export interface Training {
  kind: "speed" | "smarts";
  at: number;
  delay?: number;
  sequence?: string[];
}

/** What happened at the last station of a trip. */
export interface TripEvent {
  kind: "find" | "rest" | "tired" | "ball" | "battle" | "wild";
  at: number;
  item?: string | null;
  foe?: string;
  wild?: string;
  rounds?: unknown[][];
  outcome?: string;
}

/** A scuffle on a trip, kept to be watched again (trip.REPLAYS). */
export interface Replay {
  at: number;
  /** When the trip it happened on set off (Trip.start). */
  trip: number;
  area: string;
  foe: string;
  /** [move, trick, result] per round (battle.Round). */
  rounds: unknown[][];
  outcome: string;
  /** What the opponent left behind. */
  item: string | null;
  /** How the pet looked then, and the weather. */
  species: string;
  stage: string;
  hat: string;
  weather: number | null;
}

/**
 * One line of the travel diary: what happened at a station, without the rounds of a scuffle.
 * Besides the kinds of TripEvent: "snack" (it ate its snack after a lost scuffle) and "beaten"
 * (it had enough and turned back). A rest is not worth a line.
 */
export interface TravelStop {
  kind: TripEvent["kind"] | "snack" | "beaten";
  at: number;
  item?: string;
  foe?: string;
  wild?: string;
  outcome?: string;
}

/** A trip that is over, for the travel diary (trip.remember). */
export interface Travel {
  area: string;
  start: number;
  end: number;
  stops: TravelStop[];
}

/** A trip in progress (trip.plan). */
export interface Trip {
  area: string;
  start: number;
  end: number;
  stations: number[];
  next: number;
  found: string[];
  factor: number;
  last: TripEvent | null;
  hearts: number;
  pack: string[];
  guardian: string | null;
  /** What it ate before setting off and still has in it on the way (food.ts). */
  boosts?: string[];
  /** What has happened so far, for the travel diary (missing in trips saved before it). */
  log?: TravelStop[];
  /** It rained at one of the stations so far. */
  rained?: boolean;
}

/** An egg that is kept: its line, and what a pet has passed on to it (wild.ts). */
export interface Egg {
  line: string;
  from?: string;
  skills?: Record<string, number>;
}

/**
 * A wild pet it has made friends with; `until` is set while it is visiting. `visits` count
 * towards the next nest; `nests`: how many the two have built, `rest_until`: till when visits
 * don't count yet after the last one (wild.ts).
 */
export interface Friend {
  species: string;
  visits: number;
  next: number;
  until?: number;
  nests?: number;
  rest_until?: number;
}

export interface Plant {
  kind: string;
  grown: number;
  ripening: number;
  left: number;
}

/** Rain or snow the pet saw while it was on its own, for the story when somebody comes back. */
export interface WeatherSeen {
  at: number;
  kind: "rain" | "snow";
}

/** Something it left behind while nobody was there (idle.ts); `spot`: 0–1 along the free ground. */
export interface Trace {
  kind: string;
  spot: number;
  /** Which of its drawings (idle.DRAWINGS). */
  look: number;
}

export interface PetEvent {
  at: number;
  action: string;
  by: string;
  accepted: boolean;
  item?: string;
  reason?: string;
}

export interface PetState {
  /** Stays the same for the whole life of the pet, wherever it goes (Pet.select, the app's camera). */
  id: string;
  /**
   * How often it has moved between a phone and a display (Pet.handOver, Pet.moveIn on the Pi). The
   * display keeps the highest number of every pet that moved, and turns away an older copy.
   */
  moves: number;
  name: string;
  /** The adult form; until then the name of its line (life.LINES). */
  species: string;
  stage: life.Stage;
  stage_since: number;
  /** Seconds by which warmth brings the next stage forward: petting the egg, the ember stone. */
  egg_warmth: number;
  /** Care diary of the child stage. */
  diary: Record<string, number>;
  born_at: number;
  updated_at: number;
  stats: Record<Stat, number>;
  asleep: boolean;
  sleep_since: number;
  stay_awake_until: number;
  activity: string;
  activity_until: number;
  /** E.g. the food that is dropping in. */
  activity_item: string;
  poops: number;
  next_poop_at: number | null;
  sick: boolean;
  /** Action -> the times it was last done. */
  recent: Record<string, number[]>;
  last_pet: number;
  /** It woke up in the cold and shivers until then (home.ts). */
  cold_until: number;
  /** A hot afternoon: it sweats until then; and the local day this last happened (home.ts). */
  hot_until: number;
  hot_day: number;
  counters: Record<string, number>;
  weight: number;
  bond: number;
  game: Game | null;
  /** Trick -> practice in points (care.TRICKS). */
  tricks: Record<string, number>;
  /** Battle stats, 0–100 (battle.SKILLS). */
  skills: Record<string, number>;
  training: Training | null;
  trip: Trip | null;
  /** Areas whose guardian it has got past (trip.AREAS). */
  guardians: string[];
  /** Areas whose guardian has left it its egg (trip.GUARDIAN_EGGS). */
  guardian_eggs: string[];
  /** The trips it has been on, the latest last, at most trip.MAX_TRAVELS. */
  travels: Travel[];
  /** Brought home but not unpacked yet. */
  backpack: string[];
  /** Find -> count (home.ITEMS), except for eggs; shared by all pets at home (Pet keeps one store). */
  items: Record<string, number>;
  /** The eggs that are kept, shared like the finds. */
  eggs: Egg[];
  /** The wild pets it has made friends with, the first first. */
  friends: Friend[];
  /** The egg the two have laid, until it is collected. */
  nest: Egg | null;
  /** What a friend has left behind (wild.giftFrom), until it is unwrapped. */
  gift: string | null;
  /** What it found at home by itself (idle.ts), until somebody picks it up. */
  found: string | null;
  /** What found food has left in it, until it is used up (food.BOOSTS). */
  boosts: string[];
  hat: string;
  /** Decorations set out, the oldest first, at most home.decoSpots (home.placeDeco says where they stand). */
  deco: string[];
  /** How far its house has grown (home.HOUSE_STEPS), 0 = none yet; it stays with the place when a new pet moves in. */
  house: number;
  /** Until when somebody is looking into the house (the scene shows the inside). */
  look_in_until: number;
  plant: Plant | null;
  events: PetEvent[];
  /** The latest scuffles, oldest first. */
  replays: Replay[];
  /** When somebody last did something with it (idle.welcome); 0 = not known yet. */
  seen_at: number;
  /** When it next gets busy by itself (idle.step); 0 = not planned yet. */
  idle_next: number;
  /** Trick -> points practiced alone since it was last practiced together (idle.SOLO_LIMIT). */
  solo: Record<string, number>;
  /** Rain and snow since somebody was last there, at most one of each per part of the day (idle.noteWeather). */
  weather_seen: WeatherSeen[];
  /** What it left behind while nobody was there, until somebody does something with it (idle.ts). */
  trace: Trace | null;
  /** When somebody fed it or played with it, over the last few days (habits.ts). */
  habits: number[];
  /** Since when it has been staying at Grandma's, because nobody was there (model.GRANDMA_AFTER); 0 = at home. */
  grandma: number;
}

/** A state with every field at its starting value. */
export function newState(): PetState {
  return {
    id: "",
    moves: 0,
    name: "",
    species: "blob",
    stage: "egg",
    stage_since: 0.0,
    egg_warmth: 0.0,
    diary: life.newDiary(),
    born_at: 0.0,
    updated_at: 0.0,
    stats: { satiety: 80.0, mood: 80.0, energy: 80.0, hygiene: 80.0, health: 100.0 },
    asleep: false,
    sleep_since: 0.0,
    stay_awake_until: 0.0,
    activity: "idle",
    activity_until: 0.0,
    activity_item: "",
    poops: 0,
    next_poop_at: null,
    sick: false,
    recent: {},
    last_pet: 0.0,
    cold_until: 0.0,
    hot_until: 0.0,
    hot_day: 0,
    counters: {},
    weight: care.IDEAL_WEIGHT.baby,
    bond: 20.0,
    game: null,
    tricks: {},
    skills: battle.newSkills(),
    training: null,
    trip: null,
    guardians: [],
    guardian_eggs: [],
    travels: [],
    backpack: [],
    items: {},
    eggs: [],
    friends: [],
    nest: null,
    gift: null,
    found: null,
    boosts: [],
    hat: "",
    deco: [],
    house: 0,
    look_in_until: 0.0,
    plant: null,
    events: [],
    replays: [],
    seen_at: 0.0,
    idle_next: 0.0,
    solo: {},
    weather_seen: [],
    trace: null,
    habits: [],
    grandma: 0.0,
  };
}

/** A copy of the state that shares nothing with it, as it is saved. */
export function toDict(state: PetState): PetState {
  return structuredClone(state);
}

/** The state from a save file. Fields the file doesn't have yet start at their usual value. */
export function fromDict(data: Record<string, unknown>): PetState {
  const state = newState();
  const fields = state as unknown as Record<string, unknown>;
  for (const key of Object.keys(fields)) {
    if (key in data) {
      fields[key] = data[key];
    }
  }
  if (!("house" in data) && state.guardians.includes("mountain")) {
    state.house = 1; // saved before there was a house, by a pet that has already earned the hut
  }
  if (!("friends" in data) && data.friend) {
    state.friends = [data.friend as Friend]; // saved when a pet had at most one friend
  }
  if (!("guardian_eggs" in data)) {
    // saved before guardians kept track of their eggs: back then only the cave's guardian had one
    state.guardian_eggs = state.guardians.filter((area) => area === "cave");
  }
  const stats = (state.stats ?? {}) as Record<string, unknown>;
  state.stats = Object.fromEntries(STATS.map((k) => [k, Number(stats[k] ?? 50.0)])) as Record<Stat, number>;
  const skills = state.skills ?? {};
  state.skills = Object.fromEntries(battle.SKILLS.map((k) => [k, Number(skills[k] ?? 0.0)]));
  return state;
}
