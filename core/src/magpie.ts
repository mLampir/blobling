/**
 * The troublemaker: a magpie (Glintrick, the first adult of the magpie line) that comes now and then
 * to steal a decoration standing outside.
 *
 * She only comes to a home that has had many lines (LINES_FIRST), by day, and only when something
 * stands outside; about twice a week, never two days in a row. When a strong adult is at home and
 * awake, it chases her off, and she drops what she took (a scuffle the scene shows). Otherwise she
 * flies off with it and brings it back an hour later, with a bow. Once she has been chased off
 * CHASES_FOR_EGG times, she leaves her top hat with an egg in it (in the nest, like a friend's egg);
 * after that she comes less often.
 *
 * All of this belongs to the home, like the decorations (model.nextPet, model.moveHome).
 */

import * as festival from "./festival";
import * as home from "./home";
import { Random } from "./random";
import type { Magpie, PetState } from "./state";

export const LINE = "magpie";
export const LINES_FIRST = 15; // lines the home has had (eggs in the album) before she comes
export const DAY = [9 * 60, 17 * 60] as const; // she comes between these minutes of the day
export const DAYS_BETWEEN = [2, 5] as const; // days from one visit to the next: about twice a week, never on the next day
export const DAYS_BETWEEN_LATER = [10, 18] as const; // the same, once she has left her egg: about every two weeks
export const BACK_AFTER = 3600; // seconds until she brings back what she took
export const CHASE_STRENGTH = 30; // a pet this strong (battle.SKILLS) chases her off
export const CHASES_FOR_EGG = 5;
export const SEEN_SECONDS = 20; // how long the scene shows a visit (the chase is as long, model.ACTIVITY_SECONDS)

export type Deed = NonNullable<Magpie["deed"]>;

/** A history entry to write: [action, item]. */
export type Happened = [string, string];

/** Does she come to this home at all? */
export function comes(state: PetState): boolean {
  return state.lines_had >= LINES_FIRST;
}

/** When she comes next after t: some days later, at a time of day she is about. */
export function plan(state: PetState, t: number, rng: Random): number {
  const [least, most] = state.magpie.egg ? DAYS_BETWEEN_LATER : DAYS_BETWEEN;
  const day = festival.dayOf(t) + rng.randint(least, most);
  return festival.midnightOf(day) + 60 * rng.randint(DAY[0], DAY[1] - 1);
}

function daytime(t: number): boolean {
  const date = new Date(t * 1000);
  const minute = date.getHours() * 60 + date.getMinutes();
  return minute >= DAY[0] && minute < DAY[1];
}

/** Can the pet chase her off: an adult, strong enough, at home and awake? */
export function chaser(state: PetState, atHome: boolean): boolean {
  return atHome && state.stage === "adult" && (state.skills.strength ?? 0) >= CHASE_STRENGTH;
}

/**
 * One minute, ending at t. `atHome`: the pet is there and awake. Returns what happened, for the
 * history.
 */
export function step(state: PetState, t: number, atHome: boolean): Happened[] {
  const m = state.magpie;
  if (m.stolen !== null && t >= m.back_at) {
    return [["magpie_back", bringBack(state, t)]];
  }
  if (!comes(state)) {
    return [];
  }
  const rng = new Random(`magpie:${Math.trunc(t)}`);
  if (!m.next) {
    m.next = plan(state, t, rng);
    return [];
  }
  if (t < m.next || m.stolen !== null) {
    return [];
  }
  m.next = plan(state, t, rng);
  const outside = home.placeDeco(state).outside;
  if (!daytime(t) || !outside.length) {
    return []; // too late in the day, or nothing to take: she doesn't come this time
  }
  const item = rng.choice(outside);
  Object.assign(m, { at: t, item });
  if (!chaser(state, atHome)) {
    // off with it
    Object.assign(m, { deed: "stole", stolen: item, index: state.deco.indexOf(item), spot: outside.indexOf(item),
      back_at: t + BACK_AFTER });
    state.deco = state.deco.filter((other) => other !== item);
    home.takeItem(state, item);
    return [["magpie_stole", item]];
  }
  Object.assign(m, { deed: "chased", chases: m.chases + 1 });
  const happened: Happened[] = [["magpie_chased", item]];
  if (m.chases >= CHASES_FOR_EGG && !m.egg && !state.nest && home.canAdd(state, home.eggOf(LINE))) {
    // she has had enough: she leaves her top hat behind, and an egg in it
    state.nest = { line: LINE };
    m.egg = true;
    m.next = plan(state, t, rng);
    happened.push(["magpie_egg", LINE]);
  }
  return happened;
}

/** She brings back what she took, and it stands where it stood. Returns the decoration. */
function bringBack(state: PetState, t: number): string {
  const m = state.magpie;
  const item = m.stolen!;
  home.addItem(state, item);
  if (!state.deco.includes(item)) {
    state.deco.splice(Math.min(m.index, state.deco.length), 0, item);
    state.deco.splice(0, Math.max(0, state.deco.length - home.decoSpots(state)));
  }
  Object.assign(m, { deed: "back", at: t, item, stolen: null });
  return item;
}

/**
 * What the scene shows of her: what she did, seconds since, the decoration, and where it stands
 * (its slot outside); null when she is not there.
 */
export function seen(state: PetState, now: number): { deed: Deed; age: number; item: string; spot: number } | null {
  const m = state.magpie;
  if (!m.deed || now - m.at >= SEEN_SECONDS || now < m.at) {
    return null;
  }
  const spot = m.deed === "stole" ? m.spot : home.placeDeco(state).outside.indexOf(m.item);
  return spot < 0 ? null : { deed: m.deed, age: now - m.at, item: m.item, spot };
}
