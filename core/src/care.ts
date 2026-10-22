/**
 * Weight, bond, hide and seek, and tricks.
 *
 * All kept small on purpose so the basic game stays simple.
 */

import type { Stage } from "./life";
import { Random } from "./random";
import type { Game, PetState } from "./state";

// ---------- Weight (grams) ----------

export const IDEAL_WEIGHT: Record<Stage, number> = { egg: 20.0, baby: 20.0, child: 35.0, adult: 50.0 };
export const HEAVY = 1.3; // 30 % over the ideal: too heavy → tires faster, and it shows
export const LIGHT = 0.8; // 20 % under the ideal: too light → gets sick more easily
// Weight drifts back to the ideal by itself (half the difference per day).
// Meals, sweet things and exercise push it back and forth; only lots of honeycomb makes a
// pet too heavy, and only going hungry makes it too light. A round of play
// (or hide and seek, or training) burns off a meal's worth twice, so a
// heavy pet slims down again within a day or two of playing and trips.
export const DRIFT_PER_DAY = 0.5;
export const HUNGRY_LOSS_PER_HOUR = 0.5;
export const MEAL_WEIGHT = 1.0;
export const PLAY_WEIGHT = -2.0;
export const HIKE_WEIGHT = -0.5; // per station on a trip

export type WeightStatus = "heavy" | "light" | "ok";

export function ideal(state: PetState): number {
  return IDEAL_WEIGHT[state.stage];
}

export function weightStatus(state: PetState): WeightStatus {
  const ratio = state.weight / ideal(state);
  return ratio >= HEAVY ? "heavy" : ratio <= LIGHT ? "light" : "ok";
}

export function addWeight(state: PetState, grams: number): void {
  state.weight = Math.max(ideal(state) * 0.5, Math.min(ideal(state) * 2, state.weight + grams));
}

/** On evolving: same ratio to the ideal, new size. */
export function rescaleWeight(state: PetState, oldStage: Stage): void {
  state.weight = state.weight / IDEAL_WEIGHT[oldStage] * ideal(state);
}

export function driftWeight(state: PetState, minutes: number, hungry: boolean): void {
  state.weight -= (state.weight - ideal(state)) * DRIFT_PER_DAY * minutes / 1440;
  if (hungry) {
    state.weight -= HUNGRY_LOSS_PER_HOUR * minutes / 60;
  }
  state.weight = Math.max(ideal(state) * 0.5, state.weight);
}

export function energyFactor(state: PetState): number {
  return weightStatus(state) === "heavy" ? 1.2 : 1.0;
}

export function sickFactor(state: PetState): number {
  return weightStatus(state) === "light" ? 1.5 : 1.0;
}

// ---------- Bond (0–100) ----------

export const BOND_DECAY_PER_DAY = 0.5; // barely wears off
export const BOND_GAIN: Record<string, number> = {
  pet: 2.0, play: 1.0, game: 2.0, meal: 0.5, snack: 0.5, heart: 2.0, clean: 0.5, trick: 1.0, trip: 1.0,
  warm: 1.0,
};

export function addBond(state: PetState, kind: string, amount = 1): void {
  state.bond = Math.min(100.0, state.bond + (BOND_GAIN[kind] ?? 0) * amount);
}

/** A strong bond makes the mood drop more slowly (by up to 25 %). */
export function moodFactor(state: PetState): number {
  return 1.0 - 0.25 * state.bond / 100;
}

/** 0–5 hearts for the app. */
export function bondLevel(state: PetState): number {
  return Math.min(5, Math.floor(state.bond / 20));
}

// ---------- Hide and seek ----------

export const HIDE_TRIES = 3; // tries to find it; one more for each other pet hiding too
export const GAME_TIMEOUT = 120; // this long without a guess → game over
export const GAME_ENERGY = 15; // minimum energy, same as playing
// Where a pet can hide: the edges and the tall grass are always there; the house, the plant and the
// decorations outside add their own (hidingSpots). "left" is the edge the house stands at.
export const SPOTS = ["left", "house", "plant", "grass", "deco1", "deco0", "right"] as const;
// Each line has a spot it likes best and goes for more often, so that one learns where to look
export const FAVORITE_SPOT: Record<string, string> = {
  blob: "plant", ember: "house", stone: "grass", fox: "house", cloud: "right", leaf: "plant", duck: "grass",
  hippo: "grass", beak: "deco0",
};
const FAVORITE_WEIGHT = 3;

/**
 * The spots there are right now, from left to right: the house takes the left edge, a plant takes
 * it too while there is no house, and the decorations take the right one.
 */
export function hidingSpots(state: PetState, outside: readonly string[]): string[] {
  const spots: string[] = [];
  if (state.house > 0) {
    spots.push("house");
  } else if (!state.plant) {
    spots.push("left");
  }
  if (state.plant) {
    spots.push("plant");
  }
  spots.push("grass");
  if (outside.length > 1) {
    spots.push("deco1");
  }
  spots.push(outside.length ? "deco0" : "right");
  return spots;
}

/**
 * The pet hides (and a guest with it, at another spot). Its own line's favorite spot comes up
 * more often, and never the spot it was found at last time.
 */
export function startGame(state: PetState, now: number, spots: readonly string[], line: string, guest = false): void {
  const rng = new Random(`hide:${now}`);
  const before = state.game?.spots?.[0];
  const choose = (from: readonly string[]) => rng.weighted([...from],
    from.map((spot) => spot === FAVORITE_SPOT[line] ? FAVORITE_WEIGHT : 1));
  const open = spots.filter((spot) => spot !== before);
  const hidden = [choose(open.length ? open : spots)];
  if (guest && spots.length > 1) {
    hidden.push(rng.choice(spots.filter((spot) => spot !== hidden[0])));
  }
  state.game = { round: 0, wins: 0, last: now, spots: hidden, found: [] };
}

export const PEEK_EVERY = [3, 7] as const; // seconds between peeks: the smarter it is, the longer it keeps still

/** Every how many seconds a hiding pet peeks out. */
export function peekEvery(state: PetState): number {
  const [quick, slow] = PEEK_EVERY;
  return quick + (slow - quick) * Math.min(1, (state.skills.smarts ?? 0) / 100);
}

/** How many tries a game has: one more for every pet hiding besides the first. */
export function tries(game: Game): number {
  return HIDE_TRIES + (game.spots?.length ?? 1) - 1;
}

/** Is a game going on (started, not finished, not fallen asleep)? */
export function gameActive(state: PetState, now: number): boolean {
  return !!state.game && state.game.round !== undefined && now - state.game.last < GAME_TIMEOUT;
}

/**
 * One look behind a spot. Returns who was there ("pet", "guest" or null) and whether the game is
 * over: everybody found, or no tries left.
 */
export function seek(state: PetState, spot: string, now: number): [string | null, boolean] {
  const game = state.game!;
  const hidden = game.spots ?? [];
  const at = hidden.indexOf(spot);
  const who = at < 0 || game.found!.includes(spot) ? null : at === 0 ? "pet" : "guest";
  game.round = game.round! + 1;
  game.last = now;
  if (who) {
    game.found!.push(spot);
    game.wins = game.found!.length;
  }
  return [who, game.found!.length >= hidden.length || game.round >= tries(game)];
}

// ---------- Tricks ----------

// Name: practice needed. One practice is worth 1 point, up to 1.5 with a strong
// bond; after each one the pet needs a break, longer the more it has practiced
// lately (model.REST_SECONDS), so learning takes a few days.
export const TRICKS: Record<string, number> = { bow: 3, spin: 5, dance: 7, flip: 10 };
export const TRICK_ENERGY = 15; // minimum energy, same as playing
export const TRICK_LUCK = 0.25; // how often it already works on the very first try

// Tricks some forms do in their own way: the same gesture and the same effect, another animation
// (drawn in scene.ts). At the trick festival (festival.ts) a form's own trick counts double.
// "stage:species" → {trick: animation}
export const OWN_TRICKS: Record<string, Record<string, string>> = {
  "adult:sneezle": { flip: "flutter" }, // its wings only flap for this: up, over at the top and down again
  "adult:lumoth": { spin: "circle" }, // a moth: it flutters round in circles, as round a lamp
  "adult:glimmerock": { spin: "shine" }, // a show: its crystals flash as it turns
  "adult:bouldergrin": { flip: "toss" }, // its top stone does the flip for it and lands back on top
  "adult:gemperor": { flip: "slam" }, // a king doesn't somersault: it leaps up and lands so hard that crystals shoot up
  "adult:purrloop": { bow: "stretch" }, // a cat's bow: front down, a long stretch and a yawn, then a shake
  "adult:lanternling": { spin: "swing" }, // it swings to and fro as a lantern does on its handle
  "adult:flarelet": { flip: "flare" }, // the flame shoots up out of its bowl and rains embers
  "adult:roamtail": { spin: "chase" }, // goes round in circles after its own tail
  "adult:filchfox": { spin: "vanish" }, // a puff of smoke, gone, and it pops up again a little further on
  "adult:rumblefluff": { bow: "charge" }, // head down, a scrape with the hoof, and a charge with sparks
  "adult:prismist": { spin: "rainbow" }, // it turns, and a rainbow of shimmer arcs over it
  "adult:twiggle": { spin: "rustle" }, // it turns, and leaves whirl off its crown
  "adult:needlenub": { bow: "bloom" }, // it closes into a bud and blooms, and petals fly
  "adult:quill": { dance: "hornpipe" }, // the sailor's dance: quick steps from one foot to the other
  "adult:drakwing": { flip: "glide" }, // a few beats of its wings up, and it glides down in a long arc
  "adult:lillypot": { bow: "soak" }, // sinks low, as into its pond, and blows bubbles
  "adult:steamo": { dance: "sauna" }, // a bath dance that makes it steam
  "adult:parcelbeak": { bow: "deliver" }, // a bow, and a letter flies out of its pouch
  "adult:rapierre": { spin: "fence" }, // a fencer's lunge, forward and back, twice, with a flash
  "adult:salamber": { dance: "ember_ring" }, // it dances round, and a ring of embers glows up round it
  "adult:lunarock": { bow: "moonrise" }, // a bow, and its moonstone lights up and sends glints up into the sky
  "adult:foxfire": { spin: "fox_fire" }, // it turns, and blue fox fires whirl round it
  "adult:flurrbleat": { dance: "flurry" }, // it turns round and round in a flurry of snow
  "adult:sakurin": { dance: "fan" }, // a fan dance: it sways to and fro, and blossom drifts off its crown
  "adult:bubblehelm": { flip: "dive" }, // dives head first into the ground and pops out again in a burst of bubbles
  "adult:hippula": { bow: "count" }, // a count's deep bow with a sweep of the cape, and bats flutter up
  "adult:acewing": { flip: "loop" }, // a stunt flyer's loop with a trail of smoke
  "adult:mothmuff": { spin: "lamp" }, // flutters round and round a light, as moths do round a lamp, and dust falls off its wings
  "adult:sunflutter": { dance: "blossom" }, // sways, closes up, and its petals open like a blossom in the sun
  "adult:jesterwing": { flip: "jest" }, // a fool's somersault high in the air, its bells jingling
  "adult:digby": { spin: "settle" }, // goes round and round three times, as a dog does, and lies down
  "adult:barrelbard": { bow: "shake_off" }, // a bow, and it shakes the snow out of its coat
  "adult:pawdini": { dance: "ball_roll" }, // rolls to and fro on its big ball, the little one balanced on its nose
  "adult:rotorfly": { spin: "lift_off" }, // lifts off, turns on the spot in the air and sets down again
  "adult:jewelwing": { bow: "kneel" }, // a knight's bow: down on one knee with the lance lowered
  "adult:prismfly": { dance: "light_dance" }, // spots of light in every color dance round it
  "adult:dambert": { flip: "hurdle" }, // trowel up, and a jump over a little stack of logs
  "adult:timberjack": { spin: "chop" }, // spins with its axe tail swinging, and wood chips fly
  "adult:archibeaver": { bow: "blueprint" }, // a bow, it unrolls its plan, and its compass sparks
  "adult:teacrab": { bow: "pour" }, // a polite bow forward, as a teapot pours: a cup of tea, and the steam rises
  "adult:lightclaw": { spin: "beacon" }, // turns slowly as a lighthouse does, and its beam sweeps round
  "adult:castlecrab": { bow: "drawbridge" }, // its gate opens, the drawbridge comes down, and a fanfare sparkles
  "adult:mossolotl": { spin: "unfurl" }, // turns slowly, its gills unfurl, and bits of moss drift off its back
  "adult:medilotl": { dance: "heal" }, // a little dance, and hearts float up
  "adult:axodrake": { flip: "dragon_loop" }, // flies a loop in the air with a trail of glowing bubbles
  "adult:sirthimble": { bow: "accolade" }, // a knight's bow, and its needle lance touches its shoulder with a glint
  "adult:cogsqueak": { spin: "wind_up" }, // winds itself up, its key turning, and whirrs round on the spot
  "adult:woolwhisk": { spin: "unravel" }, // her ball turns, and the golden thread unwinds round her and winds back up
  "adult:hivebear": { bow: "hat_tip" }, // a bow, it lifts its honey pot like a hat, and the bees fly up
  "adult:snorbear": { spin: "den_roll" }, // rolls up in its mound and tumbles round
  "adult:ursastra": { dance: "star_picture" }, // dances, and the stars on its body wander up into a picture
  "adult:tuxwaddle": { bow: "serve" }, // a waiter's bow, its tray held level, the cup steaming
  "adult:glidepin": { spin: "pirouette" }, // a pirouette on its blades, faster and faster, frost flying
  "adult:aurorapin": { dance: "aurora_ribbons" }, // ribbons of the northern lights wave round it as it dances
  "adult:umbrabat": { flip: "hang_swing" }, // turns upside down, hangs from its hook tail and swings
  "adult:batbeat": { dance: "bass_nod" }, // nods to the bass, and lights flash on the beat
  "adult:lunaflap": { spin: "full_moon" }, // wraps itself in its wings, turns, and opens them as a full moon
  "adult:owlbert": { bow: "close_book" }, // closes its book, nods over it, and opens it again
  "adult:stargazer": { spin: "head_turn" }, // only its head turns, all the way round, as an owl's can
  "adult:ninjowl": { flip: "shadow_flip" }, // gone in a puff of smoke, and it drops in behind where it stood
  "adult:palettino": { spin: "color_run" }, // its colors run round and round its body
  "adult:hidewell": { bow: "melt_away" }, // a bow that melts it into the scene until it is nearly gone
  "adult:mirrorleon": { dance: "mirror_dance" }, // its friend's dance in its friend's colors (or the rainbow's)
  "adult:solroll": { flip: "ball_vault" }, // a somersault over its sun ball and back
  "adult:clockbeetle": { dance: "cog_dance" }, // bobs to the beat, and its cog ticks round a step on each
  "adult:pharabug": { bow: "raise_sun" }, // a pharaoh's greeting: it raises its sun high, and the sun shines out
  "adult:origrane": { bow: "fold_up" }, // folds itself up small and unfolds again
  "adult:lionkite": { dance: "lion_dance" }, // a lion dance, its head rearing and shaking, pompoms flying
  "adult:stormkite": { flip: "storm_dive" }, // torn up high by the wind, it turns over and dives down
  "adult:inkasso": { spin: "ink_circle" }, // turns round and round, and its brush paints a circle in the air round it
  "adult:octavio": { dance: "arm_juggle" }, // juggles with all its arms
  "adult:abyssink": { flip: "ink_vanish" }, // gone in a cloud of ink, and it appears on top of it
  "adult:gargard": { bow: "stone_still" }, // turns to stone in its bow, and wakes again with a shake
  "adult:fountaingle": { flip: "water_arc" }, // a somersault that leaves an arc of water in the air
  "adult:bellfry": { spin: "bell_swing" }, // swings itself like a bell, ringing at the end of each swing
  "adult:angloop": { bow: "lure" }, // it casts out its lure, lets the bulb dangle and flash, and snaps
  "child:stone": { flip: "skip" }, // Pebblet gets over an opponent like a flat stone skipping across water
};

/** 0–1: how well it already knows the trick. */
export function trickProgress(state: PetState, trick: string): number {
  return Math.min(1.0, (state.tricks[trick] ?? 0.0) / TRICKS[trick]);
}

export function knows(state: PetState, trick: string): boolean {
  return trickProgress(state, trick) >= 1.0;
}

export function learned(state: PetState): string[] {
  return Object.keys(TRICKS).filter((trick) => knows(state, trick));
}

/** Practice once. Returns "ok", "fail" (didn't work yet) or "learned" (it knows the trick from now on). */
export function practice(state: PetState, trick: string, factor: number, now: number): "ok" | "fail" | "learned" {
  const before = trickProgress(state, trick);
  const ok = new Random(`${now}:${trick}`).random() < TRICK_LUCK + (1 - TRICK_LUCK) * before;
  state.tricks[trick] = (state.tricks[trick] ?? 0.0) + factor * (1 + 0.5 * state.bond / 100);
  if (knows(state, trick)) {
    return "learned";
  }
  return ok ? "ok" : "fail";
}
