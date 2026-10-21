// Guests in the garden: what draws them, peeking over the fence, and the egg of their line.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as garden from "../src/garden";
import * as home from "../src/home";
import * as life from "../src/life";
import * as model from "../src/model";
import type { PetState } from "../src/state";
import * as wild from "../src/wild";
import { BEDTIME, act, at, grown } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
  pet.stage = "adult";
  pet.species = "angloop";
  Object.assign(pet.stats, { satiety: 95, energy: 95, mood: 95 });
});

const RAIN = 63;

test("each guest has its own thing that draws it", () => {
  const drawn = () => Object.keys(garden.GUESTS).filter((line) => garden.drawn(pet, line, start));
  assert.deepEqual(drawn(), []);
  pet.garden.plants_done = 1; // a plant bore all its fruits
  assert.deepEqual(drawn(), ["caterpillar"]);
  pet.garden.plants_done = 0;
  // played on five days of the last week, not on four, and not long ago
  pet.garden.play_days = [0, 1, 2, 3].map((d) => Math.floor(start / 86400) - d);
  assert.deepEqual(drawn(), []);
  garden.notePlay(pet, start - 4 * 86400);
  garden.notePlay(pet, start - 4 * 86400 + 60); // twice the same day counts once
  assert.equal(pet.garden.play_days.length, 5);
  assert.deepEqual(drawn(), ["dog"]);
  pet.garden.play_days = [];
  // a pond, and rain in the last week; a woodpile next to the pond
  pet.items = { pond: 1, woodpile: 1 };
  home.toggleDeco(pet, "pond");
  assert.deepEqual(drawn(), []);
  garden.noteRain(pet, start - 6 * 86400);
  assert.deepEqual(drawn(), ["dragonfly"]);
  garden.noteRain(pet, start - 8 * 86400);
  assert.deepEqual(drawn(), []);
  home.toggleDeco(pet, "woodpile");
  assert.deepEqual(drawn(), ["beaver"]);
});

test("the plant's last fruit and a game count by themselves", () => {
  pet.plant = { kind: "berry", grown: home.GROW_MINUTES, ripening: home.RIPEN_MINUTES, left: 1 };
  home.eatFruit(pet);
  assert.equal(pet.garden.plants_done, 1);
  act(pet, "play", start);
  assert.equal(pet.garden.play_days.length, 1);
  model.advance(pet, start + 120, BEDTIME, RAIN);
  assert.ok(pet.garden.rain_at > start);
});

test("a guest peeks over the fence, comes in as a friend, and its egg is of its own line", () => {
  pet.items = { pond: 1, woodpile: 1 };
  home.toggleDeco(pet, "pond");
  home.toggleDeco(pet, "woodpile");
  pet.friends = [{ species: "sneezle", visits: 0, next: start + 99 * 86400 }]; // a friend from a trip doesn't stop it
  model.advance(pet, start + 120, BEDTIME);
  assert.equal(garden.peeking(pet, start + 120), "dambert");
  assert.equal(pet.events.at(-1)!.action, "peek");
  assert.equal(pet.friends.length, 1);
  const until = pet.garden.peeking!.until;
  assert.ok(until - start >= garden.PEEK_SECONDS[0] && until - start <= garden.PEEK_SECONDS[1] + 120);
  model.advance(pet, until + 60, BEDTIME);
  const guest = pet.friends.find((f) => f.species === "dambert")!;
  assert.equal(guest.guest, true);
  assert.equal(garden.peeking(pet, until + 60), null);
  // it comes only once, and a guest doesn't take a friend's place on trips
  model.advance(pet, until + 3600, BEDTIME);
  assert.equal(pet.friends.filter((f) => f.species === "dambert").length, 1);
  pet.friends[0].nests = 1;
  assert.equal(wild.looking(pet), true);
  // five visits that count: an egg of the beaver line, always
  for (let i = 0; i < 4; i++) {
    guest.visits = wild.VISITS_FOR_NEST - 1;
    pet.nest = null;
    guest.until = until + 7200 + i * 86400;
    guest.rest_until = 0;
    wild.step(pet, guest.until, true);
    assert.equal(pet.nest!.line, "beaver");
  }
});

test("no guest comes to an egg, and none starts peeking while the pet is away", () => {
  pet.garden.plants_done = 1;
  assert.deepEqual(garden.step(pet, start, false), []);
  pet.stage = "egg";
  assert.deepEqual(garden.step(pet, start, true), []);
});

test("the garden lines' adult forms", () => {
  const decide = (line: string, diary: Record<string, number> = {}, world: life.World = {}) =>
    life.decideSpecies({ minutes: 7 * 1440, ...diary }, line, world);
  // the caterpillar: the fruit it ate most
  assert.equal(decide("caterpillar"), "mothmuff");
  assert.equal(decide("caterpillar", { food_fruit_sunflower: 4, food_fruit_berry: 3 }), "sunflutter");
  assert.equal(decide("caterpillar", { food_fruit_sunflower: 4, food_fruit_cherry: 4 }), "mothmuff");
  assert.equal(decide("caterpillar", { food_fruit_cherry: 5, food_fruit_sunflower: 4 }), "jesterwing");
  // the dog: bond hearts, and every trick
  assert.equal(decide("dog", {}, { bond: 3 }), "digby");
  assert.equal(decide("dog", {}, { bond: 4 }), "barrelbard");
  assert.equal(decide("dog", {}, { bond: 4, allTricks: true }), "pawdini");
  // the dragonfly: baths, and the sun after rain
  assert.equal(decide("dragonfly", { baths: 13 }), "rotorfly");
  assert.equal(decide("dragonfly", { baths: 14 }), "jewelwing");
  assert.equal(decide("dragonfly", {}, { afterRain: true }), "prismfly");
  assert.equal(decide("dragonfly", {}, { afterRain: true, raining: true }), "rotorfly");
  assert.equal(decide("dragonfly", {}, { afterRain: true, dark: true }), "rotorfly");
  // the beaver: strength first, and the house built
  assert.equal(decide("beaver", {}, { strongest: "speed" }), "dambert");
  assert.equal(decide("beaver", {}, { strongest: "strength" }), "timberjack");
  assert.equal(decide("beaver", {}, { strongest: "strength", houseBuilt: true }), "archibeaver");
});

test("the world when it grows up knows the pet's own side", () => {
  pet.skills = { strength: 20, speed: 20, smarts: 5 };
  assert.equal(model.worldAt(start, null, null, null, pet).strongest, undefined); // a tie is no strongest
  pet.skills.strength = 21;
  pet.house = home.HOUSE_STEPS;
  pet.bond = 85;
  garden.noteRain(pet, start - 3600);
  const world = model.worldAt(start, null, null, null, pet);
  assert.deepEqual([world.strongest, world.houseBuilt, world.bond, world.afterRain, world.allTricks],
    ["strength", true, 4, true, false]);
  assert.equal(model.worldAt(start + life.SUN_AFTER_RAIN, null, null, null, pet).afterRain, false);
});
