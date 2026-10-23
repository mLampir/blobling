// The playground: its pieces from trips, the neighbours meeting there, what it brings, the sandcastle.

import assert from "node:assert/strict";
import { test } from "node:test";

import * as companion from "../src/companion";
import * as home from "../src/home";
import type { Pet } from "../src/pet";
import * as playground from "../src/playground";
import { GROUND, PLAYGROUND, YARD, place } from "../src/street";
import * as trip from "../src/trip";
import * as yards from "../src/yard";
import { Disk, HOUR, at, grown } from "./helpers";

/** Two pets at home, a grown-up and a child, both happy; the camera on the grown-up. */
function two(now: number, items: Record<string, number> = {}): [Pet, string, string] {
  const pet = new Disk().pet();
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "angloop", name: "Gulp" });
  pet.state.items = { ...items };
  const gulp = pet.current;
  const kid = pet.newEgg(null, now).id;
  Object.assign(pet.state, { stage: "child", stage_since: now, name: "Kid" });
  pet.select(gulp);
  for (const s of pet.pets) {
    Object.assign(s.stats, { satiety: 90, hygiene: 90, mood: 70, energy: 100, health: 100 });
  }
  return [pet, gulp, kid];
}

test("its pieces are found once on trips, and it opens with the first one and a second pet", () => {
  assert.deepEqual(playground.PIECES.map((item) => [item, home.ITEMS[item],
    Object.keys(trip.FINDS).find((area) => trip.FINDS[area].some(([find]) => find === item))]),
  [["swing", "playground", "forest"], ["sandpit", "playground", "stream"], ["seesaw", "playground", "cave"]]);
  assert.equal(playground.open({ swing: 1 }, 1), false); // one pet has nobody to play with
  assert.equal(playground.open({}, 2), false);
  assert.equal(playground.open({ seesaw: 1 }, 2), true);
  assert.deepEqual(playground.pieces({ seesaw: 1, swing: 1 }), ["swing", "seesaw"]);

  const now = at("2026-10-12 08:00");
  const [pet] = two(now);
  assert.deepEqual([pet.places(), pet.snapshot(now).playground], [[YARD, GROUND], null]);
  pet.state.items.sandpit = 1;
  assert.deepEqual(pet.places(), [YARD, PLAYGROUND, GROUND]);
  assert.deepEqual(pet.snapshot(now).playground, { pieces: ["sandpit"], there: [] });
  // along the street: the houses, the yard, the playground, the training ground
  const ids = pet.pets.map((s) => s.id);
  assert.deepEqual([YARD, PLAYGROUND, GROUND].map((where) => place(ids, where, pet.places())), [2, 3, 4]);
  assert.equal(place(ids, GROUND), 3); // without one
});

test("they take turns with the pieces, then play a game of their own", () => {
  const all = [...playground.PIECES];
  const turns = [0, 1, 2, 3, 4].map((i) => playground.turn(all, i * playground.TURN + 1));
  assert.deepEqual(turns, ["swing", "sandpit", "seesaw", null, "swing"]);
  assert.deepEqual([0, 1, 2].map((i) => playground.turn(["seesaw"], i * playground.TURN)), ["seesaw", null, "seesaw"]);
});

test("the neighbours get together on the playground, and it is worth more there", () => {
  const day = at("2026-10-12 08:00");
  const [start, end] = companion.outWindow(day + 4 * HOUR);
  const [pet, gulp, kid] = two(start - 60, { swing: 1, sandpit: 1, seesaw: 1 });
  assert.equal(pet.atPlayground(start - 30), false);
  assert.deepEqual(pet.view(start + 60).playground, { pieces: ["swing", "sandpit", "seesaw"], castle: false });
  assert.deepEqual(pet.view(start + 60, kid).visitor!.species, "angloop"); // with Gulp, over there
  assert.deepEqual(pet.snapshot(start + 60).playground!.there.sort(), [gulp, kid].sort());
  assert.equal(pet.playgroundPet(start + 60, kid), kid);

  const mood = pet.find(kid).stats.mood;
  pet.update(end + 60);
  const child = pet.find(kid);
  assert.equal(child.diary.plays, playground.PLAYS); // a whole playtime, not half of one
  assert.ok(child.stats.mood > mood, `${child.stats.mood} after ${mood}`);
  assert.equal(pet.yard.castle_at, end); // they left a sandcastle
  assert.equal(pet.atPlayground(end + 60), false);
  assert.deepEqual(pet.playgroundView(), { pieces: ["swing", "sandpit", "seesaw"], castle: true });

  // without a playground they meet in a garden, for half a playtime
  const [other, , otherKid] = two(start - 60);
  other.update(end + 60);
  assert.equal(other.find(otherKid).diary.plays, companion.PLAYS);
  assert.equal(other.view(start + 60).playground, null);
});

test("only one pair fits: the second one meets in a garden", () => {
  const day = at("2026-10-12 08:00");
  const [start] = companion.outWindow(day + 4 * HOUR);
  const [pet] = two(start - 60, { seesaw: 1 });
  for (let i = 0; i < 2; i++) {
    pet.newEgg(null, start - 60);
    Object.assign(pet.state, { stage: "child", stage_since: start - 60 });
  }
  const there = pet.snapshot(start + 60).playground!.there;
  assert.equal(there.length, 2);
  const elsewhere = pet.pets.filter((s) => !there.includes(s.id));
  assert.equal(elsewhere.length, 2);
  for (const s of elsewhere) {
    assert.ok(pet.view(start + 60, s.id).visitor); // together in a garden
    assert.equal(pet.view(start + 60, s.id).playground, null);
  }
});

test("the rain washes the sandcastle away", () => {
  const yard = yards.newYard();
  yard.castle_at = 100;
  yards.rain(yard, {}, 60 * 60, null);
  assert.equal(yard.castle_at, 100);
  yards.rain(yard, {}, 61 * 60, 63);
  assert.equal(yard.castle_at, 0);
});
