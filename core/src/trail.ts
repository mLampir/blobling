/**
 * Trails to the secret forms: short stories and notes that point the way to a line's secret adult
 * form (life.SECRET), which the choice never gives a hint for.
 *
 * A line has three trails, each found in its own place: a friend or garden guest tells it on a
 * visit, a note lies at a quiet stop of a trip to an area where the line is at home, it comes up
 * when digging or fishing, or Grandma tells it when the pet comes home from her with her things.
 * Trails come only for a line whose two usual adult forms the home has had while its secret form
 * is still missing (state.trail_lines): first the line is known, then its secret is looked for.
 *
 * Every trail is found once per home. They are kept in the shared store like the finds, under
 * "trail:<line>:<number>" (not a thing for the bag, which lists only home.ITEMS); the album shows
 * them on the line's page, a missing one as an empty line.
 */

import { Random } from "./random";
import type { PetState } from "./state";

// Line: where its trails are found, in their order. "friend": a visit of a friend or garden guest
// that counts (wild.step); "dig", "fish": digging up the cross, a catch at the pond or on a trip;
// "grandma": fetched with Grandma's things (grandma.gifts); else an area: a quiet stop of a trip there.
export const TRAILS: Record<string, readonly string[]> = {
  blob: ["friend", "meadow", "grandma"],
  ember: ["cave", "friend", "dig"],
  stone: ["stream", "fish", "grandma"],
  fox: ["forest", "friend", "dig"],
  cloud: ["mountain", "friend", "grandma"],
  leaf: ["forest", "dig", "friend"],
  duck: ["stream", "fish", "friend"],
  hippo: ["stream", "fish", "grandma"],
  beak: ["meadow", "friend", "grandma"],
  caterpillar: ["meadow", "friend", "dig"],
  dog: ["friend", "meadow", "grandma"],
  dragonfly: ["stream", "meadow", "friend"],
  beaver: ["forest", "stream", "dig"],
  crab: ["coast", "fish", "friend"],
  axolotl: ["cave", "fish", "grandma"],
  mouse: ["ruins", "grandma", "friend"],
  bear: ["forest", "friend", "dig"],
  penguin: ["mountain", "coast", "friend"],
  bat: ["cave", "friend", "grandma"],
  owl: ["forest", "mountain", "grandma"],
  chameleon: ["forest", "friend", "dig"],
  scarab: ["ruins", "dig", "friend"],
  kite: ["mountain", "meadow", "friend"],
  octopus: ["coast", "fish", "friend"],
  gargoyle: ["ruins", "mountain", "grandma"],
  magpie: ["meadow", "friend", "dig"],
};
// How often a chance there brings one of the trails waiting there; an area: per quiet stop
export const CHANCE: Record<string, number> = { friend: 0.3, dig: 0.5, fish: 0.3, grandma: 1.0 };
export const STOP_CHANCE = 0.25;

/** How a trail is kept in the store. */
export function key(line: string, n: number): string {
  return `trail:${line}:${n}`;
}

/** Which of a line's trails the home has found (`items`: the shared store). */
export function found(items: Record<string, number>, line: string): boolean[] {
  return (TRAILS[line] ?? []).map((_, n) => !!items[key(line, n)]);
}

/**
 * A trail found at `where` at the time t, or null: one of those waiting there for a line it may
 * come for (state.trail_lines), now and then (CHANCE). It is kept at once; returns its key.
 */
export function find(state: PetState, where: string, t: number): string | null {
  const waiting = (state.trail_lines ?? []).flatMap((line) => (TRAILS[line] ?? [])
    .flatMap((w, n) => (w === where && !state.items[key(line, n)] ? [key(line, n)] : [])));
  if (!waiting.length) {
    return null;
  }
  const rng = new Random(`trail:${where}:${Math.trunc(t)}`);
  if (rng.random() >= (CHANCE[where] ?? STOP_CHANCE)) {
    return null;
  }
  const trail = rng.choice(waiting);
  state.items[trail] = 1;
  return trail;
}

/** The history entry of a trail found at `where`: "trail_friend", "trail_dig", "trail_fish", "trail_grandma" or "trail_trip". */
export function action(where: string): string {
  return `trail_${where in CHANCE ? where : "trip"}`;
}
