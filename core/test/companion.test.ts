// Neighbours: several pets at home, each in its own house, getting together, playing and sleeping side by side.

import assert from "node:assert/strict";
import { test } from "node:test";

import * as companion from "../src/companion";
import * as idle from "../src/idle";
import type { Pet } from "../src/pet";
import { Disk, HOUR, at, grown } from "./helpers";

/** Two pets at home: a grown-up and a child, the camera on the grown-up. */
function two(now: number): [Disk, Pet, string, string] {
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "angloop", name: "Gulp" });
  pet.state.tricks = { bow: 3.0 };
  const gulp = pet.current;
  const kid = pet.newEgg(null, now).id;
  Object.assign(pet.state, { stage: "child", stage_since: now, name: "Kid" });
  pet.select(gulp);
  return [disk, pet, gulp, kid];
}

test("each one lives in its own house; switching only moves the camera", () => {
  const now = at("2026-10-12 12:00");
  const [disk, pet, gulp, kid] = two(now);
  Object.assign(pet.state.items, { daisy: 1, bobble: 1 }); // the store of all of them
  Object.assign(pet.state, { deco: ["daisy"], hat: "bobble", house: 1 });
  pet.state.plant = { kind: "berry", grown: now, ripening: 0, left: 3 };
  pet.select(kid);
  const state = pet.snapshot(now + 60);
  assert.deepEqual([state.name, state.house, state.plant, state.items.map((i) => [i.id, i.active])],
    ["Kid", null, null, [["daisy", false], ["bobble", false]]]); // its own house, the finds of both
  assert.deepEqual(state.pets.map((p) => [p.id, p.name]), [[gulp, "Gulp"], [kid, "Kid"]]);
  // the bobble hat exists once: on Kid, it comes off Gulp
  assert.equal(pet.action("wear", { item: "bobble", now: now + 120 }).accepted, true);
  assert.deepEqual([pet.find(gulp).hat, pet.find(kid).hat], ["", "bobble"]);
  // an action for one pet by its id, whatever the camera is on
  assert.equal(pet.action("pet", { pet: gulp, now: now + 180 }).state.name, "Gulp");
  assert.equal(pet.current, kid);
  const loaded = disk.pet(); // it is all saved, the camera too
  assert.deepEqual([loaded.current, loaded.find(gulp).deco, loaded.find(kid).items], [kid, ["daisy"], { daisy: 1, bobble: 1 }]);
  assert.equal(loaded.find(gulp).items, loaded.find(kid).items); // one store
});

test("a file from before keeps the pet at the back as a neighbour", () => {
  const now = at("2026-10-12 12:00");
  const disk = new Disk();
  const front = { ...grown(now), name: "Front", items: { flag: 1 }, house: 2 };
  const back = { ...grown(now), name: "Back", items: {}, house: 0 };
  disk.text = JSON.stringify({ version: 1, pet: front, second: back, ancestors: [] });
  const pet = disk.pet();
  assert.deepEqual(pet.pets.map((p) => [p.name, p.house, p.items]), [["Front", 2, { flag: 1 }], ["Back", 0, { flag: 1 }]]);
  assert.equal(new Set(pet.pets.map((p) => p.id)).size, 2);
  assert.equal(pet.state.name, "Front");
});

test("at Grandma's, the others don't get together with it", () => {
  const now = at("2026-10-12 12:00");
  const [, pet, gulp, kid] = two(now);
  pet.find(gulp).seen_at = now;
  for (let t = now; t <= now + 3 * 86400; t += HOUR) {
    pet.find(kid).seen_at = t; // somebody looks after Kid, but nobody after Gulp
    pet.update(t);
  }
  assert.ok(pet.find(gulp).grandma > 0);
  assert.equal(pet.find(kid).grandma, 0);
  const [start] = companion.outWindow(now + 4 * 86400);
  pet.update(start + 60);
  assert.equal(pet.view(start + 60, kid).visitor, null);
});

test("now and then two get together, and at night they sleep side by side", () => {
  const day = at("2026-10-12 08:00");
  const [start, end] = companion.outWindow(day + 4 * HOUR);
  const [, pet, , kid] = two(start - 120);
  assert.equal(pet.view(start - 60).visitor, null);
  const out = pet.view(start + 60).visitor!;
  assert.deepEqual([out.species, out.stage, out.asleep, out.age, out.left], ["blob", "child", false, 60, end - start - 60]);
  assert.equal(pet.view(start + 60, kid).visitor!.species, "angloop"); // in Kid's house, the same two
  pet.state.asleep = true;
  pet.state.sleep_since = start + 100;
  assert.equal(pet.view(start + 160).visitor, null); // Kid is still awake
  Object.assign(pet.find(kid), { asleep: true, sleep_since: start + 120 });
  const night = pet.view(start + 160).visitor!;
  assert.deepEqual([night.asleep, night.age], [true, 40]);
  // a friend's visit comes first
  pet.state.asleep = false;
  pet.state.friend = { species: "sneezle", visits: 0, next: end + 9999, until: start + 300 };
  assert.equal(pet.view(start + 200).visitor!.species, "sneezle");
});

test("with three, two get together and the third is on its own", () => {
  const ids = ["a", "b", "c"];
  const seen = new Set<string>();
  for (let block = 0; block < 20; block++) {
    const pairs = companion.pairs(ids, block * companion.OUT_EVERY, false);
    assert.equal(pairs.length, 1);
    seen.add(pairs[0].join());
  }
  assert.ok(seen.size > 1); // not always the same two
  assert.deepEqual(companion.pairs(ids, 0, false), companion.pairs([...ids].reverse(), 0, false));
});

test("playing together, each copies a trick from the other, but never learns it that way", () => {
  const day = at("2026-10-12 08:00");
  const [start, end] = companion.outWindow(day + 4 * HOUR);
  const [, pet, gulp, id] = two(start - 60);
  const kid = pet.find(id);
  pet.update(end + 60);
  assert.equal(kid.tricks.bow, idle.PRACTICE_STEP);
  assert.equal(kid.diary.plays, companion.PLAYS);
  assert.deepEqual(kid.events.at(-1), { at: end, action: "copied", by: "self", accepted: true, item: "bow:Gulp" });
  const next = companion.nextOutEnd(end);
  pet.update(next + 60); // together once more
  assert.equal(kid.tricks.bow, idle.SOLO_LIMIT);
  assert.equal(pet.events(1, gulp)[0].action === "copied", false); // the grown-up has nothing to copy from a child
  assert.equal(companion.teach(pet.find(gulp), kid), null);
  // nothing while one of them isn't up to it
  const [, other, , otherKid] = two(start - 60);
  other.state.stats.mood = 10;
  other.update(end + 60);
  assert.equal(other.find(otherKid).tricks.bow, undefined);
});
