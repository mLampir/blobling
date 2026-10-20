// Moving between a phone and a display: a pet lives in one home only, and an old copy is turned away.

import assert from "node:assert/strict";
import { test } from "node:test";

import { RequestError } from "../src/model";
import { PLACES } from "../src/pet";
import { Disk, at, grown } from "./helpers";

function refused(run: () => unknown, key: string): void {
  assert.throws(run, (error: unknown) => error instanceof RequestError && error.message === key);
}

/** A display with two pets (Gulp, with a hat and a daisy set out, and Kid) and a phone with one (Pip). */
function homes(now: number) {
  const display = new Disk();
  const pi = display.pet();
  pi.state = grown(now);
  Object.assign(pi.state, { name: "Gulp", hat: "bobble", deco: ["daisy"] });
  Object.assign(pi.state.items, { bobble: 1, daisy: 2 });
  const gulp = pi.current;
  pi.newEgg(null, now);
  Object.assign(pi.state, { stage: "child", name: "Kid" });
  const phone = new Disk().pet();
  phone.state = grown(now);
  phone.state.name = "Pip";
  return { display, pi, gulp, phone };
}

test("a pet goes along with a phone, its house too, and the display keeps a sealed copy", () => {
  const now = at("2026-10-20 12:00");
  const { display, pi, gulp, phone } = homes(now);
  const moving = pi.handOver(gulp, now + 60);
  assert.equal(moving.pet.moves, 1);
  assert.deepEqual(moving.things, { bobble: 1, daisy: 1 });
  assert.deepEqual(pi.state.items, { daisy: 1 }); // one daisy stays in the display's store
  assert.deepEqual(pi.pets.map((p) => p.name), ["Kid"]);
  assert.deepEqual(pi.handOver(gulp, now + 70), moving); // asked again before the phone confirmed: the same
  phone.adopt(moving, null, now + 80);
  assert.deepEqual([phone.state.name, phone.state.hat, phone.state.items], ["Gulp", "bobble", { bobble: 1, daisy: 1 }]);
  pi.handedOver(gulp, 1);
  refused(() => pi.handOver(gulp, now + 90), "no_pet"); // it isn't there any more
  const saved = display.pet(); // all of it is kept
  assert.deepEqual([saved.moved, saved.awayList().map((a) => [a.name, a.confirmed])], [{ [gulp]: 1 }, [["Gulp", true]]]);
  refused(() => pi.handOver(pi.current, now + 100), "last_pet"); // the panel always has a pet
});

test("a hat that moves in where one has been found meanwhile isn't doubled", () => {
  const now = at("2026-10-20 12:00");
  const { pi, gulp, phone } = homes(now);
  phone.state.items.bobble = 1; // the phone's pet has found one of its own
  phone.adopt(pi.handOver(gulp, now), null, now);
  assert.deepEqual(phone.state.items, { bobble: 1, daisy: 1 });
});

test("it comes home, and an old copy of it is turned away", () => {
  const now = at("2026-10-20 12:00");
  const { pi, gulp, phone } = homes(now);
  const old = phone.adopt(pi.handOver(gulp, now), null, now).state;
  pi.handedOver(gulp, 1);
  const copy = phone.release(gulp, now + 60);
  const back = pi.takeIn(copy, null, now + 120);
  assert.equal(back.accepted, true);
  assert.equal(pi.find(gulp).moves, 2);
  assert.equal(pi.takeIn(copy, null, now + 130).state.id, gulp); // sent twice: it is already there
  assert.deepEqual(pi.awayList(), []);
  // once more along, and then an old backup of the phone tries to bring it
  pi.handOver(gulp, now + 200);
  refused(() => pi.takeIn(copy, null, now + 300), "stale");
  assert.equal(old.name, "Gulp");
});

test("a pet born on the phone moves in, into a free house or in somebody's place", () => {
  const now = at("2026-10-20 12:00");
  const { pi, phone } = homes(now);
  const pip = phone.state.id;
  phone.newEgg(null, now); // so the phone still has one
  const moving = phone.release(pip, now);
  const kid = pi.pets[1].id;
  const result = pi.takeIn(moving, kid, now + 60);
  assert.equal(result.accepted, true);
  assert.deepEqual(pi.pets.map((p) => p.name), ["Gulp", "Pip"]);
  assert.equal(pi.ancestorList()[0].name, "Kid");
  assert.equal(pi.current, pip);
});

test("a lost phone: the display fetches the pet back, and the phone's copy no longer counts", () => {
  const now = at("2026-10-20 12:00");
  const { pi, gulp, phone } = homes(now);
  phone.adopt(pi.handOver(gulp, now), null, now);
  pi.fetchBack(gulp, now + 3600);
  assert.deepEqual([pi.find(gulp).name, pi.find(gulp).moves, pi.state.items.bobble], ["Gulp", 3, 1]);
  refused(() => pi.takeIn(phone.release(gulp, now + 4000), null, now + 4000), "stale");
});

test("fetched back into a full home, it rests among the ancestors", () => {
  const now = at("2026-10-20 12:00");
  const { pi, gulp } = homes(now);
  pi.handOver(gulp, now);
  while (pi.pets.length < PLACES) {
    pi.newEgg(null, now);
  }
  pi.fetchBack(gulp, now + 60);
  assert.equal(pi.ancestorList()[0].name, "Gulp");
  assert.equal(pi.pets.length, PLACES);
});

test("not on a trip; the last one leaves the home empty", () => {
  const now = at("2026-10-20 12:00");
  const { pi, gulp, phone } = homes(now);
  pi.find(gulp).trip = { area: "meadow", start: now, end: now + 3600, found: [] } as never;
  refused(() => pi.handOver(gulp, now), "on_trip");
  const moving = phone.release(phone.current, now);
  assert.equal(moving.pet.name, "Pip");
  assert.equal(phone.pets.length, 0);
});

test("sent to the ancestors by hand: a pet rests there, an egg just goes, and a phone may end up empty", () => {
  const now = at("2026-10-20 12:00");
  const { pi, gulp, phone } = homes(now);
  const kid = pi.pets[1].id;
  pi.retire(gulp, now);
  assert.deepEqual([pi.ancestorList()[0].name, pi.pets.map((p) => p.name)], ["Gulp", ["Kid"]]);
  assert.equal(pi.current, kid);
  pi.newEgg(null, now);
  const ancestors = pi.ancestorList().length;
  pi.retire(pi.current, now);
  assert.equal(pi.ancestorList().length, ancestors);
  assert.equal(pi.state.eggs.length, 0); // a usual egg just goes
  pi.newEgg(null, now);
  pi.state.species = "ember"; // a special one goes back among the kept eggs
  pi.retire(pi.current, now);
  assert.deepEqual(pi.state.eggs.map((e) => e.line), ["ember"]);
  assert.equal(pi.ancestorList().length, ancestors);
  phone.retire(phone.current, now);
  assert.deepEqual([phone.pets.length, phone.ancestorList()[0].name], [0, "Pip"]);
});

test("a save file from before a pet moved is an old copy", () => {
  const now = at("2026-10-20 12:00");
  const { display, pi, gulp } = homes(now);
  const before = JSON.parse(display.text!);
  pi.handOver(gulp, now);
  refused(() => pi.replace({ state: before.pet, others: before.others, place: before.place, ancestors: [] }), "stale");
});
