/**
 * Habits: the pet notices the times of day it is usually fed or played with, and waits at the
 * edge of the panel a little before. Only as a pose in the scene, never as an icon or a need, so
 * it doesn't nag.
 */

import * as care from "./care";
import * as wild from "./wild";
import type { PetState } from "./state";

export const DAYS = 7; // it remembers this many days
export const USUAL = 3; // on at least this many of them at about the same time: that is a habit
export const SPREAD = 30; // minutes apart that still count as the same time
export const LEAD = 20; // it starts waiting this many minutes before
export const ANSWERED = 60; // fed or played with this many minutes ago: it doesn't wait
export const LIMIT = 100; // times kept at most
export const ACTIONS = ["feed", "play", "game"]; // what counts as being fed or played with

/** Minutes after midnight at the time t, in local time. */
function minuteOf(t: number): number {
  const date = new Date(t * 1000);
  return date.getHours() * 60 + date.getMinutes();
}

/** The local calendar day of the time t, as a number. */
function dayOf(t: number): number {
  const date = new Date(t * 1000);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

/** Minutes from a to b on the clock, either way round midnight. */
function apart(a: number, b: number): number {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

/** Somebody has fed it or played with it at the time t: it remembers the time. */
export function record(state: PetState, action: string, t: number): void {
  if (!ACTIONS.includes(action)) {
    return;
  }
  state.habits = [...state.habits.filter((h) => t - h < DAYS * 86400 && h <= t), Math.round(t)].slice(-LIMIT);
}

/** The times of day (minutes after midnight) it has got used to, earliest first. */
export function usualTimes(state: PetState, now: number): number[] {
  const times = state.habits.filter((h) => now - h < DAYS * 86400 && h <= now);
  const usual = new Set<number>();
  for (const candidate of times.map(minuteOf)) {
    const days = new Set(times.filter((h) => apart(minuteOf(h), candidate) <= SPREAD).map(dayOf));
    if (days.size >= USUAL) {
      usual.add(candidate);
    }
  }
  return [...usual].sort((a, b) => a - b);
}

/**
 * Is it waiting right now? A usual time is at most LEAD minutes away, nobody has fed it or
 * played with it in the last ANSWERED minutes, and it is at home, awake and free.
 */
export function waiting(state: PetState, now: number): boolean {
  if (state.stage === "egg" || state.asleep || state.trip || state.sick || care.gameActive(state, now)
      || state.training || wild.visiting(state, now)) {
    return false;
  }
  if (state.habits.some((h) => h <= now && now - h < ANSWERED * 60)) {
    return false;
  }
  const minute = minuteOf(now);
  return usualTimes(state, now).some((usual) => {
    const ahead = (usual - minute + 1440) % 1440;
    return ahead > 0 && ahead <= LEAD;
  });
}
