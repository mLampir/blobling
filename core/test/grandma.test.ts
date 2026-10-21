// A visit to Grandma's: taken there on purpose, it brings her things home; the mouse line.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as food from "../src/food";
import * as grandma from "../src/grandma";
import * as life from "../src/life";
import * as model from "../src/model";
import type { PetState } from "../src/state";
import { act, at, BEDTIME, grown, HOUR } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
});

/** Taken to Grandma's at `from`, fetched `hours` later; returns when it was fetched. */
function visit(from: number, hours: number): number {
  assert.deepEqual(act(pet, "visit_grandma", from), [true, null]);
  const back = from + hours * HOUR;
  model.advance(pet, back, BEDTIME);
  assert.deepEqual(act(pet, "grandma", back), [true, null]);
  return back;
}

test("taken to Grandma's, it stays there frozen until it is fetched", () => {
  const due = life.dueAt(pet)!;
  assert.equal(model.availableActions(pet, start).visit_grandma, true);
  assert.deepEqual(act(pet, "visit_grandma", start), [true, null]);
  assert.ok(pet.grandma > 0 && pet.grandma_visit);
  assert.deepEqual(act(pet, "visit_grandma", start + 60), [false, "at_grandmas"]);
  model.advance(pet, start + 5 * 86400, BEDTIME);
  act(pet, "grandma", start + 5 * 86400);
  assert.equal(pet.grandma, 0);
  assert.equal(life.dueAt(pet), due + 5 * 86400); // it didn't grow on while it was there
  pet.stage = "egg";
  assert.deepEqual(act(pet, "visit_grandma", start + 6 * 86400), [false, "egg"]);
});

test("after a whole day it brings Grandma's things home; fetched sooner, nothing", () => {
  let t = visit(start, 20);
  assert.deepEqual(pet.backpack, []);
  t = visit(t + HOUR, 25);
  const packed: string[] = pet.backpack;
  const [hat, ...rest] = packed;
  assert.ok(grandma.HATS.includes(hat), hat);
  assert.ok(rest.includes(grandma.CAKE));
  assert.equal(model.availableActions(pet, t).visit_grandma, false); // unpack first
  act(pet, "unpack", t + 10);
  assert.equal(pet.items[hat], 1);
  // she has something new at most every few days
  t = visit(t + HOUR, 25);
  assert.deepEqual(pet.backpack, []);
});

test("the attic: the mouse's egg first, sure by the third visit, later eggs of lines it knows", () => {
  let t = start;
  const eggs: string[] = [];
  for (let i = 0; i < 9; i++) {
    t = visit(t + HOUR, 24 * 3 + 1);
    eggs.push(...pet.backpack.filter((item) => item.startsWith("egg_")));
    act(pet, "unpack", t + 10);
    if (i === grandma.ATTIC_SURE - 1) {
      assert.deepEqual(eggs.slice(0, 1), ["egg_mouse"]);
    }
  }
  assert.ok(eggs.length >= 3);
  assert.ok(eggs.every((egg) => ["egg_mouse", "egg_blob"].includes(egg)), eggs.join()); // its own line and the mouse
  assert.deepEqual(grandma.HATS.filter((hat) => pet.items[hat]), grandma.HATS); // and every hat, once
});

test("a pet that went because nobody came brings nothing back", () => {
  pet.seen_at = start;
  model.advance(pet, start + model.GRANDMA_AFTER + 3 * 86400, BEDTIME);
  assert.ok(pet.grandma > 0 && !pet.grandma_visit);
  act(pet, "grandma", start + model.GRANDMA_AFTER + 4 * 86400);
  assert.deepEqual(pet.backpack, []);
});

test("Grandma's cake fills it up and cheers it up all the way", () => {
  pet.items = { cake: 1 };
  Object.assign(pet.stats, { satiety: 30, mood: 20 });
  assert.equal(food.give(pet, "cake"), null);
  assert.deepEqual([pet.stats.satiety, pet.stats.mood, pet.boosts], [30 + food.CAKE_SATIETY, 100, []]);
});

test("the mouse line's adult forms", () => {
  const decide = (diary: Record<string, number> = {}, world: life.World = {}) =>
    life.decideSpecies({ minutes: 7 * 1440, ...diary }, "mouse", world);
  assert.equal(decide(), "cogsqueak");
  assert.equal(decide({ hungry_minutes: 3 }), "sirthimble");
  assert.equal(decide({ hungry_minutes: 3 }, { grandmaHat: true }), "woolwhisk");
  // the world knows the hat it wears
  pet.items.stripes = 1;
  pet.hat = "stripes";
  assert.equal(model.worldAt(start, null, null, null, pet).grandmaHat, true);
  // hungry minutes are counted as a child
  pet.stats.satiety = life.HUNGRY_SATIETY - 1;
  life.recordMinute(pet, false);
  assert.equal(pet.diary.hungry_minutes, 1);
});
