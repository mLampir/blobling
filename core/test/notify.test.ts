// When the pet will call for somebody next (the app's notifications).

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as model from "../src/model";
import * as notify from "../src/notify";
import { Pet } from "../src/pet";
import type { PetState } from "../src/state";
import { BEDTIME, HOUR, at, grown } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 08:00");
  pet = grown(start);
  pet.stats = { satiety: 40, mood: 100, energy: 100, hygiene: 100, health: 100 };
});

test("it calls when it gets hungry, the moment it does", () => {
  const reminder = notify.nextReminder(pet, start, BEDTIME)!;
  assert.equal(reminder.need, "satiety");
  assert.ok(reminder.at > start && reminder.at < start + 6 * HOUR, `${(reminder.at - start) / HOUR} hours`);

  // running the pet itself gets the same: not hungry a minute before, hungry then
  const real = structuredClone(pet);
  model.advance(real, reminder.at - model.TICK, BEDTIME);
  assert.deepEqual(notify.calls(real), []);
  model.advance(real, reminder.at, BEDTIME);
  assert.deepEqual(notify.calls(real), ["satiety"]);
});

test("looking ahead changes nothing", () => {
  const before = structuredClone(pet);
  notify.nextReminder(pet, start, BEDTIME);
  assert.deepEqual(pet, before);
});

test("a need it already has has been seen", () => {
  pet.stats.satiety = 10;
  pet.stats.hygiene = 30;
  const reminder = notify.nextReminder(pet, start, BEDTIME)!;
  assert.equal(reminder.need, "hygiene");
});

test("tiredness and a single poop are no reason to call", () => {
  pet.stats = { satiety: 100, mood: 100, energy: 5, hygiene: 100, health: 100 };
  pet.poops = 1;
  assert.deepEqual(notify.calls(pet), []);
  const reminder = notify.nextReminder(pet, start, BEDTIME);
  assert.ok(!reminder || reminder.at - start > 2 * HOUR); // the poop only counts once it is really dirty
});

test("never at night: a need that comes up in its sleep waits for the morning", () => {
  const evening = at("2026-10-12 22:00");
  pet = grown(evening);
  pet.stats = { satiety: 30, mood: 100, energy: 100, hygiene: 100, health: 100 };
  const reminder = notify.nextReminder(pet, evening, BEDTIME)!;
  assert.equal(reminder.need, "satiety");
  assert.ok(reminder.at >= at("2026-10-13 07:00"), new Date(reminder.at * 1000).toString());
  assert.ok(!model.isBedtime(reminder.at, BEDTIME));

  const real = structuredClone(pet);
  model.advance(real, reminder.at, BEDTIME);
  assert.ok(!real.asleep);
});

test("an egg never calls", () => {
  const egg = model.newPet(start);
  assert.equal(notify.nextReminder(egg, start, BEDTIME), null);
});

test("the pet tells when it will call", () => {
  const app = new Pet({ t: (key) => key, saved: { state: pet, ancestors: [] }, bedtime: () => BEDTIME,
    clock: () => start });
  assert.equal(app.nextReminder()?.need, "satiety");
  assert.equal(app.nextReminder(0), null); // the clock isn't set yet
});
