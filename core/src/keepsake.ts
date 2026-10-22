/**
 * Keepsakes of the lines: once the home has had all three adult forms of a line (the album), the
 * next pet to come home from a trip finds that line's keepsake in its backpack, once per home.
 *
 * A keepsake is a decoration with a small effect of its own. It works for the pet that has it set
 * out, outside or in the house (like the ember stone), and only while it is set out; with at most
 * five spots and 26 keepsakes, which ones stand there is a real choice. The scene shows what each
 * one does (the pet stands in the fountain's spray, the bell rings), and the bag names it in a
 * short line (home.effects).
 *
 * Every keepsake does one thing, by a factor on something that is already there: a need that drops
 * more slowly, a training that counts for more, a chance that comes up more often. The places that
 * ask are named next to each entry.
 */

import type { PetState } from "./state";

// Line: its keepsake
export const KEEPSAKES: Record<string, string> = {
  blob: "jellylamp", ember: "brazier", stone: "moonstone", fox: "signpost", cloud: "weatherbell",
  leaf: "cherrybranch", duck: "bathduck", hippo: "hippofountain", beak: "mailbox", caterpillar: "flowerbasket",
  dog: "ballcrate", dragonfly: "windchime", beaver: "gnawedstump", crab: "shelllamp", axolotl: "herbtank",
  mouse: "knitbasket", bear: "honeypot", penguin: "iceblock", bat: "gramophone", owl: "telescope",
  chameleon: "easel", scarab: "hourglass", kite: "windsock", octopus: "conch", gargoyle: "guardianstatue",
  magpie: "trinketbox",
};

// Keepsake: [what it does, by this factor]. An effect without a factor (0) is on or off.
export const EFFECTS: Record<string, readonly [string, number]> = {
  jellylamp: ["mood", 0.85], // the mood drops more slowly (life.decayFactor)
  brazier: ["rest", 1.15], // energy comes back faster in its sleep (model.tick)
  moonstone: ["sick", 0.85], // it gets sick less often (life.bonusFactor)
  signpost: ["finds", 1.15], // a find at a quiet stop of a trip (trip.find)
  weatherbell: ["bored", 0.75], // it listens to the bell and gets bored less often (model.tick)
  cherrybranch: ["plant", 1.2], // the plant grows faster (home.grow)
  bathduck: ["hygiene", 0.85], // it stays clean longer (life.decayFactor)
  hippofountain: ["heat", 0], // on a hot afternoon it cools down in the spray (home.hot)
  mailbox: ["friends", 1.15], // friends come to visit more often (wild.step)
  flowerbasket: ["fruit", 1.2], // a fruit of the plant fills it more (home.eat)
  ballcrate: ["play", 1.2], // a game cheers it up more (life.bonusFactor)
  windchime: ["speed", 1.15], // speed training counts for more (battle.train)
  gnawedstump: ["strength", 1.15], // strength training counts for more (battle.train)
  shelllamp: ["bite", 0.8], // at the pond something bites sooner (fishing.cast)
  herbtank: ["heal", 1.2], // its health comes back faster (model.tick)
  knitbasket: ["children", 1.1], // a child grows faster (model.tick)
  honeypot: ["satiety", 0.85], // it gets hungry more slowly (life.decayFactor)
  iceblock: ["cold", 0], // a cold morning doesn't bother it (home.cold)
  gramophone: ["tricks", 1.15], // trick practice counts for more (care.practice)
  telescope: ["stars", 1.2], // shooting stars fall more often (stars.falls)
  easel: ["smarts", 1.15], // smarts training counts for more (battle.train)
  hourglass: ["maps", 1.2], // a trip brings a treasure map more often (digging.mapFor)
  windsock: ["hike", 0.85], // trips tire it less (trip.step)
  conch: ["festival", 1.1], // more points at the trick festival (festival.score)
  guardianstatue: ["steady", 0.85], // it is knocked over less often in a scuffle (battle.fight)
  trinketbox: ["gifts", 1.25], // a friend's visit brings a gift more often (wild.step)
};

/** Is this find a keepsake? */
export function isKeepsake(item: string): boolean {
  return item in EFFECTS;
}

/** The keepsakes it has set out (outside or in the house). */
function setOut(state: PetState): string[] {
  return state.deco.filter(isKeepsake);
}

/** The factor of an effect for this pet: 1 without a keepsake for it set out. */
export function factor(state: PetState, effect: string): number {
  return setOut(state).reduce((f, item) => EFFECTS[item][0] === effect ? f * EFFECTS[item][1] : f, 1.0);
}

/** Is a keepsake with this effect set out? */
export function has(state: PetState, effect: string): boolean {
  return setOut(state).some((item) => EFFECTS[item][0] === effect);
}

/**
 * The keepsake the pet brings home from a trip, or null: the first line the home has had all
 * adults of (state.complete_lines) whose keepsake the home doesn't have yet.
 */
export function due(state: PetState): string | null {
  const line = state.complete_lines.find((l) => KEEPSAKES[l] && !state.items[KEEPSAKES[l]]
    && !state.backpack.includes(KEEPSAKES[l]));
  return line ? KEEPSAKES[line] : null;
}
