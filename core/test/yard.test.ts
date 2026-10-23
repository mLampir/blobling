// The yard at the end of the street: trough and basin, the visits, the floors, Grandma, the finds.

import assert from "node:assert/strict";
import { test } from "node:test";

import * as home from "../src/home";
import * as model from "../src/model";
import { readSave } from "../src/pet";
import type { PetState } from "../src/state";
import * as trip from "../src/trip";
import * as yards from "../src/yard";
import { BEDTIME, Disk, HOUR, at, grown } from "./helpers";

/** Two children at home sharing one store, both fed, clean and happy, and a yard. */
function twoPets(now: number, items: Record<string, number> = {}): { pets: PetState[]; yard: yards.Yard } {
  const pets = [grown(now), grown(now)];
  pets.forEach((pet, i) => {
    pet.id = `pet${i}`;
    pet.items = items; // shared, as Pet.share does
    pet.seen_at = now;
    Object.assign(pet.stats, { satiety: 90, hygiene: 90, mood: 90, energy: 100, health: 100 });
  });
  const yard = yards.newYard();
  yards.settle(yard, items);
  return { pets, yard };
}

/** Steps them on hour by hour up to `until`, the way a Pi that keeps running does. */
function hours(pets: PetState[], from: number, until: number, yard: yards.Yard | null): void {
  for (let t = from + HOUR; t <= until; t += HOUR) {
    model.advanceTogether(pets, t, BEDTIME, null, null, null, yard);
  }
}

test("the yard is there with the second pet, and the trough comes full", () => {
  const now = at("2026-10-12 10:00");
  const pet = new Disk().pet();
  pet.state = grown(now);
  const alone = pet.snapshot(now);
  assert.deepEqual([alone.yard, alone.actions.fill], [null, false]);
  assert.equal(pet.action("fill", { item: "trough", now }).reason, "no_yard");

  pet.newEgg(null, now + 60);
  const two = pet.snapshot(now + 60);
  assert.equal(two.actions.fill, true);
  assert.deepEqual([two.yard!.size, two.yard!.trough.portions, two.yard!.trough.capacity, two.yard!.trough.level],
    ["small", yards.TROUGH[0], yards.TROUGH[0], "full"]);
  assert.equal(two.yard!.basin, null); // the basin is found at the stream first
  assert.equal(pet.action("fill", { item: "basin", now: now + 60 }).reason, "no_basin");
  assert.equal(pet.action("fill", { item: "trough", now: now + 60 }).reason, "yard_full");
  assert.ok(pet.yardView(now + 60));
});

test("a tap fills the trough or the basin up, and it is in the log", () => {
  const now = at("2026-10-12 10:00");
  const pet = new Disk().pet();
  pet.state = grown(now);
  pet.state.items = { basin: 1 };
  pet.newEgg(null, now);
  pet.yard.trough = 2;
  pet.yard.basin = 0;
  const bond = pet.state.bond;
  const result = pet.action("fill", { item: "trough", now: now + 1 });
  assert.equal(result.accepted, true);
  assert.deepEqual([result.state.yard!.trough.portions, result.state.yard!.trough.level], [yards.TROUGH[0], "full"]);
  assert.equal(result.state.yard!.basin!.level, "empty");
  assert.equal(pet.action("fill", { item: "basin", now: now + 2 }).state.yard!.basin!.portions, yards.BASIN[0]);
  assert.deepEqual(pet.events(1)[0], { at: now + 2, action: "fill", item: "basin", by: "app", accepted: true });
  assert.equal(pet.state.bond, bond); // filling up isn't caring for the pet itself
  // the levels the scene shows
  assert.deepEqual([0, 1, 4, 5, 9, 12].map((n) => yards.level(n, 12)), ["empty", "low", "low", "half", "full", "full"]);
});

test("a pet goes to the yard at 50, eats a portion there, and it isn't feeding", () => {
  const now = at("2026-10-12 10:00");
  const { pets, yard } = twoPets(now, { basin: 1 });
  const [a, b] = pets;
  a.stats.satiety = 52;
  b.stats.hygiene = 51;
  const diary = { ...a.diary }, bond = a.bond, counters = { ...a.counters };
  let went: [string, string] | null = null, back: number | null = null;
  for (let t = now + 60; t <= now + 3 * HOUR && back === null; t += 60) {
    model.advanceTogether(pets, t, BEDTIME, null, null, null, yard);
    if (!went && a.activity === "yard") {
      went = [a.activity_item, String(a.activity_until - a.updated_at)];
      assert.equal(yards.phase(a.activity, a.activity_until, a.activity_item, a.updated_at)!.where, "out");
    }
    if (went && a.activity !== "yard") {
      back = t;
    }
  }
  assert.deepEqual(went, ["eat", String(yards.seconds("eat"))]);
  assert.ok(a.stats.satiety > 75, `${a.stats.satiety}`); // 50 and a portion
  assert.equal(yard.trough, yards.TROUGH[0] - 1);
  assert.equal(yard.basin, yards.BASIN[0] - 1); // the other went for a bath
  // no meal in the care diary or the counters, no food_*, no bond
  const fed = (record: Record<string, number>) => Object.entries(record).filter(([k, n]) => (k === "meals" || k.startsWith("food_")) && n);
  assert.deepEqual([fed(a.diary), fed(a.counters), a.bond <= bond], [fed(diary), fed(counters), true]);
  // a pet asleep doesn't go
  const sleepy = twoPets(now);
  model.fallAsleep(sleepy.pets[0], now);
  Object.assign(sleepy.pets[0].stats, { satiety: 40, energy: 20 });
  model.advanceTogether(sleepy.pets, now + 60, BEDTIME, null, null, null, sleepy.yard);
  assert.notEqual(sleepy.pets[0].activity, "yard");
});

test("a ripe fruit is eaten before the trough, so plants still bear all their fruits", () => {
  const now = at("2026-10-12 10:00");
  const { pets, yard } = twoPets(now);
  const [a] = pets;
  a.plant = { kind: "berry", grown: home.GROW_MINUTES, ripening: home.RIPEN_MINUTES, left: 1 };
  a.stats.satiety = home.EAT_BELOW - 1; // hungry for the berry, not yet for the trough
  model.advanceTogether(pets, now + 60, BEDTIME, null, null, null, yard);
  assert.equal(a.plant, null);
  assert.equal(a.garden.plants_done, 1); // a caterpillar may come
  assert.equal(yard.trough, yards.TROUGH[0]);
  assert.ok(home.EAT_BELOW > yards.GOES_AT && home.EAT_BELOW > yards.MOOD_FLOOR);
});

test("two pets in the yard at the same time are both shown there", () => {
  const now = at("2026-10-12 10:00");
  const pet = new Disk().pet();
  pet.state = grown(now);
  pet.newEgg(null, now);
  pet.state = grown(now); // the egg hatched, so to speak
  for (const s of pet.pets) {
    Object.assign(s.stats, { satiety: 50.01, hygiene: 90, mood: 90, energy: 100 });
    s.seen_at = s.updated_at = now;
  }
  const t = now + 60 + yards.OUT + 1;
  const view = pet.yardView(t)!;
  assert.deepEqual(view.pets.map((p) => p.slot), [0, 1]);
  assert.equal(pet.inYard(t), true);
  assert.deepEqual(pet.snapshot(t).yard!.there.length, 2);
  assert.equal(pet.yard.trough, yards.TROUGH[0] - 2);
});

test("while there is something in the yard, satiety, hygiene and mood don't drop below its floors", () => {
  const now = at("2026-10-12 23:30");
  const { pets, yard } = twoPets(now, { basin: 1 });
  for (const pet of pets) {
    model.fallAsleep(pet, now);
    Object.assign(pet.stats, { satiety: 52, hygiene: 52, mood: 41 });
  }
  hours(pets, now, now + 7 * HOUR, yard); // asleep, so it doesn't go over: only the floors hold it
  for (const pet of pets) {
    assert.ok(pet.asleep);
    assert.deepEqual([pet.stats.satiety, pet.stats.hygiene, pet.stats.mood].map((x) => x >= 40), [true, true, true]);
    assert.ok(pet.stats.satiety >= yards.FLOOR && pet.stats.hygiene >= yards.FLOOR && pet.stats.mood >= yards.MOOD_FLOOR);
  }
  // an empty basin: hygiene goes on down, and mood isn't held either
  const empty = twoPets(now, { basin: 1 });
  empty.yard.basin = 0;
  for (const pet of empty.pets) {
    model.fallAsleep(pet, now);
    Object.assign(pet.stats, { satiety: 52, hygiene: 52, mood: 41 });
  }
  hours(empty.pets, now, now + 7 * HOUR, empty.yard);
  assert.ok(empty.pets[0].stats.satiety >= yards.FLOOR);
  assert.ok(empty.pets[0].stats.hygiene < yards.FLOOR);
  // a need that was lower already isn't pushed down further, nor lifted
  const low = twoPets(now, { basin: 1 });
  model.fallAsleep(low.pets[0], now);
  low.pets[0].stats.satiety = 30;
  hours(low.pets, now, now + HOUR, low.yard);
  assert.ok(low.pets[0].stats.satiety <= 30 && low.pets[0].stats.satiety > 25);
});

test("the simulation is the same whether anybody looks or not", () => {
  const now = at("2026-10-12 08:00");
  const watched = twoPets(now, { basin: 1 });
  const left = twoPets(now, { basin: 1 });
  watched.pets[1].stats.satiety = left.pets[1].stats.satiety = 60;
  hours(watched.pets, now, now + 30 * HOUR, watched.yard);
  model.advanceTogether(left.pets, now + 30 * HOUR, BEDTIME, null, null, null, left.yard);
  assert.deepEqual(left.yard, watched.yard);
  assert.deepEqual(left.pets.map((p) => p.stats), watched.pets.map((p) => p.stats));
  assert.ok(watched.yard.trough! < yards.TROUGH[0]);
});

test("Grandma's: not while both have something; 36 hours after the later of the last visit and one running empty", () => {
  const now = at("2026-10-12 08:00");
  const fed = twoPets(now, { basin: 1, planks_coast: 1, planks_ruins: 1 });
  hours(fed.pets, now, now + 2 * 86400, fed.yard);
  assert.deepEqual(fed.pets.map((p) => !!p.grandma), [false, false]);
  assert.ok(!model.leavesForGrandma(fed.pets[0], now + 3 * 86400, fed.yard));
  // without a yard (one pet alone) it would be gone by now
  assert.ok(model.leavesForGrandma(fed.pets[0], now + 3 * 86400 + 8 * HOUR));

  // a need that is critical: the yard doesn't keep it home
  const critical = twoPets(now, { basin: 1 });
  critical.pets[0].stats.energy = 5;
  assert.ok(model.leavesForGrandma(critical.pets[0], now + 37 * HOUR, critical.yard));

  // the small yard runs empty after about two days; Grandma 36 hours after that
  const small = twoPets(now, { basin: 1 });
  let emptyAt: number | null = null, gone: number | null = null;
  for (let t = now + HOUR; t <= now + 5 * 86400 && gone === null; t += HOUR) {
    model.advanceTogether(small.pets, t, BEDTIME, null, null, null, small.yard);
    emptyAt ??= yards.supplied(small.yard) ? null : t;
    gone = small.pets.some((p) => p.grandma) ? t : null;
  }
  assert.ok(emptyAt !== null && emptyAt > now + 36 * HOUR, `${emptyAt}`);
  assert.equal(small.yard.empty_at > now, true);
  assert.ok(gone! - small.yard.empty_at >= model.GRANDMA_AFTER && gone! - small.yard.empty_at < model.GRANDMA_AFTER + 10 * HOUR);
  // the owner's last visit later than that counts instead
  const state = small.pets[0];
  state.seen_at = small.yard.empty_at + 5 * HOUR;
  state.grandma = 0;
  assert.ok(!model.leavesForGrandma(state, small.yard.empty_at + model.GRANDMA_AFTER + HOUR, small.yard));
});

test("the basin is found at the stream, and the upgrades only after the guardian has left its egg", () => {
  assert.ok(trip.FINDS.stream.some(([item]) => item === yards.BASIN_ITEM));
  assert.ok(trip.FINDS.coast.some(([item]) => item === "planks_coast"));
  assert.ok(trip.FINDS.ruins.some(([item]) => item === "planks_ruins"));
  const s = grown(at("2026-10-12 10:00"));
  assert.ok(trip.canFind(s, "stream", "basin"));
  assert.ok(!trip.canFind(s, "coast", "planks_coast"));
  s.guardians.push("coast");
  assert.ok(!trip.canFind(s, "coast", "planks_coast")); // got past it, but its egg is still waiting
  s.guardian_eggs.push("coast");
  assert.ok(trip.canFind(s, "coast", "planks_coast"));
  assert.ok(!trip.canFind(s, "ruins", "planks_ruins"));

  // each upgrade makes the yard a size bigger; the basin comes at the size it has then
  const items: Record<string, number> = {};
  const yard = yards.newYard();
  yards.settle(yard, items);
  assert.deepEqual([yards.sizeOf(items), yard.trough, yard.basin], [0, yards.TROUGH[0], null]);
  items.planks_ruins = 1;
  yards.settle(yard, items);
  assert.deepEqual([yards.sizeOf(items), yard.trough, yards.capacity(items, "trough")], [1, yards.TROUGH[0], yards.TROUGH[1]]);
  items.basin = 1;
  yards.settle(yard, items);
  assert.equal(yard.basin, yards.BASIN[1]); // it comes full, and medium
  items.planks_coast = 1;
  assert.equal(yards.fill(yard, items, "trough"), null);
  assert.deepEqual([yards.sizeOf(items), yard.trough], [2, yards.TROUGH[2]]);
});

test("the yard is saved with the home, and an older save gets one that comes full", () => {
  const now = at("2026-10-12 10:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  pet.state.items = { basin: 1 };
  pet.newEgg(null, now);
  pet.yard.trough = 5;
  pet.yard.basin = 3;
  pet.yard.empty_at = now - 100;
  pet.save();
  const loaded = disk.pet();
  assert.deepEqual(loaded.yard, { trough: 5, basin: 3, empty_at: now - 100, rain_at: 0 });
  assert.deepEqual(loaded.snapshot(now).yard!.basin!.portions, 3);

  const file = JSON.parse(disk.text!);
  delete file.yard;
  const old = readSave(file);
  assert.deepEqual(old.yard, yards.newYard());
  disk.text = JSON.stringify(file);
  assert.deepEqual(disk.pet().snapshot(now).yard!.trough.portions, yards.TROUGH[0]);
  assert.deepEqual(yards.readYard({ trough: "x", basin: -3 }), { trough: null, basin: 0, empty_at: 0, rain_at: 0 });
});

test("the rain barrel tops the basin up while it really rains, once a minute for the whole home", () => {
  const now = at("2026-10-12 10:00");
  const RAIN = 63, SNOW = 73;
  const { pets, yard } = twoPets(now, { basin: 1, rain_barrel: 1 });
  yard.basin = 0;
  yard.trough = 0; // nobody goes over to eat
  model.advanceTogether(pets, now + HOUR, BEDTIME, RAIN, null, null, yard);
  // an hour of rain: six portions, not twelve for two pets (and nobody bathed: they are clean)
  assert.equal(yard.basin, 60 / yards.RAIN_EVERY);
  model.advanceTogether(pets, now + 2 * HOUR, BEDTIME, SNOW, null, null, yard);
  model.advanceTogether(pets, now + 3 * HOUR, BEDTIME, null, null, null, yard);
  assert.equal(yard.basin, 60 / yards.RAIN_EVERY); // snow and dry weather bring nothing
  model.advanceTogether(pets, now + 20 * HOUR, BEDTIME, RAIN, null, null, yard);
  assert.equal(yard.basin, yards.BASIN[0]); // up to what it holds
  // without the basin the barrel has nothing to run into, and without the barrel the rain stays out
  const dry = twoPets(now, { rain_barrel: 1 });
  model.advanceTogether(dry.pets, now + HOUR, BEDTIME, RAIN, null, null, dry.yard);
  assert.equal(dry.yard.basin, null);
  const open = twoPets(now, { basin: 1 });
  open.yard.basin = 0;
  open.yard.trough = 0;
  model.advanceTogether(open.pets, now + HOUR, BEDTIME, RAIN, null, null, open.yard);
  assert.equal(open.yard.basin, 0);
});

test("the rain barrel is found once at the stream, only while it rains", () => {
  assert.ok(trip.FINDS.stream.some(([item, , only]) => item === yards.BARREL_ITEM && only === "rain"));
  assert.equal(home.kindOf(yards.BARREL_ITEM), "yard");
});

test("in the evening the pets sit at the campfire until bedtime, a little happier, and then go to bed", () => {
  const now = at("2026-10-12 22:00"); // bedtime is at 23:00
  const { pets, yard } = twoPets(now, { basin: 1 });
  for (const pet of pets) {
    pet.stats.mood = 60;
  }
  model.advanceTogether(pets, at("2026-10-12 22:10"), BEDTIME, null, null, null, yard);
  assert.deepEqual(pets.map((p) => p.activity), ["idle", "idle"]); // not yet
  const sitting = at("2026-10-12 22:40");
  model.advanceTogether(pets, sitting, BEDTIME, null, null, null, yard);
  for (const pet of pets) {
    assert.equal(pet.activity, "yard");
    assert.ok(yards.atFire(pet.activity_item));
    assert.ok(Math.abs(pet.activity_until - at("2026-10-12 23:00")) < 60);
    assert.equal(yards.phase(pet.activity, pet.activity_until, pet.activity_item, sitting)?.where, "there");
    assert.ok(pet.stats.mood > 60); // it went up by the fire, though mood drops awake
  }
  model.advanceTogether(pets, at("2026-10-12 23:05"), BEDTIME, null, null, null, yard);
  assert.deepEqual(pets.map((p) => p.asleep), [true, true]);
  // the yard's food isn't touched by it
  assert.equal(yard.trough, yards.TROUGH[0]);
});

test("no campfire in the rain, for a pet that is busy until shortly before bedtime, or with one pet", () => {
  const now = at("2026-10-12 22:00");
  const wet = twoPets(now, { basin: 1 });
  model.advanceTogether(wet.pets, at("2026-10-12 22:40"), BEDTIME, 61, null, null, wet.yard);
  assert.deepEqual(wet.pets.map((p) => p.activity), ["idle", "idle"]);
  // less than FIRE_LEAST minutes left: it stays home
  assert.equal(yards.toFire((yards.FIRE_LEAST - 1) * 60, null), null);
  assert.equal(yards.toFire((yards.FIRE_MINUTES + 1) * 60, null), null);
  assert.ok(yards.toFire(yards.FIRE_MINUTES * 60, null));
  // one pet alone has no yard, so no fire
  const [alone] = twoPets(now).pets;
  model.advanceTogether([alone], at("2026-10-12 22:40"), BEDTIME, null, null, null, null);
  assert.equal(alone.activity, "idle");
});

test("falling asleep at the fire, it is home in bed", () => {
  const now = at("2026-10-12 22:20");
  const { pets, yard } = twoPets(now, { basin: 1 });
  model.advanceTogether(pets, now + 10 * 60, BEDTIME, null, null, null, yard);
  assert.equal(pets[0].activity, "yard");
  model.fallAsleep(pets[0], now + 10 * 60);
  assert.equal(yards.phase(pets[0].activity, pets[0].activity_until, pets[0].activity_item, now + 10 * 60 + 1), null);
});
