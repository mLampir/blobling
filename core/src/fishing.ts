/**
 * Fishing: at the pond in the garden, and by itself at a rest by the water on a trip.
 *
 * At home the pet casts its line, the bobber rocks on the water, and when it dips under somebody
 * taps and the pet pulls. Too early: it reels in with nothing, and that costs nothing. Too late:
 * whatever it was has got away. When the bite comes is decided at the cast (seeded), so the scene
 * shows the dip at the same moment the tap is judged against.
 *
 * Mostly it catches something to eat, now and then an old boot, and rarely an egg: at the pond the
 * crab's, in the lake of the cave the axolotl's. Angloop is a fisher by nature: with its lure
 * something bites more often, and the rare things too.
 */

import * as home from "./home";
import { Random } from "./random";
import type { PetState } from "./state";

export const FISH_ENERGY = 15; // minimum energy, same as playing
export const BITE_DELAY = [3.0, 9.0] as const; // seconds from the cast to the bite
export const BITE_WINDOW = 2.0; // this long the bobber stays under: a tap now pulls it in
export const BITE_CHANCE = 0.8; // something bites at all (times how often it has fished lately)
export const EMPTY_WAIT = 12.0; // nothing bites: it reels in by itself after this long
export const COST = { energy: 8, satiety: 4 } as const;
export const LURE = "angloop"; // the fisher by nature
export const LURE_BITE = 1.25; // something bites this much more often with its lure (up to always)
export const LURE_RARE = 2; // and the rare things come this much more often

// Where: what bites [catch, weight]. "egg": the rare egg of that water (EGGS).
export const CATCHES: Record<string, readonly (readonly [string, number])[]> = {
  pond: [["mussel", 10], ["seagrass", 8], ["boot", 2], ["egg", 1]],
  stream: [["mussel", 10], ["seagrass", 8], ["boot", 2], ["egg", 1]],
  cave: [["mussel", 6], ["seagrass", 4], ["glowberry", 3], ["egg", 1]],
};
export const EGGS: Record<string, string> = { pond: "egg_crab", stream: "egg_crab", cave: "egg_axolotl" };
// A water the pet has fished this often without ever bringing up its egg gives it the next time,
// so the egg can't be missed with good play.
export const SURE_AFTER = 15;
export const TRIP_CHANCE = 0.5; // on a trip: at a rest by the water, how often it fishes
export const TRIP_WATERS = ["stream", "cave"];

/** The pond is set out in the garden: the pet can fish at home. */
export function canFish(state: PetState): boolean {
  return home.placeDeco(state).outside.includes("pond");
}

/** The line is cast: when (state.fishing.at), and after how many seconds something bites (null: nothing will). */
export function cast(state: PetState, now: number, factor: number): number | null {
  const rng = new Random(`cast:${now}`);
  const lure = state.species === LURE ? LURE_BITE : 1;
  // two digits: the scene is told the same delay as the one that is kept
  const bite = rng.random() < BITE_CHANCE * factor * lure
    ? Number(rng.uniform(...BITE_DELAY).toFixed(2)) : null;
  state.fishing = { at: now, bite };
  return bite;
}

/** Is a line in the water (until the bite is over, or the pet reels in by itself)? */
export function active(state: PetState, now: number): boolean {
  const line = state.fishing;
  return !!line && now < line.at + (line.bite === null ? EMPTY_WAIT : line.bite + BITE_WINDOW);
}

/** The tap: "early" (it reels in with nothing), "caught", or "gone" (too late). */
export function pull(state: PetState, now: number): "early" | "caught" | "gone" {
  const line = state.fishing!;
  state.fishing = null;
  if (line.bite === null || now < line.at + line.bite) {
    return "early";
  }
  return now < line.at + line.bite + BITE_WINDOW ? "caught" : "gone";
}

/**
 * What comes up out of this water. Things that exist only once (the boot) and what there is no room
 * for are left out; the egg is the water's own (EGGS), and sure after SURE_AFTER catches without it.
 */
export function catchFrom(state: PetState, water: string, rng: Random): string | null {
  const egg = EGGS[water];
  const tries = state.counters[`fished_${water}`] = (state.counters[`fished_${water}`] ?? 0) + 1;
  if (!state.counters[`fished_${egg}`] && tries >= SURE_AFTER && home.canAdd(state, egg)) {
    return got(state, egg);
  }
  const rare = state.species === LURE ? LURE_RARE : 1;
  const options = CATCHES[water].filter(([item]) => home.canAdd(state, item === "egg" ? egg : item));
  if (!options.length) {
    return null;
  }
  const item = rng.weighted(options.map(([item]) => item),
    options.map(([item, weight]) => ["egg", "boot"].includes(item) ? weight * rare : weight));
  return got(state, item === "egg" ? egg : item);
}

function got(state: PetState, item: string): string {
  state.counters[`fished_${item}`] = (state.counters[`fished_${item}`] ?? 0) + 1;
  return item;
}
