// Weight, bond, snacks, the mini-game and tricks.

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
  act(pet, "feed", start + 60, { item: "icecream" });
  assert.equal(pet.weight, 35 + 1 + 3);
  act(pet, "play", start + 120);
  assert.equal(pet.weight, 37);
  for (let i = 0; i < 2 * 1440; i++) { // two days well fed: drifts back to the ideal
    care.driftWeight(pet, 1, false);
  }
  near(pet.weight, 35 + 2 * Math.exp(-1), 0.05);
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

test("snacks and the favorite", () => {
  pet.stats.mood = 20;
  act(pet, "feed", start, { item: "cookie" });
  assert.equal(pet.stats.mood, 35);
  assert.ok(!("favorite_found" in pet.counters));
  act(pet, "feed", start + 60, { item: "icecream" }); // a blob's favorite snack
  assert.equal(pet.stats.mood, 35 + 20 * 1.5 * 0.6);
  assert.equal(pet.counters.favorite_found, 1);
  assert.equal(pet.activity_item, "icecream");
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

test("game", () => {
  assert.deepEqual(act(pet, "game", start, { item: "left" }), [false, "no_game"]);
  assert.equal(act(pet, "game", start, { item: "start" })[0], true);
  assert.equal(care.gameActive(pet, start + 1), true);
  let hits = 0;
  for (let i = 0; i < care.GAME_ROUNDS; i++) {
    assert.equal(act(pet, "game", start + 10 + i, { item: "left" })[0], true);
    const [jump, result] = pet.activity_item.split(":");
    hits += result === "hit" ? 1 : 0;
    assert.equal(result === "hit", jump === "left");
  }
  assert.equal(care.gameActive(pet, start + 20), false);
  assert.equal(pet.game!.result, hits);
  assert.equal(pet.counters.games, 1);
  assert.equal(pet.counters.games_won ?? 0, hits >= care.GAME_WIN ? 1 : 0);
  assert.deepEqual(act(pet, "game", start + 30, { item: "left" }), [false, "no_game"]);
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

test("trick practice in a row brings less and bond helps", () => {
  for (const when of [0, 60, 240, 840]) { // each time right after the break
    assert.equal(act(pet, "trick", start + when, { item: "flip" })[0], true);
  }
  near(pet.tricks.flip, (1 + 0.6 + 0.3 + 0.15) * 1.1, 0.03);
  const loved = grown(start);
  loved.bond = 100;
  act(loved, "trick", start, { item: "flip" });
  near(loved.tricks.flip, 1.5);
});

test("tricks need a break, longer each time", () => {
  pet.bond = 0;
  act(pet, "trick", start, { item: "bow" });
  assert.equal(model.restLeft(pet, ["trick"], start + 20), 40);
  assert.deepEqual(act(pet, "trick", start + 30, { item: "spin" }), [false, "rest_trick"]); // any trick
  const energy = pet.stats.energy;
  act(pet, "trick", start + 60, { item: "bow" });
  assert.equal(pet.stats.energy, energy - 5);
  assert.deepEqual(act(pet, "trick", start + 200, { item: "bow" }), [false, "rest_trick"]);
  assert.equal(act(pet, "trick", start + 240, { item: "bow" })[0], true);
  assert.equal(model.restLeft(pet, ["trick"], start + 240), 600);
  near(pet.bond, 1 + 0.6 + 0.3); // the bond grows less with each one, too
  assert.equal(model.restLeft(pet, ["trick"], start + 240 + model.REPEAT_WINDOW), 0); // a new day, a fresh start
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
