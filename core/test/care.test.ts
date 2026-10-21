// Weight, bond, snacks, hide and seek and tricks.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as care from "../src/care";
import * as model from "../src/model";
import type { PetState } from "../src/state";
import { BEDTIME, HOUR, act, at, grown, near, refused } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 08:00");
  pet = grown(start); // child, ideal weight 35 g
  pet.weight = 35.0;
});

test("weight goes up with food and down with play", () => {
  pet.stats.satiety = 30;
  act(pet, "feed", start, { item: "meal" });
  pet.items.honeycomb = 1;
  act(pet, "feed", start + 60, { item: "honeycomb" });
  assert.equal(pet.weight, 35 + 1 + 2.5);
  act(pet, "play", start + 120);
  assert.equal(pet.weight, 36.5);
  for (let i = 0; i < 2 * 1440; i++) { // two days well fed: drifts back to the ideal
    care.driftWeight(pet, 1, false);
  }
  near(pet.weight, 35 + 1.5 * Math.exp(-1), 0.05);
});

test("hunger makes light", () => {
  pet.stats.satiety = 0;
  for (const day of ["13", "14", "15"]) {
    model.advance(pet, at(`2026-10-${day} 08:00`), BEDTIME);
  }
  assert.equal(care.weightStatus(pet), "light");
});

test("heavy pet gets tired faster", () => {
  const normal = grown(start);
  normal.weight = 35.0;
  pet.weight = 50.0; // > 1.3 × the ideal
  assert.equal(care.weightStatus(pet), "heavy");
  for (const p of [normal, pet]) {
    model.advance(p, start + 3 * HOUR, BEDTIME);
  }
  assert.ok(pet.stats.energy < normal.stats.energy);
});

test("weight follows evolution", () => {
  pet.weight = 42.0; // 1.2 × the ideal for a child
  pet.stage_since = start - 7 * 86400;
  act(pet, "evolve", start);
  assert.equal(pet.stage, "adult");
  near(pet.weight, 60.0);
});

test("bond grows with care and fades slowly", () => {
  const bond = pet.bond;
  act(pet, "pet", start);
  act(pet, "play", start + 60);
  assert.equal(pet.bond, bond + 3);
  model.advance(pet, start + 86400, BEDTIME);
  near(pet.bond, bond + 3 - care.BOND_DECAY_PER_DAY, 0.005);
});

test("high bond keeps the mood up", () => {
  const loved = grown(start);
  loved.bond = 100;
  for (const p of [loved, pet]) {
    model.advance(p, start + 3 * HOUR, BEDTIME);
  }
  assert.ok(loved.stats.mood > pet.stats.mood);
});

test("hide and seek: found at its spot", () => {
  assert.deepEqual(act(pet, "game", start, { item: "grass" }), [false, "no_game"]);
  assert.equal(act(pet, "game", start, { item: "start" })[0], true);
  assert.equal(care.gameActive(pet, start + 1), true);
  const [spot] = pet.game!.spots!;
  assert.ok(care.hidingSpots(pet, []).includes(spot));
  const wrong = care.hidingSpots(pet, []).find((other) => other !== spot)!;
  assert.equal(act(pet, "game", start + 10, { item: wrong })[0], true);
  assert.equal(pet.activity_item, `${wrong}:miss`);
  assert.equal(care.gameActive(pet, start + 11), true);
  act(pet, "game", start + 12, { item: spot });
  assert.equal(pet.activity_item, `${spot}:pet`);
  assert.equal(care.gameActive(pet, start + 13), false);
  assert.equal(pet.game!.won, true);
  assert.equal(pet.counters.games, 1);
  assert.equal(pet.counters.games_won, 1);
  assert.deepEqual(act(pet, "game", start + 30, { item: spot }), [false, "no_game"]);
});

test("hide and seek: three tries, and it never hides at the same spot twice in a row", () => {
  act(pet, "game", start, { item: "start" });
  const [spot] = pet.game!.spots!;
  const wrong = care.hidingSpots(pet, []).find((other) => other !== spot)!;
  for (let i = 0; i < care.HIDE_TRIES; i++) {
    act(pet, "game", start + 10 + i, { item: wrong });
  }
  assert.equal(care.gameActive(pet, start + 20), false);
  assert.equal(pet.game!.won, false);
  assert.equal(pet.counters.games_won ?? 0, 0);
  act(pet, "game", start + 60, { item: "start" });
  assert.notEqual(pet.game!.spots![0], spot);
});

test("hide and seek: a guest hides too, and there is a try more", () => {
  act(pet, "game", start, { item: "start" });
  assert.equal(pet.game!.spots!.length, 1);
  act(pet, "game", start + 60, { item: "start", guest: true });
  const [mine, theirs] = pet.game!.spots!;
  assert.notEqual(mine, theirs);
  assert.equal(care.tries(pet.game!), care.HIDE_TRIES + 1);
  act(pet, "game", start + 70, { item: theirs });
  assert.equal(pet.activity_item, `${theirs}:guest`);
  assert.equal(care.gameActive(pet, start + 71), true);
  act(pet, "game", start + 72, { item: theirs }); // found already: nobody there any more
  assert.equal(pet.activity_item, `${theirs}:miss`);
  act(pet, "game", start + 73, { item: mine });
  assert.equal(pet.game!.won, true);
});

test("the spots: the house, the plant and the decorations bring their own", () => {
  assert.deepEqual(care.hidingSpots(pet, []), ["left", "grass", "right"]);
  pet.house = 1;
  pet.plant = { kind: "fruit_herb", grown: 0, ripening: 0, left: 1 };
  assert.deepEqual(care.hidingSpots(pet, ["gnome"]), ["house", "plant", "grass", "deco0"]);
  assert.deepEqual(care.hidingSpots(pet, ["gnome", "lantern"]), ["house", "plant", "grass", "deco1", "deco0"]);
  // an app from before hide and seek still sends left or right
  assert.ok(model.GAME_MOVES.includes("left") && model.GAME_MOVES.includes("right"));
});

test("a smart pet keeps still longer", () => {
  pet.skills.smarts = 0;
  assert.equal(care.peekEvery(pet), care.PEEK_EVERY[0]);
  pet.skills.smarts = 100;
  assert.equal(care.peekEvery(pet), care.PEEK_EVERY[1]);
});

test("game needs energy and times out", () => {
  pet.stats.energy = 10;
  assert.deepEqual(act(pet, "game", start, { item: "start" }), [false, "tired"]);
  pet.stats.energy = 80;
  act(pet, "game", start, { item: "start" });
  assert.deepEqual(act(pet, "game", start + care.GAME_TIMEOUT + 1, { item: "right" }), [false, "no_game"]);
});

test("trick is learned by practice", () => {
  pet.bond = 0;
  assert.deepEqual(care.learned(pet), []);
  const results: string[] = [];
  for (let i = 0; i < 3; i++) { // a bow takes 3 points; practiced with breaks in between, each time counts in full
    pet.stats.energy = 80;
    assert.equal(act(pet, "trick", start + i * 3 * HOUR, { item: "bow" })[0], true);
    results.push(pet.activity_item);
  }
  assert.ok(["bow:ok", "bow:fail"].includes(results[0]));
  assert.equal(results[2], "bow:learned");
  assert.deepEqual(care.learned(pet), ["bow"]);
  assert.deepEqual(pet.events.slice(-2).map((e) => e.action), ["learned", "trick"]);
  act(pet, "trick", start + 12 * HOUR, { item: "bow" }); // it knows the trick: always works
  assert.equal(pet.activity_item, "bow:ok");
  assert.equal(pet.counters.tricks, 4);
});

test("a trick it knows can be shown any time, for free", () => {
  pet.tricks.bow = 3;
  pet.stats.energy = 5; // too tired to practice …
  assert.deepEqual(act(pet, "trick", start, { item: "flip" }), [false, "tired_trick"]);
  for (let i = 0; i < 3; i++) { // … but it shows what it knows, again and again, without a break
    assert.equal(act(pet, "trick", start + i, { item: "bow" })[0], true);
    assert.equal(pet.activity_item, "bow:ok");
  }
  assert.equal(pet.stats.energy, 5);
  assert.equal(model.restLeft(pet, ["trick"], start + 3), 0);
});

test("every practice after the break counts in full, and bond helps", () => {
  for (const when of [0, 120, 720, 2520]) { // each time right after the break
    assert.equal(act(pet, "trick", start + when, { item: "flip" })[0], true);
  }
  near(pet.tricks.flip, 4 * 1.1, 0.05); // the bond grows a little on the way
  const loved = grown(start);
  loved.bond = 100;
  act(loved, "trick", start, { item: "flip" });
  near(loved.tricks.flip, 1.5);
});

test("tricks need a break, longer each time", () => {
  pet.bond = 0;
  act(pet, "trick", start, { item: "bow" });
  assert.equal(model.restLeft(pet, ["trick"], start + 20), 100);
  assert.deepEqual(act(pet, "trick", start + 30, { item: "spin" }), [false, "rest_trick"]); // any trick
  const energy = pet.stats.energy;
  act(pet, "trick", start + 120, { item: "bow" });
  assert.equal(pet.stats.energy, energy - 5);
  assert.deepEqual(act(pet, "trick", start + 700, { item: "bow" }), [false, "rest_trick"]);
  assert.equal(act(pet, "trick", start + 720, { item: "bow" })[0], true);
  assert.equal(model.restLeft(pet, ["trick"], start + 720), 1800);
  near(pet.bond, 3); // the break is the only brake: the bond grows in full each time
  assert.equal(model.restLeft(pet, ["trick"], start + 720 + model.REST_WINDOW), 0); // later, a fresh start
});

test("trick refused", () => {
  refused(() => act(pet, "trick", start, { item: "handstand" }), "unknown_trick");
  pet.stats.energy = 10;
  assert.deepEqual(act(pet, "trick", start, { item: "bow" }), [false, "tired_trick"]);
  pet.asleep = true;
  assert.deepEqual(act(pet, "trick", start, { item: "bow" }), [false, "asleep"]);
  const egg = model.newPet(start);
  assert.deepEqual(act(egg, "trick", start, { item: "bow" }), [false, "egg"]);
  assert.deepEqual(pet.tricks, {});
});
