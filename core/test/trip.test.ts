// Trips, finds, the plant, hats and decorations.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as home from "../src/home";
import * as model from "../src/model";
import { STATS, toDict, type PetState, type Trip } from "../src/state";
import * as trip from "../src/trip";
import { BEDTIME, HOUR, act, at, grown, near, refused } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
});

function runUntil(when: number, weather: number | null = null): void {
  model.advance(pet, when, BEDTIME, weather);
}

test("trip brings finds home", () => {
  assert.deepEqual(act(pet, "trip", start, { item: "meadow", throw: 0.5 }), [true, null]);
  assert.equal(model.activityOf(pet, start + 1), "trip_start");
  const end = pet.trip!.end;
  assert.ok(45 * 60 <= end - start && end - start <= 110 * 60);
  runUntil(start + 20 * 60);
  assert.deepEqual(act(pet, "feed", start + 20 * 60, { item: "meal" }), [false, "away"]);
  assert.equal(pet.activity, "trip_start"); // on a trip it doesn't shake its head
  assert.equal(model.availableActions(pet, start + 20 * 60).feed, false);
  assert.equal(model.availableActions(pet, start + 20 * 60).recall, true);
  runUntil(end + 60);
  assert.equal(pet.trip, null);
  assert.equal(pet.activity, "trip_home");
  assert.equal(pet.counters.trips, 1);
  assert.equal(pet.diary.trips, 1); // the child's care diary counts it as well
  let found = pet.events.filter((e) => e.action === "find").map((e) => e.item!);
  assert.equal(pet.events.at(-1)!.item, "home");
  // the finds stay in the backpack until they are unpacked
  assert.deepEqual([pet.backpack, pet.items], [found, {}]);
  found = found.length ? found : ["seed_berry"];
  pet.backpack = found;
  Object.assign(pet.stats, { satiety: 90, energy: 90 });
  assert.deepEqual(act(pet, "trip", end + 120, { item: "meadow" }), [false, "unpack_first"]);
  pet.asleep = true;
  assert.deepEqual(act(pet, "unpack", end + 120), [false, "asleep"]);
  pet.asleep = false;
  assert.deepEqual(act(pet, "unpack", end + 120), [true, null]);
  assert.deepEqual([pet.activity, pet.activity_item], ["unpack", found.join(",")]);
  assert.equal(Object.values(pet.items).reduce((sum, n) => sum + n, 0), found.length);
  assert.deepEqual(act(pet, "unpack", end + 180), [false, "nothing_packed"]);
});

test("hiking takes off weight", () => {
  pet.weight = 50.0; // too heavy for a child
  const home = grown(start);
  home.weight = 50.0;
  act(pet, "trip", start, { item: "meadow" });
  const end = pet.trip!.end;
  runUntil(end + 60);
  model.advance(home, end + 60, BEDTIME);
  assert.ok(pet.weight < home.weight - 4 * 0.5 + 0.01); // at least four stations
});

test("trip is the same after catching up", () => {
  const other = grown(start);
  for (const p of [pet, other]) {
    act(p, "trip", start, { item: "meadow" });
  }
  runUntil(start + 3 * HOUR);
  let t = start;
  while (t < start + 3 * HOUR) {
    t += 600;
    model.advance(other, t, BEDTIME);
  }
  assert.deepEqual(toDict(pet), toDict(other));
});

test("woken early in the morning, it may still go", () => {
  // bedtime runs until 07:00 (BEDTIME); at 06:40 the night is nearly over, not too late
  assert.deepEqual(act(pet, "trip", at("2026-10-13 06:40"), { item: "meadow" }), [true, null]);
  assert.ok(pet.trip);
});

test("trip refused", () => {
  refused(() => act(pet, "trip", start, { item: "moon" }), "unknown_area");
  assert.deepEqual(act(pet, "trip", start, { item: "recall" }), [false, "not_away"]);
  assert.deepEqual(act(pet, "trip", start, { item: "forest" }), [false, "locked"]);
  assert.deepEqual(act(pet, "trip", start, { item: "meadow", weather: 95 }), [false, "thunder"]);
  assert.deepEqual(act(pet, "trip", at("2026-10-12 21:30"), { item: "meadow" }), [false, "too_late"]);
  assert.deepEqual(act(pet, "trip", at("2026-10-12 23:30"), { item: "meadow" }), [false, "too_late"]);
  const changes: [Record<string, number>, string][] = [[{ satiety: 40 }, "hungry_trip"], [{ energy: 40 }, "tired_trip"]];
  for (const [change, reason] of changes) {
    const other = grown(start);
    Object.assign(other.stats, change);
    assert.deepEqual(act(other, "trip", start, { item: "meadow" }), [false, reason]);
  }
  pet.sick = true;
  assert.deepEqual(act(pet, "trip", start, { item: "meadow" }), [false, "sick_trip"]);
  pet.sick = false;
  pet.stage = "baby";
  assert.deepEqual(act(pet, "trip", start, { item: "meadow" }), [false, "too_young"]);
  assert.equal(pet.trip, null);
  assert.deepEqual(pet.recent.trip ?? [], []);
});

test("areas open one after the other, and behind the mountain the path forks", () => {
  assert.deepEqual(trip.AREAS.map((area) => trip.unlocked(pet, area)), [true, false, false, false, false, false, false]);
  pet.guardians = ["meadow", "forest"];
  assert.deepEqual(trip.AREAS.map((area) => trip.unlocked(pet, area)), [true, true, true, false, false, false, false]);
  assert.deepEqual(act(pet, "trip", start, { item: "cave" }), [false, "locked"]);
  assert.deepEqual(act(pet, "trip", start, { item: "stream" }), [true, null]);
  assert.equal(pet.trip!.guardian, "ripplesprite");
  // past the mountain both the coast and the ruins are open, and neither one needs the other
  pet.guardians = ["meadow", "forest", "stream", "cave", "mountain"];
  assert.deepEqual(trip.AREAS.map((area) => trip.unlocked(pet, area)), Array(7).fill(true));
  assert.deepEqual([trip.blockedBy("coast"), trip.blockedBy("ruins")], ["mountain", "mountain"]);
  pet.guardians.push("ruins");
  assert.equal(trip.guardianWaiting(pet, "coast"), "barkguard");
  assert.equal(trip.guardianWaiting(pet, "ruins"), null);
  assert.equal(trip.discoveries(pet, "coast")[0].id, "egg_octopus"); // Whistlion sits on the octopus egg
  assert.equal(trip.discoveries(pet, "ruins")[0].id, "egg_gargoyle"); // and Shellmet on the gargoyle's
});

test("the tide at the coast comes and goes with the clock, and low tide brings more mussels", () => {
  const high = Math.ceil(start / trip.TIDE_PERIOD) * trip.TIDE_PERIOD; // high water
  assert.ok(trip.tide(high) > 0.99 && !trip.lowTide(high));
  assert.ok(trip.lowTide(high + trip.TIDE_PERIOD / 2)); // about six hours later
  assert.ok(!trip.lowTide(high + trip.TIDE_PERIOD)); // and high again after about twelve
  const share = (t: number) => {
    let mussels = 0;
    let finds = 0;
    for (let i = 0; i < 400; i++) {
      pet.items = {};
      Object.assign(pet.stats, { satiety: 100, energy: 100 });
      const planned = trip.plan(pet, "coast", t + i * 7);
      pet.trip = { ...planned, factor: 1 };
      const [events] = trip.step(pet, planned.stations[0], null);
      for (const [action, item] of events) {
        finds += action === "find" ? 1 : 0;
        mussels += action === "find" && item === "mussel" ? 1 : 0;
      }
    }
    return mussels / finds;
  };
  assert.ok(share(high + trip.TIDE_PERIOD / 2 - 3000) > 1.4 * share(high - 3000));
});

test("each area shows what is still to discover there once", () => {
  const found = () => trip.discoveries(pet, "meadow").filter((f) => f.found).map((f) => f.id);
  assert.deepEqual(trip.discoveries(pet, "meadow").map((f) => f.id), ["egg_beak", "flag", "windmill", "daisy", "leaf", "bobble", "cones"]);
  assert.deepEqual(found(), []);
  home.addItem(pet, "windmill");
  home.addItem(pet, "seed_berry"); // seeds come again and again, they don't count
  pet.guardian_eggs.push("meadow");
  assert.deepEqual(found(), ["egg_beak", "windmill"]);
  assert.equal(trip.discoveries(pet, "forest")[0].id, "egg_bear"); // Mossoad sits on the bear's egg
});

test("healing herb cures", () => {
  pet.items.seed_herb = 1;
  assert.deepEqual(act(pet, "plant", start, { item: "herb" }), [true, null]);
  Object.assign(pet.plant!, { grown: home.GROW_MINUTES, ripening: home.RIPEN_MINUTES });
  assert.equal(home.wantsFruit(pet), false); // healthy: the blossom stays on the plant
  pet.sick = true;
  pet.stats.health = 60;
  runUntil(start + 120);
  assert.equal(pet.sick, false);
  near(pet.stats.health, 90, 0.5);
  assert.deepEqual([pet.events.at(-1)!.action, pet.events.at(-1)!.item], ["fruit", "herb"]);
  assert.equal(pet.plant!.left, home.FRUITS - 1);
});

test("recall brings it home quickly", () => {
  act(pet, "trip", start, { item: "meadow" });
  assert.deepEqual(act(pet, "trip", start + 60, { item: "recall" }), [true, null]);
  runUntil(start + 60 + trip.RECALL);
  assert.equal(pet.trip, null);
  assert.ok(!("trips" in pet.counters)); // called straight back home doesn't count
});

test("turns back when tired", () => {
  act(pet, "trip", start, { item: "meadow" });
  const first = pet.trip!.stations[0];
  pet.stats.energy = 21;
  runUntil(first + 60);
  assert.equal(trip.returning(pet.trip!), true);
  assert.equal(pet.events.at(-1)!.item, "tired");
  assert.ok(pet.trip!.end <= first + 60 + trip.WAY_HOME);
  pet.stats.energy = 5; // it doesn't fall asleep on a trip
  runUntil(first + 5 * 60);
  assert.equal(pet.asleep, false);
  runUntil(first + 2 * HOUR);
  assert.equal(pet.trip, null);
});

test("second trip of the day brings less", () => {
  assert.equal(trip.dayFactor(pet, start), 1.0);
  act(pet, "trip", start, { item: "meadow" });
  runUntil(start + 3 * HOUR);
  assert.equal(trip.dayFactor(pet, start + 3 * HOUR), 0.5);
  assert.equal(trip.dayFactor(pet, start + 30 * HOUR), 1.0);
});

test("finds depend on weather and are unique", () => {
  pet.items = Object.fromEntries(Object.keys(home.ITEMS).filter((item) => home.kindOf(item) !== "seed")
    .map((item) => [item, home.kindOf(item) === "food" ? home.MAX_FOOD : 1]));
  delete pet.items.bobble;
  Object.assign(pet.items, { seed_berry: home.MAX_SEEDS, seed_sunflower: home.MAX_SEEDS });
  act(pet, "trip", start, { item: "meadow" });
  runUntil(start + 3 * HOUR);
  assert.ok(!("bobble" in pet.items)); // without snow there is nothing left to find here
  const found = new Set<string>();
  for (let day = 1; day < 8; day++) { // when it snows, the bobble hat is lying around
    const now = start + day * 24 * HOUR;
    runUntil(now);
    pet.stats = Object.fromEntries(STATS.map((k) => [k, 90.0])) as PetState["stats"];
    pet.asleep = pet.sick = false;
    assert.deepEqual(act(pet, "trip", now, { item: "meadow" }), [true, null]);
    runUntil(now + 3 * HOUR, 73); // snowfall
    act(pet, "unpack", now + 3 * HOUR);
    Object.keys(pet.items).forEach((item) => found.add(item));
  }
  assert.ok(found.has("bobble"));
  assert.equal(pet.items.bobble, 1);
});

test("plant grows and feeds", () => {
  assert.deepEqual(act(pet, "plant", start, { item: "berry" }), [false, "no_item"]);
  pet.items.seed_berry = 2;
  assert.deepEqual(act(pet, "plant", start, { item: "berry", throw: 0.2 }), [true, null]);
  assert.equal(pet.activity, "plant");
  assert.deepEqual(act(pet, "plant", start, { item: "berry" }), [false, "plant_busy"]);
  assert.deepEqual(pet.items, { seed_berry: 1 });
  assert.equal(home.plantStage(pet), "sprout");
  runUntil(start + 13 * HOUR);
  assert.equal(home.plantStage(pet), "young");
  // well fed: the ripe fruit stays on the plant
  for (let hours = 18; hours < 73; hours += 6) {
    pet.stats.satiety = 90;
    pet.seen_at = start + (hours - 6) * HOUR; // somebody looks after it
    runUntil(start + hours * HOUR);
  }
  assert.equal(home.ripe(pet), true);
  assert.equal(pet.plant!.left, 3);
  pet.stats.satiety = 39;
  runUntil(start + 3 * 24 * HOUR + 60);
  near(pet.stats.satiety, 69, 0.2);
  assert.deepEqual([pet.activity, pet.activity_item], ["pick", "berry"]);
  assert.equal(pet.events.at(-1)!.action, "fruit");
  assert.equal(home.ripe(pet), false);
  assert.equal(pet.plant!.left, 2);
  assert.equal(pet.next_poop_at, null); // doesn't count as a meal
  Object.assign(pet.plant!, { left: 1, ripening: home.RIPEN_MINUTES });
  pet.stats.satiety = 30;
  runUntil(start + 3 * 24 * HOUR + 600);
  assert.equal(pet.plant, null); // wilts after the last fruit
});

test("rain makes plants grow faster", () => {
  pet.items.seed_cherry = 1;
  act(pet, "plant", start, { item: "cherry" });
  runUntil(start + 6 * HOUR, 63); // rain
  assert.equal(pet.plant!.grown, 12 * 60);
  runUntil(start + 7 * HOUR, 73); // snow doesn't count
  assert.equal(pet.plant!.grown, 13 * 60);
});

test("hat and deco", () => {
  assert.deepEqual(act(pet, "wear", start, { item: "daisy" }), [false, "no_item"]);
  pet.items = { daisy: 1, cap: 1, flag: 1, windmill: 1, lantern: 1 };
  assert.deepEqual(act(pet, "wear", start, { item: "daisy" }), [true, null]);
  assert.deepEqual([pet.hat, pet.activity], ["daisy", "happy"]);
  act(pet, "wear", start, { item: "cap" });
  assert.equal(pet.hat, "cap");
  act(pet, "wear", start, { item: "cap" }); // again = take it off
  assert.equal(pet.hat, "");
  for (const item of ["flag", "windmill", "lantern"]) {
    assert.deepEqual(act(pet, "deco", start, { item }), [true, null]);
  }
  assert.deepEqual(pet.deco, ["windmill", "lantern"]); // two spots, the oldest one makes room
  act(pet, "deco", start, { item: "lantern" });
  assert.deepEqual(pet.deco, ["windmill"]);
  refused(() => act(pet, "deco", start, { item: "daisy" }), "unknown_deco");
});

test("no evolution on the way", () => {
  pet.stage_since = start - 8 * 24 * HOUR; // long overdue
  act(pet, "trip", start, { item: "meadow" });
  assert.deepEqual(act(pet, "evolve", start + 60), [false, "away"]);
  runUntil(start + 30 * 60);
  assert.equal(pet.stage, "child");
});

test("the travel diary keeps what happened on each trip", () => {
  act(pet, "trip", start, { item: "meadow" });
  const planned = pet.trip!;
  runUntil(planned.end + 60);
  assert.equal(pet.travels.length, 1);
  const [travel] = pet.travels;
  assert.deepEqual([travel.area, travel.start], ["meadow", start]);
  assert.ok(travel.end >= planned.end && travel.end <= planned.end + 60);
  // every find is in it, and no rounds of a scuffle
  const found = travel.stops.flatMap((stop) => stop.item ? [stop.item] : []);
  assert.deepEqual(found, pet.backpack);
  for (const stop of travel.stops) {
    assert.ok(stop.at >= start && stop.at <= travel.end);
    assert.ok(!("rounds" in stop));
  }
  // called straight back home doesn't count
  pet.backpack = [];
  Object.assign(pet.stats, { satiety: 90, energy: 90 });
  act(pet, "trip", travel.end + 600, { item: "meadow" });
  act(pet, "trip", travel.end + 660, { item: "recall" });
  runUntil(travel.end + 660 + trip.RECALL);
  assert.equal(pet.trip, null);
  assert.equal(pet.travels.length, 1);
});

test("the travel diary keeps the latest trips", () => {
  const done = (n: number): Trip => ({ ...trip.plan(pet, "meadow", start + n), next: 1 });
  for (let n = 0; n < trip.MAX_TRAVELS + 5; n++) {
    trip.remember(pet, done(n), start + n);
  }
  assert.equal(pet.travels.length, trip.MAX_TRAVELS);
  assert.equal(pet.travels.at(-1)!.start, start + trip.MAX_TRAVELS + 4);
  // a trip saved before the diary was there has no log yet
  const old = done(100);
  delete old.log;
  trip.remember(pet, old, start + 100);
  assert.deepEqual(pet.travels.at(-1)!.stops, []);
  // the next pet starts a diary of its own
  assert.deepEqual(model.nextPet(pet, start + 200).travels, []);
});

test("the hearts it would set off with are known before it goes", () => {
  const state = grown(start);
  state.stats.satiety = state.stats.energy = state.stats.health = 100;
  assert.equal(trip.heartsNow(state), 3);
  state.boosts.push("heart"); // a honeycomb eaten before
  assert.equal(trip.heartsNow(state), 4);
  state.stats.satiety = state.stats.energy = state.stats.health = 50;
  assert.equal(trip.heartsNow(state), 3);
});
