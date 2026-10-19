// Food from trips: one kind per area, given by hand, and what it leaves in the pet.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as battle from "../src/battle";
import * as food from "../src/food";
import * as home from "../src/home";
import * as model from "../src/model";
import { fromDict, toDict, type PetState } from "../src/state";
import * as trip from "../src/trip";
import { BEDTIME, HOUR, act, at, grown, withRules } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
  pet.name = "Blob";
  pet.stats = { satiety: 60, mood: 80, energy: 90, hygiene: 100, health: 100 };
});

function runUntil(when: number): void {
  model.advance(pet, when, BEDTIME);
}

test("every area has one food, and every food is found somewhere", () => {
  for (const area of trip.AREAS) {
    assert.equal(trip.FINDS[area].filter(([item]) => food.isFood(item)).length, 1, area);
  }
  const found = trip.AREAS.flatMap((area) => trip.FINDS[area].map(([item]) => item));
  for (const item of Object.keys(food.FOODS)) {
    assert.equal(home.kindOf(item), "food");
    assert.ok(found.includes(item), item);
  }
});

test("it is kept in small numbers", () => {
  for (let i = 0; i < home.MAX_FOOD + 2; i++) {
    home.addItem(pet, "honeycomb");
  }
  assert.equal(pet.items.honeycomb, home.MAX_FOOD);
  assert.equal(home.canAdd(pet, "honeycomb"), false);
  assert.equal(home.canAdd(pet, "hazelnut"), true);
});

test("given by hand: a little filling, no snack, and a boost that doesn't add up", () => {
  assert.deepEqual(act(pet, "feed", start, { item: "honeycomb" }), [false, "no_item"]);
  pet.items.honeycomb = 2;
  const snacks = pet.counters.snacks ?? 0;
  assert.deepEqual(act(pet, "feed", start, { item: "honeycomb", throw: 0.5 }), [true, null]);
  assert.equal(pet.items.honeycomb, 1);
  assert.deepEqual(pet.boosts, ["heart"]);
  assert.equal(pet.stats.satiety, 60 + food.SATIETY);
  assert.equal(pet.activity, "throw_snack");
  assert.equal(pet.counters.snacks ?? 0, snacks); // it doesn't count as a snack
  assert.equal(pet.counters.food_honeycomb, 1);
  assert.equal(pet.diary.food_honeycomb, 1); // which food a child gets most could decide a form one day
  // while the heart is waiting, another honeycomb is refused
  assert.deepEqual(act(pet, "feed", start + 60, { item: "honeycomb" }), [false, "boost_waiting"]);
  assert.equal(pet.items.honeycomb, 1);
  // three snacks in a row don't keep it from eating found food
  for (let i = 0; i < model.MAX_SNACKS; i++) {
    act(pet, "feed", start + 120 + i, { item: "cookie" });
  }
  pet.items.hazelnut = 1;
  assert.deepEqual(act(pet, "feed", start + 200, { item: "hazelnut" }), [true, null]);
  assert.deepEqual(pet.boosts, ["heart", "trick"]);
  // not in its sleep
  pet.items.watercress = 1;
  pet.asleep = true;
  assert.deepEqual(act(pet, "feed", start + 300, { item: "watercress" }), [false, "asleep"]);
});

test("honeycomb: one more heart on the next trip", () => {
  const usual = trip.startHearts(pet);
  pet.boosts = ["heart"];
  assert.deepEqual(act(pet, "trip", start, { item: "meadow" }), [true, null]);
  assert.equal(pet.trip!.hearts, usual + 1);
  assert.deepEqual(pet.boosts, []); // used up
});

test("glow berry: it finds something at every quiet stop", () => {
  pet.boosts = ["finder"];
  pet.guardians = ["meadow"]; // so that nobody is waiting at the end of the path
  withRules(trip.rules, { encounterChance: 0 }, () => {
    act(pet, "trip", start, { item: "meadow" });
    const stations = pet.trip!.stations.length;
    runUntil(start + 3 * HOUR);
    const finds = pet.events.filter((e) => e.action === "find").length;
    assert.equal(finds, stations);
  });
});

test("pine cone: the next trip doesn't tire it and brings as much as the first of the day", () => {
  act(pet, "trip", start, { item: "meadow" });
  runUntil(start + 3 * HOUR);
  act(pet, "unpack", start + 3 * HOUR);
  pet.stats = { satiety: 80, mood: 80, energy: 80, hygiene: 100, health: 100 };
  const second = start + 3 * HOUR + 60;
  assert.equal(trip.dayFactor(pet, second), 0.5);
  const tired = fromDict(toDict(pet) as unknown as Record<string, unknown>);
  pet.boosts = ["fresh"];
  withRules(trip.rules, { encounterChance: 0 }, () => {
    for (const p of [pet, tired]) {
      model.applyAction(p, "trip", second, BEDTIME, { item: "meadow" });
    }
    assert.equal(pet.trip!.factor, 1.0);
    assert.equal(tired.trip!.factor, 0.5);
    const station = pet.trip!.stations[0];
    for (const p of [pet, tired]) {
      model.advance(p, station + 60, BEDTIME);
    }
  });
  assert.ok(pet.stats.energy > tired.stats.energy + trip.STATION_COST.energy / 2);
  assert.ok(pet.stats.satiety > tired.stats.satiety + trip.STATION_COST.satiety / 2);
});

test("hazelnut: the next trick practice counts double", () => {
  const plain = fromDict(toDict(pet) as unknown as Record<string, unknown>);
  pet.boosts = ["trick"];
  for (const p of [pet, plain]) {
    model.applyAction(p, "trick", start, BEDTIME, { item: "flip" });
  }
  assert.equal(pet.tricks.flip, 2 * plain.tricks.flip);
  assert.deepEqual(pet.boosts, []);
});

test("watercress: the next exercise counts double", () => {
  const plain = fromDict(toDict(pet) as unknown as Record<string, unknown>);
  pet.boosts = ["train"];
  for (const p of [pet, plain]) {
    model.applyAction(p, "train", start, BEDTIME, { item: "strength", value: 0.5 });
  }
  const before = battle.newSkills().strength;
  assert.ok(plain.skills.strength > before);
  assert.equal(Number((pet.skills.strength - before).toFixed(3)), Number((2 * (plain.skills.strength - before)).toFixed(3)));
  assert.deepEqual(pet.boosts, []);
});

