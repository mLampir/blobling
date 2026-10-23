/**
 * The trick festival on the meadow: every second Saturday, all day.
 *
 * Three days before, a poster hangs on the fence, and the app shows the festival where a trip in
 * progress stands. On the day, somebody picks up to four tricks in the order the pet shows them
 * and sends it there; if it hasn't gone by FESTIVAL_ALONE, it goes by itself and shows its best
 * tricks. It is the trip of the day: about an hour, with the show in the middle of it (trip.ts).
 *
 * Three wild pets from the areas it knows are the jury. Every trick works as surely as it has been
 * practiced; one that works brings its points (the flip the most), every other trick that works
 * one more, and a form's own trick (care.OWN_TRICKS) counts double. The places bring prizes: the
 * first an egg (the chameleon's, then the paper kite's, later one of a line in the jury), the
 * second and third a ribbon to set out (each once per home), everybody else something to eat.
 *
 * Babies and sick pets don't go, and a pet on a trip misses it; it comes again two weeks later.
 */

import * as care from "./care";
import * as grandma from "./grandma";
import * as home from "./home";
import * as keepsake from "./keepsake";
import * as life from "./life";
import { Random } from "./random";
import type { PetState, Trip } from "./state";
import * as wild from "./wild";

export const AREA = "festival"; // a trip to the festival is a trip with this area
// A Saturday from which every second one is a festival day (3 January 2026), as a day number
export const FIRST = Date.UTC(2026, 0, 3) / 86_400_000;
export const EVERY_DAYS = 14;
export const POSTER_DAYS = 3; // the poster hangs this many days before (and on the day itself)
export const ALONE_AT = 18 * 60; // minutes after midnight: not gone by then, it goes by itself
export const SHOW_AFTER = 25 * 60; // seconds from setting off to the show
export const BACK_AFTER = 60 * 60; // and back home
export const MAX_TRICKS = 4;
export const POINTS: Record<string, number> = { bow: 1, spin: 2, dance: 3, flip: 4 };
export const VARIETY = 1; // for every other trick that works
export const OWN_FACTOR = 2; // a form's own trick
export const PLACES = [10, 6, 3]; // points from which it comes first, second, third
export const JURY = 3;
export const PRIZE_EGGS = ["egg_chameleon", "egg_kite"]; // the first two first places, in this order
export const RIBBONS: Record<number, string> = { 2: "ribbon_blue", 3: "ribbon_red" };
export const FOOD = "honeycomb"; // for everybody else, and when a prize is had already

/** The local calendar day of t, as a number of days. */
export function dayOf(t: number): number {
  const date = new Date(t * 1000);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

/** Local midnight of a day number. */
export function midnightOf(day: number): number {
  const date = new Date(day * 86_400_000);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).getTime() / 1000;
}

/** The next festival day on or after the day of t (a day number). */
export function next(t: number): number {
  const day = dayOf(t);
  return day + (((FIRST - day) % EVERY_DAYS) + EVERY_DAYS) % EVERY_DAYS;
}

/** Is the day of t a festival day? */
export function today(t: number): boolean {
  return next(t) === dayOf(t);
}

/** Has it been to the festival today? */
export function went(state: PetState, t: number): boolean {
  return state.counters.festival_day === dayOf(t);
}

/** The festival coming up within POSTER_DAYS (its day number), while it hasn't been yet; null otherwise. */
export function announced(state: PetState, t: number): number | null {
  const day = next(t);
  return day - dayOf(t) <= POSTER_DAYS && !(day === dayOf(t) && went(state, t)) ? day : null;
}

/** Can it go to the festival now? null, or why not. */
export function canGo(state: PetState, t: number): string | null {
  return !today(t) ? "no_festival" : went(state, t) ? "festival_done" : state.stage === "egg" ? "egg"
    : state.stage === "baby" ? "too_young" : state.trip ? "away" : state.grandma ? "at_grandmas" : state.asleep ? "asleep"
    : state.sick ? "sick_trip" : null;
}

/** Is it time for it to go by itself (the minute ending at t is the one at ALONE_AT)? */
export function alone(state: PetState, t: number): boolean {
  const date = new Date(t * 1000);
  return date.getHours() * 60 + date.getMinutes() === ALONE_AT && canGo(state, t) === null;
}

/**
 * What it shows: the tricks picked, or else its best ones (the ones that bring the most, each once,
 * then the best one again), up to MAX_TRICKS.
 */
export function sequence(state: PetState, picked: readonly string[] = []): string[] {
  if (picked.length) {
    return picked.slice(0, MAX_TRICKS);
  }
  const worth = (trick: string) => care.trickProgress(state, trick) * points(state, trick);
  const best = Object.keys(POINTS).filter((trick) => care.trickProgress(state, trick) > 0)
    .sort((a, b) => worth(b) - worth(a));
  const shown = best.slice(0, MAX_TRICKS);
  while (shown.length && shown.length < MAX_TRICKS) {
    shown.push(best[0]);
  }
  return shown.length ? shown : ["bow"];
}

/** The points a trick brings when it works. */
export function points(state: PetState, trick: string): number {
  const own = care.OWN_TRICKS[`${state.stage}:${state.species}`]?.[trick] !== undefined;
  return POINTS[trick] * (own ? OWN_FACTOR : 1);
}

/** A trip to the festival, setting off now. `picked`: the tricks to show, in order. */
export function plan(state: PetState, now: number, picked: readonly string[] = []): Trip {
  return {
    area: AREA, start: now, end: now + BACK_AFTER, stations: [now + SHOW_AFTER], next: 0, found: [], factor: 1,
    last: null, hearts: 1, pack: [], guardian: null, log: [], tricks: sequence(state, picked),
  };
}

/** One trick of the show: [trick, whether it worked, the points it brought]. */
export type Shown = [string, boolean, number];

/** The whole show: the tricks, the points, the place (1–3, 0 = it took part), the prize and the jury. */
export interface Show {
  rounds: Shown[];
  points: number;
  place: number;
  prize: string;
  jury: string[];
}

/** Points for a show: what worked, and one more for every other trick that worked. */
export function score(rounds: readonly Shown[]): number {
  const worked = new Set(rounds.filter(([, ok]) => ok).map(([trick]) => trick));
  return rounds.reduce((sum, [, , got]) => sum + got, 0) + VARIETY * Math.max(0, worked.size - 1);
}

/** The place for so many points: 1, 2, 3, or 0 for taking part. */
export function placeFor(total: number): number {
  const index = PLACES.findIndex((least) => total >= least);
  return index < 0 ? 0 : index + 1;
}

/** Three wild pets from the areas it knows (`areas`, the meadow always among them), the same for the whole day. */
export function jury(areas: readonly string[], day: number): string[] {
  const rng = new Random(`jury:${day}`);
  const pool = [...new Map(areas.flatMap((area) => wild.WILD[area] ?? []).map(([form, weight]) => [form, weight]))];
  const chosen: string[] = [];
  while (chosen.length < JURY && chosen.length < pool.length) {
    const left = pool.filter(([form]) => !chosen.includes(form));
    chosen.push(rng.weighted(left.map(([form]) => form), left.map(([, weight]) => weight)));
  }
  return chosen;
}

/** The show at the festival, at the time t. `areas`: where the pet knows its way (for the jury). */
export function perform(state: PetState, trip: Trip, areas: readonly string[], t: number): Show {
  const rng = new Random(`festival:${Math.trunc(t)}`);
  const rounds = (trip.tricks ?? sequence(state)).map((trick): Shown => {
    const ok = rng.random() < care.trickProgress(state, trick);
    return [trick, ok, ok ? points(state, trick) : 0];
  });
  const total = Math.round(score(rounds) * keepsake.factor(state, "festival"));
  const place = placeFor(total);
  const panel = jury(areas, dayOf(trip.start));
  const c = state.counters;
  c.festivals = (c.festivals ?? 0) + 1;
  if (place) {
    c[`festival_${place}`] = (c[`festival_${place}`] ?? 0) + 1;
  }
  if (place === 1) {
    life.record(state, "festival_wins"); // a first place as a child (the magpie line)
  }
  if (rounds.some(([trick, ok]) => trick === "dance" && ok)) {
    life.record(state, "festival_dance"); // the dance shown, and it worked, as a child (the dog line)
  }
  return { rounds, points: total, place, prize: prize(state, place, panel, rng), jury: panel };
}

/** What a place brings: an egg for the first, a ribbon for the second and third, and food otherwise. */
export function prize(state: PetState, place: number, panel: readonly string[], rng: Random): string {
  const c = state.counters;
  if (place === 1) {
    const won = c.festival_eggs ?? 0;
    const lines = panel.filter((form) => !life.WILD_ONLY.includes(form)).map((form) => life.lineOf(form));
    const egg = PRIZE_EGGS[won] ?? home.eggOf(rng.choice(lines.length ? lines : grandma.knownLines(state)));
    if (home.canAdd(state, egg)) {
      c.festival_eggs = won + 1;
      return egg;
    }
  }
  const ribbon = RIBBONS[place];
  if (ribbon && home.canAdd(state, ribbon)) {
    return ribbon;
  }
  return home.canAdd(state, FOOD) ? FOOD : `fruit_${rng.choice(Object.keys(home.PLANTS))}`;
}
