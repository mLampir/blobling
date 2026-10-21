// The bag: fruits and food from trips, given by hand, what each form likes and what food leaves in the pet.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as battle from "../src/battle";
import * as food from "../src/food";
import * as home from "../src/home";
import * as model from "../src/model";
import { fromDict, toDict, type PetState } from "../src/state";
import * as trip from "../src/trip";
import { BEDTIME, HOUR, act, at, grown, refused, withRules } from "./helpers";

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

test("only what is in the bag, and no more than a few of each", () => {
  assert.deepEqual(act(pet, "feed", start, { item: "fruit_cherry" }), [false, "no_item"]);
  refused(() => act(pet, "feed", start, { item: "cookie" }), "unknown_food"); // no snacks out of thin air
  for (let i = 0; i < home.MAX_FOOD; i++) {
    home.receive(pet, "fruit_cherry"); // a friend's gift or something found at home
  }
  assert.equal(pet.items.fruit_cherry, home.MAX_FOOD);
  const mood = pet.stats.mood;
  home.receive(pet, "fruit_cherry"); // no room left: eaten straight away
  assert.equal(pet.items.fruit_cherry, home.MAX_FOOD);
  assert.equal(pet.stats.mood, mood + home.PLANTS.cherry[1]);
  pet.stats.mood = 20;
  assert.deepEqual(act(pet, "feed", start, { item: "fruit_cherry", throw: 0.5 }), [true, null]);
  assert.equal(pet.items.fruit_cherry, home.MAX_FOOD - 1);
  assert.equal(pet.stats.mood, 20 + home.PLANTS.cherry[1] + food.FRUIT_MOOD);
  assert.equal(pet.activity, "throw_snack");
  assert.deepEqual([pet.counters.snacks, pet.counters.food_fruit_cherry], [1, 1]);
  assert.equal(pet.diary.food_fruit_cherry, 1); // which food a child gets most could decide a form one day
});

test("every form has a favorite and something it won't eat, and both show once tried", () => {
  for (const [favorite, disliked] of Object.values(food.TASTES)) {
    assert.ok(food.edible(favorite) && food.edible(disliked) && favorite !== disliked);
  }
  assert.deepEqual(food.known(pet), { favorite: null, disliked: null });
  const [favorite, disliked] = food.TASTES.blob;
  pet.items[disliked] = 1;
  pet.items[favorite] = 1;
  assert.deepEqual(act(pet, "feed", start, { item: disliked }), [false, "dislikes"]);
  assert.equal(pet.items[disliked], 1); // it stays in the bag
  pet.stats.mood = 20;
  act(pet, "feed", start + 60, { item: favorite });
  assert.equal(pet.stats.mood, 20 + food.FRUIT_MOOD + food.FAVORITE_MOOD);
  assert.deepEqual(food.known(pet), { favorite, disliked });
  // a new form has tastes of its own, found out anew
  pet.species = "angloop";
  assert.deepEqual(food.known(pet), { favorite: null, disliked: null });
});

test("food from trips: a little filling and a boost that doesn't add up", () => {
  pet.items.hazelnut = 2;
  assert.deepEqual(act(pet, "feed", start, { item: "hazelnut" }), [true, null]);
  assert.equal(pet.items.hazelnut, 1);
  assert.deepEqual(pet.boosts, ["trick"]);
  assert.equal(pet.stats.satiety, 60 + food.SATIETY);
  // while the boost is waiting, another hazelnut is refused
  assert.deepEqual(act(pet, "feed", start + 60, { item: "hazelnut" }), [false, "boost_waiting"]);
  assert.equal(pet.items.hazelnut, 1);
  // food that works from the backpack is plain food at home: no boost
  pet.items.honeycomb = 1;
  assert.deepEqual(act(pet, "feed", start + 200, { item: "honeycomb" }), [true, null]);
  assert.deepEqual(pet.boosts, ["trick"]);
  // not in its sleep
  pet.items.watercress = 1;
  pet.asleep = true;
  assert.deepEqual(act(pet, "feed", start + 300, { item: "watercress" }), [false, "asleep"]);
});

test("honeycomb: packed, one more heart on the trip", () => {
  const usual = trip.startHearts(pet);
  pet.items.honeycomb = 1;
  assert.deepEqual(act(pet, "trip", start, { item: "meadow", value: ["honeycomb"] }), [true, null]);
  assert.equal(pet.trip!.hearts, usual + 1);
  assert.deepEqual([pet.trip!.pack, pet.items.honeycomb], [[], undefined]); // used up when it sets off
  // one still waiting from before packing existed works too
  const old = grown(start);
  old.boosts = ["heart"];
  act(old, "trip", start, { item: "meadow" });
  assert.deepEqual([old.trip!.hearts, old.boosts], [usual + 1, []]);
});

test("glow berry: packed, it finds something at every quiet stop", () => {
  pet.items.glowberry = 1;
  pet.guardians = ["meadow"]; // so that nobody is waiting at the end of the path
  withRules(trip.rules, { encounterChance: 0 }, () => {
    act(pet, "trip", start, { item: "meadow", value: ["glowberry"] });
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
  pet.items.pinenut = 1;
  withRules(trip.rules, { encounterChance: 0 }, () => {
    for (const p of [pet, tired]) {
      model.applyAction(p, "trip", second, BEDTIME, { item: "meadow", value: p === pet ? ["pinenut"] : [] });
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

