/**
 * Game logic of the pet: stats, decay, actions, sleep (life cycle: life.ts).
 *
 * Pure logic that knows nothing about files, networks or the panel. Time is always passed in
 * (Unix seconds), never read here. The simulation runs in fixed one-minute steps, and each step
 * seeds its randomness from its own timestamp. That way, catching up after a break gives exactly
 * the same result as running non-stop.
 */

import * as battle from "./battle";
import * as care from "./care";
import * as food from "./food";
import * as habits from "./habits";
import * as home from "./home";
import * as idle from "./idle";
import * as life from "./life";
import { Random } from "./random";
import * as sky from "./sky";
import { STATS, newState, type PetState, type Trip } from "./state";
import { isDark, type Location } from "./sun";
import * as trip from "./trip";
import * as wild from "./wild";

export const TICK = 60;
export const MAX_CATCH_UP = 24 * 3600; // off for longer → the pet was "at Grandma's"
export const CRITICAL = 25;

// Change per hour: [awake, asleep]
export const RATES = {
  satiety: [-5.0, -2.0],
  mood: [-2.0, -0.5],
  energy: [-2.5, 12.0], // a day alone leaves it rested enough for the evening
  hygiene: [-2.0, -1.0],
} as const;
const NEEDS = ["satiety", "energy", "hygiene", "mood"] as const;
export const TIRED_BEFORE_BED = 60; // it gets tired this many minutes before bedtime
export const STAY_AWAKE_AFTER_WAKE = 30 * 60; // woken at night: it stays awake this long
export const POOP_DELAY = [60 * 60, 120 * 60] as const;
export const MAX_POOPS = 3;
export const PET_COOLDOWN = 120;
export const HEART_EVERY = 5; // every fifth counted petting, a heart falls from the sky
export const HEART_MOOD = 10;
export const REPEAT_WINDOW = 2 * 3600;
export const REPEAT_FACTORS = [1.0, 0.6, 0.3, 0.15]; // the same action several times in a row is worth less
// After a trick or an exercise the pet needs a break, longer each time within REPEAT_WINDOW (seconds)
export const REST_SECONDS = [60, 180, 600, 1200];
const TRAIN_KEYS = battle.SKILLS.map((skill) => `train_${skill}`);
export const EVENT_LIMIT = 100;

export const ACTIONS = ["feed", "play", "sleep", "wake", "clean", "pet", "medicine", "evolve", "game", "trick",
  "trip", "plant", "wear", "deco", "unpack", "train", "collect", "unwrap", "pickup", "look_in"];
export const FOODS = ["meal", ...food.EDIBLE];
export const GAME_MOVES = ["start", "left", "right"];
export const TRIP_MOVES = [...trip.AREAS, "recall"];
export const TRAIN_MOVES = [...battle.SKILLS, "tap", "answer"]; // an exercise, or the answer to one that is waiting
export const THROW_ACTIONS = ["feed", "play", "medicine", "trip", "plant"];
export const THROW_SECONDS = 2.4; // a thrown item drops in and the pet hops over – only then does it start
export const LOOK_IN_SECONDS = 8; // a tap on the house shows the inside this long

// How long an action shows in the scene (seconds)
export const ACTIVITY_SECONDS: Record<string, number> = {
  eat: 6, snack: 4, play: 8, fall_asleep: 3, wake_up: 3, clean: 4, go_in: 9, come_out: 8,
  happy: 3, no: 2.5, medicine: 4, turn_over: 2, catch_heart: 7,
  egg_wobble: 2, hatch: 6, evolve: 8, game_wait: care.GAME_TIMEOUT, game_turn: 2.5,
  trick: 4, build: 10, throw_meal: THROW_SECONDS + 6, throw_snack: THROW_SECONDS + 4,
  trip_start: 4, trip_home: 4, unpack: 6, plant: 3, pick: 4, collect: 4, unwrap: 4,
  discover: 4, pickup: 4,
  train_strength: 5, train_speed: 3, train_smarts: 3,
  // waiting for the signal, and showing the sequence: as long as the longest one can take
  train_ready: battle.SIGNAL_DELAY[1] + battle.SIGNAL_WINDOW,
  train_show: battle.SEQUENCE[1] * battle.SHOW_STEP + 10,
};
for (const name of ["play", "medicine"]) {
  ACTIVITY_SECONDS[`throw_${name}`] = THROW_SECONDS + ACTIVITY_SECONDS[name];
}

/** When the pet sleeps: [start, end] as "HH:MM". */
export type Bedtime = readonly [string, string];

/** An invalid request. The message is a key from the "error" texts of the locale files. */
export class RequestError extends Error {
  constructor(key: string) {
    super(key);
    this.name = "RequestError";
  }
}

/** A new egg. `species`: the line that hatches from it (life.LINES). */
export function newPet(now: number, name = "", species = "blob"): PetState {
  return { ...newState(), name, species, born_at: now, updated_at: now, stage_since: now };
}

/**
 * The egg that comes after a pet. `egg`: which of the eggs that are kept to brood (its place in
 * old.eggs), or null to start over with a usual egg. What is at home stays: the finds (including
 * what hasn't been unpacked yet), the other eggs, the decorations that are set out and the plant.
 * The new pet starts from zero, apart from the battle stats its egg has been given.
 * Throws a RequestError if there is no such egg.
 */
export function nextPet(old: PetState, now: number, name = "", egg: unknown = null): PetState {
  const kept = newState();
  kept.items = { ...old.items };
  kept.eggs = [...old.eggs];
  for (const found of [...old.backpack, ...(old.trip ? old.trip.found : [])]) {
    home.addItem(kept, found);
  }
  if (old.nest) {
    kept.eggs.push(old.nest);
  }
  if (old.stage === "egg" && (old.species !== "blob" || Object.values(old.skills).some(Boolean))) {
    // an egg that hasn't hatched goes back (a usual one isn't worth keeping)
    kept.eggs.push({ line: old.species, skills: { ...old.skills } });
  }
  let chosen;
  if (egg === null || egg === undefined) {
    chosen = { line: "blob" };
  } else if (typeof egg !== "number" || !Number.isInteger(egg) || egg < 0 || egg >= old.eggs.length) {
    throw new RequestError("no_egg");
  } else {
    chosen = kept.eggs.splice(egg, 1)[0];
  }
  const state = newPet(now, name, chosen.line);
  Object.assign(state.skills, chosen.skills ?? {});
  state.items = kept.items;
  state.eggs = kept.eggs;
  state.deco = [...old.deco];
  state.house = old.house;
  state.plant = old.plant;
  state.gift = old.gift; // a friend's gift still lies there
  state.found = old.found; // and so does what the pet found at home
  return state;
}

/**
 * What belongs to the home, not to a pet, goes from `from` to `to`: the finds, the eggs, the
 * decorations, the house, the plant, a gift, what it found at home, the nest and what lies
 * around. What is still in the backpack is unpacked into the finds. Used when the pet at the back
 * comes to the front (companion.ts).
 */
export function moveHome(from: PetState, to: PetState): void {
  to.items = from.items;
  to.eggs = from.eggs;
  for (const found of [...from.backpack, ...(from.trip ? from.trip.found : [])]) {
    home.addItem(to, found);
  }
  Object.assign(to, {
    deco: from.deco, house: from.house, plant: from.plant, gift: from.gift, found: from.found, nest: from.nest,
    trace: from.trace,
  });
  clearHome(from);
}

/** A pet without a home of its own: it lives at the back, and the home is the front pet's. Its hat stays among the finds. */
export function clearHome(state: PetState): void {
  Object.assign(state, {
    items: {}, eggs: [], backpack: [], deco: [], house: 0, plant: null, gift: null, found: null, nest: null, trace: null,
    trip: null, hat: "",
  });
}

// ---------- Time of day ----------

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/** Minutes after midnight at the time t, in local time. */
function minuteOfDay(t: number): number {
  const date = new Date(t * 1000);
  return date.getHours() * 60 + date.getMinutes();
}

/** Is the time t (Unix) inside the window start–end ("HH:MM", may span midnight)? */
export function inWindow(t: number, start: string, end: string): boolean {
  const now = minuteOfDay(t);
  const s = minutes(start);
  const e = minutes(end);
  if (s === e) {
    return false;
  }
  return s < e ? s <= now && now < e : now >= s || now < e;
}

export function isBedtime(t: number, bedtime: Bedtime): boolean {
  return inWindow(t, bedtime[0], bedtime[1]);
}

export function minutesUntilBed(t: number, bedtime: Bedtime): number {
  return (((minutes(bedtime[0]) - minuteOfDay(t)) % 1440) + 1440) % 1440;
}

/**
 * Is the time t in the evening half of bedtime? The second half is already the morning: a pet
 * that is awake then (woken by its owner) has the whole day ahead of it.
 */
export function isLateEvening(t: number, bedtime: Bedtime): boolean {
  const length = (((minutes(bedtime[1]) - minutes(bedtime[0])) % 1440) + 1440) % 1440;
  return isBedtime(t, bedtime) && (1440 - minutesUntilBed(t, bedtime)) % 1440 < length / 2;
}

// ---------- Simulation ----------

export function clamp(state: PetState): void {
  for (const k of STATS) {
    state.stats[k] = Number(Math.min(100.0, Math.max(0.0, state.stats[k])).toFixed(3));
  }
}

export function criticalCount(state: PetState): number {
  return NEEDS.filter((k) => state.stats[k] < CRITICAL).length;
}

export function fallAsleep(state: PetState, t: number): void {
  state.asleep = true;
  state.sleep_since = t;
  state.game = state.training = null; // falling asleep ends the game and the training
  if (state.house) {
    setActivity(state, "go_in", t); // it goes into its house to sleep
  }
}

/** `temp`: the temperature in °C, or null: in the cold it wakes up shivering. */
export function wakeUp(state: PetState, t: number, temp: number | null = null): void {
  state.asleep = false;
  home.wakeInCold(state, temp, t);
  if (state.house) {
    setActivity(state, "come_out", t);
  }
}

/**
 * One minute of simulation, ending at time t. `weather`: WMO code from Open-Meteo, or null;
 * `temp`: the temperature in °C, or null; `location`: where the sun rises and sets.
 */
export function tick(state: PetState, t: number, bedtime: Bedtime, weather: sky.WeatherCode = null,
    temp: number | null = null, location: Location = null): void {
  const rng = new Random(Math.trunc(t));
  const s = state.stats;
  const h = TICK / 3600;
  const asleep = state.asleep;

  if (state.stage !== "adult") {
    state.egg_warmth += home.growthBonus(state, TICK);
  }
  if (state.stage === "egg") {
    // Nothing happens inside the egg, except that it eventually hatches by itself
    if (t >= life.dueAt(state)! + life.AUTO_EVOLVE_AFTER) {
      evolve(state, t, "system");
    }
    return;
  }

  for (const key of Object.keys(RATES) as (keyof typeof RATES)[]) {
    let rate: number = RATES[key][asleep ? 1 : 0];
    if (rate < 0) {
      rate *= life.decayFactor(state, key);
      if (key === "energy") {
        rate *= care.energyFactor(state);
      }
      if (key === "mood") {
        rate *= care.moodFactor(state);
      }
    }
    s[key] += rate * h;
  }
  care.driftWeight(state, TICK / 60, s.satiety < CRITICAL);
  state.bond = Math.max(0.0, state.bond - care.BOND_DECAY_PER_DAY / 1440);
  home.grow(state, TICK / 60, sky.precipitation(weather) === "rain");
  idle.noteWeather(state, t, sky.precipitation(weather));
  idle.melt(state, temp);
  if (state.trip) {
    const [events, done] = trip.step(state, t, weather, location);
    for (const [action, item] of events) {
      logEvent(state, t, action, "system", { item });
    }
    if (done) {
      comeHome(state, t, done);
    }
  }
  if (state.friend) {
    for (const [action, item] of wild.step(state, t, !asleep && !state.trip)) {
      logEvent(state, t, action, "system", { item });
    }
  }

  if (!asleep && minutesUntilBed(t, bedtime) <= TIRED_BEFORE_BED) {
    s.energy += RATES.energy[0] * h; // twice as tired in the evening
  }
  s.mood -= 2 * h * criticalCount(state);
  s.hygiene -= 3 * h * state.poops;

  const critical = criticalCount(state);
  if (critical >= 2 || state.sick) {
    s.health -= 2 * h;
  } else if (NEEDS.every((k) => s[k] > 50)) {
    s.health += 1 * h;
  }
  if (state.sick) {
    s.mood -= 1 * h;
  }

  if (!state.sick && state.stage !== "baby" && s.health < 30
      && rng.random() < life.bonusFactor(state, "sick") * care.sickFactor(state) / 360) {
    state.sick = true;
  }
  if (state.next_poop_at !== null && t >= state.next_poop_at) {
    if (!state.trip) { // on a trip it stays in the bushes
      state.poops = Math.min(MAX_POOPS, state.poops + 1);
    }
    state.next_poop_at = null;
  }
  if (!asleep && rng.random() < 1 / 360) {
    s.mood -= 5; // boredom
  }

  const bed = isBedtime(t, bedtime);
  if (state.trip) {
    // it only sleeps once it is home
  } else if (!asleep) {
    if (s.energy < 10 || (bed && t >= state.stay_awake_until)) {
      fallAsleep(state, t);
    }
  } else {
    const napping = !isBedtime(state.sleep_since, bedtime);
    if (!bed && (s.energy >= 95 || (napping && s.energy >= 60 && t - state.sleep_since >= 30 * 60))) {
      wakeUp(state, t, temp);
    }
  }
  if (!state.asleep && !state.trip && t >= state.activity_until && home.wantsFruit(state)) {
    // ripe fruit: it helps itself
    const kind = home.eatFruit(state);
    count(state, "fruits");
    setActivity(state, "pick", t, kind);
    logEvent(state, t, "fruit", "system", { item: kind });
  }
  if (!state.asleep && !state.trip) {
    // left to itself, it finds something to do
    const busy = t < state.activity_until || wild.visiting(state, t);
    const pastime = idle.step(state, t, busy, weather);
    if (pastime) {
      const [activity, shown, action, item] = pastime;
      setActivity(state, activity, t, shown);
      logEvent(state, t, action, "system", { item });
    }
  }
  clamp(state);

  life.recordMinute(state, !state.sick && s.satiety >= CRITICAL && s.hygiene >= CRITICAL && s.mood >= CRITICAL);
  const due = life.dueAt(state);
  if (due !== null && t >= due + life.AUTO_EVOLVE_AFTER && !state.asleep && !state.trip && !isBedtime(t, bedtime)) {
    evolve(state, t, "system", weather, location);
  }
}

/** Catch the simulation up to `now`. Returns true if anything changed. */
export function advance(state: PetState, now: number, bedtime: Bedtime, weather: sky.WeatherCode = null,
    temp: number | null = null, location: Location = null): boolean {
  if (now < state.updated_at) {
    // The clock jumped back: don't calculate backwards
    state.updated_at = now;
    return true;
  }
  if (now - state.updated_at > MAX_CATCH_UP) {
    const days = Math.max(1, Math.round((now - state.updated_at) / 86400));
    for (const k of STATS) {
      state.stats[k] = Math.max(state.stats[k], 50.0);
    }
    state.poops = 0;
    state.next_poop_at = null;
    state.sick = false;
    state.asleep = false;
    state.trip = null;
    state.updated_at = now;
    // item: about how many days it was off, for Grandma's postcard
    logEvent(state, now, "away", "system", { item: String(days) });
    return true;
  }
  let changed = false;
  while (state.updated_at + TICK <= now) {
    state.updated_at += TICK;
    tick(state, state.updated_at, bedtime, weather, temp, location);
    changed = true;
  }
  return changed;
}

// ---------- Derived values ----------

/** Mood derived from the stats (the first match wins). */
export function moodOf(state: PetState): string {
  const s = state.stats;
  if (state.stage === "egg") {
    return "normal";
  }
  if (state.sick) {
    return "sick";
  }
  if (s.satiety < CRITICAL) {
    return "hungry";
  }
  if (s.energy < CRITICAL) {
    return "tired";
  }
  if (s.hygiene < CRITICAL) {
    return "dirty";
  }
  if (s.mood < 30) {
    return "sad";
  }
  if (s.mood > 75 && criticalCount(state) === 0) {
    return "happy";
  }
  return "normal";
}

export function activityOf(state: PetState, now: number): string {
  return now < state.activity_until ? state.activity : "idle";
}

/** Stats that need looking after (for the icons and the app). */
export function needs(state: PetState): string[] {
  if (state.stage === "egg") {
    return [];
  }
  const result: string[] = NEEDS.filter((k) => state.stats[k] < CRITICAL);
  if (state.poops && !result.includes("hygiene")) {
    result.push("hygiene");
  }
  if (state.sick) {
    result.push("health");
  }
  return result;
}

/** Which buttons the app should offer right now (an action can still be refused). */
export function availableActions(state: PetState, now: number): Record<string, boolean> {
  const asleep = state.asleep;
  const away = !!state.trip;
  const ready = life.isDue(state, now) && !asleep && !away;
  const nothing = Object.fromEntries([...ACTIONS, "recall"].map((action) => [action, false]));
  if (state.stage === "egg") {
    return { ...nothing, pet: true, evolve: ready };
  }
  if (away) { // on a trip it can only be called home – and things at home can be arranged
    return { ...nothing, recall: true, plant: true, wear: true, deco: true, look_in: state.house > 0 };
  }
  const packed = state.backpack.length > 0;
  return {
    ...nothing,
    evolve: ready,
    game: !asleep && state.stats.energy >= care.GAME_ENERGY,
    trick: !asleep && state.stats.energy >= care.TRICK_ENERGY,
    train: !asleep && state.stats.energy >= battle.TRAIN_ENERGY,
    feed: !asleep,
    play: !asleep,
    sleep: !asleep,
    wake: asleep,
    clean: state.poops > 0 || state.stats.hygiene < 90,
    pet: true,
    medicine: state.sick,
    trip: !asleep && state.stage !== "baby" && !packed,
    unpack: packed && !asleep,
    collect: !!state.nest && !asleep,
    unwrap: !!state.gift && !asleep,
    pickup: !!state.found && !asleep,
    plant: true,
    wear: true,
    deco: true,
    look_in: state.house > 0 && !asleep,
  };
}

// ---------- Actions ----------

export function logEvent(state: PetState, now: number, action: string, by: string,
    details: { item?: string | null; accepted?: boolean; reason?: string | null } = {}): void {
  const event: PetState["events"][number] = { at: Math.round(now), action, by, accepted: details.accepted ?? true };
  if (details.item) {
    event.item = details.item;
  }
  if (details.reason) {
    event.reason = details.reason;
  }
  state.events.push(event);
  state.events.splice(0, Math.max(0, state.events.length - EVENT_LIMIT));
}

function repeatFactor(state: PetState, key: string, now: number): number {
  const times = (state.recent[key] ?? []).filter((t) => now - t < REPEAT_WINDOW);
  state.recent[key] = [...times, now];
  return REPEAT_FACTORS[Math.min(times.length, REPEAT_FACTORS.length - 1)];
}

/** Seconds until the pet is up for another trick or exercise (keys: where `recent` keeps them); 0 = now. */
export function restLeft(state: PetState, keys: string[], now: number): number {
  const times = keys.flatMap((key) => state.recent[key] ?? []).filter((t) => now - t < REPEAT_WINDOW);
  if (!times.length) {
    return 0;
  }
  const rest = REST_SECONDS[Math.min(times.length, REST_SECONDS.length) - 1];
  return Math.max(0, Math.max(...times) + rest - now);
}

function setActivity(state: PetState, name: string, now: number, item = ""): void {
  state.activity = name;
  state.activity_until = now + ACTIVITY_SECONDS[name];
  state.activity_item = item;
}

/**
 * Like setActivity; with a throw, `item` drops in first and the activity is "throw_<kind>", with
 * where it lands. `plain`: the activity without a throw, and its item.
 */
function setThrown(state: PetState, kind: string, now: number, thrown: number | null, item: string,
    plain: readonly [string, string] = [kind, ""]): void {
  if (thrown === null) {
    setActivity(state, plain[0], now, plain[1]);
  } else {
    setActivity(state, `throw_${kind}`, now, `${item}@${thrown.toFixed(2)}`);
  }
}

function count(state: PetState, key: string): void {
  state.counters[key] = (state.counters[key] ?? 0) + 1;
}

/** The weather and the time of day at the time t, as far as they decide an adult form. */
export function worldAt(t: number, weather: sky.WeatherCode, location: Location): life.World {
  return { raining: sky.precipitation(weather) === "rain", dark: isDark(t, location) };
}

function evolve(state: PetState, now: number, by: string, weather: sky.WeatherCode = null,
    location: Location = null): void {
  const oldStage = state.stage;
  const old = life.evolve(state, now, worldAt(now, weather, location));
  care.rescaleWeight(state, oldStage);
  state.game = null;
  const hatched = old.startsWith("egg");
  if (hatched) {
    state.stats = newState().stats; // freshly hatched: all is well
    state.asleep = false;
  }
  setActivity(state, hatched ? "hatch" : "evolve", now, old);
  logEvent(state, now, "evolve", by, { item: `${state.stage}:${state.species}` });
}

/** Back from the trip. The finds stay in the backpack until someone is watching (action "unpack"). */
function comeHome(state: PetState, now: number, done: Trip): void {
  state.backpack = [...done.found];
  state.stats.mood += 10 * done.factor;
  care.addBond(state, "trip");
  trip.remember(state, done, now);
  setActivity(state, "trip_home", now);
  logEvent(state, now, "trip", "system", { item: "home" });
}

function isUnit(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1;
}

function isList(value: unknown, allowed: readonly string[], longest: number): value is string[] {
  return Array.isArray(value) && value.length <= longest && value.every((entry) => allowed.includes(entry));
}

/** What an action may bring along besides its item; anything else is an invalid request. */
function checkValue(action: string, item: string | null, value: unknown): unknown {
  let ok: boolean;
  if (action === "train" && item === "strength") {
    ok = isUnit(value); // how hard the ball was thrown, 0–1
  } else if (action === "train" && item === "answer") {
    ok = isList(value, battle.DIRECTIONS, battle.SEQUENCE[1]); // the directions that were swiped back
  } else if (action === "trip" && item !== "recall" && value != null) {
    ok = isList(value, trip.PACKABLE, trip.MAX_PACK); // what goes into the backpack
  } else {
    return null;
  }
  if (!ok) {
    throw new RequestError("invalid_value");
  }
  return value;
}

export interface ActionOptions {
  /** What the action is about: the food, the trick, the area … */
  item?: unknown;
  /** Who did it, for the history. */
  by?: string;
  /** 0–1: the food, ball or medicine was thrown and lands there in the scene (0 = left). */
  throw?: unknown;
  weather?: sky.WeatherCode;
  /** The temperature in °C, or null without weather data. */
  temp?: number | null;
  /** Where the sun rises and sets (the night decides a form). */
  location?: Location;
  /** What else belongs to the action (see checkValue). */
  value?: unknown;
}

export interface ActionResult {
  accepted: boolean;
  /** null, or a key under "pet.rejected" in the locale files. */
  reason: string | null;
}

// Actions that need an item, what it may be, and the error if it is something else
const ITEM_CHECKS: Record<string, [() => readonly string[], string]> = {
  feed: [() => FOODS, "unknown_food"],
  game: [() => GAME_MOVES, "unknown_move"],
  trick: [() => Object.keys(care.TRICKS), "unknown_trick"],
  trip: [() => TRIP_MOVES, "unknown_area"],
  plant: [() => Object.keys(home.PLANTS), "unknown_seed"],
  wear: [() => ["none", ...home.ids("hat")], "unknown_hat"],
  deco: [() => home.ids("deco"), "unknown_deco"],
  train: [() => TRAIN_MOVES, "unknown_exercise"],
};

/** Carries out an action. An invalid request throws a RequestError. */
export function applyAction(state: PetState, action: string, now: number, bedtime: Bedtime,
    options: ActionOptions = {}): ActionResult {
  const by = options.by ?? "app";
  const weather = options.weather ?? null;
  const item = typeof options.item === "string" ? options.item : null;
  if (!ACTIONS.includes(action)) {
    throw new RequestError("unknown_action");
  }
  const check = ITEM_CHECKS[action];
  if (check && (item === null || !check[0]().includes(item))) {
    throw new RequestError(check[1]);
  }
  const value = checkValue(action, item, options.value);
  state.seen_at = now; // somebody is there (for idle.welcome)
  if (action === "look_in") {
    // only a look: it doesn't do anything with the pet, so it isn't in the history either
    const reason = !state.house ? "no_house" : state.asleep ? "inside" : null;
    if (reason === null) {
      state.look_in_until = now + LOOK_IN_SECONDS;
    }
    return { accepted: reason === null, reason };
  }
  idle.noticed(state);
  let thrown: number | null = null;
  if (THROW_ACTIONS.includes(action) && options.throw != null) {
    if (!isUnit(options.throw)) {
      throw new RequestError("invalid_throw");
    }
    thrown = options.throw;
  }

  if (action === "evolve") {
    let reason: string;
    if (!life.isDue(state, now)) {
      reason = "not_ready";
    } else if (state.asleep) {
      reason = "asleep";
    } else if (state.trip) {
      reason = "away";
    } else {
      evolve(state, now, by, weather, options.location ?? null); // gets its own entry in the history
      return { accepted: true, reason: null };
    }
    logEvent(state, now, action, by, { accepted: false, reason });
    return { accepted: false, reason };
  }

  const reason = state.stage === "egg"
    ? applyToEgg(state, action, now)
    : apply(state, action, now, bedtime, item, thrown, by, weather, value, options.temp ?? null);
  if (reason && state.activity_until <= now && state.stage !== "egg" && !state.trip) {
    setActivity(state, "no", now);
  }
  clamp(state);
  const told = (action === "unwrap" || action === "pickup") && reason === null ? state.activity_item : item;
  logEvent(state, now, action, by, { item: told, accepted: reason === null, reason });
  if (reason === null && by !== "system") {
    habits.record(state, action, now);
  }
  return { accepted: reason === null, reason };
}

/** A meal, which is always there, or something from the bag (food.ts). */
function feed(state: PetState, now: number, name: string, thrown: number | null): string | null {
  const s = state.stats;
  if (state.asleep) {
    return "asleep";
  }
  if (name === "meal") {
    if (s.satiety > 90) {
      return "full";
    }
    s.satiety += 40 * repeatFactor(state, "meal", now);
    s.health += 2;
    s.mood += 5;
    if (state.next_poop_at === null) {
      state.next_poop_at = now + new Random(Math.trunc(now)).uniform(...POOP_DELAY);
    }
    care.addWeight(state, care.MEAL_WEIGHT);
    care.addBond(state, "meal");
    setThrown(state, "meal", now, thrown, "meal", ["eat", ""]);
    count(state, "meals");
    life.record(state, "meals");
    return null;
  }
  const reason = food.give(state, name);
  if (reason !== null) {
    return reason;
  }
  care.addBond(state, "snack");
  setThrown(state, "snack", now, thrown, name, ["snack", name]);
  count(state, "snacks");
  count(state, `food_${name}`);
  life.record(state, "snacks");
  life.record(state, `food_${name}`); // which food a child gets most could decide a form one day
  return null;
}

/** Mini-game "Left or right?": five rounds of guessing which way the pet jumps. */
function game(state: PetState, now: number, move: string): string | null {
  const s = state.stats;
  if (move === "start") {
    if (state.asleep) {
      return "asleep";
    }
    if (s.energy < care.GAME_ENERGY) {
      return "tired";
    }
    care.startGame(state, now);
    setActivity(state, "game_wait", now);
    return null;
  }
  if (!care.gameActive(state, now)) {
    state.game = null;
    return "no_game";
  }
  const [jump, hit, done] = care.guess(state, move, now);
  setActivity(state, "game_turn", now, `${jump}:${hit ? "hit" : "miss"}`);
  if (!done) {
    return null;
  }
  // Game over: counts as playing, and winning makes it happier
  const wins = state.game!.wins!;
  const won = wins >= care.GAME_WIN;
  s.mood += (won ? 25 : 10) * repeatFactor(state, "play", now) * life.bonusFactor(state, "play");
  s.energy -= 10;
  s.satiety -= 5;
  care.addWeight(state, care.PLAY_WEIGHT);
  care.addBond(state, "game");
  count(state, "games");
  count(state, "plays");
  if (won) {
    count(state, "games_won");
  }
  life.record(state, "plays");
  state.game = { result: wins, last: now }; // result for the app
  return null;
}

/** An egg can only be kept warm (petted). */
function applyToEgg(state: PetState, action: string, now: number): string | null {
  if (action === "pet") {
    state.egg_warmth = Math.min(life.STAGE_SECONDS.egg!, state.egg_warmth + life.EGG_WARMTH);
    setActivity(state, "egg_wobble", now);
    return null;
  }
  return "egg";
}

/**
 * A heart falls from the sky and gets caught. Love wears off less than playing does, so it is
 * halved at most.
 */
function catchHeart(state: PetState, now: number): void {
  state.stats.mood += HEART_MOOD * Math.max(0.5, repeatFactor(state, "heart", now)) * life.bonusFactor(state, "heart");
  count(state, "hearts");
  care.addBond(state, "heart");
  setActivity(state, "catch_heart", now);
  logEvent(state, now, "heart", "system");
}

/** Training for the battle stats: an exercise, or the tap or answer one of them is waiting for. */
function train(state: PetState, now: number, move: string, value: unknown): string | null {
  if (move === "tap") {
    if (!battle.trainingActive(state, now, "speed")) {
      state.training = null;
      return "no_training";
    }
    const [score, result] = battle.tap(state, now);
    return trained(state, now, "speed", score, result !== "ok" ? result : score.toFixed(2));
  }
  if (move === "answer") {
    if (!battle.trainingActive(state, now, "smarts")) {
      state.training = null;
      return "no_training";
    }
    const [score, right, steps] = battle.answer(state, value as string[]);
    return trained(state, now, "smarts", score, `${right}/${steps}`);
  }
  if (state.asleep) {
    return "asleep";
  }
  if (state.stats.energy < battle.TRAIN_ENERGY) {
    return "tired_train";
  }
  if (restLeft(state, TRAIN_KEYS, now) > 0) {
    return "rest_train";
  }
  state.game = state.training = null; // this ends a mini-game or another exercise in progress
  if (move === "strength") {
    return trained(state, now, move, value as number, (value as number).toFixed(2));
  }
  const kind = move as "speed" | "smarts";
  setActivity(state, kind === "speed" ? "train_ready" : "train_show", now, battle.start(state, kind, now));
  return null;
}

/**
 * An exercise is over. It counts as playing, costs energy and is worth less when repeated; one
 * that went completely wrong costs nothing and brings nothing.
 */
function trained(state: PetState, now: number, skill: battle.Skill, score: number, shown: string): null {
  setActivity(state, `train_${skill}`, now, shown);
  if (score <= 0) {
    return null;
  }
  const s = state.stats;
  const factor = repeatFactor(state, `train_${skill}`, now);
  battle.train(state, skill, score * factor * (food.use(state, "train") ? 2 : 1));
  s.mood += 10 * factor * life.bonusFactor(state, "play");
  s.energy -= battle.TRAIN_COST.energy;
  s.satiety -= battle.TRAIN_COST.satiety;
  care.addWeight(state, care.PLAY_WEIGHT);
  care.addBond(state, "play", factor);
  count(state, "trainings");
  life.record(state, "plays");
  return null;
}

/** Set off on a trip, or call the pet home (area = "recall"). */
function startTrip(state: PetState, now: number, bedtime: Bedtime, area: string, weather: sky.WeatherCode,
    pack: readonly string[]): string | null {
  const s = state.stats;
  if (area === "recall") {
    if (!state.trip) {
      return "not_away";
    }
    trip.recall(state, now);
    return null;
  }
  if (state.trip) {
    return "away";
  }
  if (state.backpack.length) {
    return "unpack_first";
  }
  if (state.stage === "baby") {
    return "too_young";
  }
  if (state.asleep) {
    return "asleep";
  }
  if (!trip.unlocked(state, area)) {
    return "locked";
  }
  if (state.sick) {
    return "sick_trip";
  }
  if (s.satiety < trip.MIN_STAT) {
    return "hungry_trip";
  }
  if (s.energy < trip.MIN_STAT) {
    return "tired_trip";
  }
  if (sky.isThunder(weather)) {
    return "thunder";
  }
  const planned = trip.plan(state, area, now, pack);
  if (isLateEvening(now, bedtime)
      || minutesUntilBed(now, bedtime) * 60 < planned.end - now + trip.HOME_BEFORE_BED) {
    return "too_late";
  }
  trip.begin(state, planned, now);
  state.game = state.training = null;
  setActivity(state, "trip_start", now, area);
  return null;
}

function apply(state: PetState, action: string, now: number, bedtime: Bedtime, item: string | null,
    thrown: number | null, by: string, weather: sky.WeatherCode, value: unknown,
    temp: number | null): string | null {
  const s = state.stats;

  if (action === "trip") {
    return startTrip(state, now, bedtime, item!, weather, (value as string[] | null) ?? []);
  }
  if (action === "plant") {
    const reason = home.plantSeed(state, item!);
    if (reason === null && !state.trip) {
      setActivity(state, "plant", now, item!);
    }
    return reason;
  }
  if (action === "wear") {
    const reason = home.wear(state, item!);
    if (reason === null && state.hat && !state.asleep && !state.trip) {
      setActivity(state, "happy", now);
    }
    return reason;
  }
  if (action === "deco") {
    return home.toggleDeco(state, item!);
  }
  if (action === "unpack") {
    if (!state.backpack.length) {
      return "nothing_packed";
    }
    if (state.asleep) {
      return "asleep";
    }
    for (const found of state.backpack) {
      home.addItem(state, found);
    }
    setActivity(state, "unpack", now, state.backpack.join(","));
    state.backpack = [];
    return null;
  }
  if (state.trip) {
    return "away";
  }

  if (action === "collect") {
    if (!state.nest) {
      return "no_nest";
    }
    if (state.asleep) {
      return "asleep";
    }
    setActivity(state, "collect", now, home.eggOf(wild.collect(state).line));
    return null;
  }

  if (action === "unwrap") {
    if (!state.gift) {
      return "no_gift";
    }
    if (state.asleep) {
      return "asleep";
    }
    setActivity(state, "unwrap", now, wild.unwrap(state)); // the history tells what was in it
    return null;
  }

  if (action === "pickup") {
    if (!state.found) {
      return "nothing_found";
    }
    if (state.asleep) {
      return "asleep";
    }
    setActivity(state, "pickup", now, idle.pickUp(state));
    return null;
  }

  if (action === "feed") {
    return feed(state, now, item!, thrown);
  }

  if (action === "play") {
    if (state.asleep) {
      return "asleep";
    }
    if (s.energy < 15) {
      return "tired";
    }
    s.mood += 20 * repeatFactor(state, "play", now) * life.bonusFactor(state, "play");
    s.energy -= 10;
    s.satiety -= 5;
    care.addWeight(state, care.PLAY_WEIGHT);
    care.addBond(state, "play");
    setThrown(state, "play", now, thrown, "ball");
    count(state, "plays");
    life.record(state, "plays");
    return null;
  }

  if (action === "sleep") {
    if (state.asleep) {
      return "already_asleep";
    }
    const nearBed = isBedtime(now, bedtime) || minutesUntilBed(now, bedtime) <= TIRED_BEFORE_BED;
    if (s.energy > 80 && !nearBed) {
      return "not_tired";
    }
    if (nearBed) {
      s.mood += 10 * repeatFactor(state, "tuck_in", now); // tucked in by hand
    }
    fallAsleep(state, now);
    state.stay_awake_until = 0.0;
    if (!state.house) {
      setActivity(state, "fall_asleep", now);
    }
    return null;
  }

  if (action === "wake") {
    if (!state.asleep) {
      return "awake";
    }
    wakeUp(state, now, temp);
    if (isBedtime(now, bedtime)) {
      s.mood -= 15; // woken in the middle of the night: grumpy
      state.stay_awake_until = now + STAY_AWAKE_AFTER_WAKE;
    }
    if (!state.house) {
      setActivity(state, "wake_up", now);
    }
    return null;
  }

  if (action === "clean") {
    if (!state.poops && s.hygiene >= 90) {
      return "already_clean";
    }
    state.poops = 0;
    s.hygiene = 100.0;
    s.mood += 5;
    care.addBond(state, "clean");
    setActivity(state, "clean", now);
    count(state, "cleanups");
    life.record(state, "baths"); // in a child's care diary (the hippo line)
    return null;
  }

  if (action === "pet") {
    if (state.asleep) {
      setActivity(state, "turn_over", now);
      return null;
    }
    if (home.cold(state, now)) {
      // rubbed warm, on top of the petting (and whether or not that one counts)
      home.rubWarm(state);
      s.mood += home.RUB_MOOD;
      care.addBond(state, "warm");
      count(state, "warmed");
    }
    if (now - state.last_pet >= PET_COOLDOWN) {
      s.mood += 5 * life.bonusFactor(state, "pet");
      state.last_pet = now;
      care.addBond(state, "pet");
      life.record(state, "love");
      count(state, "pets");
      if (state.counters.pets % HEART_EVERY === 0) {
        catchHeart(state, now);
        return null;
      }
    }
    setActivity(state, "happy", now);
    return null;
  }

  if (action === "game") {
    return game(state, now, item!);
  }

  if (action === "train") {
    return train(state, now, item!, value);
  }

  if (action === "trick") {
    // Practice until it sticks; a trick it already knows is simply performed
    const trick = item!;
    if (state.asleep) {
      return "asleep";
    }
    if (care.knows(state, trick)) {
      // Showing a trick it knows is play: no energy, no break, and less fun each time in a row
      s.mood += 5 * repeatFactor(state, "show", now);
      state.game = null;
      setActivity(state, "trick", now, `${trick}:ok`);
      count(state, "tricks");
      return null;
    }
    if (s.energy < care.TRICK_ENERGY) {
      return "tired_trick";
    }
    if (restLeft(state, ["trick"], now) > 0) {
      return "rest_trick";
    }
    const factor = repeatFactor(state, "trick", now);
    const result = care.practice(state, trick, factor * (food.use(state, "trick") ? 2 : 1), now);
    idle.practicedTogether(state, trick);
    s.mood += (result === "fail" ? 3 : 6) * factor;
    if (result === "learned") {
      s.mood += 10; // proud
      logEvent(state, now, "learned", by, { item: trick });
    }
    s.energy -= 5;
    care.addBond(state, "trick", factor);
    life.record(state, "tricks"); // practiced, in a child's care diary (the beak line)
    state.game = null; // this ends a mini-game in progress
    setActivity(state, "trick", now, `${trick}:${result}`);
    count(state, "tricks");
    return null;
  }

  if (action === "medicine") {
    if (!state.sick) {
      s.mood -= 5;
      return "not_sick";
    }
    state.sick = false;
    s.health += 20;
    setThrown(state, "medicine", now, thrown, "medicine");
    return null;
  }

  throw new Error(`unhandled action ${action}`);
}
