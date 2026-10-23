// Fishing: at the pond, the bite and the tap, what comes up, and fishing on trips by the water.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as fishing from "../src/fishing";
import * as home from "../src/home";
import * as life from "../src/life";
import * as model from "../src/model";
import { Random } from "../src/random";
import type { PetState } from "../src/state";
import * as trip from "../src/trip";
import { act, at, grown } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
  pet.stage = "adult";
  pet.species = "gemperor";
  Object.assign(pet.stats, { satiety: 95, energy: 95, mood: 60 });
  pet.items = { pond: 1 };
  home.toggleDeco(pet, "pond");
});

/** A cast at a time something bites (the bite is seeded with the time of the cast). */
function castWithBite(from: number): number {
  for (let t = from; ; t += 1) {
    if (fishing.cast(structuredClone(pet), t, 1) !== null) {
      act(pet, "fish", t, { item: "cast" });
      return t;
    }
  }
}

test("only with the pond set out in the garden", () => {
  pet.deco = [];
  assert.equal(fishing.canFish(pet), false);
  assert.deepEqual(act(pet, "fish", start, { item: "cast" }), [false, "no_pond"]);
  home.toggleDeco(pet, "pond");
  assert.deepEqual(act(pet, "fish", start, { item: "cast" }), [true, null]);
  assert.equal(pet.activity, "fish_wait");
});

test("a tap while the bobber is under pulls something out; too early costs nothing, too late it's gone", () => {
  // too early: it reels in with nothing, and nothing is used up
  let t = castWithBite(start);
  const energy = pet.stats.energy;
  assert.deepEqual(act(pet, "fish", t + 0.5, { item: "pull" }), [true, null]);
  assert.equal(pet.activity_item, "early");
  assert.equal(pet.stats.energy, energy);
  assert.deepEqual(act(pet, "fish", t + 1, { item: "pull" }), [false, "no_line"]); // the line is out
  // in time: something comes up and lands in the bag (or among the eggs)
  t = castWithBite(t + 3 * 3600);
  const bite = pet.fishing!.bite!;
  assert.ok(bite >= fishing.BITE_DELAY[0] && bite <= fishing.BITE_DELAY[1]);
  assert.equal(pet.activity_item, bite.toFixed(2)); // the scene shows the dip at the same moment
  assert.deepEqual(act(pet, "fish", t + bite + 0.5, { item: "pull" }), [true, null]);
  assert.equal(pet.activity, "fish_catch");
  const caught: string = pet.activity_item;
  assert.ok(caught === "egg_crab" ? pet.eggs.length === 1 : pet.items[caught] === 1, caught);
  assert.ok(pet.stats.energy < energy);
  assert.equal(pet.events.at(-1)!.item, caught);
  // too late: whatever it was has got away
  t = castWithBite(t + 3 * 3600);
  const late = pet.fishing!.bite! + fishing.BITE_WINDOW - 0.1;
  assert.deepEqual(act(pet, "fish", t + late + 0.2, { item: "pull" }), [false, "no_line"]);
});

test("what comes up: food, the boot once, and sooner or later the crab's egg", () => {
  const rng = new Random("pond");
  const seen = new Set<string>();
  let egg = 0;
  for (let i = 0; i < fishing.SURE_AFTER; i++) {
    const item = fishing.catchFrom(pet, "pond", rng)!;
    seen.add(item);
    if (item === "egg_crab") {
      egg = i + 1;
      break;
    }
    pet.items = { pond: 1, ...(item === "boot" ? { boot: 1 } : {}) };
  }
  assert.ok(egg > 0 && egg <= fishing.SURE_AFTER, "the egg can't be missed");
  assert.ok([...seen].every((item) => ["mussel", "seagrass", "boot", "egg_crab"].includes(item)));
  // the boot exists only once
  pet.items.boot = 1;
  for (let i = 0; i < 50; i++) {
    assert.notEqual(fishing.catchFrom(pet, "pond", rng), "boot");
  }
  // the cave's lake has the axolotl's egg
  pet.counters = {};
  const cave = Array.from({ length: fishing.SURE_AFTER }, () => fishing.catchFrom(pet, "cave", rng));
  assert.ok(cave.includes("egg_axolotl"));
  // and by the sea, the crab's again
  pet.counters = {};
  const coast = Array.from({ length: fishing.SURE_AFTER }, () => fishing.catchFrom(pet, "coast", rng));
  assert.ok(coast.includes("egg_crab") && fishing.TRIP_WATERS.includes("coast"));
});

test("Angloop is a fisher by nature: something bites more often", () => {
  const bites = (species: string) => {
    pet.species = species;
    return Array.from({ length: 400 }, (_, i) => fishing.cast(pet, start + i, 0.6)).filter((b) => b !== null).length;
  };
  assert.ok(bites(fishing.LURE) > bites("gemperor"));
});

test("casting again and again, something bites less often", () => {
  let bites = 0;
  for (let i = 0; i < 40; i++) {
    act(pet, "fish", start + i * 60, { item: "cast" });
    bites += pet.fishing!.bite === null ? 0 : 1;
    pet.stats.energy = 95;
  }
  assert.ok(bites < 30);
});

test("on a trip it fishes at a rest by the water, and brings the catch home", () => {
  pet.stats.energy = pet.stats.satiety = 100;
  pet.guardians = ["meadow", "forest"];
  let fished = 0;
  for (let day = 0; day < 20 && !fished; day++) {
    const t = start + day * 86400;
    pet.trip = trip.plan(pet, "stream", t);
    trip.begin(pet, pet.trip, t);
    pet.stats.energy = pet.stats.satiety = 100;
    const [, done] = trip.step(pet, pet.trip!.end, null);
    fished += (done!.log ?? []).filter((stop) => stop.kind === "fish").length;
    pet.trip = null;
  }
  assert.ok(fished > 0);
});

test("the crab and the axolotl lines' adult forms", () => {
  const decide = (line: string, diary: Record<string, number> = {}, world: life.World = {}) =>
    life.decideSpecies({ minutes: 7 * 1440, ...diary }, line, world);
  assert.equal(decide("crab"), "teacrab");
  assert.equal(decide("crab", {}, { dark: true }), "teacrab");
  assert.equal(decide("crab", {}, { dark: true, glowOutside: true }), "lightclaw");
  assert.equal(decide("crab", { trips_coast: 3 }), "teacrab"); // a child hardly gets that far
  assert.equal(decide("crab", {}, { sandcastle: true }), "castlecrab");
  assert.equal(decide("axolotl", { weak_minutes: 1 }), "mossolotl");
  assert.equal(decide("axolotl"), "medilotl");
  assert.equal(decide("axolotl", { weak_minutes: 5, won_gloompeep: 1 }), "axodrake");
  // the world knows a glowing decoration outside
  pet.items.lantern = 1;
  home.toggleDeco(pet, "lantern");
  assert.equal(model.worldAt(start, null, null, null, pet).glowOutside, true);
  // and the sandcastle from the coast outside
  pet.items.sandcastle = 1;
  home.toggleDeco(pet, "sandcastle");
  assert.equal(model.worldAt(start, null, null, null, pet).sandcastle, true);
});
