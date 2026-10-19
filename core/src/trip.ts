/**
 * Trips: the pet is away for a while and brings finds home.
 *
 * A trip is planned ahead when it starts, seeded with the start time (which station comes when);
 * what happens at a station – a find, an opponent or just a rest – is decided there, again
 * seeded. That way, catching up after a break gives the same result as running non-stop.
 *
 * Every area has a guardian. It waits at the last station of a trip until the pet has got past
 * it once; only then does the pet know the way to the next area. A guardian may have been
 * sitting on a rare egg, which it leaves behind then.
 *
 * An adult that is looking for a friend may meet a wild pet instead of an opponent (wild.ts): it
 * shows its tricks, and nobody gets knocked over.
 */

import * as battle from "./battle";
import * as care from "./care";
import * as home from "./home";
import * as life from "./life";
import { Random } from "./random";
import * as sky from "./sky";
import type { PetState, Replay, Travel, TravelStop, Trip, TripEvent } from "./state";
import * as sun from "./sun";
import * as wild from "./wild";

// The areas in the order in which they open up: each one once the pet has got past the guardian
// of the one before (battle.GUARDIANS).
export const AREAS = ["meadow", "forest", "stream", "cave", "mountain"];
// What can be found where: [find, weight, only in this weather]
export const FINDS: Record<string, readonly (readonly [string, number, sky.Precipitation])[]> = {
  meadow: [["seed_berry", 4, null], ["seed_sunflower", 4, null], ["flag", 2, null], ["windmill", 1, null],
    ["daisy", 2, null], ["leaf", 2, null], ["bobble", 4, "snow"]],
  forest: [["seed_cherry", 4, null], ["seed_berry", 2, null], ["glowshroom", 2, null], ["lantern", 1, null],
    ["cap", 2, null], ["snailshell", 4, "rain"]],
  stream: [["seed_berry", 3, null], ["seed_sunflower", 3, null], ["seed_cherry", 2, null], ["cattail", 2, null],
    ["lily", 2, null], ["boat", 4, "rain"]],
  cave: [["seed_cherry", 4, null], ["seed_berry", 3, null], ["seed_herb", 1, null], ["crystal", 2, null],
    ["batears", 2, null], ["emberstone", 2, null]],
  mountain: [["seed_sunflower", 4, null], ["seed_berry", 3, null], ["seed_herb", 1, null], ["cairn", 2, null],
    ["edelweiss", 2, null], ["snowman", 4, "snow"]],
};
export const STATIONS = [4, 6] as const;
export const STEP = [10 * 60, 16 * 60] as const; // seconds from one station to the next
export const WAY_HOME = 10 * 60;
export const RECALL = 5 * 60; // called home: back this quickly
export const HOME_BEFORE_BED = 30 * 60; // it has to be home this long before bedtime
export const FIND_CHANCE = 0.6;
export const MIN_STAT = 50; // satiety and energy needed to set off
export const TURN_BACK = 20; // below this it turns back
export const STATION_COST = { energy: 3, satiety: 2 } as const; // hiking makes it tired and hungry
export const DAY_WINDOW = 20 * 3600;
export const DAY_FACTORS = [1.0, 0.5, 0.25]; // the second trip of the day brings less
export const ENCOUNTER_CHANCE = 0.3; // how often an opponent is waiting at a station
export const HEARTS = [45, 75]; // the day's condition (satiety, energy, health) from which it has two and three hearts
export const WIN_MOOD = 5;
export const LOSE_MOOD = -3;
export const GUARDIAN_MOOD = 15; // getting past a guardian makes it proud
// Area: the rare egg its guardian leaves behind the first time the pet gets past it (home.EGGS)
export const GUARDIAN_EGGS: Record<string, string> = { cave: "egg_ember" };
// What can go into the backpack: a snack heals a heart on the way, a ball distracts an opponent
export const PACKABLE = ["snack", "ball"];
export const MAX_PACK = 2;
export const MAX_TRAVELS = 30; // trips kept in the travel diary
export const REPLAYS = 10; // the latest scuffles are kept, to be watched again in the app

/** What the tests turn: how often an opponent is waiting, and how a scuffle goes. */
export const rules = { encounterChance: ENCOUNTER_CHANCE, fight: battle.fight };

/** The area whose guardian stands between the pet and this one (null for the first). */
export function blockedBy(area: string): string | null {
  const index = AREAS.indexOf(area);
  return index > 0 ? AREAS[index - 1] : null;
}

export function unlocked(state: PetState, area: string): boolean {
  const blocker = blockedBy(area);
  return blocker === null || state.guardians.includes(blocker);
}

/** The guardian of this area, as long as the pet hasn't got past it yet. */
export function guardianWaiting(state: PetState, area: string): string | null {
  return state.guardians.includes(area) ? null : battle.GUARDIANS[area];
}

export function dayFactor(state: PetState, now: number): number {
  const recent = (state.recent.trip ?? []).filter((t) => now - t < DAY_WINDOW);
  return DAY_FACTORS[Math.min(recent.length, DAY_FACTORS.length - 1)];
}

/** Hearts for the trip: a lost battle costs one, and at zero the pet goes home. */
export function startHearts(state: PetState): number {
  const condition = (state.stats.satiety + state.stats.energy + state.stats.health) / 3;
  return 1 + HEARTS.filter((limit) => condition >= limit).length;
}

/** Plan a trip (without setting off yet). `pack`: what goes into the backpack (PACKABLE). */
export function plan(state: PetState, area: string, now: number, pack: readonly string[] = []): Trip {
  const rng = new Random(`trip:${Math.trunc(now)}`);
  const stations: number[] = [];
  let t = now;
  for (let i = rng.randint(...STATIONS); i > 0; i--) {
    t += Math.round(rng.uniform(...STEP));
    stations.push(t);
  }
  return {
    area, start: now, end: t + WAY_HOME, stations, next: 0, found: [], factor: dayFactor(state, now), last: null,
    hearts: startHearts(state), pack: [...pack], guardian: guardianWaiting(state, area), log: [],
  };
}

export function begin(state: PetState, trip: Trip, now: number): void {
  state.recent.trip = [...(state.recent.trip ?? []).filter((t) => now - t < DAY_WINDOW), now];
  state.trip = trip;
}

export function returning(trip: Trip): boolean {
  return trip.next >= trip.stations.length;
}

export function recall(state: PetState, now: number): void {
  const trip = state.trip!;
  trip.stations.length = Math.min(trip.stations.length, trip.next);
  trip.end = Math.min(trip.end, now + RECALL);
}

/** What happened at a station: shown in the scene (trip.last) and kept for the diary. */
function happened(trip: Trip, event: TripEvent): TravelStop {
  trip.last = event;
  return note(trip, event);
}

/** A line for the travel diary, without the rounds of a scuffle. */
function note(trip: Trip, event: { kind: TravelStop["kind"]; at: number; item?: string | null; foe?: string;
    wild?: string; outcome?: string }): TravelStop {
  const stop: TravelStop = { kind: event.kind, at: Math.round(event.at) };
  for (const key of ["item", "foe", "wild", "outcome"] as const) {
    const value = event[key];
    if (value) {
      stop[key] = value;
    }
  }
  trip.log = [...(trip.log ?? []), stop];
  return stop;
}

/** Keeps a finished trip in the travel diary. Called straight back home doesn't count. */
export function remember(state: PetState, done: Trip, now: number): void {
  if (!done.next) {
    return;
  }
  const travel: Travel = {
    area: done.area, start: Math.round(done.start), end: Math.round(now), stops: done.log ?? [],
  };
  state.travels = [...(state.travels ?? []), travel].slice(-MAX_TRAVELS);
}

function turnBack(trip: Trip, t: number): void {
  trip.stations.length = Math.min(trip.stations.length, trip.next);
  trip.end = Math.min(trip.end, t + WAY_HOME);
}

/**
 * What it finds at this station (or null). Decorations and hats exist only once.
 * `sure`: an opponent it chased off always leaves something behind, if there is anything left.
 */
function find(state: PetState, trip: Trip, rng: Random, weather: sky.WeatherCode, sure = false): string | null {
  if (!sure && rng.random() >= FIND_CHANCE * trip.factor) {
    return null;
  }
  const skyNow = sky.precipitation(weather);
  const options = FINDS[trip.area].filter(([item, , only]) =>
    (only === null || only === skyNow) && home.canAdd(state, item)
    && !(trip.found.includes(item) && home.kindOf(item) !== "seed"));
  if (!options.length) {
    return null;
  }
  return rng.weighted(options.map(([item]) => item), options.map(([, weight]) => weight));
}

/**
 * An opponent is in the way. With a ball in the backpack it gets distracted; otherwise they
 * scuffle. A guardian doesn't care about balls, and getting past it opens the way to the next
 * area.
 */
function encounter(state: PetState, trip: Trip, foe: string, rng: Random, weather: sky.WeatherCode, t: number,
    events: wild.Happened[]): void {
  const count = state.counters;
  const guardian = battle.isGuardian(foe);
  if (trip.pack.includes("ball") && !guardian) {
    trip.pack.splice(trip.pack.indexOf("ball"), 1);
    happened(trip, { kind: "ball", foe, at: t });
    events.push(["battle", `${foe}:ball`]);
    return;
  }
  const fight = rules.fight(state, foe, rng);
  const outcome = fight.outcome;
  const last: TripEvent = { kind: "battle", foe, rounds: fight.rounds, outcome, at: t };
  const stop = happened(trip, last);
  const replay: Replay = {
    at: Math.round(t), trip: trip.start, area: trip.area, foe, rounds: fight.rounds, outcome, item: null,
    species: state.species, stage: state.stage, hat: state.hat, weather,
  };
  state.replays = [...state.replays, replay].slice(-REPLAYS);
  events.push(["battle", `${foe}:${outcome}`]);
  count.battles = (count.battles ?? 0) + 1;
  if (outcome === "win") {
    let egg: string | undefined;
    count.battles_won = (count.battles_won ?? 0) + 1;
    state.stats.mood += guardian ? GUARDIAN_MOOD : WIN_MOOD;
    if (guardian && !state.guardians.includes(trip.area)) {
      state.guardians.push(trip.area);
      events.push(["guardian", foe]);
      for (const area of AREAS.filter((area) => blockedBy(area) === trip.area)) {
        events.push(["unlock", area]);
      }
      egg = GUARDIAN_EGGS[trip.area];
      const step = trip.area === AREAS.at(-1) ? home.buildHouse(state) : null;
      if (step !== null) {
        events.push(["house", String(step)]); // past the last guardian: the house grows
      }
    }
    let item = find(state, trip, rng, weather, true);
    if (egg && home.canAdd(state, egg)) {
      item = egg; // what it was sitting on, instead of something from along the path
    }
    if (item) {
      trip.found.push(item);
      last.item = stop.item = replay.item = item;
      events.push(["find", item]);
    }
  } else if (outcome === "lose") {
    state.stats.mood += LOSE_MOOD;
    trip.hearts -= 1;
    if (trip.pack.includes("snack")) {
      trip.pack.splice(trip.pack.indexOf("snack"), 1);
      trip.hearts += 1;
      note(trip, { kind: "snack", at: t });
      events.push(["trip", "snack"]);
    } else if (trip.hearts <= 0) {
      // beaten: it goes home, is merely tired and keeps what it already has
      turnBack(trip, t);
      note(trip, { kind: "beaten", at: t });
      events.push(["trip", "beaten"]);
    }
  }
}

/**
 * One minute on the road, ending at t. Returns what happened, for the history, and the trip:
 * null while the pet is still away, and the finished trip (with `found`) once it is home.
 * `location`: where the sun sets, for whoever only comes out at dusk.
 */
export function step(state: PetState, t: number, weather: sky.WeatherCode,
    location: sun.Location = null): [wild.Happened[], Trip | null] {
  const trip = state.trip!;
  const s = state.stats;
  const events: wild.Happened[] = [];
  while (!returning(trip) && t >= trip.stations[trip.next]) {
    const at = trip.stations[trip.next];
    trip.next += 1;
    s.energy -= STATION_COST.energy;
    s.satiety -= STATION_COST.satiety;
    care.addWeight(state, care.HIKE_WEIGHT);
    if (s.energy < TURN_BACK || s.satiety < TURN_BACK) {
      turnBack(trip, t);
      happened(trip, { kind: "tired", at: t });
      events.push(["trip", "tired"]);
      break;
    }
    const rng = new Random(`station:${Math.trunc(at)}`);
    // the end of the path: this is where the guardian waits
    const guardian = returning(trip) ? trip.guardian : null;
    const met = guardian ? null : wild.meet(state, trip.area, at, weather);
    if (met) {
      const shown = wild.show(state, met, rng, t);
      happened(trip, { kind: "wild", wild: met, rounds: shown.rounds, outcome: shown.outcome, at: t });
      events.push(["wild", `${met}:${shown.outcome}`]);
      continue;
    }
    const foe = guardian ?? (rng.random() < rules.encounterChance
      ? battle.encounter(trip.area, rng, weather, sun.isDusk(at, location)) : null);
    if (foe) {
      encounter(state, trip, foe, rng, weather, t, events);
      continue;
    }
    const item = find(state, trip, rng, weather);
    if (item) {
      trip.found.push(item);
      events.push(["find", item]);
    }
    if (item) {
      happened(trip, { kind: "find", item, at: t });
    } else {
      trip.last = { kind: "rest", item, at: t }; // a rest is not worth a line in the diary
    }
  }
  if (t < trip.end) {
    return [events, null];
  }
  if (trip.next) { // called straight back home doesn't count
    state.counters.trips = (state.counters.trips ?? 0) + 1;
    life.record(state, "trips"); // in a child's care diary too (the fox line)
  }
  state.trip = null;
  return [events, trip];
}
