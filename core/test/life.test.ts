// The life cycle: egg, baby, child, and what decides the adult.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as care from "../src/care";
import * as life from "../src/life";
import * as model from "../src/model";
import { fromDict, toDict, type PetState } from "../src/state";
import { BEDTIME, act, at, near } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 08:00");
  pet = model.newPet(start);
});

test("egg only takes warmth", () => {
  assert.equal(pet.stage, "egg");
  assert.deepEqual(act(pet, "feed", start, { item: "meal" }), [false, "egg"]);
  assert.deepEqual(act(pet, "evolve", start), [false, "not_ready"]);
  const stats = { ...pet.stats };
  model.advance(pet, start + 1800, BEDTIME);
  assert.deepEqual(pet.stats, stats); // nothing decays inside the egg
  for (let i = 0; i < 2; i++) { // warming it twice = 30 min sooner
    assert.equal(act(pet, "pet", start + 1800 + i)[0], true);
  }
  assert.equal(model.availableActions(pet, start + 1800).evolve, true);
});

test("hatch by hand", () => {
  const hatch = start + 3600;
  assert.equal(act(pet, "evolve", hatch)[0], true);
  assert.deepEqual([pet.stage, pet.born_at], ["baby", hatch]);
  assert.equal(model.activityOf(pet, hatch + 1), "hatch");
  assert.equal(pet.activity_item, "egg:blob");
  assert.equal(pet.events.at(-1)!.item, "baby:blob");
});

test("hatches by itself after a day", () => {
  model.advance(pet, start + 3600 + 23 * 3600, BEDTIME);
  assert.equal(pet.stage, "egg");
  model.advance(pet, start + 3600 + 24 * 3600 + 60, BEDTIME);
  assert.equal(pet.stage, "baby");
  assert.equal(pet.events.at(-1)!.by, "system");
});

test("baby gets hungry faster", () => {
  model.advance(pet, start + 3600, BEDTIME); // like Pet.action: catch up to now first
  act(pet, "evolve", start + 3600);
  const before = pet.stats.satiety;
  model.advance(pet, start + 3600 + 2 * 3600, BEDTIME);
  near(before - pet.stats.satiety, 2 * 5 * 1.3, 0.1);
});

test("baby becomes child after three days", () => {
  act(pet, "evolve", start + 3600);
  pet.stage_since = start; // simpler numbers
  assert.deepEqual(act(pet, "evolve", start + 2 * 86400), [false, "not_ready"]);
  assert.equal(act(pet, "evolve", at("2026-10-15 09:00"))[0], true);
  assert.equal(pet.stage, "child");
  assert.equal(pet.diary.minutes, 0);
});

test("no evolution while asleep", () => {
  pet.stage = "child";
  pet.stage_since = start - 7 * 86400;
  pet.asleep = true;
  assert.deepEqual(act(pet, "evolve", start), [false, "asleep"]);
});

test("diary decides the adult", () => {
  const cases: [Record<string, number>, string][] = [
    [{ minutes: 10080, good_minutes: 4000 }, "angloop"],
    [{ minutes: 10080, good_minutes: 4000, love: 60 }, "purrloop"], // petting wins even without the rest
    [{ minutes: 10080, good_minutes: 9500, love: 60, plays: 30 }, "purrloop"],
    [{ minutes: 10080, good_minutes: 9500, love: 50, plays: 30 }, "gemperor"],
    [{ minutes: 10080, good_minutes: 9500, plays: 10 }, "gemperor"],
    [{ minutes: 10080, good_minutes: 7000, plays: 10 }, "angloop"],
  ];
  for (const [diary, species] of cases) {
    assert.equal(life.decideSpecies({ ...life.newDiary(), ...diary }), species);
  }
});

test("lure hints at the adult after a day", () => {
  assert.equal(life.hint(pet), null); // an egg
  pet.stage = "child";
  pet.diary = { ...life.newDiary(), minutes: 600, good_minutes: 600, plays: 5 };
  assert.equal(life.hint(pet), null);
  Object.assign(pet.diary, { minutes: 2880, good_minutes: 2800, plays: 8 });
  assert.equal(life.hint(pet), "gemperor");
  pet.diary.good_minutes = 2000;
  assert.equal(life.hint(pet), "angloop");
  pet.stage = "adult";
  assert.equal(life.hint(pet), null);
});

test("a rare egg grows up in its own line", () => {
  const ember = model.newPet(start, "", "ember");
  assert.deepEqual(["blob", "lumoth", "ember", "flarelet"].map(life.lineOf), ["blob", "blob", "ember", "ember"]);
  assert.equal(act(ember, "evolve", start + 3600)[0], true);
  assert.deepEqual([ember.stage, ember.species, ember.activity_item], ["baby", "ember", "egg:ember"]);
  ember.stage = "child";
  ember.stage_since = start;
  ember.diary = { ...life.newDiary(), minutes: 2880, good_minutes: 1000, plays: 2, love: 40 };
  assert.equal(life.hint(ember), "lanternling"); // the slime's rules don't count for it
  ember.diary.plays = 6;
  assert.equal(life.hint(ember), "flarelet");
  assert.equal(act(ember, "evolve", start + 7 * 86400)[0], true);
  assert.deepEqual([ember.stage, ember.species], ["adult", "flarelet"]);
  assert.equal(life.decayFactor(ember, "satiety"), 1.25);
  for (const species of life.SPECIES) {
    assert.ok(species in care.FAVORITE, species);
  }
});

test("a pebble that is petted a lot grows up polished", () => {
  const stone = model.newPet(start, "", "stone");
  assert.deepEqual(["stone", "glimmerock", "bouldergrin"].map(life.lineOf), ["stone", "stone", "stone"]);
  stone.stage = "child";
  stone.stage_since = start;
  stone.diary = { ...life.newDiary(), minutes: 2880, good_minutes: 2880, plays: 10, love: 8 };
  assert.equal(life.hint(stone), "bouldergrin"); // well cared for and played with, but hardly petted
  stone.diary.love = 2 * life.GLIMMEROCK_LOVE_PER_DAY;
  assert.equal(life.hint(stone), "glimmerock");
  assert.equal(act(stone, "evolve", start + 7 * 86400)[0], true);
  assert.deepEqual([stone.stage, stone.species], ["adult", "glimmerock"]);
  assert.equal(life.bonusFactor(stone, "pet"), 1.5);
});

test("child keeps a diary and grows up", () => {
  pet.stage = "child";
  pet.stage_since = start;
  for (let day = 0; day < 7; day++) {
    const t = start + day * 86400;
    for (const hour of [0, 4, 10]) {
      act(pet, "play", t + hour * 3600 + 60);
      act(pet, "feed", t + hour * 3600 + 120, { item: "meal" });
      act(pet, "clean", t + hour * 3600 + 180);
    }
    model.advance(pet, t + 86400 - 60, BEDTIME);
  }
  assert.ok(pet.diary.minutes > 10000);
  assert.equal(pet.diary.plays, 21);
  assert.equal(act(pet, "evolve", start + 7 * 86400 + 600)[0], true);
  assert.deepEqual([pet.stage, pet.species], ["adult", "angloop"]); // played with, but hungry at night
  assert.equal(life.dueAt(pet), null);
  assert.deepEqual(act(pet, "evolve", start + 8 * 86400), [false, "not_ready"]);
});

test("an adult of the slime's first forms turns into its new form", () => {
  pet.stage = "adult";
  for (const [old, next] of [["sneezle", "gemperor"], ["lumoth", "purrloop"], ["cyclopuff", "angloop"],
    ["grumpcap", "angloop"], ["flicker", "angloop"]]) {
    pet.species = old;
    pet.activity = "idle";
    pet.form_rules = 1;
    assert.equal(model.reform(pet, start), true);
    assert.deepEqual([pet.species, pet.activity, pet.activity_item], [next, "evolve", `adult:${old}`]);
  }
  assert.equal(model.reform(pet, start), false); // only once
  pet.species = "sneezle";
  assert.equal(model.reform(pet, start), false); // saved under the new rules: a Sneezle of a line of its own
  pet.form_rules = 1;
  pet.asleep = true;
  pet.activity = "idle";
  assert.equal(model.reform(pet, start), true);
  assert.deepEqual([pet.species, pet.activity], ["gemperor", "idle"]); // changed in its sleep, without a show
  pet.species = "lumoth";
  pet.stage = "child"; // only adults have a form
  pet.form_rules = 1;
  assert.equal(model.reform(pet, start), false);
  assert.equal(fromDict({ species: "sneezle" }).form_rules, 1); // a save from before
  assert.equal(fromDict(toDict(pet) as unknown as Record<string, unknown>).form_rules, life.FORM_RULES);
});

test("every form is in the album once, and a pet has been the ones on its way", () => {
  assert.equal(new Set(life.FORMS).size, life.FORMS.length);
  assert.equal(life.FORMS.length, Object.values(life.LINES).reduce((n, adults) => n + 3 + adults.length, 0));
  assert.deepEqual(life.formsOf("egg", "blob"), ["egg:blob"]);
  assert.deepEqual(life.formsOf("child", "stone"), ["egg:stone", "baby:stone", "child:stone"]);
  assert.deepEqual(life.formsOf("adult", "flarelet"), ["egg:ember", "baby:ember", "child:ember", "adult:flarelet"]);
  assert.deepEqual(life.formsOf("ghost", "blob"), []);
});
