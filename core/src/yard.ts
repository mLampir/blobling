/**
 * The yard: a screen of its own at the end of the street, right of the last house. It is there
 * once two pets live at home, and it belongs to the home, not to one of them, like the store.
 *
 * It holds a trough, which comes with the yard, and a water basin for bathing, found once at the
 * stream. Both hold portions, not time: a pet whose satiety (trough) or hygiene (basin) is down to
 * GOES_AT goes over by itself, eats a portion or bathes once, and comes back. Three portions a day
 * are about what a pet needs, so more pets empty it sooner. A tap on either fills it up. While
 * there is something in them, satiety and hygiene don't drop below FLOOR, and with both, mood not
 * below MOOD_FLOOR: looked after, not happy. It doesn't count as being fed (no care diary, no bond,
 * no favorite food), and it keeps a pet from Grandma's only while both have something.
 *
 * An upgrade found at the coast or in the ruins, once their guardian has left its egg, makes both
 * a size bigger; the basin takes the size the yard has when it comes.
 *
 * The basin comes with a rain barrel: while it really rains, the barrel tops the basin up by a
 * portion every RAIN_EVERY minutes. And in the evening, in the last FIRE_MINUTES before bedtime, a
 * campfire burns in the yard when it is dry: every pet that is awake, at home and not busy goes
 * over and sits there until bedtime, a little happier for it (FIRE_MOOD).
 *
 * All of it happens in the simulation step (model.tick), with every pet of the home stepped
 * together minute by minute (model.advanceTogether), so who gets the last portion is the same
 * whether anybody is looking or not.
 */

import * as sky from "./sky";
import type { PetState } from "./state";

export const SIZES = ["small", "medium", "large"] as const;
export type Size = (typeof SIZES)[number];
// What each size is meant to last, as [pets, days]
export const LASTS: readonly (readonly [number, number])[] = [[2, 2], [3, 4], [4, 7]];
// Portions per size: LASTS times what a pet left alone uses up in a day (npm run balance -- --yard),
// about three meals and three baths (hygiene goes down about as fast as satiety)
export const TROUGH = [12, 36, 84];
export const BASIN = [12, 36, 84];
export const PORTION = 30; // satiety or hygiene one portion brings back
export const GOES_AT = 50; // satiety or hygiene: down to this, it goes to the yard
export const FLOOR = 50; // while there is something in it, the need doesn't drop below this
export const MOOD_FLOOR = 40; // and with something in both, mood doesn't
export const MIN_PETS = 2; // the yard is there from this many pets at home
// The finds: the basin at the stream, and an upgrade each at the coast and in the ruins
export const BASIN_ITEM = "basin";
export const UPGRADES: Record<string, string> = { coast: "planks_coast", ruins: "planks_ruins" };
// A visit, in seconds: off at the edge of its garden, in at the side of the yard, a portion,
// out again, and back home
export const OUT = 2;
export const IN = 4;
export const PART = 60;
export const LEAVE = 4;
export const BACK = 3;
// The rain barrel: a portion into the basin every this many minutes of rain
export const RAIN_EVERY = 10;
// The campfire: from this many minutes before bedtime until bedtime; a pet that would get there
// for less than FIRE_LEAST minutes stays home. While it sits there, its mood goes up by FIRE_MOOD an hour.
export const FIRE_MINUTES = 40;
export const FIRE_LEAST = 10;
export const FIRE_MOOD = 10;
export const FIRE = "fire"; // the activity_item of a visit to the fire: "fire:<seconds>"

/** What is in the trough and the basin: portions (null: not filled yet, it comes full), and when one ran empty. */
export interface Yard {
  trough: number | null;
  basin: number | null;
  /** When the trough or the basin last ran empty while the other still had something (0 = never). */
  empty_at: number;
  /** The last minute the rain barrel has had (0 = none yet): it runs once a minute for the whole home. */
  rain_at: number;
}

export type What = "trough" | "basin";

export function newYard(): Yard {
  return { trough: null, basin: null, empty_at: 0, rain_at: 0 };
}

/** The yard from a save file; older files have none. */
export function readYard(data: unknown): Yard {
  const yard = newYard();
  if (data !== null && typeof data === "object") {
    const saved = data as Record<string, unknown>;
    for (const what of ["trough", "basin"] as const) {
      const value = saved[what];
      yard[what] = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
    }
    yard.empty_at = Number(saved.empty_at) || 0;
    yard.rain_at = Number(saved.rain_at) || 0;
  }
  return yard;
}

/** How big trough and basin are (0 = small): one size up for every upgrade in the store. */
export function sizeOf(items: Record<string, number>): number {
  return Math.min(SIZES.length - 1, Object.values(UPGRADES).filter((item) => (items[item] ?? 0) > 0).length);
}

/** Has the basin been found? */
export function hasBasin(items: Record<string, number>): boolean {
  return (items[BASIN_ITEM] ?? 0) > 0;
}

/** How many portions it holds at the size the yard has now (0: the basin isn't there yet). */
export function capacity(items: Record<string, number>, what: What): number {
  if (what === "basin" && !hasBasin(items)) {
    return 0;
  }
  return (what === "trough" ? TROUGH : BASIN)[sizeOf(items)];
}

/** What is in it now (0 while it isn't there). */
export function portions(yard: Yard, what: What): number {
  return yard[what] ?? 0;
}

/** A trough or basin that hasn't been filled yet comes full: with the yard, and the basin when it is found. */
export function settle(yard: Yard, items: Record<string, number>): void {
  for (const what of ["trough", "basin"] as const) {
    const most = capacity(items, what);
    if (yard[what] === null && most > 0) {
      yard[what] = most;
    }
    if (yard[what] !== null) {
      yard[what] = Math.min(yard[what]!, Math.max(most, 0));
    }
  }
}

/** Fills it up (a tap on it). Returns null, or why not. */
export function fill(yard: Yard, items: Record<string, number>, what: What): string | null {
  const most = capacity(items, what);
  if (!most) {
    return "no_basin";
  }
  if (portions(yard, what) >= most) {
    return "yard_full";
  }
  yard[what] = most;
  return null;
}

/** Both have something: the pets are looked after there. */
export function supplied(yard: Yard): boolean {
  return portions(yard, "trough") > 0 && portions(yard, "basin") > 0;
}

/** How full it looks: "empty", "low", "half" or "full". */
export function level(count: number, most: number): "empty" | "low" | "half" | "full" {
  const share = most > 0 ? count / most : 0;
  return count <= 0 ? "empty" : share <= 1 / 3 ? "low" : share <= 2 / 3 ? "half" : "full";
}

/** How long a visit takes, for what it does there ("eat", "bath", "eat,bath" or "fire:<seconds>"). */
export function seconds(item: string): number {
  if (item.startsWith(`${FIRE}:`)) {
    return Number(item.slice(FIRE.length + 1)) || 0;
  }
  return OUT + IN + PART * Math.max(1, item.split(",").length) + LEAVE + BACK;
}

/** Is a visit with this activity_item one to the campfire? */
export function atFire(item: string): boolean {
  return item.startsWith(`${FIRE}:`);
}

/**
 * The rain barrel, once a minute for the whole home (the minute ending at t): while it really rains
 * (not snow), every RAIN_EVERY minutes a portion runs into the basin, up to what it holds.
 */
export function rain(yard: Yard, items: Record<string, number>, t: number, weather: sky.WeatherCode): void {
  const minute = Math.trunc(t / 60);
  if (minute <= Math.trunc(yard.rain_at / 60)) {
    return; // another pet of the home has had this minute already
  }
  yard.rain_at = t;
  const most = capacity(items, "basin");
  if (!most || sky.precipitation(weather) !== "rain" || minute % RAIN_EVERY !== 0) {
    return;
  }
  yard.basin = Math.min(most, portions(yard, "basin") + 1);
}

/**
 * The campfire: `untilBed` is how many seconds are left until bedtime at the time t. Within the
 * last FIRE_MINUTES before it, on a dry evening, a pet goes over and stays until bedtime: returns
 * its activity_item ("fire:<seconds>"), or null if it doesn't go. The caller has checked that it is
 * awake, at home and not busy.
 */
export function toFire(untilBed: number, weather: sky.WeatherCode): string | null {
  if (untilBed > FIRE_MINUTES * 60 || untilBed < OUT + IN + FIRE_LEAST * 60 + LEAVE + BACK || sky.precipitation(weather)) {
    return null;
  }
  return `${FIRE}:${Math.round(untilBed)}`;
}

/** It sits at the fire this minute: a little happier. */
export function warm(state: PetState, minutes: number): void {
  state.stats.mood += FIRE_MOOD * minutes / 60;
}

/**
 * Where a pet on a visit is at the time `now`: "out" (walking off its garden), "there" (in the
 * yard, `e` seconds since it came in), "back" (coming home into its garden), or null if it isn't on
 * a visit. `activity` and `until` are its activity and activity_until.
 */
export function phase(activity: string, until: number, item: string, now: number):
    { where: "out" | "there" | "back"; e: number } | null {
  if (activity !== "yard" || now >= until) {
    return null;
  }
  const e = seconds(item) - (until - now);
  if (e < OUT) {
    return { where: "out", e };
  }
  if (e < seconds(item) - BACK) {
    return { where: "there", e: e - OUT };
  }
  return { where: "back", e: e - (seconds(item) - BACK) };
}

/**
 * One minute of the pet's life, ending at t: down to GOES_AT and with a portion for it, it goes to
 * the yard. Takes the portions, brings the stats back up and returns what it does there ("eat",
 * "bath" or both), or null if it doesn't go. The caller has checked that it is awake, at home and
 * not busy.
 */
export function visit(state: PetState, yard: Yard, t: number): string | null {
  const s = state.stats;
  const parts: string[] = [];
  const before = supplied(yard);
  if (s.satiety <= GOES_AT && portions(yard, "trough") > 0) {
    yard.trough! -= 1;
    s.satiety += PORTION;
    parts.push("eat");
  }
  if (s.hygiene <= GOES_AT && portions(yard, "basin") > 0) {
    yard.basin! -= 1;
    s.hygiene += PORTION;
    parts.push("bath");
  }
  if (before && !supplied(yard)) {
    yard.empty_at = t; // from now on, the time until Grandma's counts again
  }
  return parts.length ? parts.join(",") : null;
}

/**
 * While there is something in the yard, the needs don't drop below its floors: `before` are the
 * stats at the start of the minute, so a need that was already lower only isn't pushed further down.
 */
export function floors(state: PetState, yard: Yard, before: Readonly<Record<string, number>>): void {
  const s = state.stats;
  const floor = (key: "satiety" | "hygiene" | "mood", low: number) => {
    s[key] = Math.max(s[key], Math.min(before[key], low));
  };
  if (portions(yard, "trough") > 0) {
    floor("satiety", FLOOR);
  }
  if (portions(yard, "basin") > 0) {
    floor("hygiene", FLOOR);
  }
  if (supplied(yard)) {
    floor("mood", MOOD_FLOOR);
  }
}
