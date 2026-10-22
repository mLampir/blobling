// The keepsakes of the lines: one per line, once the home has had all its adults, and what they do.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as battle from "../src/battle";
import * as home from "../src/home";
import { I18n } from "../src/i18n";
import * as keepsake from "../src/keepsake";
import * as life from "../src/life";
import * as model from "../src/model";
import { Pet } from "../src/pet";
import { type PetState } from "../src/state";
import { BEDTIME, act, at, grown, readLocales } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
});

test("every line has a keepsake, and each is a decoration with an effect of its own", () => {
  assert.deepEqual(Object.keys(keepsake.KEEPSAKES).sort(), Object.keys(life.LINES).sort());
  const items = Object.values(keepsake.KEEPSAKES);
  assert.equal(new Set(items).size, items.length);
  for (const item of items) {
    assert.equal(home.kindOf(item), "deco", item);
    assert.ok(keepsake.isKeepsake(item), item);
  }
  const effects = items.map((item) => keepsake.EFFECTS[item][0]);
  assert.equal(new Set(effects).size, effects.length);
});

test("after a trip the pet brings home the keepsake of a line the home has had all adults of, once", () => {
  pet.complete_lines = ["bear"];
  assert.deepEqual(act(pet, "trip", start, { item: "meadow" }), [true, null]);
  model.advance(pet, pet.trip!.end + 60, BEDTIME);
  assert.ok(pet.backpack.includes("honeypot"));
  assert.deepEqual(act(pet, "unpack", pet.updated_at), [true, null]);
  assert.equal(pet.items.honeypot, 1);
  Object.assign(pet.stats, { satiety: 90, energy: 90 });
  const again = pet.updated_at + 60;
  assert.deepEqual(act(pet, "trip", again, { item: "meadow" }), [true, null]);
  model.advance(pet, pet.trip!.end + 60, BEDTIME);
  assert.ok(!pet.backpack.includes("honeypot")); // the home has it already
});

test("the home knows which lines it has had all adults of", () => {
  const owner = new Pet({ t: new I18n(readLocales()).t, clock: () => start });
  owner.album.push(...life.LINES.bear.map((adult) => `adult:${adult}`), "adult:tuxwaddle"); // one penguin is not all
  assert.deepEqual(owner.completeLines(), ["bear"]);
  owner.state.items.honeypot = 1;
  assert.deepEqual(owner.albumLines().find((line) => line.keepsake)?.keepsake?.id, "honeypot");
});

test("a keepsake works only while it is set out", () => {
  pet.items.jellylamp = 1;
  assert.equal(life.decayFactor(pet, "mood"), 1);
  assert.deepEqual(act(pet, "deco", start, { item: "jellylamp" }), [true, null]);
  assert.equal(life.decayFactor(pet, "mood"), 0.85);
  assert.equal(life.decayFactor(pet, "satiety"), 1);
  assert.deepEqual(act(pet, "deco", start, { item: "jellylamp" }), [true, null]);
  assert.equal(life.decayFactor(pet, "mood"), 1);
});

test("the stump makes strength training count for more", () => {
  const plain = battle.train(pet, "strength", 1);
  pet.items.gnawedstump = 1;
  home.toggleDeco(pet, "gnawedstump");
  const more = battle.train(pet, "strength", 1);
  assert.ok(Math.abs(more - plain * 1.15) < 1e-6, `${more} vs ${plain}`);
});

test("with the block of ice or the fountain set out, cold mornings and hot afternoons don't bother it", () => {
  pet.cold_until = start + 3600;
  pet.hot_until = start + 3600;
  assert.ok(home.cold(pet, start) && home.hot(pet, start));
  pet.items.iceblock = 1;
  pet.items.hippofountain = 1;
  home.toggleDeco(pet, "iceblock");
  home.toggleDeco(pet, "hippofountain");
  assert.ok(!home.cold(pet, start) && !home.hot(pet, start));
  // both belong in the garden, never in the house
  assert.ok(home.OUTDOOR_DECO.includes("iceblock") && home.OUTDOOR_DECO.includes("hippofountain"));
});

test("the bag names what a keepsake does", () => {
  assert.deepEqual(home.effects("telescope"), ["keep_stars"]);
});
