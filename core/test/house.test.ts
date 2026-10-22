// The house: how it grows, where the decorations stand, sleeping in it and looking in.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as care from "../src/care";
import * as home from "../src/home";
import * as model from "../src/model";
import { fromDict, toDict, type PetState } from "../src/state";
import * as trip from "../src/trip";
import { BEDTIME, HOUR, act, at, grown } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
});

test("every pet that gets past the mountain's guardian adds a step; the coast's doesn't", () => {
  // a pet that has trained a lot, on its way to the mountain
  pet.stage = "adult";
  pet.species = "angloop";
  pet.guardians = trip.AREAS.slice(0, trip.AREAS.indexOf(trip.HOUSE_AREA));
  pet.tricks = Object.fromEntries(Object.entries(care.TRICKS).map(([k, needed]) => [k, needed]));
  pet.skills = { strength: 100, speed: 100, smarts: 100 };
  pet.bond = 100;
  let when = start;
  const pastGuardian = (area: string) => {
    for (let i = 0; i < 20 && !pet.guardians.includes(area); i++) {
      Object.assign(pet.stats, { satiety: 100, energy: 100, health: 100, mood: 100 });
      pet.recent = {};
      assert.deepEqual(act(pet, "trip", when, { item: area }), [true, null]);
      model.advance(pet, pet.trip!.end + 60, BEDTIME);
      pet.backpack = [];
      when = pet.updated_at + 24 * HOUR;
      pet.updated_at = when;
    }
    assert.ok(pet.guardians.includes(area), area);
  };
  pastGuardian("mountain");
  assert.equal(pet.house, 1);
  assert.ok(pet.events.some((e) => e.action === "house" && e.item === "1"));
  pastGuardian("coast"); // a branch behind the mountain: the house stays as it is
  assert.equal(pet.house, 1);

  // the next pet keeps the house; getting past the guardian again adds the next step
  const next = model.nextPet(pet, when, "Next");
  assert.equal(next.house, 1);
  assert.equal(home.buildHouse(next), 2);
  assert.equal(home.buildHouse(next), 3);
  assert.equal(home.buildHouse(next), null); // the whole house: it doesn't grow any further
  assert.equal(next.house, home.HOUSE_STEPS);
});

test("the house has room for more decorations; the snowman stays outside", () => {
  pet.items = { flag: 1, windmill: 1, lantern: 1, crystal: 1, snowman: 1, boat: 1 };
  for (const item of ["flag", "windmill", "lantern"]) {
    act(pet, "deco", start, { item });
  }
  assert.deepEqual(pet.deco, ["windmill", "lantern"]); // no house: two spots
  pet.house = 2;
  for (const item of ["flag", "crystal"]) {
    act(pet, "deco", start, { item });
  }
  assert.deepEqual(home.placeDeco(pet), { outside: ["windmill", "lantern"], inside: ["flag", "crystal"] });
  act(pet, "deco", start, { item: "snowman" }); // the oldest makes room, and the snowman goes outside
  assert.deepEqual(pet.deco, ["lantern", "flag", "crystal", "snowman"]);
  assert.deepEqual(home.placeDeco(pet), { outside: ["lantern", "snowman"], inside: ["flag", "crystal"] });
});

test("with a house, it goes in to sleep and comes out in the morning", () => {
  const night = at("2026-10-12 23:30");
  model.advance(pet, night, BEDTIME);
  assert.equal(pet.asleep, true);
  assert.notEqual(pet.activity, "go_in"); // without a house it simply falls asleep where it is

  pet = grown(start);
  pet.house = 1;
  model.advance(pet, night, BEDTIME);
  assert.equal(pet.activity, "go_in");
  model.advance(pet, at("2026-10-13 07:01"), BEDTIME);
  assert.equal(pet.asleep, false);
  assert.equal(pet.activity, "come_out");

  assert.deepEqual(act(pet, "sleep", at("2026-10-13 22:30")), [true, null]);
  assert.equal(pet.activity, "go_in");
  assert.deepEqual(act(pet, "wake", at("2026-10-13 22:40")), [true, null]);
  assert.equal(pet.activity, "come_out");
});

test("a tap on the house looks in, without doing anything with the pet", () => {
  assert.deepEqual(act(pet, "look_in", start), [false, "no_house"]);
  pet.house = 2;
  pet.trace = { kind: "tower", spot: 0.5, look: 0 };
  const events = pet.events.length;
  assert.deepEqual(act(pet, "look_in", start), [true, null]);
  assert.equal(pet.look_in_until, start + model.LOOK_IN_SECONDS);
  assert.notEqual(pet.trace, null); // what it left behind stays
  assert.equal(pet.events.length, events); // and it isn't in the history
  pet.asleep = true;
  assert.deepEqual(act(pet, "look_in", start), [false, "inside"]);
});

test("a save from before the house gives a pet that has been past the mountain its hut", () => {
  const saved = toDict(pet) as unknown as Record<string, unknown>;
  delete saved.house;
  assert.equal(fromDict({ ...saved, guardians: ["meadow"] }).house, 0);
  assert.equal(fromDict({ ...saved, guardians: trip.AREAS }).house, 1);
  assert.equal(fromDict({ ...saved, guardians: trip.AREAS, house: 3 }).house, 3);
});
