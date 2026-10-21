// Shooting stars: on clear evenings now and then one falls; the pet wishes, something lies in the
// garden the morning after, and the owl comes to the roof.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as home from "../src/home";
import * as model from "../src/model";
import * as stars from "../src/stars";
import type { PetState } from "../src/state";
import { sunTimes } from "../src/sun";
import { act, at, BEDTIME, grown, HOUR } from "./helpers";

const CLEAR = 0;
const RAIN = 61;

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 08:00");
  pet = grown(start);
});

/** Lets `days` days go by in this weather, the pet kept well. */
function days(count: number, weather: number, from = start): number {
  let t = from;
  for (let i = 0; i < count * 24; i++) {
    t += HOUR;
    model.advance(pet, t, BEDTIME, weather);
    Object.assign(pet.stats, { satiety: 100, hygiene: 100, energy: 100, mood: 100, health: 100 });
  }
  return t;
}

test("a shooting star falls between dusk and a little before bedtime", () => {
  for (let d = 0; d < 60; d++) {
    const day = at("2026-06-01 00:00") + d * 86400;
    const when = stars.candidate(day, BEDTIME[0], null);
    const sunset = sunTimes(new Date((day + 12 * HOUR) * 1000), null)[1];
    const minutes = (when - day) / 60;
    const bed = 23 * 60;
    assert.ok(minutes <= bed - stars.LATEST, String(minutes));
    assert.ok(minutes >= Math.min(sunset + stars.DUSK_AFTER, bed - stars.EARLIEST), String(minutes));
  }
});

test("none in the rain; on clear evenings about every third", () => {
  days(15, RAIN);
  assert.equal(pet.stars.evenings, 0);
  assert.equal(pet.fallen, null);
  pet = grown(start);
  days(30, CLEAR);
  assert.ok(pet.stars.evenings >= 5 && pet.stars.evenings <= 17, String(pet.stars.evenings));
  assert.ok(pet.events.some((e) => e.action === "star" && e.by === "system"));
});

test("the pet looks up and wishes when it is up and at home", () => {
  // the falls happen before bedtime: minute by minute, the wish is caught
  let t = start;
  let wished = false;
  while (!wished && t < start + 60 * 86400) {
    t += 60;
    model.advance(pet, t, BEDTIME, CLEAR);
    Object.assign(pet.stats, { satiety: 100, hygiene: 100, energy: 100, mood: 100, health: 100 });
    wished = pet.activity === "wish";
  }
  assert.ok(wished);
  assert.ok(t - pet.stars.at < 60);
  const hour = new Date(t * 1000).getHours();
  assert.ok(hour >= 17 && hour < 23, String(hour)); // in the evening, before bedtime
});

test("what it leaves lies in the garden the morning after, and is picked up into the bag", () => {
  stars.fall(pet, at("2026-10-12 21:00"));
  assert.ok(pet.fallen);
  assert.equal(stars.lying(pet), null); // not before the morning
  model.advance(pet, at("2026-10-12 22:00"), BEDTIME, RAIN);
  model.advance(pet, at("2026-10-13 06:00"), BEDTIME, RAIN);
  assert.equal(stars.lying(pet), null);
  model.advance(pet, at("2026-10-13 08:00"), BEDTIME, RAIN);
  const item = stars.lying(pet)!;
  assert.ok(item);
  assert.equal(model.availableActions(pet, at("2026-10-13 08:00")).pickup, true);
  assert.deepEqual(act(pet, "pickup", at("2026-10-13 08:01"), { item: "star" }), [true, null]);
  assert.equal(pet.fallen, null);
  assert.equal(pet.activity_item, item);
  assert.ok((pet.items[item] ?? 0) > 0 || pet.eggs.length > 0);
});

test("the gifts: seeds most of the time, the shard while the home has none, eggs of known lines", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 400; i++) {
    pet.fallen = null;
    stars.fall(pet, start + i * 86400);
    seen.add(pet.fallen!.item);
  }
  assert.ok(seen.has(stars.SHARD));
  assert.ok([...seen].some((item) => item.startsWith("seed_")));
  assert.ok([...seen].some((item) => item in home.EGGS));
  // with a shard in the bag it leaves no second one
  pet.items[stars.SHARD] = 1;
  pet.stars.evenings = 0;
  pet.counters.owl_egg = 1;
  for (let i = 0; i < 100; i++) {
    pet.fallen = null;
    stars.fall(pet, start + i * 3600);
    assert.notEqual(pet.fallen!.item, stars.SHARD);
  }
});

test("the owl comes from the second evening, and after the fifth its egg lies on the roof, once", () => {
  pet.items[stars.SHARD] = 1;
  const evening = (n: number) => at("2026-10-12 21:00") + n * 86400;
  stars.fall(pet, evening(0));
  assert.equal(stars.owl(pet), false);
  pet.fallen = null;
  stars.fall(pet, evening(1));
  assert.equal(stars.owl(pet), true);
  for (let n = 2; n < 4; n++) {
    pet.fallen = null;
    stars.fall(pet, evening(n));
    assert.notEqual(pet.fallen!.item, stars.OWL_EGG);
  }
  pet.fallen = null;
  stars.fall(pet, evening(4)); // the fifth: its egg lies there the morning after
  assert.equal(pet.fallen!.item, stars.OWL_EGG);
  assert.equal(stars.owl(pet), false); // it has left its egg
  pet.fallen!.lies = true;
  assert.equal(stars.pickUp(pet), stars.OWL_EGG);
  assert.equal(pet.eggs.at(-1)!.line, home.EGGS[stars.OWL_EGG]);
  pet.fallen = null;
  stars.fall(pet, evening(5));
  assert.notEqual(pet.fallen!.item, stars.OWL_EGG);
  assert.equal(stars.owl(pet), false);
});
