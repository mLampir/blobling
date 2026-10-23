/**
 * Game logic of the pet: stats, decay, actions, sleep (life cycle: life.ts).
 *
 * Pure logic that knows nothing about files, networks or the panel. Time is always passed in
 * (Unix seconds), never read here. The simulation runs in fixed one-minute steps, and each step
 * seeds its randomness from its own timestamp. That way, catching up after a break gives exactly
 * the same result as running non-stop.
 */

import * as battle from "./battle";
import * as brood from "./brood";
import * as care from "./care";
import * as digging from "./digging";
import * as festival from "./festival";
import * as fishing from "./fishing";
import * as grandma from "./grandma";
import * as food from "./food";
import * as garden from "./garden";
import * as ground from "./ground";
import * as habits from "./habits";
import * as home from "./home";
import * as idle from "./idle";
import * as keepsake from "./keepsake";
import * as life from "./life";
import * as magpie from "./magpie";
import { Random } from "./random";
import * as sky from "./sky";
import * as stars from "./stars";
import { STATS, newMagpie, newState, type Egg, type PetState, type Trip } from "./state";
import { isDark, isFullMoon, sunTimes, type Location } from "./sun";
import * as trail from "./trail";
import * as trip from "./trip";
import * as wild from "./wild";
import * as yards from "./yard";

export const TICK = 60;
// After a break the simulation catches up at most this far; by then a pet that somebody had
// looked after has long gone to Grandma's (GRANDMA_AFTER), and one that nobody ever did goes there
export const MAX_CATCH_UP = 3 * 86400;
// Nobody has done anything with it for this long: it goes to Grandma's and waits there, frozen,
// until somebody fetches it (action "grandma"), so that a week away doesn't leave it sick for days.
// Longer than a day, so that an owner who comes once a day keeps looking after it themselves;
// shorter than it takes to get sick without care.
export const GRANDMA_AFTER = 36 * 3600;
// Grandma looks after it: it comes home with at least this much of every stat
export const GRANDMA_STATS = 50.0;
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
// Tricks and training have one rule instead: every practice is worth all it is, but afterwards the
// pet needs a break, the longer the more it has practiced within REST_WINDOW (seconds). It shows:
// while it rests it sits and puffs (SceneView.resting).
export const REST_WINDOW = 6 * 3600;
export const SHOWN_COUNTS_EVERY = 10 * 60; // a trick it knows, shown, counts in a child's diary at most this often
export const REST_SECONDS = [120, 600, 1800, 3600, 7200];
const TRAIN_KEYS = battle.SKILLS.map((skill) => `train_${skill}`);
export const EVENT_LIMIT = 100;

export const ACTIONS = ["feed", "play", "sleep", "wake", "clean", "pet", "medicine", "evolve", "game", "trick",
  "trip", "plant", "wear", "deco", "unpack", "train", "collect", "unwrap", "pickup", "look_in", "grandma", "fish",
  "visit_grandma", "festival", "dig", "fill"];
export const FOODS = ["meal", ...food.EDIBLE];
export const GAME_MOVES = ["start", ...care.SPOTS]; // start, or look behind a spot
export const TRIP_MOVES = [...trip.AREAS, "recall"];
export const FISH_MOVES = ["cast", "pull"]; // cast the line at the pond, or pull it in
// an exercise, or the answer to one that is waiting; or over to the training ground and home again (ground.ts)
export const TRAIN_MOVES = [...battle.SKILLS, "tap", "answer", "go", "leave"];
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
  discover: 4, pickup: 4, grandma_go: 5, grandma_home: 4,
  // off to the yard for a portion; a visit for two takes longer (yard.seconds)
  yard: yards.seconds("eat"),
  wish: stars.WISH_SECONDS, // a shooting star: it looks up and wishes
  shoo: magpie.SEEN_SECONDS, // it chases off the magpie (magpie.ts)
  // over to the cross, digging (a digger by nature sooner, see dig), and holding up what it found
  dig: digging.WALK_SECONDS + digging.DIG_SECONDS + digging.SHOW_SECONDS,
  train_strength: 5, train_speed: 3, train_smarts: 3,
  // practicing a battle stat alone at the training ground (ground.ts)
  train_solo: ground.SOLO_SECONDS,
  // the line in the water: as long as it can be until something bites and is gone again
  fish_wait: fishing.EMPTY_WAIT, fish_catch: 4, fish_empty: 2.5,
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
/** An egg that hasn't hatched, as one of the eggs that are kept; null for a usual one, which isn't worth keeping. */
export function keptEgg(state: PetState): Egg | null {
  if (state.stage !== "egg" || (state.species === "blob" && !Object.values(state.skills).some(Boolean))) {
    return null;
  }
  return { line: state.species, skills: { ...state.skills } };
}

export function nextPet(old: PetState, now: number, name = "", egg: unknown = null): PetState {
  const kept = newState();
  kept.items = { ...old.items };
  kept.eggs = [...old.eggs];
  for (const found of [...old.backpack, ...(old.trip ? [...old.trip.found, ...old.trip.pack] : [])]) {
    if (found !== trip.BALL) {
      home.addItem(kept, found);
    }
  }
  if (old.nest) {
    kept.eggs.push(old.nest);
  }
  const back = keptEgg(old);
  if (back) {
    kept.eggs.push(back); // an egg that hasn't hatched goes back
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
  state.fallen = old.fallen; // and what a shooting star left
  state.magpie = old.magpie; // the magpie knows the home
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
  for (const found of [...from.backpack, ...(from.trip ? [...from.trip.found, ...from.trip.pack] : [])]) {
    if (found !== trip.BALL) {
      home.addItem(to, found);
    }
  }
  Object.assign(to, {
    deco: from.deco, house: from.house, plant: from.plant, gift: from.gift, found: from.found, nest: from.nest,
    trace: from.trace, fallen: from.fallen, magpie: from.magpie,
  });
  clearHome(from);
}

/** A pet without a home of its own: it lives at the back, and the home is the front pet's. Its hat stays among the finds. */
export function clearHome(state: PetState): void {
  Object.assign(state, {
    items: {}, eggs: [], backpack: [], deco: [], house: 0, plant: null, gift: null, found: null, nest: null, trace: null,
    trip: null, hat: "", fallen: null, magpie: newMagpie(),
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
  state.game = state.training = state.fishing = null; // falling asleep ends the game and the training
  if (state.activity === "yard") {
    state.activity_until = Math.min(state.activity_until, t); // dropping off at the fire, it is home in bed
  }
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
 * `temp`: the temperature in °C, or null; `location`: where the sun rises and sets; `yard`: the
 * home's yard (yard.ts), or null while there is none.
 */
export function tick(state: PetState, t: number, bedtime: Bedtime, weather: sky.WeatherCode = null,
    temp: number | null = null, location: Location = null, yard: yards.Yard | null = null): void {
  if (!state.grandma && leavesForGrandma(state, t, yard)) {
    goToGrandma(state, t);
  }
  if (state.grandma) {
    return; // at Grandma's nothing happens to it: no needs, no growing (see stayAtGrandmas)
  }
  const rng = new Random(Math.trunc(t));
  const s = state.stats;
  const h = TICK / 3600;
  const asleep = state.asleep;

  if (state.stage !== "adult") {
    state.egg_warmth += home.growthBonus(state, TICK);
  }
  if (state.stage === "child") {
    state.egg_warmth += TICK * (keepsake.factor(state, "children") - 1); // the knitting basket
  }
  if (state.stage === "egg") {
    // Nothing happens inside the egg, except that it eventually hatches by itself
    if (t >= life.dueAt(state)! + life.AUTO_EVOLVE_AFTER) {
      evolve(state, t, "system");
    }
    return;
  }

  const before = { ...s }; // the yard's floors only stop a need from dropping further
  for (const key of Object.keys(RATES) as (keyof typeof RATES)[]) {
    let rate: number = RATES[key][asleep ? 1 : 0];
    if (rate > 0 && key === "energy") {
      rate *= keepsake.factor(state, "rest");
    }
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
  if (sky.precipitation(weather) === "rain") {
    garden.noteRain(state, t);
  }
  idle.noteWeather(state, t, sky.precipitation(weather));
  idle.melt(state, temp);
  home.noteHeat(state, temp, t);
  if (festival.alone(state, t)) {
    // the festival day, and nobody has sent it: it goes by itself and shows its best tricks
    goToFestival(state, t);
    logEvent(state, t, "festival", "system");
  }
  if (state.trip) {
    const [events, done] = trip.step(state, t, weather, location);
    for (const [action, item] of events) {
      logEvent(state, t, action, "system", { item });
    }
    if (done) {
      comeHome(state, t, done);
    }
  }
  for (const [action, item] of garden.step(state, t, !asleep && !state.trip)) {
    logEvent(state, t, action, "system", { item });
  }
  if (stars.step(state, t, weather, bedtime[0], isBedtime(t, bedtime), location)) {
    // a shooting star: still up and at home, it looks up and makes a wish
    if (!asleep && !state.trip && t >= state.activity_until) {
      setActivity(state, "wish", t);
    }
    logEvent(state, t, "star", "system");
  }
  if (state.friends.length) {
    for (const [action, item] of wild.step(state, t, !asleep && !state.trip)) {
      logEvent(state, t, action, "system", { item });
    }
  }
  for (const [action, item] of magpie.step(state, t, !asleep && !state.trip)) {
    if (action === "magpie_chased") {
      setActivity(state, "shoo", t, item); // the scuffle with her, until she drops it and flies off
    }
    logEvent(state, t, action, "system", { item });
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
    s.health += 1 * h * keepsake.factor(state, "heal");
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
  if (!asleep && rng.random() < keepsake.factor(state, "bored") / 360) {
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
      if (!napping) {
        morning(state, t);
      }
    }
  }
  if (yard) {
    yards.rain(yard, state.items, t, weather); // the rain barrel and the sandcastle, once a minute for the whole home
  }
  if (yard && !state.asleep && !state.trip && t >= state.activity_until && !wild.visiting(state, t)
      && !care.gameActive(state, t) && !battle.trainingActive(state, t) && !fishing.active(state, t)
      && !ground.there(state, t)) {
    // hungry or dirty enough, and there is something in the yard: it goes over by itself; in the
    // evening, to the campfire
    const done = yards.visit(state, yard, t) ?? yards.toFire(minutesUntilBed(t, bedtime) * 60 - t % 60, weather);
    if (done) {
      setActivity(state, "yard", t, done);
      state.activity_until = t + yards.seconds(done);
    }
  }
  if (state.activity === "yard" && yards.atFire(state.activity_item)
      && yards.phase(state.activity, state.activity_until, state.activity_item, t)?.where === "there") {
    yards.warm(state, TICK / 60);
  }
  if (!state.asleep && !state.trip && t >= state.activity_until && home.wantsFruit(state)) {
    // ripe fruit: it helps itself
    const kind = home.eatFruit(state);
    count(state, "fruits");
    life.record(state, "plant_fruits");
    life.record(state, `food_fruit_${kind}`); // eaten like one from the bag (the caterpillar line goes by it)
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
  if (yard && !state.trip) {
    yards.floors(state, yard, before);
  }
  clamp(state);
  brood.step(state, t, !state.asleep && !state.trip);

  life.recordMinute(state, !state.sick && s.satiety >= CRITICAL && s.hygiene >= CRITICAL && s.mood >= CRITICAL);
  // A baby that is due grows up by itself after a while; a child waits until its adult form is picked
  const due = life.dueAt(state);
  if (due !== null && state.stage === "baby" && t >= due + life.AUTO_EVOLVE_AFTER && !state.asleep && !state.trip
      && !isBedtime(t, bedtime)) {
    evolve(state, t, "system");
  }
}

/** It has woken up at home after a night: after its good days, its own egg lies in the nest (brood.ts). */
function morning(state: PetState, t: number): void {
  const egg = brood.wake(state, t);
  if (egg) {
    logEvent(state, t, "laid", "system", { item: egg.line });
  }
}

/** Catch the simulation up to `now`. Returns true if anything changed. */
export function advance(state: PetState, now: number, bedtime: Bedtime, weather: sky.WeatherCode = null,
    temp: number | null = null, location: Location = null, yard: yards.Yard | null = null): boolean {
  const [from, grandma] = [state.updated_at, state.grandma];
  advanceTogether([state], now, bedtime, weather, temp, location, yard);
  return state.updated_at !== from || !!state.grandma || state.grandma !== grandma;
}

/**
 * Catch all the pets of a home up to `now`, minute by minute in the order of the time (and of their
 * houses within the same second): what they share in the yard is used up in the order it would
 * be if they ran non-stop, however often somebody looks. Each catches up at most MAX_CATCH_UP.
 */
export function advanceTogether(states: readonly PetState[], now: number, bedtime: Bedtime,
    weather: sky.WeatherCode = null, temp: number | null = null, location: Location = null,
    yard: yards.Yard | null = null): void {
  const ends = states.map((state) => {
    if (now < state.updated_at) {
      // The clock jumped back: don't calculate backwards
      state.updated_at = now;
      return null;
    }
    return Math.min(now, state.updated_at + MAX_CATCH_UP);
  });
  for (;;) {
    let next = -1;
    states.forEach((state, i) => {
      if (ends[i] !== null && !state.grandma && state.updated_at + TICK <= ends[i]!
          && (next < 0 || state.updated_at < states[next].updated_at)) {
        next = i;
      }
    });
    if (next < 0) {
      break;
    }
    const state = states[next];
    state.updated_at += TICK;
    tick(state, state.updated_at, bedtime, weather, temp, location, yard);
  }
  states.forEach((state, i) => {
    if (ends[i] === null) {
      return;
    }
    if (!state.grandma && now > ends[i]!) {
      // caught up as far as it goes, and still nobody there: Grandma takes it in
      state.trip = null;
      goToGrandma(state, state.updated_at);
    }
    if (state.grandma) {
      stayAtGrandmas(state, now);
    }
  });
}

// ---------- At Grandma's ----------

/**
 * Does it go to Grandma's at the time t? When nobody has done anything with it for GRANDMA_AFTER
 * (and it hasn't just come back from her), as soon as it is awake and at home. Not while the yard
 * looks after it (both trough and basin have something, and no need is critical); once one of
 * them has run empty, the time counts from then if that is later.
 */
export function leavesForGrandma(state: PetState, t: number, yard: yards.Yard | null = null): boolean {
  if (yard && yards.supplied(yard) && criticalCount(state) === 0) {
    return false;
  }
  const since = Math.max(state.seen_at, state.recent.grandma?.at(-1) ?? 0.0, yard?.empty_at ?? 0.0);
  return since > 0 && t - since >= GRANDMA_AFTER && !state.asleep && !state.trip;
}

/**
 * Grandma takes it in at the time t; she also clears away what was lying around. `visit`: it was
 * taken there on purpose, and brings Grandma's things home after a whole day (grandma.ts).
 */
export function goToGrandma(state: PetState, t: number, visit = false): void {
  state.grandma = t;
  state.grandma_visit = visit;
  state.game = state.training = state.fishing = null;
  state.poops = 0;
  state.next_poop_at = null;
  setActivity(state, "grandma_go", t);
}

/**
 * At Grandma's, time stands still for it, as among the ancestors: it doesn't get older or grow on,
 * and what it waits for (the next visit of a friend) waits too. The pet at the back goes with it
 * (Pet.advance).
 */
export function stayAtGrandmas(state: PetState, now: number): void {
  const gap = Math.max(0, now - state.updated_at);
  state.stage_since += gap;
  state.born_at += gap;
  for (const friend of state.friends) {
    friend.next += gap;
    if (friend.until !== undefined) {
      friend.until += gap;
    }
    if (friend.rest_until !== undefined) {
      friend.rest_until += gap;
    }
  }
  if (state.brood.rest_until > state.updated_at) {
    state.brood.rest_until += gap; // and so does the rest after its own egg
  }
  state.updated_at = Math.max(state.updated_at, now);
}

/**
 * Fetched from Grandma's: it comes home looked after, and Grandma writes a postcard about it
 * (story.ts). `seen_at` stays, so the story tells what happened since somebody was last there.
 */
export function comeBack(state: PetState, now: number): void {
  const days = Math.max(1, Math.round((now - state.grandma) / 86400));
  if (grandma.giftsReady(state, now)) {
    state.backpack = grandma.gifts(state, now, new Random(`grandma:${now}`)); // unpacked at home
    const told = trail.find(state, "grandma", now); // and she tells it a story
    if (told) {
      logEvent(state, now, trail.action("grandma"), "system", { item: told });
    }
  }
  state.grandma_visit = false;
  for (const k of STATS) {
    state.stats[k] = Math.max(state.stats[k], GRANDMA_STATS);
  }
  state.sick = false;
  state.asleep = false;
  state.cold_until = 0.0;
  state.grandma = 0.0;
  state.recent.grandma = [now];
  state.idle_next = 0.0;
  idle.noticed(state);
  setActivity(state, "grandma_home", now);
  // item: about how many days it was there, for Grandma's postcard
  logEvent(state, now, "away", "system", { item: String(days) });
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
  if (state.stage === "egg" || state.grandma) {
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
  if (state.grandma) {
    // at Grandma's it can only be fetched – and things at home can be arranged
    return { ...nothing, grandma: true, plant: true, wear: true, deco: true, look_in: state.house > 0 };
  }
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
    clean: state.poops > 0 || state.stats.hygiene < 90 || home.hot(state, now),
    pet: true,
    medicine: state.sick,
    trip: !asleep && state.stage !== "baby" && !packed,
    unpack: packed && !asleep,
    collect: !!state.nest && !asleep,
    unwrap: !!state.gift && !asleep,
    pickup: (!!state.found || !!stars.lying(state)) && !asleep,
    festival: festival.canGo(state, now) === null && !packed,
    dig: digging.canDig(state) === null,
    plant: true,
    wear: true,
    deco: true,
    look_in: state.house > 0 && !asleep,
    visit_grandma: grandma.canVisit(state) === null,
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

/** A trick or an exercise was practiced now: it counts towards the next break (restLeft). */
function practiced(state: PetState, key: string, now: number): void {
  state.recent[key] = [...(state.recent[key] ?? []).filter((t) => now - t < REST_WINDOW), now];
}

/** Seconds until the pet is up for another trick or exercise (keys: where `recent` keeps them); 0 = now. */
export function restLeft(state: PetState, keys: string[], now: number): number {
  const times = keys.flatMap((key) => state.recent[key] ?? []).filter((t) => now - t < REST_WINDOW);
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

/**
 * The weather, the time of day and the moon at the time t, as far as they may decide an adult form.
 * With `state`: what is set out at its home too (the snow globe makes it snow), the rain lately,
 * and what the pet itself has come to (bond, tricks, battle stats, house).
 */
export function worldAt(t: number, weather: sky.WeatherCode, location: Location, temp: number | null = null,
    state: PetState | null = null): life.World {
  const date = new Date(t * 1000);
  const [sunrise, sunset] = sunTimes(date, location);
  return {
    raining: sky.precipitation(weather) === "rain",
    snowing: sky.precipitation(weather) === "snow" || (state !== null && home.snowDeco(state)),
    storm: sky.isThunder(weather) || (state !== null && home.momentDeco(state, "storm")),
    clear: weather !== null && weather <= 1, dark: isDark(t, location),
    temp: state !== null && home.momentDeco(state, "heat") ? Math.max(temp ?? -Infinity, life.PHARABUG_HEAT) : temp,
    minute: date.getHours() * 60 + date.getMinutes(), sunrise: Math.round(sunrise), sunset: Math.round(sunset),
    fullMoon: isFullMoon(t) || (state !== null && home.momentDeco(state, "moon")),
    ...(state && petWorld(state, t)),
  };
}

/** What the pet itself brings to the moment it grows up (life.World). */
function petWorld(state: PetState, t: number): life.World {
  const top = Math.max(...battle.SKILLS.map((skill) => state.skills[skill]));
  const strongest = battle.SKILLS.filter((skill) => state.skills[skill] === top);
  return {
    afterRain: state.garden.rain_at > 0 && t - state.garden.rain_at <= life.SUN_AFTER_RAIN,
    bond: care.bondLevel(state),
    allTricks: Object.keys(care.TRICKS).every((trick) => care.knows(state, trick)),
    spin: care.knows(state, "spin"),
    dance: care.knows(state, "dance"),
    friend: state.friends.length > 0,
    wildFriends: state.friends.filter((f) => !f.guest).length,
    tricks: care.learned(state).length,
    smarts: state.skills.smarts ?? 0,
    strongest: strongest.length === 1 && top > 0 ? strongest[0] : undefined,
    houseBuilt: state.house >= home.HOUSE_STEPS,
    glowOutside: home.placeDeco(state).outside.some((item) => home.GLOWING_DECO.includes(item)),
    sandcastle: home.placeDeco(state).outside.includes("sandcastle"),
    grandmaHat: grandma.HATS.includes(state.hat),
  };
}

function evolve(state: PetState, now: number, by: string, world: life.World = {}, form: string | null = null): void {
  const oldStage = state.stage;
  const old = life.evolve(state, now, world, form);
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
  state.backpack = [...state.backpack, ...done.found]; // (off to the festival by itself, it may not have unpacked)
  const keep = keepsake.due(state);
  if (keep) {
    state.backpack.push(keep); // the home has had all three adults of a line: its keepsake
  }
  trip.putBack(state, done); // what it took along and didn't need
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
    // what goes into the backpack (checked in startTrip); "snack" comes from an app of API 7 or
    // older, from before nothing to eat came out of thin air, and is left out
    ok = isList(value, [trip.BALL, "snack", ...food.EDIBLE], trip.MAX_PACK);
  } else if (action === "festival" && value != null) {
    ok = isList(value, Object.keys(care.TRICKS), festival.MAX_TRICKS); // the tricks to show, in order
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
  /** Another pet is there (a visiting friend, or the neighbour): it hides too. */
  guest?: boolean;
  /** What else belongs to the action (see checkValue). */
  value?: unknown;
  /** The home's yard (yard.ts), for "fill"; null while there is none. */
  yard?: yards.Yard | null;
  /** The forms the home has had (the album), for the adult form a child may grow into ("evolve"). */
  had?: readonly string[];
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
  fish: [() => FISH_MOVES, "unknown_move"],
  fill: [() => ["trough", "basin"], "unknown_move"],
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
  if (action === "visit_grandma") {
    // taken to Grandma's on purpose: it stays there until it is fetched, like when nobody came
    const reason = grandma.canVisit(state);
    if (reason === null) {
      state.seen_at = now;
      goToGrandma(state, now, true);
    }
    logEvent(state, now, action, by, { accepted: reason === null, reason });
    return { accepted: reason === null, reason };
  }
  if (action === "grandma") {
    // fetched from Grandma's; somebody is there, but what happened since they were last is still to be told
    const reason = state.grandma ? null : "at_home";
    if (reason === null) {
      comeBack(state, now);
    } else {
      logEvent(state, now, action, by, { accepted: false, reason });
    }
    return { accepted: reason === null, reason };
  }
  if (action === "fill") {
    // the trough or the basin in the yard: it belongs to the home, whatever the pet is doing
    const yard = options.yard ?? null;
    const reason = yard ? yards.fill(yard, state.items, item as yards.What) : "no_yard";
    if (!state.grandma && reason === null) {
      state.seen_at = now; // somebody is there
    }
    logEvent(state, now, action, by, { item, accepted: reason === null, reason });
    return { accepted: reason === null, reason };
  }
  if (state.grandma && !["plant", "wear", "deco", "look_in"].includes(action)) {
    comeBack(state, now); // an app from before Grandma: anything it does with the pet fetches it
  }
  if (!state.grandma) {
    state.seen_at = now; // somebody is there (for idle.welcome)
  }
  if (action === "look_in") {
    // only a look: it doesn't do anything with the pet, so it isn't in the history either
    const reason = !state.house ? "no_house" : state.asleep ? "inside" : null;
    if (reason === null) {
      state.look_in_until = now + LOOK_IN_SECONDS;
    }
    return { accepted: reason === null, reason };
  }
  if (action === "train" && (item === "go" || item === "leave")) {
    // only where it is: over at the training ground for the training, or home again; not in the history
    const reason = item === "leave" ? null : state.stage === "egg" ? "egg" : state.trip ? "away"
      : state.asleep ? "asleep" : null;
    if (reason === null) {
      if (item === "go") {
        ground.go(state, now);
      } else {
        ground.leave(state);
      }
    }
    return { accepted: reason === null, reason };
  }
  if (!["train", "plant", "wear", "deco"].includes(action)) {
    ground.leave(state); // anything else done with it brings it home from the training ground
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
    // A child grows into the adult form picked (life.choices); without one, as an older app
    // asks, into the one its diary and the world lead to
    const world = worldAt(now, weather, options.location ?? null, options.temp ?? null, state);
    let reason: string;
    if (!life.isDue(state, now)) {
      reason = "not_ready";
    } else if (state.asleep) {
      reason = "asleep";
    } else if (state.trip) {
      reason = "away";
    } else if (item !== null && (state.stage !== "child"
        || !life.choices(state, world, options.had ?? []).some((c) => c.ready && c.form === item))) {
      reason = "form_not_ready";
    } else {
      evolve(state, now, by, world, item); // gets its own entry in the history
      return { accepted: true, reason: null };
    }
    logEvent(state, now, action, by, { accepted: false, reason });
    return { accepted: false, reason };
  }

  const reason = state.stage === "egg"
    ? applyToEgg(state, action, now)
    : apply(state, action, now, bedtime, item, thrown, by, weather, value, options.temp ?? null, !!options.guest);
  if (reason && state.activity_until <= now && state.stage !== "egg" && !state.trip) {
    setActivity(state, "no", now);
  }
  clamp(state);
  // what was in it, what it picked up, and what came out of the pond
  const told = (action === "unwrap" || action === "pickup" || (action === "fish" && item === "pull")) && reason === null
    ? state.activity_item || "nothing" : action === "dig" && reason === null ? digFound(state) : item;
  logEvent(state, now, action, by, { item: told, accepted: reason === null, reason });
  if (reason === null && by !== "system") {
    habits.record(state, action, now);
    if (action === "play" || action === "game") {
      garden.notePlay(state, now);
    }
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

/**
 * Hide and seek: the pet hides (and a guest with it), and every move looks behind one spot. It ends
 * when everybody has been found or the tries are used up.
 */
function game(state: PetState, now: number, move: string, guest: boolean): string | null {
  const s = state.stats;
  if (move === "start") {
    if (state.asleep) {
      return "asleep";
    }
    if (s.energy < care.GAME_ENERGY) {
      return "tired";
    }
    care.startGame(state, now, care.hidingSpots(state, home.placeDeco(state).outside), life.lineOf(state.species),
      guest);
    setActivity(state, "game_wait", now);
    return null;
  }
  if (!care.gameActive(state, now)) {
    state.game = null;
    return "no_game";
  }
  const [who, done] = care.seek(state, move, now);
  setActivity(state, "game_turn", now, `${move}:${who ?? "miss"}`);
  if (!done) {
    return null;
  }
  // Game over: counts as playing, and finding everybody makes it happier
  const { found = [], spots = [] } = state.game!;
  const won = found.length >= spots.length;
  s.mood += (won ? 25 : 10) * repeatFactor(state, "play", now) * life.bonusFactor(state, "play");
  s.energy -= 10;
  s.satiety -= 5;
  care.addWeight(state, care.PLAY_WEIGHT);
  care.addBond(state, "game");
  count(state, "games");
  count(state, "plays");
  life.record(state, "games");
  life.record(state, "games_won", won ? 1 : 0);
  if (won) {
    count(state, "games_won");
  }
  life.record(state, "plays");
  state.game = { result: found.length, last: now, spots, found, won }; // result for the app
  return null;
}

/**
 * Fishing at the pond: cast the line, then pull when the bobber dips (fishing.ts). A catch costs
 * energy like a game; pulling too early costs nothing, too late costs half. Casting again soon
 * after brings bites less often (repeatFactor).
 */
function fish(state: PetState, now: number, move: string): string | null {
  const s = state.stats;
  if (move === "pull") {
    if (!fishing.active(state, now)) {
      state.fishing = null;
      return "no_line";
    }
    const result = fishing.pull(state, now);
    if (result === "early") {
      setActivity(state, "fish_empty", now, "early");
      return null;
    }
    s.energy -= fishing.COST.energy * (result === "caught" ? 1 : 0.5);
    s.satiety -= fishing.COST.satiety * (result === "caught" ? 1 : 0.5);
    count(state, "fished");
    life.record(state, "fished");
    if (result === "gone") {
      setActivity(state, "fish_empty", now, "gone");
      return null;
    }
    const caught = fishing.catchFrom(state, "pond", new Random(`catch:${now}`));
    if (caught) {
      home.addItem(state, caught);
      count(state, "caught");
      const note = trail.find(state, "fish", now); // a bottle with a note in it
      if (note) {
        logEvent(state, now, trail.action("fish"), "system", { item: note });
      }
    }
    s.mood += 15 * life.bonusFactor(state, "play");
    care.addBond(state, "play");
    setActivity(state, "fish_catch", now, caught ?? "");
    return null;
  }
  if (state.asleep) {
    return "asleep";
  }
  if (!fishing.canFish(state)) {
    return "no_pond";
  }
  if (s.energy < fishing.FISH_ENERGY) {
    return "tired";
  }
  state.game = state.training = null; // this ends a mini-game or an exercise in progress
  const bite = fishing.cast(state, now, repeatFactor(state, "fish", now));
  setActivity(state, "fish_wait", now, bite === null ? "" : bite.toFixed(2));
  // it reels in by itself: with nothing, or a moment after whatever bit has got away
  state.activity_until = now + (bite === null ? fishing.EMPTY_WAIT : bite + fishing.BITE_WINDOW + 1);
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
  ground.go(state, now); // the exercises are done over at the training ground
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
  state.game = state.training = state.fishing = null; // this ends a mini-game or another exercise in progress
  if (move === "strength") {
    return trained(state, now, move, value as number, (value as number).toFixed(2));
  }
  const kind = move as "speed" | "smarts";
  setActivity(state, kind === "speed" ? "train_ready" : "train_show", now, battle.start(state, kind, now));
  return null;
}

/**
 * An exercise is over. It counts as playing, costs energy and is followed by a break (restLeft);
 * one that went completely wrong costs nothing and brings nothing.
 */
function trained(state: PetState, now: number, skill: battle.Skill, score: number, shown: string): null {
  setActivity(state, `train_${skill}`, now, shown);
  if (score <= 0) {
    return null;
  }
  const s = state.stats;
  practiced(state, `train_${skill}`, now);
  battle.train(state, skill, score * (food.use(state, "train") ? 2 : 1) * ground.factor(state, skill));
  ground.trainedTogether(state, skill);
  s.mood += 10 * life.bonusFactor(state, "play");
  s.energy -= battle.TRAIN_COST.energy;
  s.satiety -= battle.TRAIN_COST.satiety;
  care.addWeight(state, care.PLAY_WEIGHT);
  care.addBond(state, "play");
  count(state, "trainings");
  life.record(state, "plays");
  return null;
}

/** Off to the trick festival (festival.ts), now: it is the trip of the day. `picked`: the tricks to show. */
function goToFestival(state: PetState, now: number, picked: readonly string[] = []): void {
  state.recent.trip = [...(state.recent.trip ?? []).filter((t) => now - t < trip.DAY_WINDOW), now];
  state.counters.festival_day = festival.dayOf(now);
  state.trip = festival.plan(state, now, picked);
  state.game = state.training = state.fishing = null;
  setActivity(state, "trip_start", now, festival.AREA);
}

/** What it dug up, as the history tells it: "egg_scarab,seed_berry". */
function digFound(state: PetState): string {
  return state.activity_item.split(":")[1] ?? "";
}

/**
 * Digging at the red cross (digging.ts): the map is used up, it walks over and digs, and holds up
 * what it found. Costs energy like playing; a digger by nature is done sooner.
 */
function dig(state: PetState, now: number): string | null {
  const reason = digging.canDig(state);
  if (reason) {
    return reason;
  }
  const s = state.stats;
  state.game = state.training = state.fishing = null;
  const found = digging.dig(state, new Random(`dig:${now}`));
  const note = trail.find(state, "dig", now); // an old note under the cross
  if (note) {
    logEvent(state, now, trail.action("dig"), "system", { item: note });
  }
  s.mood += 15 * life.bonusFactor(state, "play");
  s.energy -= digging.COST.energy;
  s.satiety -= digging.COST.satiety;
  care.addWeight(state, care.PLAY_WEIGHT);
  care.addBond(state, "play");
  count(state, "plays");
  life.record(state, "plays");
  const seconds = digging.seconds(state);
  // activity_item: how long it digs, and what it finds
  setActivity(state, "dig", now, `${seconds}:${found.join(",")}`);
  state.activity_until = now + digging.WALK_SECONDS + seconds + digging.SHOW_SECONDS;
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
  const packing = trip.checkPack(state, pack);
  if (packing) {
    return packing;
  }
  const planned = trip.plan(state, area, now, pack);
  if (isLateEvening(now, bedtime)
      || minutesUntilBed(now, bedtime) * 60 < planned.end - now + trip.HOME_BEFORE_BED) {
    return "too_late";
  }
  trip.begin(state, planned, now);
  state.game = state.training = state.fishing = null;
  setActivity(state, "trip_start", now, area);
  return null;
}

function apply(state: PetState, action: string, now: number, bedtime: Bedtime, item: string | null,
    thrown: number | null, by: string, weather: sky.WeatherCode, value: unknown,
    temp: number | null, guest: boolean): string | null {
  const s = state.stats;

  if (action === "trip") {
    return startTrip(state, now, bedtime, item!, weather, ((value as string[] | null) ?? []).filter((x) => x !== "snack"));
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
    // what it found at home, or (item "star", or when nothing else lies there) what a shooting star left
    const star = stars.lying(state);
    const fromStar = !!star && (item === "star" || !state.found);
    if (!state.found && !star) {
      return "nothing_found";
    }
    if (state.asleep) {
      return "asleep";
    }
    if (fromStar && !home.canAdd(state, star!) && !star!.startsWith("fruit_")) {
      return "no_room";
    }
    setActivity(state, "pickup", now, fromStar ? stars.pickUp(state) : idle.pickUp(state));
    return null;
  }

  if (action === "festival") {
    const reason = state.backpack.length ? "unpack_first" : festival.canGo(state, now);
    if (reason === null) {
      goToFestival(state, now, (value as string[] | null) ?? []);
    }
    return reason;
  }

  if (action === "dig") {
    return dig(state, now);
  }

  if (action === "feed") {
    return feed(state, now, item!, thrown);
  }

  if (action === "fish") {
    return fish(state, now, item!);
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
      life.record(state, "tucked");
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
    const night = isBedtime(state.sleep_since, bedtime);
    wakeUp(state, now, temp);
    if (night && !isLateEvening(now, bedtime)) {
      morning(state, now); // woken in the morning half of the night, or after it
    }
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
    const hot = home.hot(state, now);
    if (!state.poops && s.hygiene >= 90 && !hot) {
      return "already_clean";
    }
    if (hot) {
      // a bath on a hot afternoon cools it down
      home.coolDown(state);
      s.mood += home.COOL_MOOD;
      count(state, "cooled");
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
      life.recordLove(state);
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
    return game(state, now, item!, guest);
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
      if (state.stage === "child" && now - (state.recent.trick_shown?.[0] ?? -Infinity) >= SHOWN_COUNTS_EVERY) {
        life.record(state, "tricks"); // shown, in the care diary too (the beak and the magpie line)
        state.recent.trick_shown = [now];
      }
      return null;
    }
    if (s.energy < care.TRICK_ENERGY) {
      return "tired_trick";
    }
    if (restLeft(state, ["trick"], now) > 0) {
      return "rest_trick";
    }
    practiced(state, "trick", now);
    const result = care.practice(state, trick, food.use(state, "trick") ? 2 : 1, now);
    idle.practicedTogether(state, trick);
    s.mood += result === "fail" ? 3 : 6;
    if (result === "learned") {
      s.mood += 10; // proud
      logEvent(state, now, "learned", by, { item: trick });
    }
    s.energy -= 5;
    care.addBond(state, "trick");
    life.record(state, "tricks"); // practiced, in a child's care diary (the beak and the magpie line)
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
