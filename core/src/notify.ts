/**
 * When the pet will need somebody next: for the app on the phone, which leaves a notification
 * for that moment when it goes into the background (app/src/notify.ts).
 *
 * The simulation has no randomness of its own (it is seeded from the time), so a copy of the
 * state can simply be run ahead to see what will happen. Only real needs count, and rarely:
 * hunger, dirt and sadness once they are critical, and being sick. Tiredness doesn't, the pet
 * goes to sleep by itself; a single poop doesn't either. A need it already has when the app goes
 * into the background has been seen. And it never calls at night: a need that comes up while it
 * sleeps or at bedtime waits until it is up again.
 */

import * as model from "./model";
import type { PetState } from "./state";
import type { Location } from "./sun";
import type { Yard } from "./yard";

export const HORIZON = 24 * 3600; // a day ahead at most (a little later it is at Grandma's anyway)
// The needs it calls for, in order of priority
export const CALLS = ["health", "satiety", "hygiene", "mood"] as const;
export type Call = (typeof CALLS)[number];

/** A moment the pet will call: when (Unix seconds) and for what. */
export interface Reminder {
  at: number;
  need: Call;
}

/** The needs it would call for right now. */
export function calls(state: PetState): Call[] {
  if (state.stage === "egg" || state.grandma) { // at Grandma's it is looked after
    return [];
  }
  return CALLS.filter((need) => need === "health" ? state.sick : state.stats[need] < model.CRITICAL);
}

/**
 * The next moment a new need comes up while it is awake, at home and not at bedtime, if nobody
 * does anything until then; null if none does within HORIZON. `state` must be caught up to `now`
 * and is not changed. Weather is left out: it only changes trips, plants and waking in the cold.
 * `yard`: the home's yard, which looks after it for a while (as if this pet were the only one to use it).
 */
export function nextReminder(state: PetState, now: number, bedtime: model.Bedtime,
    location: Location = null, yard: Yard | null = null): Reminder | null {
  const s = structuredClone(state);
  const supply = yard && { ...yard };
  const seen = new Set(calls(s));
  while (s.updated_at + model.TICK <= now + HORIZON) {
    s.updated_at += model.TICK;
    model.tick(s, s.updated_at, bedtime, null, null, location, supply);
    const current = calls(s);
    for (const need of seen) {
      if (!current.includes(need)) {
        seen.delete(need); // it got over it by itself: should it come back, that is news again
      }
    }
    if (s.asleep || s.trip || model.isBedtime(s.updated_at, bedtime)) {
      continue;
    }
    const fresh = current.find((need) => !seen.has(need));
    if (fresh) {
      return { at: s.updated_at, need: fresh };
    }
  }
  return null;
}
