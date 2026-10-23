/**
 * The playground: a screen of its own along the street, after the yard. A home with two pets or
 * more has one once the first of its pieces has been found on a trip (PIECES): a swing hanging
 * from a tree, a sandpit sunk into the soil, a seesaw.
 *
 * The neighbours' times together by day (companion.ts) happen there: the first pair that gets
 * together goes over, and only one pair fits, so a second pair meets in a garden as before. Over
 * there they take turns with what the playground has (TURN seconds each, then a game of their
 * own). It is worth more than meeting in a garden: a child counts it as a whole playtime instead of
 * half a one, and every piece cheers both of them up a little (MOOD_PER_PIECE). Playing in the
 * sandpit, they leave a sandcastle in it, which stays until the rain washes it away (yard.ts).
 */

import type { PetState } from "./state";

// The pieces in the order the scene draws them, and the area each is found in (trip.FINDS)
export const PIECES = ["swing", "sandpit", "seesaw"] as const;
export type Piece = typeof PIECES[number];
export const PLAYS = 1.0; // a time together over there counts as a whole playtime in a child's diary
export const MOOD_PER_PIECE = 4; // and each piece cheers both of them up this much
export const TURN = 60; // seconds they spend with each piece before going on to the next

/** The pieces the home has found, in the order of PIECES. */
export function pieces(items: Record<string, number>): Piece[] {
  return PIECES.filter((piece) => (items[piece] ?? 0) > 0);
}

/** Has the home a playground: two pets or more, and at least one piece? */
export function open(items: Record<string, number>, pets: number): boolean {
  return pets >= 2 && pieces(items).length > 0;
}

/**
 * What they are doing `since` seconds after they got there: one of the pieces, or null for a game
 * of their own (companion.ts, as in a garden). They go round the pieces and their own game in turn.
 */
export function turn(found: readonly string[], since: number): string | null {
  const turns = [...found, null];
  return turns[Math.floor(Math.max(0, since) / TURN) % turns.length];
}

/** The two have played on the playground: the mood the pieces bring, for both of them. */
export function played(a: PetState, b: PetState, items: Record<string, number>): void {
  const mood = MOOD_PER_PIECE * pieces(items).length;
  a.stats.mood += mood;
  b.stats.mood += mood;
}
