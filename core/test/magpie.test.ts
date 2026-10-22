// The troublemaker: the magpie who steals a decoration from outside, gets chased off, brings it
// back, and leaves her egg in the end.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as festival from "../src/festival";
import * as home from "../src/home";
import { I18n } from "../src/i18n";
import * as magpie from "../src/magpie";
import * as model from "../src/model";
import { Pet } from "../src/pet";
import { Random } from "../src/random";
import { type PetState } from "../src/state";
import { BEDTIME, at, grown, readLocales } from "./helpers";

let start: number;
let pet: PetState;

/** A home that has had enough lines, with the snowman and the pond outside. */
function visited(state: PetState): void {
  state.lines_had = magpie.LINES_FIRST;
  for (const item of ["snowman", "pond"]) {
    state.items[item] = 1;
    home.toggleDeco(state, item);
  }
}

/** Her next visit is at t. */
function comesAt(state: PetState, t: number): void {
  state.magpie.next = t;
}

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
  visited(pet);
});

test("she only comes to a home that has had many lines, by day, every few days", () => {
  pet.lines_had = magpie.LINES_FIRST - 1;
  assert.deepEqual(magpie.step(pet, start, true), []);
  assert.equal(pet.magpie.next, 0);
  pet.lines_had = magpie.LINES_FIRST;
  magpie.step(pet, start, true);
  for (let i = 0; i < 50; i++) {
    const next = magpie.plan(pet, start, new Random(i));
    const days = festival.dayOf(next) - festival.dayOf(start);
    const minute = new Date(next * 1000).getHours() * 60 + new Date(next * 1000).getMinutes();
    assert.ok(days >= magpie.DAYS_BETWEEN[0] && days <= magpie.DAYS_BETWEEN[1], `${days} days`); // never on the next day
    assert.ok(minute >= magpie.DAY[0] && minute < magpie.DAY[1], `${minute}`);
  }
  pet.magpie.egg = true; // after her egg, less often
  const later = magpie.plan(pet, start, new Random(1));
  assert.ok(festival.dayOf(later) - festival.dayOf(start) >= magpie.DAYS_BETWEEN_LATER[0]);
});

test("with nobody to chase her off, she flies off with a decoration and brings it back an hour later", () => {
  comesAt(pet, start);
  const [[action, item]] = magpie.step(pet, start, true); // a child is no match for her
  assert.equal(action, "magpie_stole");
  assert.ok(["snowman", "pond"].includes(item));
  assert.ok(!pet.deco.includes(item) && !pet.items[item]);
  assert.equal(magpie.seen(pet, start + 5)?.deed, "stole");
  assert.equal(magpie.seen(pet, start + magpie.SEEN_SECONDS), null);
  assert.deepEqual(magpie.step(pet, start + magpie.BACK_AFTER - 60, true), []);
  assert.deepEqual(magpie.step(pet, start + magpie.BACK_AFTER, true), [["magpie_back", item]]);
  assert.deepEqual(pet.deco, ["snowman", "pond"]); // where it stood
  assert.equal(pet.items[item], 1);
  assert.equal(magpie.seen(pet, start + magpie.BACK_AFTER + 2)?.deed, "back");
});

test("she doesn't come when nothing stands outside, or too late in the day", () => {
  comesAt(pet, start);
  pet.deco = [];
  assert.deepEqual(magpie.step(pet, start, true), []);
  assert.ok(pet.magpie.next > start); // she'll try again another day
  visited(pet);
  comesAt(pet, at("2026-10-12 21:00"));
  assert.deepEqual(magpie.step(pet, at("2026-10-12 21:00"), true), []);
});

test("a strong adult at home chases her off, and after a few times she leaves her egg in her top hat", () => {
  Object.assign(pet, { stage: "adult", species: "angloop" });
  pet.skills.strength = magpie.CHASE_STRENGTH;
  assert.ok(!magpie.chaser(pet, false)); // asleep or away, it can't
  let t = start;
  for (let i = 1; i <= magpie.CHASES_FOR_EGG; i++) {
    comesAt(pet, t);
    const happened = magpie.step(pet, t, true);
    assert.equal(happened[0][0], "magpie_chased");
    assert.deepEqual(pet.deco, ["snowman", "pond"]); // she dropped it
    assert.equal(pet.magpie.chases, i);
    assert.equal(happened.length, i < magpie.CHASES_FOR_EGG ? 1 : 2);
    t += 3 * 86400;
  }
  assert.deepEqual(pet.nest, { line: magpie.LINE });
  assert.ok(pet.magpie.egg);
});

test("the scuffle shows in the history and as the pet's activity, and the egg waits in the nest", () => {
  Object.assign(pet, { stage: "adult", species: "angloop" });
  pet.skills.strength = magpie.CHASE_STRENGTH;
  pet.magpie.chases = magpie.CHASES_FOR_EGG - 1;
  comesAt(pet, start + 60);
  model.advance(pet, start + 60, BEDTIME);
  assert.equal(model.activityOf(pet, start + 61), "shoo");
  const actions = pet.events.map((e) => e.action);
  assert.ok(actions.includes("magpie_chased") && actions.includes("magpie_egg"));
  assert.equal(pet.nest?.line, magpie.LINE);
});

test("she belongs to the home: a new pet takes over what she is up to", () => {
  pet.magpie.chases = 3;
  const next = model.nextPet(pet, start);
  assert.equal(next.magpie.chases, 3);
});

test("the home counts the lines it has had, and the scene is shown the magpie while she is there", () => {
  const owner = new Pet({ t: new I18n(readLocales()).t, clock: () => start });
  owner.album.push(...["blob", "ember", "stone"].map((line) => `egg:${line}`));
  owner.update(start);
  assert.equal(owner.state.lines_had, 3);
  Object.assign(owner.state, { lines_had: magpie.LINES_FIRST });
  owner.state.magpie = { ...owner.state.magpie, deed: "stole", at: start, item: "pond", spot: 0 };
  assert.deepEqual(owner.view(start + 1).magpie, { deed: "stole", age: 1, item: "pond", spot: 0 });
});
