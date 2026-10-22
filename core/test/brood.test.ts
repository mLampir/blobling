// The pet's own egg: good days with a strong bond, an egg in the morning, then a rest.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as brood from "../src/brood";
import * as home from "../src/home";
import * as model from "../src/model";
import { fromDict, toDict, type PetState } from "../src/state";
import * as wild from "../src/wild";
import { BEDTIME, HOUR, act, at, grown } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 08:00");
  pet = grown(start);
  Object.assign(pet, { stage: "adult", species: "cyclopuff", name: "Puff", bond: 85 });
  pet.skills = { strength: 40, speed: 21, smarts: 0 };
});

/** `minutes` minutes awake at home on the day of `from`, in this mood, then the next day begins. */
function day(from: number, mood: number, minutes = 8 * 60, atHome = true): number {
  pet.stats.mood = mood;
  for (let i = 1; i <= minutes; i++) {
    brood.step(pet, from + i * 60, atHome);
  }
  const next = from + 86400;
  brood.step(pet, next, false); // the next day settles this one
  return next;
}

test("only a close adult counts its good days", () => {
  let t = day(start, 80);
  assert.equal(pet.brood.days, 1);
  for (const change of [{ stage: "child" }, { bond: 79 }]) {
    const before = toDict(pet);
    Object.assign(pet, change);
    t = day(t, 80);
    assert.equal(pet.brood.days, 1, JSON.stringify(change));
    Object.assign(pet, fromDict(before as unknown as Record<string, unknown>));
  }
});

test("a day counts by its average mood at home, and the days need not follow each other", () => {
  let t = day(start, brood.GOOD_MOOD);
  t = day(t, brood.GOOD_MOOD - 1); // not quite
  t = day(t, 90, brood.MIN_MINUTES - 1); // hardly there
  t = day(t, 90, 8 * 60, false); // on a trip all day, or asleep
  assert.equal(pet.brood.days, 1);
  // half the day glum, half the day happy: on average good enough
  pet.stats.mood = 30;
  for (let i = 1; i <= 120; i++) {
    brood.step(pet, t + i * 60, true);
  }
  t = day(t + 120 * 60, 95, 120);
  assert.deepEqual([pet.brood.days, pet.brood.ready], [2, false]);
});

test("after five good days the egg lies in the nest the next morning, and then it rests", () => {
  let t = start;
  for (let i = 0; i < brood.DAYS; i++) {
    t = day(t, 80);
  }
  assert.equal(pet.brood.ready, true);
  assert.equal(brood.counting(pet, t), false); // it has its days: no more counting till it has laid
  const egg = brood.wake(pet, t);
  assert.deepEqual(egg, { line: "blob", from: "Puff", skills: { strength: 10.0, speed: 5.3, smarts: 0.0 } });
  assert.deepEqual(pet.nest, egg);
  assert.deepEqual([pet.brood.days, pet.brood.ready, pet.brood.rest_until], [0, false, t + brood.REST]);
  // during the rest nothing counts; after it, the days start again from nothing
  t = day(t, 90);
  assert.equal(pet.brood.days, 0);
  t = day(pet.brood.rest_until, 90);
  assert.equal(pet.brood.days, 1);
  // the egg is collected like a friend's
  assert.deepEqual(act(pet, "collect", t + 60), [true, null]);
  assert.deepEqual([pet.nest, pet.eggs.at(-1)!.line], [null, "blob"]);
});

test("without room for the egg it waits for a later morning", () => {
  Object.assign(pet.brood, { days: brood.DAYS, ready: true });
  pet.nest = { line: "ember" };
  assert.equal(brood.wake(pet, start), null);
  pet.nest = null;
  pet.eggs = Array(home.MAX_EGGS).fill({ line: "stone" }); // other lines don't take its room
  assert.ok(brood.wake(pet, start));
  Object.assign(pet.brood, { days: brood.DAYS, ready: true, rest_until: 0 });
  pet.nest = null;
  pet.eggs = Array(home.MAX_EGGS).fill({ line: "blob" }); // as many of its own line as there may be
  assert.equal(wild.roomForEgg(pet, "blob"), false);
  assert.equal(brood.wake(pet, start), null);
  pet.eggs = [];
  assert.equal(brood.wake(pet, start + 86400)!.line, "blob");
});

test("the egg comes when it wakes up at home in the morning, not after a nap", () => {
  Object.assign(pet.brood, { days: brood.DAYS, ready: true });
  Object.assign(pet.stats, { satiety: 90, energy: 50, hygiene: 90, mood: 90 });
  // a nap in the afternoon: no egg when it wakes
  const nap = at("2026-10-12 14:00");
  pet.updated_at = nap;
  model.fallAsleep(pet, nap);
  model.advance(pet, nap + 2 * HOUR, BEDTIME);
  assert.equal(pet.asleep, false);
  assert.equal(pet.nest, null);
  // the night: in the morning it lies there
  const night = at("2026-10-12 23:00");
  pet.updated_at = night;
  pet.seen_at = night;
  model.fallAsleep(pet, night);
  model.advance(pet, at("2026-10-13 07:30"), BEDTIME);
  assert.equal(pet.asleep, false);
  assert.equal(pet.nest!.line, "blob");
  const laid = pet.events.find((e) => e.action === "laid")!;
  assert.deepEqual([laid.item, laid.at >= at("2026-10-13 07:00")], ["blob", true]);
});

test("woken in the morning, it has laid too; woken late in the evening, not yet", () => {
  Object.assign(pet.brood, { days: brood.DAYS, ready: true });
  model.fallAsleep(pet, at("2026-10-12 23:00"));
  act(pet, "wake", at("2026-10-12 23:30"));
  assert.equal(pet.nest, null);
  model.fallAsleep(pet, at("2026-10-12 23:45"));
  act(pet, "wake", at("2026-10-13 06:30"));
  assert.equal(pet.nest!.line, "blob");
});

test("good days with its owner add up over a week", () => {
  // somebody looks after it every morning and evening, and it is in a good mood all day
  pet.updated_at = start;
  for (let i = 0; i < 7 && !pet.nest; i++) {
    for (const hour of [8, 13, 18]) {
      const now = at(`2026-10-${12 + i} ${String(hour).padStart(2, "0")}:00`);
      model.advance(pet, now, BEDTIME);
      Object.assign(pet.stats, { satiety: 95, energy: 95, hygiene: 95, mood: 95 });
      pet.poops = 0;
      pet.seen_at = now;
    }
  }
  model.advance(pet, at("2026-10-19 09:00"), BEDTIME);
  const laid = pet.events.find((e) => e.action === "laid")!;
  // five good days (the 12th to the 16th), and on the morning of the 17th the egg lies there
  assert.equal(new Date(laid.at * 1000).getDate(), 17);
  assert.equal(pet.nest!.line, "blob");
});

test("time at Grandma's doesn't count, and the rest waits there too", () => {
  Object.assign(pet.brood, { rest_until: start + 5 * 86400 });
  pet.updated_at = start;
  model.goToGrandma(pet, start);
  model.advance(pet, start + 3 * 86400, BEDTIME);
  assert.equal(pet.brood.rest_until, start + 8 * 86400);
  assert.equal(pet.brood.minutes, 0);
});

test("a pet saved before its own egg starts counting from nothing", () => {
  const { brood: _, ...saved } = toDict(pet) as unknown as Record<string, unknown>;
  assert.deepEqual(fromDict(saved).brood, { day: 0, minutes: 0, mood: 0, days: 0, ready: false, rest_until: 0 });
  Object.assign(pet.brood, { days: 3, rest_until: 7 });
  assert.deepEqual(fromDict(toDict(pet) as unknown as Record<string, unknown>).brood, pet.brood);
});
