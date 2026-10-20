// The pet at the back: swapping places, growing at the back, coming out, playing and sleeping together.

import assert from "node:assert/strict";
import { test } from "node:test";

import * as companion from "../src/companion";
import * as idle from "../src/idle";
import * as life from "../src/life";
import type { Pet } from "../src/pet";
import { Disk, HOUR, at, grown, refused } from "./helpers";

/** A pet with a grown-up at the front and a child at the back. */
function two(now: number): [Disk, Pet] {
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "angloop", name: "Gulp" });
  pet.state.tricks = { bow: 3.0 };
  pet.newEgg(null, now);
  Object.assign(pet.state, { stage: "child", stage_since: now, name: "Kid" });
  pet.swap(now); // the grown-up comes to the front again, the child goes to the back
  return [disk, pet];
}

test("the two swap places, and the home stays at the front", () => {
  const now = at("2026-10-12 12:00");
  const [disk, pet] = two(now);
  assert.deepEqual([pet.state.name, pet.second!.name], ["Gulp", "Kid"]);
  Object.assign(pet.state, { items: { daisy: 1, bobble: 1 }, deco: ["daisy"], hat: "bobble", backpack: ["seed_berry"] });
  pet.state.eggs = [{ line: "ember" }];
  pet.state.plant = { kind: "berry", grown: now, ripening: 0, left: 3 };
  const result = pet.swap(now + 60);
  assert.equal(result.accepted, true);
  assert.deepEqual([result.state.name, result.state.second!.name, result.state.second!.stage], ["Kid", "Gulp", "adult"]);
  const front = pet.state;
  const back = pet.second!;
  assert.deepEqual([front.items, front.deco, front.eggs.length, front.plant?.kind], [{ daisy: 1, bobble: 1, seed_berry: 1 },
    ["daisy"], 1, "berry"]);
  assert.deepEqual([back.items, back.deco, back.eggs, back.plant, back.hat, back.backpack], [{}, [], [], null, "", []]);
  assert.deepEqual(pet.events(1)[0], { at: now + 60, action: "swap", by: "app", accepted: true, item: "Gulp" });
  const loaded = disk.pet(); // it is all saved
  assert.deepEqual([loaded.state.name, loaded.second!.name], ["Kid", "Gulp"]);
});

test("they don't swap while the one at the front is away or an egg", () => {
  const now = at("2026-10-12 12:00");
  const [, pet] = two(now);
  assert.equal(pet.action("trip", { item: "meadow", now }).accepted, true);
  const away = pet.swap(now + 60);
  assert.deepEqual([away.accepted, away.reason, away.message, away.state.second!.swap], [false, "away", "Gulp is out and about.", "away"]);
  pet.state.trip = null;
  pet.state.stage = "egg";
  assert.equal(pet.swap(now + 120).reason, "egg");
  const lonely = new Disk().pet();
  refused(() => lonely.swap(now), "no_second");
  assert.equal(lonely.snapshot(now).second, null);
});

test("a child at the back grows up, decently cared for but not specially", () => {
  const now = at("2026-10-12 12:00");
  const [, pet] = two(now);
  pet.second!.stats.satiety = 10;
  pet.update(now + 60);
  assert.equal(pet.second!.stats.satiety, companion.STAT_FLOOR); // the one at the front looks after it
  const due = life.dueAt(pet.second!)!;
  const back = pet.second!;
  for (let t = now + HOUR; t < due - 60; t += 6 * HOUR) {
    pet.state.seen_at = t; // somebody is there, so the two stay at home
    pet.update(t);
  }
  pet.update(due - 60);
  assert.equal(back.stage, "child");
  const care = back.diary.good_minutes / back.diary.minutes;
  assert.ok(Math.abs(care - companion.BACK_CARE) < 1e-9);
  pet.update(due + 60);
  assert.deepEqual([back.stage, back.species], ["adult", "angloop"]); // the special forms need the front
  assert.deepEqual(back.events.at(-1), { at: Math.round(due), action: "evolve", by: "system", accepted: true,
    item: "adult:angloop" });
  assert.ok(pet.albumList().some((form) => form?.species === "angloop"));
});

test("at Grandma's, the pet at the back is there too and doesn't grow on either", () => {
  const now = at("2026-10-12 12:00");
  const [, pet] = two(now);
  const back = pet.second!;
  for (let t = now; t <= now + 5 * 86400; t += HOUR) {
    pet.update(t);
  }
  assert.ok(pet.state.grandma > 0);
  const [due, minutes] = [life.dueAt(back)!, back.diary.minutes];
  pet.update(now + 6 * 86400);
  assert.equal(pet.view(now + 6 * 86400).visitor, null);
  assert.deepEqual([life.dueAt(back)! - due, back.diary.minutes], [86400, minutes]);
});

test("now and then it comes out, and at night the two sleep side by side", () => {
  const day = at("2026-10-12 08:00");
  const [start, end] = companion.outWindow(day + 4 * HOUR);
  const [, pet] = two(start - 120);
  assert.equal(pet.view(start - 60).visitor, null);
  const out = pet.view(start + 60).visitor!;
  assert.deepEqual([out.species, out.stage, out.asleep, out.age, out.left], ["blob", "child", false, 60, end - start - 60]);
  assert.equal(pet.snapshot(start + 60).second!.out, true);
  pet.state.asleep = true;
  pet.state.sleep_since = start + 100;
  const night = pet.view(start + 160).visitor!;
  assert.deepEqual([night.asleep, night.age], [true, 60]);
  // a friend's visit comes first
  pet.state.asleep = false;
  pet.state.friends = [{ species: "sneezle", visits: 0, next: end + 9999, until: start + 300 }];
  assert.equal(pet.view(start + 200).visitor!.species, "sneezle");
});

test("playing together, each copies a trick from the other, but never learns it that way", () => {
  const day = at("2026-10-12 08:00");
  const [start, end] = companion.outWindow(day + 4 * HOUR);
  const [, pet] = two(start - 60);
  const kid = pet.second!;
  pet.update(end + 60);
  assert.equal(kid.tricks.bow, idle.PRACTICE_STEP);
  assert.equal(kid.diary.plays, companion.BACK_PLAYS);
  assert.deepEqual(kid.events.at(-1), { at: end, action: "copied", by: "self", accepted: true, item: "bow:Gulp" });
  const next = companion.nextOutEnd(end);
  pet.update(next + 60); // out together once more
  assert.equal(kid.tricks.bow, idle.SOLO_LIMIT);
  assert.equal(pet.events(1)[0].action === "copied", false); // the grown-up has nothing to copy from a child
  assert.equal(companion.teach(pet.state, kid), null);
  // nothing while the one at the front isn't up to it
  const [, other] = two(start - 60);
  other.state.stats.mood = 10;
  other.update(end + 60);
  assert.equal(other.second!.tricks.bow, undefined);
});
