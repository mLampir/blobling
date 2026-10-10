// What the pet does by itself, and what it tells when somebody comes back.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as care from "../src/care";
import * as idle from "../src/idle";
import * as model from "../src/model";
import type { PetState } from "../src/state";
import { BEDTIME, HOUR, act, at, grown } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 08:00");
  pet = grown(start);
  pet.stats = { satiety: 100, mood: 60, energy: 100, hygiene: 100, health: 100 };
});

function solo(p: PetState, from = 0): string[] {
  return p.events.filter((e) => e.action === "solo" && e.at > from).map((e) => e.item!);
}

test("left to itself, it plays now and then", () => {
  model.advance(pet, start + 6 * HOUR, BEDTIME);
  const done = solo(pet);
  assert.ok(done.length >= 2 && done.length <= 7, `${done.length} times`);
  assert.ok(done.every((item) => item === "ball")); // it hasn't been shown any trick yet
  assert.ok(pet.events.filter((e) => e.action === "solo").every((e) => e.by === "system"));
});

test("not while somebody is busy with it, and not in its sleep", () => {
  for (let t = start; t < start + 6 * HOUR; t += 10 * 60) {
    act(pet, "pet", t);
    model.advance(pet, t + 10 * 60 - 1, BEDTIME);
  }
  assert.deepEqual(solo(pet), []);

  const night = at("2026-10-12 23:30");
  model.advance(pet, night, BEDTIME);
  assert.ok(pet.asleep);
  const before = pet.events.length;
  model.advance(pet, at("2026-10-13 06:30"), BEDTIME);
  assert.deepEqual(solo(pet, pet.events[before - 1].at), []);
});

test("it only practices tricks it has been shown, and only a little", () => {
  act(pet, "trick", start, { item: "dance" });
  const shown = pet.tricks.dance;
  for (let hours = 12; hours <= 72; hours += 12) { // looked after now and then, but no more practice
    model.advance(pet, start + hours * HOUR, BEDTIME);
    Object.assign(pet.stats, { satiety: 100, hygiene: 100 });
  }
  assert.ok(solo(pet).includes("dance"));
  assert.ok(!solo(pet).some((item) => item !== "dance" && item !== "ball"));
  assert.equal(pet.tricks.dance, shown + idle.SOLO_LIMIT); // no further without practicing together
  assert.ok(!care.knows(pet, "dance"));

  act(pet, "trick", start + 3 * 86400 + 60, { item: "dance" });
  assert.equal(pet.solo.dance, undefined); // now it may practice alone again
});

test("it never learns a trick alone", () => {
  pet.tricks.bow = care.TRICKS.bow - idle.PRACTICE_STEP; // one step short
  assert.deepEqual(idle.practicable(pet), []);
  pet.tricks.bow = care.TRICKS.bow - 2 * idle.PRACTICE_STEP - 0.01;
  assert.deepEqual(idle.practicable(pet), ["bow"]);
});

test("catching up gives the same as running non-stop", () => {
  const stepwise = grown(start);
  const atOnce = grown(start);
  act(stepwise, "trick", start, { item: "spin" });
  act(atOnce, "trick", start, { item: "spin" });
  for (let t = start; t <= start + 12 * HOUR; t += 7 * 60) {
    model.advance(stepwise, t, BEDTIME);
  }
  model.advance(stepwise, start + 12 * HOUR, BEDTIME);
  model.advance(atOnce, start + 12 * HOUR, BEDTIME);
  assert.deepEqual(stepwise, atOnce);
});

test("coming back after a while, it tells what happened", () => {
  act(pet, "feed", start, { item: "meal" });
  assert.equal(idle.welcome(pet, start + HOUR), null); // somebody was just there
  model.logEvent(pet, start + HOUR, "fruit", "system", { item: "berry" });
  model.logEvent(pet, start + 2 * HOUR, "fruit", "system", { item: "berry" });
  model.logEvent(pet, start + 3 * HOUR, "visit", "system", { item: "cyclopuff" });
  model.logEvent(pet, start + 3 * HOUR, "heart", "system");
  model.logEvent(pet, start + 4 * HOUR, "feed", "app", { item: "meal", accepted: false, reason: "full" });

  assert.equal(idle.welcome(pet, start + 5 * HOUR), null); // not long enough
  assert.deepEqual(idle.welcome(pet, start + 7 * HOUR), {
    since: start,
    told: [
      { action: "fruit", item: "berry", count: 2 },
      { action: "visit", item: "cyclopuff", count: 1 },
    ],
  });

  act(pet, "pet", start + 7 * HOUR);
  assert.equal(idle.welcome(pet, start + 7 * HOUR + 60), null); // told once somebody is back
});

test("nothing to tell: no welcome", () => {
  pet.seen_at = start;
  assert.equal(idle.welcome(pet, start + 8 * HOUR), null);
  pet.seen_at = 0; // an old save: not known when somebody was last there
  model.logEvent(pet, start + HOUR, "fruit", "system", { item: "berry" });
  assert.equal(idle.welcome(pet, start + 8 * HOUR), null);
});
