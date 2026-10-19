/**
 * Food from trips: one kind per area (trip.FINDS), kept in small numbers (home.MAX_FOOD).
 *
 * It is given by hand, like a snack, and fills the pet up a little. What makes it worth carrying
 * home is what it leaves in the pet: a boost that waits until it is used, such as one more heart
 * on the next trip. A boost doesn't add up: while one is waiting, the same food is refused.
 *
 * The roles stay apart: the plant feeds the pet slowly and by itself, snacks are for mood and
 * the favorite, and found food is for a plan.
 */

import * as home from "./home";
import type { PetState } from "./state";

// Food: the boost it leaves until it is used
// - heart: the next trip starts with one more heart (trip.begin)
// - trick: the next trick practiced together counts double (model)
// - train: the next exercise counts double (model)
// - finder: on the next trip it finds something at every stop where nothing else happens
// - fresh: the next trip doesn't tire it or make it hungry, and finds as much as the first of the day
export const FOODS: Record<string, string> = {
  honeycomb: "heart",
  hazelnut: "trick",
  watercress: "train",
  glowberry: "finder",
  pinenut: "fresh",
};
export const SATIETY = 10;

export function isFood(item: string): boolean {
  return item in FOODS;
}

/** Give it found food. Returns null, or why not. */
export function give(state: PetState, item: string): string | null {
  if (state.asleep) {
    return "asleep";
  }
  if (!state.items[item]) {
    return "no_item";
  }
  const boost = FOODS[item];
  if (state.boosts.includes(boost)) {
    return "boost_waiting";
  }
  home.takeItem(state, item);
  state.boosts.push(boost);
  state.stats.satiety += SATIETY;
  return null;
}

/** Is this boost waiting? */
export function waiting(state: PetState, boost: string): boolean {
  return state.boosts.includes(boost);
}

/** Use the boost up. Returns whether it was waiting. */
export function use(state: PetState, boost: string): boolean {
  if (!waiting(state, boost)) {
    return false;
  }
  state.boosts = state.boosts.filter((b) => b !== boost);
  return true;
}

/** What a find does besides being there (for the app). */
export function effects(item: string): string[] {
  return isFood(item) ? [FOODS[item]] : [];
}
