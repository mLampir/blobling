/**
 * Life while nobody watches: what the pet does by itself, and what it has to tell when somebody
 * comes back.
 *
 * Everything here happens in the simulation step (model.tick), with randomness seeded from the
 * time, so it is the same whether or not anybody is looking at the panel.
 */

import * as care from "./care";
import * as ground from "./ground";
import * as home from "./home";
import { Random } from "./random";
import * as sky from "./sky";
import type { PetEvent, PetState, WeatherSeen } from "./state";

export const EVERY = [60 * 60, 120 * 60] as const; // seconds between two things it does by itself
export const RETRY = 10 * 60; // it was busy when the time came: it tries again this much later
export const QUIET = 15 * 60; // this long after somebody did something with it, it is left to itself
export const ENERGY = 30; // it needs at least this much energy

// Playing with the ball by itself: a little mood, much less than playing together
export const BALL_MOOD = 4;
export const BALL_ENERGY = 1;

// Practicing a trick by itself: only tricks it has been shown, a little at a time, and only
// SOLO_LIMIT points between two practices together. It never learns a trick alone.
export const PRACTICE_STEP = 0.25;
export const SOLO_LIMIT = 0.5;
export const PRACTICE_MOOD = 2;
export const PRACTICE_ENERGY = 1;

// What it leaves behind (state.trace) until somebody does something with it. Only one at a time;
// playing with the ball again only moves the ball. A snowman is built only in real snow.
export const BUILDS = ["tower", "drawing"] as const;
export const BUILD_CHANCE = 0.5; // instead of playing with the ball, when nothing lies around yet
export const SNOWMAN_CHANCE = 0.7; // when it snows, it would rather build a snowman
export const MELT_ABOVE = 3; // °C: above this a snowman melts away
export const DRAWINGS = 2; // how many different drawings it can scratch into the ground

// Now and then it finds something small at home (state.found), like a friend's gift: mostly a
// fruit, rarely a seed. It lies in one spot until somebody picks it up, and nothing new turns up
// while it is there.
export const FIND_CHANCE = 0.12; // of the times it gets busy by itself (about once a day)

export const WELCOME_AFTER = 6 * 3600; // nobody did anything with it for this long: it has something to tell
export const WELCOME_LINES = 8;
// Things it did by itself that are not worth telling: they followed something a person did
const UNTOLD = ["heart"];

/** What it can do by itself right now: play (with the ball, or building something), or practice. */
type Pastime = "ball" | "practice";

/** Tricks it could practice alone: started together, not known yet, and not practiced alone too much. */
export function practicable(state: PetState): string[] {
  return Object.keys(care.TRICKS).filter((trick) => {
    const points = state.tricks[trick] ?? 0.0;
    return points > 0 && points + PRACTICE_STEP < care.TRICKS[trick]
      && (state.solo[trick] ?? 0.0) + PRACTICE_STEP <= SOLO_LIMIT;
  });
}

/** Can it get busy by itself at the time t? (The model checks sleep, trips and the activity.) */
function free(state: PetState, t: number): boolean {
  return state.stage !== "egg" && !state.sick && state.game === null && state.training === null
    && !ground.there(state, t) && state.stats.energy >= ENERGY && t - state.seen_at >= QUIET;
}

/**
 * One minute of its own life, ending at time t. `busy`: it can't start anything right now
 * (asleep, away, in the middle of something, a friend is visiting); `weather`: the WMO code.
 * Returns what it does, as [activity for the scene, item for the scene, action and item for the
 * history], or null.
 */
export function step(state: PetState, t: number, busy: boolean,
    weather: sky.WeatherCode = null): [string, string, string, string] | null {
  if (state.idle_next === 0.0) {
    state.idle_next = t + new Random(`${t}:idle`).uniform(...EVERY);
    return null;
  }
  if (t < state.idle_next) {
    return null;
  }
  if (busy || !free(state, t)) {
    state.idle_next = t + RETRY;
    return null;
  }
  const rng = new Random(`${t}:idle`);
  state.idle_next = t + rng.uniform(...EVERY);
  const look = new Random(`${t}:found`);
  if (state.found === null && look.random() < FIND_CHANCE) {
    state.found = home.smallThing(state, look);
    return ["discover", state.found, "found", state.found];
  }
  const workouts = ground.practicable(state);
  if (workouts.length > 0 && rng.random() < ground.SOLO_CHANCE) {
    // over to the training ground, with the equipment for a stat (ground.ts)
    const skill = rng.choice(workouts);
    ground.practiceAlone(state, skill, t);
    return ["train_solo", skill, "solo", skill];
  }
  const tricks = practicable(state);
  const pastime: Pastime = tricks.length > 0 && rng.random() < 0.5 ? "practice" : "ball";
  const s = state.stats;
  if (pastime === "practice") {
    const trick = rng.choice(tricks);
    const ok = rng.random() < care.TRICK_LUCK + (1 - care.TRICK_LUCK) * care.trickProgress(state, trick);
    state.tricks[trick] += PRACTICE_STEP;
    state.solo[trick] = (state.solo[trick] ?? 0.0) + PRACTICE_STEP;
    s.mood += PRACTICE_MOOD;
    s.energy -= PRACTICE_ENERGY;
    return ["trick", `${trick}:${ok ? "ok" : "fail"}`, "solo", trick];
  }
  s.mood += BALL_MOOD;
  s.energy -= BALL_ENERGY;
  const spot = rng.random();
  if (state.trace === null) {
    const snow = sky.precipitation(weather) === "snow";
    const kind = snow && rng.random() < SNOWMAN_CHANCE ? "snowman"
      : rng.random() < BUILD_CHANCE ? rng.choice(BUILDS) : null;
    if (kind) {
      state.trace = { kind, spot, look: rng.randint(0, DRAWINGS - 1) };
      return ["build", kind, "solo", kind];
    }
  }
  if (state.trace === null || state.trace.kind === "ball") {
    state.trace = { kind: "ball", spot, look: 0 }; // it leaves the ball lying where it rolled
  }
  return ["play", "", "solo", "ball"];
}

/** Pick up what it found: a fruit is eaten straight away, a seed is kept. Returns what it was. */
export function pickUp(state: PetState): string {
  const found = state.found!;
  state.found = null;
  home.receive(state, found);
  return found;
}

/** Somebody does something with it: what it left behind has been seen, and is cleared away. */
export function noticed(state: PetState): void {
  state.trace = null;
}

/** One minute of weather: a snowman melts once it is warm. */
export function melt(state: PetState, temp: number | null): void {
  if (state.trace?.kind === "snowman" && temp !== null && temp > MELT_ABOVE) {
    state.trace = null;
  }
}

/** It has practiced a trick together with somebody: it may practice that one alone again. */
export function practicedTogether(state: PetState, trick: string): void {
  delete state.solo[trick];
}

/** One line of what happened: the action and item from the history, and how often. */
export interface Told {
  action: string;
  item: string | null;
  count: number;
}

/**
 * What happened while nobody was there, for the app: from the last time somebody did something
 * with it, if that was at least WELCOME_AFTER ago and there is anything to tell. Same things
 * are told once, with a count, in the order they first happened.
 */
export function welcome(state: PetState, now: number): { since: number; told: Told[] } | null {
  const since = state.seen_at;
  if (since === 0.0 || now - since < WELCOME_AFTER) {
    return null;
  }
  const told: Told[] = [];
  for (const event of state.events) {
    if (!worthTelling(event, since)) {
      continue;
    }
    const item = event.item ?? null;
    const same = told.find((line) => line.action === event.action && line.item === item);
    if (same) {
      same.count += 1;
    } else {
      told.push({ action: event.action, item, count: 1 });
    }
  }
  return told.length > 0 ? { since: Math.round(since), told: told.slice(0, WELCOME_LINES) } : null;
}

export function worthTelling(event: PetEvent, since: number): boolean {
  return event.at > since && event.by === "system" && event.accepted && !UNTOLD.includes(event.action);
}

// ---------- The weather while nobody is there ----------

export type PartOfDay = "morning" | "afternoon" | "evening" | "night";

/** The part of the day at the time t, in local time. */
export function partOfDay(t: number): PartOfDay {
  const hour = new Date(t * 1000).getHours();
  return hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon"
    : hour >= 17 && hour < 22 ? "evening" : "night";
}

/** The local day and part of the day at the time t, as a key ("2026-9-15:morning"). */
function slot(t: number): string {
  const date = new Date(t * 1000);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}:${partOfDay(t)}`;
}

/**
 * One minute of weather at the time t ("rain", "snow" or null): kept for the story when somebody
 * comes back, once per kind and part of the day. What was before somebody was last there is
 * dropped, so the list stays short.
 */
export function noteWeather(state: PetState, t: number, kind: WeatherSeen["kind"] | null): void {
  if (kind === null) {
    return;
  }
  const seen = state.weather_seen.filter((w) => w.at > state.seen_at);
  if (!seen.some((w) => w.kind === kind && slot(w.at) === slot(t))) {
    seen.push({ at: t, kind });
  }
  state.weather_seen = seen;
}
