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
 *
 * The trick festival (festival.ts) is a trip too, with a single station: the show. And now and then
 * a trip brings a treasure map home (digging.ts).
 */

import * as battle from "./battle";
import * as care from "./care";
import * as digging from "./digging";
import * as festival from "./festival";
import * as fishing from "./fishing";
import * as food from "./food";
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
    ["daisy", 2, null], ["leaf", 2, null], ["honeycomb", 3, null], ["bobble", 4, "snow"]],
  forest: [["seed_cherry", 4, null], ["seed_berry", 2, null], ["glowshroom", 2, null], ["lantern", 1, null],
    ["cap", 2, null], ["hazelnut", 3, null], ["woodpile", 1, null], ["snailshell", 4, "rain"]],
  stream: [["seed_berry", 3, null], ["seed_sunflower", 3, null], ["seed_cherry", 2, null], ["cattail", 2, null],
    ["lily", 2, null], ["watercress", 3, null], ["pond", 1, null], ["boat", 4, "rain"]],
  cave: [["seed_cherry", 4, null], ["seed_berry", 3, null], ["seed_herb", 1, null], ["crystal", 2, null],
    ["batears", 2, null], ["emberstone", 2, null], ["glowberry", 3, null]],
  mountain: [["seed_sunflower", 4, null], ["seed_berry", 3, null], ["seed_herb", 1, null], ["cairn", 2, null],
    ["edelweiss", 2, null], ["pinenut", 3, null], ["snowglobe", 1, null], ["snowman", 4, "snow"]],
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
export const FESTIVAL_MOOD = [20, 15, 10]; // a place at the trick festival makes it proud
// Area: the rare egg its guardian leaves behind the first time the pet gets past it (home.EGGS). If
// there was no room for it, or the pet got past before the guardian had an egg, it leaves it at
// the end of the path on a later trip.
export const GUARDIAN_EGGS: Record<string, string> = { meadow: "egg_beak", forest: "egg_bear", stream: "egg_duck",
  cave: "egg_ember", mountain: "egg_penguin" };
// What goes into the backpack: the pet's own ball, and things to eat from the bag (food.EDIBLE).
// Nothing comes out of thin air, so what is packed is taken from the bag, and what isn't used
// goes back into it.
// - Something to eat: after a lost scuffle the pet eats it and has the heart back.
// - A wild pet's favorite (food.TASTES): the pet gives it as a present, and that counts as a trick
//   that worked.
// - The ball: the pet plays with a wild pet, and that counts as a trick that worked too.
// - Food from trips that works on a trip (food.PACKED) does its own thing instead: it is used up
//   when the pet sets off.
export const BALL = "ball";
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

/** The egg the guardian of this area still has for the pet, if there is room for it at home. */
function guardianEgg(state: PetState, area: string): string | null {
  const egg = GUARDIAN_EGGS[area];
  return egg && !state.guardian_eggs.includes(area) && home.canAdd(state, egg) ? egg : null;
}

/** The guardian of this area, as long as the pet hasn't got past it yet. */
export function guardianWaiting(state: PetState, area: string): string | null {
  return state.guardians.includes(area) ? null : battle.GUARDIANS[area];
}

/**
 * What there is to discover in this area once and for all: the guardian's egg, and the hats and
 * decorations along the path (seeds and food come again and again). `found`: it is at home, so the
 * area won't bring it any more; a thing that moved away with a pet can be found again.
 */
export function discoveries(state: PetState, area: string): { id: string; found: boolean }[] {
  const egg = GUARDIAN_EGGS[area];
  const once = FINDS[area].map(([item]) => item).filter((item) => ["hat", "deco"].includes(home.kindOf(item)));
  return [
    ...(egg ? [{ id: egg, found: state.guardian_eggs.includes(area) }] : []),
    ...once.map((item) => ({ id: item, found: (state.items[item] ?? 0) > 0 })),
  ];
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

/** The hearts it would set off with now: its condition, and one more from a honeycomb it has eaten. */
export function heartsNow(state: PetState): number {
  return startHearts(state) + (food.waiting(state, "heart") ? 1 : 0);
}

/** What could go into the backpack now: [item, how many]. The ball is always there. */
export function packable(state: PetState): [string, number][] {
  return [[BALL, 1], ...food.EDIBLE.filter((item) => state.items[item]).map((item): [string, number] =>
    [item, state.items[item]])];
}

/** Null if all of it can be packed, or why not. */
export function checkPack(state: PetState, pack: readonly string[]): string | null {
  if (pack.length > MAX_PACK) {
    return "pack_full";
  }
  const have = new Map(packable(state));
  for (const item of new Set(pack)) {
    if (pack.filter((x) => x === item).length > (have.get(item) ?? 0)) {
      return "not_in_bag";
    }
  }
  return null;
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

/**
 * Set off. What is packed comes out of the bag; food that works from the backpack is used up now.
 * (A boost still waiting from a food eaten at home before packing existed is used as well.)
 */
export function begin(state: PetState, trip: Trip, now: number): void {
  state.recent.trip = [...(state.recent.trip ?? []).filter((t) => now - t < DAY_WINDOW), now];
  for (const item of trip.pack) {
    if (item !== BALL) {
      home.takeItem(state, item);
    }
  }
  const packed = trip.pack.filter((item) => food.PACKED[item]);
  trip.pack = trip.pack.filter((item) => !food.PACKED[item]);
  const boosts = ["heart", "finder", "fresh"].filter((boost) =>
    packed.some((item) => food.PACKED[item] === boost) || food.use(state, boost));
  if (boosts.includes("heart")) {
    trip.hearts += 1;
  }
  if (boosts.includes("fresh")) {
    trip.factor = DAY_FACTORS[0];
  }
  if (boosts.length) {
    trip.boosts = boosts;
  }
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
    wild?: string; outcome?: string; jury?: string[] }): TravelStop {
  const stop: TravelStop = { kind: event.kind, at: Math.round(event.at) };
  for (const key of ["item", "foe", "wild", "outcome"] as const) {
    const value = event[key];
    if (value) {
      stop[key] = value;
    }
  }
  if (event.jury) {
    stop.jury = [...event.jury];
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
 * What the pet offers a wild pet before its tricks, taken out of the backpack: the wild pet's
 * favorite as a present ("gift:<item>"), and a game with the ball.
 */
function offer(trip: Trip, species: string): string[] {
  const offered: string[] = [];
  const favorite = food.TASTES[species]?.[0];
  for (const item of [favorite, BALL]) {
    if (item && trip.pack.includes(item)) {
      trip.pack.splice(trip.pack.indexOf(item), 1);
      offered.push(item === BALL ? BALL : `gift:${item}`);
    }
  }
  return offered;
}

/** Something to eat from the backpack, if there is anything left that it eats (the ball is not). */
function provision(state: PetState, trip: Trip): string | null {
  return trip.pack.find((item) => item !== BALL && item !== food.disliked(state)) ?? null;
}

/** Back home: what is left in the backpack from home goes back into the bag. */
export function putBack(state: PetState, trip: Trip): void {
  for (const item of trip.pack.filter((x) => x !== BALL)) {
    home.addItem(state, item);
  }
  trip.pack = [];
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

/** An opponent is in the way, and they scuffle. Getting past a guardian opens the way to the next area. */
function encounter(state: PetState, trip: Trip, foe: string, rng: Random, weather: sky.WeatherCode, t: number,
    events: wild.Happened[]): void {
  const count = state.counters;
  const guardian = battle.isGuardian(foe);
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
  if (fight.rounds.some(([, , result]) => result === "special")) {
    count.specials = (count.specials ?? 0) + 1; // scuffles it showed its special move in (the album's star)
  }
  life.record(state, "battles"); // in a child's care diary too, however it ends (the duck line)
  life.record(state, "clean_battles", fight.rounds.some(([, , result]) => result === "ouch") ? 0 : 1);
  if (outcome === "win") {
    let egg: string | null = null;
    life.record(state, `won_${foe}`); // whom it beat as a child (the axolotl line)
    count.battles_won = (count.battles_won ?? 0) + 1;
    state.stats.mood += guardian ? GUARDIAN_MOOD : WIN_MOOD;
    if (guardian && !state.guardians.includes(trip.area)) {
      state.guardians.push(trip.area);
      life.record(state, "guardians");
      events.push(["guardian", foe]);
      for (const area of AREAS.filter((area) => blockedBy(area) === trip.area)) {
        events.push(["unlock", area]);
      }
      egg = guardianEgg(state, trip.area);
      const step = trip.area === AREAS.at(-1) ? home.buildHouse(state) : null;
      if (step !== null) {
        events.push(["house", String(step)]); // past the last guardian: the house grows
      }
    }
    let item = find(state, trip, rng, weather, true);
    if (egg) {
      item = egg; // what it was sitting on, instead of something from along the path
      state.guardian_eggs.push(trip.area);
    }
    if (item) {
      trip.found.push(item);
      last.item = stop.item = replay.item = item;
      events.push(["find", item]);
    }
  } else if (outcome === "lose") {
    state.stats.mood += LOSE_MOOD;
    trip.hearts -= 1;
    const bite = provision(state, trip);
    if (bite) {
      trip.pack.splice(trip.pack.indexOf(bite), 1);
      trip.hearts += 1;
      note(trip, { kind: "snack", item: bite, at: t });
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
 * The show at the trick festival (festival.perform): kept like a scuffle to be watched again, and
 * the prize goes into the backpack.
 */
function show(state: PetState, trip: Trip, t: number, events: wild.Happened[]): void {
  const done = festival.perform(state, trip, AREAS.filter((area) => unlocked(state, area)), t);
  const outcome = String(done.place);
  happened(trip, { kind: "festival", rounds: done.rounds, outcome, item: done.prize, jury: done.jury, at: t });
  const replay: Replay = {
    kind: "festival", jury: done.jury, at: Math.round(t), trip: trip.start, area: trip.area, foe: festival.AREA,
    rounds: done.rounds, outcome, item: done.prize, species: state.species, stage: state.stage, hat: state.hat,
    weather: null,
  };
  state.replays = [...state.replays, replay].slice(-REPLAYS);
  trip.found.push(done.prize);
  events.push(["show", outcome], ["find", done.prize]); // (the history line of the show, not of setting off)
  state.stats.mood += done.place ? FESTIVAL_MOOD[done.place - 1] : WIN_MOOD; // proud, and it was fun anyway
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
    if (trip.area === festival.AREA) { // the festival is just up the meadow: it doesn't tire it on the way
      show(state, trip, t, events);
      continue;
    }
    if (sky.precipitation(weather) === "rain") {
      trip.rained = true;
    }
    if (!trip.boosts?.includes("fresh")) {
      s.energy -= STATION_COST.energy;
      s.satiety -= STATION_COST.satiety;
    }
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
    const late = returning(trip) && !guardian ? guardianEgg(state, trip.area) : null;
    if (late) { // a guardian it got past long ago has its egg waiting for it
      state.guardian_eggs.push(trip.area);
      trip.found.push(late);
      events.push(["find", late]);
      happened(trip, { kind: "find", item: late, at: t });
      continue;
    }
    const met = guardian ? null : wild.meet(state, trip.area, at, weather);
    if (met) {
      const shown = wild.show(state, met, rng, t, offer(trip, met));
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
    const item = find(state, trip, rng, weather, trip.boosts?.includes("finder"));
    if (item) {
      trip.found.push(item);
      events.push(["find", item]);
      happened(trip, { kind: "find", item, at: t });
    } else if (fishing.TRIP_WATERS.includes(trip.area) && rng.random() < fishing.TRIP_CHANCE) {
      // a rest by the water: it fishes, and what it catches comes home with it
      const caught = fishing.catchFrom(state, trip.area, rng);
      if (caught) {
        trip.found.push(caught);
        events.push(["find", caught]);
      }
      happened(trip, { kind: "fish", item: caught, at: t });
    } else {
      trip.last = { kind: "rest", item, at: t }; // a rest is not worth a line in the diary
    }
  }
  if (t < trip.end) {
    return [events, null];
  }
  if (trip.next) { // called straight back home doesn't count
    if (trip.area !== festival.AREA && digging.mapFrom(state, trip, (state.counters.trips ?? 0) + 1)) {
      trip.found.push(digging.MAP); // a treasure map, among what it brings home
      events.push(["find", digging.MAP]);
      note(trip, { kind: "find", item: digging.MAP, at: t });
    }
    state.counters.trips = (state.counters.trips ?? 0) + 1;
    life.record(state, "trips"); // in a child's care diary too (the fox line)
    life.record(state, `trips_${trip.area}`);
    life.record(state, "rain_trips", trip.rained ? 1 : 0);
  }
  state.trip = null;
  return [events, trip];
}
