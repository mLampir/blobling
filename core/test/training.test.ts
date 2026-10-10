// Training for the battle stats.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as battle from "../src/battle";
import * as model from "../src/model";
import { fromDict, toDict, type PetState } from "../src/state";
import { HOUR, act, at, grown, near, refused } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
});

test("throwing the ball builds strength", () => {
  Object.assign(pet.stats, { energy: 80, satiety: 80 });
  assert.deepEqual(act(pet, "train", start, { item: "strength", value: 1 }), [true, null]);
  assert.deepEqual(pet.skills, { strength: 4.0, speed: 0.0, smarts: 0.0 });
  assert.deepEqual([pet.activity, pet.activity_item], ["train_strength", "1.00"]);
  assert.deepEqual([pet.stats.energy, pet.stats.satiety], [72, 77]);
  assert.deepEqual([pet.diary.plays, pet.counters.trainings], [1, 1]); // counts as playing
  // a weaker throw brings less, and so does training again straight away
  act(pet, "train", start + 60, { item: "strength", value: 0.5 });
  near(pet.skills.strength, 4 + 4 * 0.5 * 0.6);
  for (const bad of [null, undefined, 1.5, -0.1, "1", true]) {
    refused(() => act(pet, "train", start + 120, { item: "strength", value: bad }), "invalid_value");
  }
  refused(() => act(pet, "train", start + 120, { item: "juggling" }), "unknown_exercise");
});

test("reaction test is timed by the clock, not by the phone", () => {
  assert.deepEqual(act(pet, "train", start, { item: "tap" }), [false, "no_training"]);
  assert.deepEqual(act(pet, "train", start, { item: "speed" }), [true, null]);
  const delay = pet.training!.delay!;
  assert.ok(battle.SIGNAL_DELAY[0] <= delay && delay <= battle.SIGNAL_DELAY[1]);
  assert.deepEqual([pet.activity, pet.activity_item], ["train_ready", delay.toFixed(2)]);
  // before the signal: nothing gained, but nothing lost either
  const energy = pet.stats.energy;
  assert.deepEqual(act(pet, "train", start + delay - 0.5, { item: "tap" }), [true, null]);
  assert.deepEqual([pet.activity_item, pet.skills.speed, pet.stats.energy], ["early", 0.0, energy]);
  assert.equal(pet.training, null);
  // a quick tap counts in full, a slow one for less
  act(pet, "train", start + 60, { item: "speed" });
  act(pet, "train", start + 60 + pet.training!.delay! + 0.3, { item: "tap" });
  assert.deepEqual([pet.skills.speed, pet.activity], [4.0, "train_speed"]);
  act(pet, "train", start + 3 * HOUR, { item: "speed" });
  act(pet, "train", start + 3 * HOUR + pet.training!.delay! + 0.95, { item: "tap" });
  near(pet.skills.speed, 4 + 4 * 0.5, 0.005);
  // the signal doesn't wait forever
  act(pet, "train", start + 6 * HOUR, { item: "speed" });
  const late = start + 6 * HOUR + pet.training!.delay! + battle.SIGNAL_WINDOW + 1;
  assert.deepEqual(act(pet, "train", late, { item: "tap" }), [false, "no_training"]);
});

test("sequence has to be swiped back", () => {
  assert.deepEqual(act(pet, "train", start, { item: "smarts" }), [true, null]);
  let steps = [...pet.training!.sequence!];
  assert.equal(steps.length, 3);
  assert.deepEqual([pet.activity, pet.activity_item], ["train_show", steps.join(",")]);
  const wrong = steps.map((step) => (step !== "up" ? "up" : "down"));
  assert.deepEqual(act(pet, "train", start + 10, { item: "answer", value: [steps[0], ...wrong.slice(1)] }), [true, null]);
  near(pet.skills.smarts, 4 / 3, 0.005);
  assert.equal(pet.activity_item, "1/3");
  assert.deepEqual(act(pet, "train", start + 20, { item: "answer", value: steps }), [false, "no_training"]);
  // the smarter it is, the longer the sequence
  pet.skills.smarts = 50.0;
  act(pet, "train", start + 3 * HOUR, { item: "smarts" });
  steps = [...pet.training!.sequence!];
  assert.equal(steps.length, 5);
  act(pet, "train", start + 3 * HOUR + 10, { item: "answer", value: steps });
  assert.deepEqual([pet.skills.smarts, pet.activity_item], [54.0, "5/5"]);
  act(pet, "train", start + 6 * HOUR, { item: "smarts" });
  assert.deepEqual(act(pet, "train", start + 6 * HOUR + 5, { item: "answer", value: [] }), [true, null]);
  assert.equal(pet.skills.smarts, 54.0); // all wrong: nothing gained
  for (const bad of [null, "left", ["north"], Array(7).fill("left")]) {
    refused(() => act(pet, "train", start + 7 * HOUR, { item: "answer", value: bad }), "invalid_value");
  }
});

test("training needs a break, whatever the exercise", () => {
  Object.assign(pet.stats, { energy: 80, satiety: 80 });
  act(pet, "train", start, { item: "strength", value: 1 });
  assert.deepEqual(act(pet, "train", start + 30, { item: "speed" }), [false, "rest_train"]);
  assert.deepEqual(act(pet, "train", start + 30, { item: "strength", value: 1 }), [false, "rest_train"]);
  assert.equal(pet.training, null);
  act(pet, "train", start + 60, { item: "smarts" });
  act(pet, "train", start + 70, { item: "answer", value: pet.training!.sequence });
  assert.deepEqual(act(pet, "train", start + 200, { item: "speed" }), [false, "rest_train"]); // 3 minutes now
  assert.deepEqual(act(pet, "train", start + 250, { item: "speed" }), [true, null]);
  // an exercise that went completely wrong costs nothing, not even a break
  act(pet, "train", start + 250.5, { item: "tap" });
  assert.equal(pet.activity_item, "early");
  assert.equal(model.restLeft(pet, ["train_strength", "train_speed", "train_smarts"], start + 250.5), 0);
});

test("training refused", () => {
  pet.stats.energy = 10;
  assert.deepEqual(act(pet, "train", start, { item: "speed" }), [false, "tired_train"]);
  assert.equal(model.availableActions(pet, start).train, false);
  pet.stats.energy = 80;
  pet.asleep = true;
  assert.deepEqual(act(pet, "train", start, { item: "strength", value: 1 }), [false, "asleep"]);
  pet.asleep = false;
  act(pet, "trip", start, { item: "meadow" });
  assert.deepEqual(act(pet, "train", start + 60, { item: "smarts" }), [false, "away"]);
  const egg = model.newPet(start);
  assert.deepEqual(act(egg, "train", start, { item: "speed" }), [false, "egg"]);
  assert.deepEqual(pet.skills, battle.newSkills());
});

test("old save files get the battle stats", () => {
  const data = toDict(pet) as unknown as Record<string, unknown>;
  delete data.skills;
  delete data.training;
  assert.deepEqual(fromDict(data).skills, battle.newSkills());
});
