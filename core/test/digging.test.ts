// Digging: a trip brings a treasure map now and then; dragged onto the pet, it digs at the red cross.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as digging from "../src/digging";
import * as model from "../src/model";
import { Random } from "../src/random";
import type { PetState } from "../src/state";
import { act, at, BEDTIME, grown } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
});

/** One trip to the meadow, unpacked afterwards; returns when it is over. */
function trip(from: number): number {
  model.advance(pet, from, BEDTIME); // (the night before would leave it hungry and tired otherwise)
  pet.backpack = []; // (a festival Saturday on the way brings its prize home in the backpack)
  Object.assign(pet.stats, { satiety: 100, energy: 100, mood: 100, hygiene: 100, health: 100 });
  assert.deepEqual(act(pet, "trip", from, { item: "meadow" }), [true, null]);
  const end = pet.trip!.end + 60;
  model.advance(pet, end, BEDTIME);
  act(pet, "unpack", end);
  return end;
}

test("the first map comes for sure on the third trip, and there is only ever one", () => {
  for (let n = 1; n <= 3; n++) {
    trip(start + n * 86400);
    if (n < 3 && pet.items[digging.MAP]) {
      break; // (a map on an earlier trip, by chance, is fine as well)
    }
  }
  assert.equal(pet.items[digging.MAP], 1);
  const note = pet.events.filter((e) => e.action === "find" && e.item === digging.MAP);
  assert.equal(note.length, 1);
  // found by the path at a quiet stop, and held up there
  const travel = pet.travels.find((tr) => tr.stops.some((stop) => stop.item === digging.MAP))!;
  const stop = travel.stops.find((s) => s.item === digging.MAP)!;
  assert.equal(stop.kind, "find");
  assert.ok(stop.at < travel.end - 60, "the map is found on the way, before the trip is over");
  for (let day = 4; day < 16; day++) {
    trip(start + day * 86400);
  }
  assert.equal(pet.items[digging.MAP], 1); // never a second one while it has one
});

test("dragged onto the pet: it digs, the map is used up, the first time it finds the scarab's egg", () => {
  assert.deepEqual(act(pet, "dig", start), [false, "no_map"]);
  assert.equal(model.availableActions(pet, start).dig, false);
  pet.items[digging.MAP] = 1;
  assert.equal(model.availableActions(pet, start).dig, true);
  pet.stats.energy = 5;
  assert.deepEqual(act(pet, "dig", start), [false, "tired"]);
  pet.stats.energy = 80;
  const eggs = pet.eggs.length;
  assert.deepEqual(act(pet, "dig", start + 10), [true, null]);
  assert.equal(pet.activity, "dig");
  assert.equal(pet.items[digging.MAP] ?? 0, 0);
  assert.equal(pet.stats.energy, 80 - digging.COST.energy);
  assert.equal(pet.eggs.length, eggs + 1);
  assert.equal(pet.eggs.at(-1)!.line, "scarab");
  assert.equal(pet.events.at(-1)!.item, digging.FIRST);
  // later: seeds, and once in a while a helmet or a fossil, each once per home
  const found = new Set<string>();
  for (let i = 0; i < 80; i++) {
    pet.items[digging.MAP] = 1;
    for (const item of digging.dig(pet, new Random(`test:${i}`))) {
      assert.notEqual(item, digging.FIRST);
      found.add(item);
    }
  }
  assert.ok(found.has("helmet") && found.has("fossil"));
  assert.equal(pet.items.helmet, 1);
  assert.equal(pet.items.fossil, 1);
  assert.ok([...found].some((item) => item.startsWith("seed_")));
});

test("a digger by nature digs quicker and finds a seed more", () => {
  assert.equal(digging.seconds(pet), digging.DIG_SECONDS);
  pet.species = "dog";
  pet.counters.dug_egg = 1;
  assert.ok(digging.seconds(pet) < digging.DIG_SECONDS);
  pet.items[digging.MAP] = 1;
  assert.equal(digging.dig(pet, new Random("x")).length, 2);
  pet.species = "beaver";
  pet.items[digging.MAP] = 1;
  assert.equal(digging.dig(pet, new Random("y")).length, 2);
  pet.species = "blob";
  pet.items[digging.MAP] = 1;
  assert.equal(digging.dig(pet, new Random("z")).length, 1);
});
