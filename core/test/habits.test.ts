// Habits: it notices when it is usually fed or played with, and waits a little before.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as habits from "../src/habits";
import { I18n } from "../src/i18n";
import * as model from "../src/model";
import { Pet } from "../src/pet";
import { fromDict, type PetState } from "../src/state";
import { act, at, grown, readLocales } from "./helpers";

let pet: PetState;

beforeEach(() => {
  pet = grown(at("2026-10-05 06:00"));
});

/** Fed at the same time of day on these days of October 2026. */
function fedAt(time: string, ...days: number[]): void {
  for (const day of days) {
    habits.record(pet, "feed", at(`2026-10-${String(day).padStart(2, "0")} ${time}`));
  }
}

test("on three days at about the same time, that time is a habit", () => {
  fedAt("08:00", 9, 10);
  assert.deepEqual(habits.usualTimes(pet, at("2026-10-12 07:45")), []);
  fedAt("08:20", 11);
  assert.deepEqual(habits.usualTimes(pet, at("2026-10-12 07:45")), [480, 500]); // 8:00 and 8:20
  // three times on one day is no habit
  pet.habits = [];
  fedAt("12:00", 9);
  fedAt("12:10", 9);
  fedAt("12:20", 9);
  assert.deepEqual(habits.usualTimes(pet, at("2026-10-12 11:45")), []);
});

test("it waits a little before the usual time, not long before and not after", () => {
  fedAt("08:00", 9, 10, 11);
  assert.equal(habits.waiting(pet, at("2026-10-12 07:30")), false);
  assert.equal(habits.waiting(pet, at("2026-10-12 07:45")), true);
  assert.equal(habits.waiting(pet, at("2026-10-12 07:59")), true);
  assert.equal(habits.waiting(pet, at("2026-10-12 08:00")), false);
  assert.equal(habits.waiting(pet, at("2026-10-12 12:00")), false);
});

test("around midnight too", () => {
  fedAt("00:05", 9, 10, 11);
  assert.equal(habits.waiting(pet, at("2026-10-11 23:55")), true);
});

test("fed just before, it doesn't wait any more", () => {
  fedAt("08:00", 9, 10, 11);
  habits.record(pet, "play", at("2026-10-12 07:40"));
  assert.equal(habits.waiting(pet, at("2026-10-12 07:50")), false);
});

test("not asleep, away, sick or in the middle of a game, and not as an egg", () => {
  fedAt("08:00", 9, 10, 11);
  const now = at("2026-10-12 07:50");
  for (const change of [{ asleep: true }, { sick: true }, { stage: "egg" as const },
    { game: { round: 1, wins: 0, last: now } }]) {
    const other = { ...pet, ...change };
    assert.equal(habits.waiting(other, now), false, JSON.stringify(change));
  }
});

test("it forgets after a week", () => {
  fedAt("08:00", 1, 2, 3);
  assert.equal(habits.waiting(pet, at("2026-10-12 07:50")), false);
  fedAt("08:00", 9, 10, 11);
  assert.equal(pet.habits.length, 3); // the old ones are gone
});

test("only feeding and playing by somebody count", () => {
  for (const day of [9, 10, 11]) {
    const t = at(`2026-10-${day} 08:00`);
    pet.stats.satiety = 30; // hungry again
    act(pet, "feed", t, { item: "meal" });
    act(pet, "clean", t + 60);
    model.applyAction(pet, "play", t + 120, ["23:00", "07:00"], { by: "system" });
  }
  assert.equal(pet.habits.length, 3);
  assert.equal(habits.waiting(pet, at("2026-10-12 07:50")), true);
});

test("the scene learns it from the view, and an old save has no habits yet", () => {
  fedAt("08:00", 9, 10, 11);
  const now = at("2026-10-12 07:50");
  pet.updated_at = now;
  const shown = new Pet({ t: new I18n(readLocales()).t, clock: () => now });
  shown.state = pet;
  assert.equal(shown.view(now).waiting, true);
  const old = { ...pet } as Partial<PetState>;
  delete old.habits;
  assert.deepEqual(fromDict(old as Record<string, unknown>).habits, []);
});
