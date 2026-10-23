// The training ground: going over and home again, the equipment from trips, practicing alone.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as ground from "../src/ground";
import * as home from "../src/home";
import * as model from "../src/model";
import type { PetState } from "../src/state";
import * as trip from "../src/trip";
import { BEDTIME, Disk, HOUR, act, at, grown, near } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
  Object.assign(pet.stats, { satiety: 90, hygiene: 90, mood: 60, energy: 100, health: 100 });
});

test("opening the training takes it over, closing it brings it home", () => {
  assert.equal(ground.there(pet, start), false);
  assert.deepEqual(act(pet, "train", start, { item: "go" }), [true, null]);
  assert.equal(ground.there(pet, start + 60), true);
  assert.deepEqual(pet.events, []); // only where it is, nothing for the history
  assert.deepEqual(act(pet, "train", start + 60, { item: "leave" }), [true, null]);
  assert.equal(ground.there(pet, start + 61), false);
  // left there, it comes home by itself after a while
  act(pet, "train", start, { item: "go" });
  assert.equal(ground.there(pet, start + ground.STAYS + 1), false);
});

test("an exercise takes it over too, and anything else brings it home", () => {
  assert.deepEqual(act(pet, "train", start, { item: "strength", value: 1 }), [true, null]);
  assert.equal(ground.there(pet, start + 10), true);
  pet.items.cap = 1;
  act(pet, "wear", start + 20, { item: "cap" }); // dressing it up there is fine
  assert.equal(ground.there(pet, start + 30), true);
  act(pet, "pet", start + 30);
  assert.equal(ground.there(pet, start + 31), false);
});

test("not as an egg, on a trip or asleep", () => {
  const egg = model.newPet(start);
  assert.deepEqual(act(egg, "train", start, { item: "go" }), [false, "egg"]);
  pet.asleep = true;
  assert.deepEqual(act(pet, "train", start, { item: "go" }), [false, "asleep"]);
  assert.equal(ground.there(pet, start + 1), false);
  // sleeping, it isn't over there even if it was
  pet.asleep = false;
  act(pet, "train", start, { item: "go" });
  pet.asleep = true;
  assert.equal(ground.there(pet, start + 1), false);
});

test("the equipment is found once on trips and makes a perfect exercise worth 5", () => {
  assert.deepEqual(Object.entries(ground.EQUIPMENT).map(([skill, item]) =>
    [skill, home.ITEMS[item], Object.keys(trip.FINDS).find((area) => trip.FINDS[area].some(([find]) => find === item))]),
  [["strength", "ground", "mountain"], ["speed", "ground", "meadow"], ["smarts", "ground", "forest"]]);
  assert.deepEqual(ground.equipment(pet.items), []);

  act(pet, "train", start, { item: "strength", value: 1 });
  assert.equal(pet.skills.strength, 4.0);
  pet.items.barbell = 1;
  assert.deepEqual(ground.equipment(pet.items), ["barbell"]);
  act(pet, "train", start + 3 * HOUR, { item: "strength", value: 1 });
  near(pet.skills.strength, 4.0 + 5.0);
  // found, it is no longer something to discover on the mountain
  assert.equal(trip.discoveries(pet, "mountain").find((f) => f.id === "barbell")!.found, true);
});

test("with equipment it practices a little alone, until somebody trains with it again", () => {
  assert.deepEqual(ground.practicable(pet), []); // nothing to practice with
  pet.items.cones = 1;
  assert.deepEqual(ground.practicable(pet), ["speed"]);
  ground.practiceAlone(pet, "speed", start);
  assert.deepEqual([pet.skills.speed, pet.stats.mood, pet.stats.energy],
    [ground.SOLO_STEP, 60 + ground.SOLO_MOOD, 100 - ground.SOLO_ENERGY]);
  assert.equal(ground.there(pet, start + 10), true); // over there for it
  assert.equal(ground.there(pet, start + ground.SOLO_SECONDS + 1), false);
  ground.practiceAlone(pet, "speed", start + HOUR);
  assert.deepEqual(ground.practicable(pet), []); // that is enough alone
  assert.equal(pet.skills.speed, ground.SOLO_LIMIT);

  act(pet, "train", start + 2 * HOUR, { item: "speed" });
  act(pet, "train", start + 2 * HOUR + pet.training!.delay! + 0.3, { item: "tap" });
  assert.deepEqual(ground.practicable(pet), ["speed"]); // trained together: it may again
});

test("left to itself with equipment, it goes over to practice now and then", () => {
  pet.items = { barbell: 1, cones: 1, coach_board: 1 };
  model.advance(pet, start + 12 * HOUR, BEDTIME);
  const solo = pet.events.filter((e) => e.action === "solo").map((e) => e.item!);
  const workouts = solo.filter((item) => item in ground.EQUIPMENT);
  assert.ok(workouts.length >= 1, solo.join());
  // no more than allowed for each stat
  for (const skill of Object.keys(ground.EQUIPMENT)) {
    assert.ok(workouts.filter((item) => item === skill).length <= ground.SOLO_LIMIT / ground.SOLO_STEP);
  }
});

test("the snapshot tells the equipment and who is over there", () => {
  const now = start;
  const p = new Disk().pet();
  p.state = grown(now);
  p.state.items.cones = 1;
  assert.deepEqual(p.snapshot(now).ground, { equipment: ["cones"], there: [] });
  p.action("train", { item: "go", now });
  assert.deepEqual(p.snapshot(now + 1).ground, { equipment: ["cones"], there: [p.state.id] });
  assert.deepEqual(p.view(now + 1).ground, ["cones"]);
  assert.equal(p.groundPet(now + 1), p.state.id);
  p.action("train", { item: "leave", now: now + 2 });
  assert.equal(p.view(now + 3).ground, null);
  assert.equal(p.groundPet(now + 3), null);
  assert.deepEqual(p.groundView(), { equipment: ["cones"] });
});
