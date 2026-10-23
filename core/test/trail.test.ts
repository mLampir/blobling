// Trails to the secret forms: stories and notes, each found once, only while the home looks for that form.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { I18n } from "../src/i18n";
import * as life from "../src/life";
import * as model from "../src/model";
import { Pet } from "../src/pet";
import type { PetState } from "../src/state";
import * as trail from "../src/trail";
import * as trip from "../src/trip";
import * as wild from "../src/wild";
import { BEDTIME, HOUR, act, at, grown, readLocales } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
});

test("every line has three trails, each in a place there is, with a text in every language", () => {
  assert.deepEqual(Object.keys(trail.TRAILS).sort(), Object.keys(life.LINES).sort());
  const places = [...Object.keys(trail.CHANCE), ...trip.AREAS];
  const locales = readLocales() as Record<string, { trails: Record<string, Record<string, string>> }>;
  for (const [line, where] of Object.entries(trail.TRAILS)) {
    assert.equal(where.length, 3, line);
    assert.ok(where.every((w) => places.includes(w)), line);
    for (const [lang, texts] of Object.entries(locales)) {
      assert.equal(Object.keys(texts.trails?.[line] ?? {}).length, where.length, `${lang} ${line}`);
    }
  }
});

test("a trail comes only for a line the home looks for, and each only once", () => {
  assert.equal(trail.find(pet, "grandma", start), null);
  pet.trail_lines = ["stone"];
  const found = trail.find(pet, "grandma", start)!;
  assert.equal(found, trail.key("stone", 2));
  assert.equal(pet.items[found], 1);
  assert.equal(trail.find(pet, "grandma", start + 60), null); // that one is found
  assert.deepEqual(trail.found(pet.items, "stone"), [false, false, true]);
  assert.equal(trail.action("stream"), "trail_trip");
  assert.equal(trail.action("fish"), "trail_fish");
  // at a quiet stop of the stream now and then
  let t = start;
  while (!trail.find(pet, "stream", t)) {
    t += 60;
  }
  assert.ok(t - start < 100 * 60);
  assert.deepEqual(trail.found(pet.items, "stone"), [true, false, true]);
});

test("the home looks for a secret form once it has had both usual adults, until it has the secret one", () => {
  const owner = new Pet({ t: new I18n(readLocales()).t, clock: () => start });
  const [a, b, secret] = life.LINES.stone;
  owner.album.push(`adult:${a}`);
  assert.deepEqual(owner.trailLines(), []);
  assert.equal(owner.albumLines()[2].trails, null); // nothing to look for yet
  owner.album.push(`adult:${b}`);
  assert.deepEqual(owner.trailLines(), ["stone"]);
  owner.state.items[trail.key("stone", 1)] = 1;
  const trails = owner.albumLines().find((line) => line.trails)!.trails!;
  assert.equal(trails.length, 3);
  assert.equal(trails[0], null);
  assert.match(trails[1]!, /full-moon/);
  owner.album.push(`adult:${secret}`);
  assert.deepEqual(owner.trailLines(), []);
  assert.ok(owner.albumLines().some((line) => line.trails)); // what was found stays in the album
});

test("Grandma tells one when it comes home with her things", () => {
  pet.trail_lines = ["mouse"];
  assert.deepEqual(act(pet, "visit_grandma", start), [true, null]);
  const back = start + 25 * HOUR;
  model.advance(pet, back, BEDTIME);
  assert.deepEqual(act(pet, "grandma", back), [true, null]);
  assert.equal(pet.items[trail.key("mouse", 1)], 1);
  assert.ok(pet.events.some((e) => e.action === "trail_grandma" && e.item === trail.key("mouse", 1)));
});

test("a friend's visit can tell one", () => {
  pet.trail_lines = ["fox"];
  pet.friends = [{ species: "filchfox", visits: 0, next: start }];
  let t = start;
  for (let i = 0; i < 60 && !pet.items[trail.key("fox", 1)]; i++) {
    t = pet.friends[0].next;
    Object.assign(pet.stats, { mood: 100 });
    wild.step(pet, t, true);
    wild.step(pet, t + wild.VISIT_SECONDS, true);
    pet.gift = null;
  }
  assert.equal(pet.items[trail.key("fox", 1)], 1);
});

test("a chameleon child looks for a friend on its trips already, other children don't", () => {
  pet.stage = "child";
  pet.species = "chameleon";
  assert.equal(life.lineOf(pet.species), wild.CURIOUS);
  assert.equal(wild.looking(pet), true);
  pet.species = "fox";
  assert.equal(wild.looking(pet), false);
});
