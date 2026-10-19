// Decay, sleep, catching up and the everyday actions.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as home from "../src/home";
import * as life from "../src/life";
import * as model from "../src/model";
import { toDict, type PetState } from "../src/state";
import { BEDTIME, HOUR, act, at, grown, near, refused } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 08:00");
  pet = grown(start);
});

function runUntil(text: string): void {
  model.advance(pet, at(text), BEDTIME);
}

test("decay while awake", () => {
  const before = { ...pet.stats };
  runUntil("2026-10-12 12:00");
  near(pet.stats.satiety, before.satiety - 20, 0.5);
  assert.ok(pet.stats.energy < before.energy);
  assert.equal(pet.asleep, false);
});

test("falls asleep at bedtime and wakes in the morning", () => {
  runUntil("2026-10-12 23:01");
  assert.equal(pet.asleep, true);
  runUntil("2026-10-13 07:30");
  assert.equal(pet.asleep, false);
  assert.ok(pet.stats.energy > 90);
});

test("catch-up equals continuous run", () => {
  const other = grown(start);
  act(pet, "feed", at("2026-10-12 08:00"), { item: "meal" });
  act(other, "feed", at("2026-10-12 08:00"), { item: "meal" });
  runUntil("2026-10-13 08:00");
  let t = start;
  while (t < at("2026-10-13 08:00")) {
    t += 600;
    model.advance(other, t, BEDTIME);
  }
  assert.deepEqual(toDict(pet), toDict(other));
});

test("long absence is capped", () => {
  pet.stats.satiety = 30;
  runUntil("2026-10-20 08:00");
  assert.equal(pet.stats.satiety, 50);
  assert.equal(pet.events.at(-1)!.action, "away");
});

test("clock jump backwards", () => {
  model.advance(pet, start - HOUR, BEDTIME);
  assert.equal(pet.updated_at, start - HOUR);
});

test("feed and refuse when full", () => {
  pet.stats.satiety = 50;
  assert.deepEqual(act(pet, "feed", start, { item: "meal" }), [true, null]);
  assert.equal(pet.stats.satiety, 90);
  assert.equal(model.activityOf(pet, start + 1), "eat");
  pet.stats.satiety = 95;
  assert.deepEqual(act(pet, "feed", start + 60, { item: "meal" }), [false, "full"]);
  assert.notEqual(pet.next_poop_at, null);
});

test("thrown food lands first and counts like feeding", () => {
  pet.stats.satiety = 50;
  assert.equal(act(pet, "feed", start, { item: "meal", throw: 0.25 })[0], true);
  assert.equal(pet.stats.satiety, 90);
  assert.deepEqual([pet.activity, pet.activity_item], ["throw_meal", "meal@0.25"]);
  assert.equal(pet.activity_until, start + model.THROW_SECONDS + model.ACTIVITY_SECONDS.eat);
  pet.items.fruit_cherry = 1;
  act(pet, "feed", start + 60, { item: "fruit_cherry", throw: 1 });
  assert.deepEqual([pet.activity, pet.activity_item], ["throw_snack", "fruit_cherry@1.00"]);
  assert.equal(pet.events.at(-1)!.item, "fruit_cherry");
  // where nothing gets thrown, a throw has no meaning
  assert.equal(act(pet, "pet", start + 120, { throw: "x" })[0], true);
  assert.equal(pet.activity, "happy");
  for (const bad of [-0.1, 1.5, "0.5", true, NaN]) {
    refused(() => act(pet, "feed", start + 180, { item: "meal", throw: bad }), "invalid_throw");
  }
});

test("thrown things land first", () => {
  Object.assign(pet.stats, { mood: 50, energy: 50 });
  pet.sick = true;
  const thrown = [["play", "ball"], ["medicine", "medicine"]];
  thrown.forEach(([action, item], i) => {
    const now = start + i * 60;
    assert.deepEqual(act(pet, action, now, { throw: 0.5 }), [true, null]);
    assert.deepEqual([pet.activity, pet.activity_item], [`throw_${action}`, `${item}@0.50`]);
    assert.equal(pet.activity_until, now + model.THROW_SECONDS + model.ACTIVITY_SECONDS[action]);
  });
  assert.equal(pet.sick, false);
  // refused: nothing drops in, the pet shakes its head straight away
  assert.deepEqual(act(pet, "medicine", start + 600, { throw: 0.5 }), [false, "not_sick"]);
  assert.equal(pet.activity, "no");
});

test("repeated play gives less", () => {
  pet.stats.mood = 10;
  const gains: number[] = [];
  for (let i = 0; i < 3; i++) {
    const before = pet.stats.mood;
    act(pet, "play", start + i * 60);
    gains.push(pet.stats.mood - before);
  }
  assert.deepEqual(gains, [20, 12, 6]);
});

test("sleep needs tiredness during the day", () => {
  pet.stats.energy = 95;
  assert.deepEqual(act(pet, "sleep", start), [false, "not_tired"]);
  pet.stats.energy = 40;
  assert.equal(act(pet, "sleep", start)[0], true);
  assert.equal(pet.asleep, true);
});

test("woken at night is grumpy and stays awake a while", () => {
  runUntil("2026-10-13 02:00");
  assert.equal(pet.asleep, true);
  pet.stats.mood = 50;
  act(pet, "wake", at("2026-10-13 02:00"));
  assert.equal(pet.stats.mood, 50 - 15);
  runUntil("2026-10-13 02:20");
  assert.equal(pet.asleep, false);
  runUntil("2026-10-13 02:40");
  assert.equal(pet.asleep, true);
});

test("poop appears and clean removes it", () => {
  pet.stats.satiety = 40;
  act(pet, "feed", start, { item: "meal" });
  runUntil("2026-10-12 10:01");
  assert.equal(pet.poops, 1);
  assert.ok(model.needs(pet).includes("hygiene"));
  assert.equal(act(pet, "clean", at("2026-10-12 10:01"))[0], true);
  assert.deepEqual([pet.poops, pet.stats.hygiene], [0, 100]);
});

test("neglect makes sick but medicine heals", () => {
  for (const day of ["13", "14", "15"]) { // three days without care (the pet keeps running)
    runUntil(`2026-10-${day} 07:59`);
  }
  assert.equal(pet.sick, true);
  assert.equal(model.moodOf(pet), "sick");
  assert.equal(act(pet, "medicine", at("2026-10-15 08:00"))[0], true);
  assert.equal(pet.sick, false);
});

test("unknown action", () => {
  refused(() => act(pet, "dance", start), "unknown_action");
  refused(() => act(pet, "feed", start, { item: "schnitzel" }), "unknown_food");
  refused(() => act(pet, "feed", start), "unknown_food");
  refused(() => act(pet, "heart", start, { item: "default" })); // only through petting
});

test("every fifth counted pet brings a heart", () => {
  pet.stats.mood = 0;
  const cooldown = model.PET_COOLDOWN;
  for (let i = 0; i < 4; i++) {
    act(pet, "pet", start + i * cooldown);
    assert.equal(model.activityOf(pet, start + i * cooldown + 1), "happy");
  }
  act(pet, "pet", start + 3 * cooldown + 10); // too soon: doesn't count
  assert.equal(pet.counters.pets, 4);
  const t = start + 4 * cooldown;
  assert.deepEqual(act(pet, "pet", t), [true, null]);
  assert.equal(model.activityOf(pet, t + 1), "catch_heart");
  assert.equal(pet.counters.hearts, 1);
  assert.deepEqual(pet.events.slice(-2).map((e) => e.action), ["heart", "pet"]);
  assert.equal(pet.stats.mood, 5 * 5 + 10);
  assert.equal(pet.diary.love, 5);
  // the next heart shortly afterwards is worth less, but at least half
  for (let i = 5; i < 15; i++) {
    act(pet, "pet", start + i * cooldown);
  }
  assert.equal(pet.counters.hearts, 3);
  near(pet.stats.mood, 15 * 5 + 10 + 6 + 5, 0.005);
});

test("petting while asleep does not count", () => {
  runUntil("2026-10-13 01:00");
  act(pet, "pet", at("2026-10-13 01:00"));
  assert.equal(pet.asleep, true);
  assert.equal(pet.activity, "turn_over");
  assert.ok(!("pets" in pet.counters));
});

test("the ember stone makes whatever is still growing grow faster", () => {
  const other = grown(start);
  const stage = life.STAGE_SECONDS.child!;
  pet.items = { emberstone: 1 };
  assert.deepEqual(act(pet, "deco", start, { item: "emberstone" }), [true, null]);
  const run = (until: number) => {
    for (const state of [pet, other]) {
      for (let t = state.updated_at; t < until; t += HOUR) {
        state.stats.satiety = state.stats.hygiene = state.stats.mood = 80; // looked after all along
        model.advance(state, Math.min(until, t + HOUR), BEDTIME);
      }
    }
  };
  run(start + stage * (1 - home.GROWTH_SAVED) - HOUR);
  assert.equal(life.isDue(pet, pet.updated_at), false);
  run(start + stage * (1 - home.GROWTH_SAVED) + 120);
  assert.deepEqual([life.isDue(pet, pet.updated_at), life.isDue(other, other.updated_at)], [true, false]);
  near(life.dueAt(other)! - life.dueAt(pet)!, stage * home.GROWTH_SAVED, 120);
  // put away again, it stops helping
  act(pet, "deco", pet.updated_at, { item: "emberstone" });
  const warmth = pet.egg_warmth;
  run(pet.updated_at + HOUR);
  assert.equal(pet.egg_warmth, warmth);
  // an egg hatches sooner too, and a grown-up has no use for it
  const egg = model.newPet(start);
  const adult = grown(start);
  adult.stage = "adult";
  for (const state of [egg, adult]) {
    state.deco = ["emberstone"];
    model.advance(state, start + life.STAGE_SECONDS.egg! * (1 - home.GROWTH_SAVED) + 60, BEDTIME);
  }
  assert.equal(life.isDue(egg, egg.updated_at), true);
  assert.equal(adult.egg_warmth, 0);
});

test("in the cold it wakes up shivering, until it is rubbed warm", () => {
  const night = at("2026-10-13 03:00");
  const other = grown(start);
  for (const [state, temp] of [[pet, 0], [other, 20]] as const) {
    for (let t = start; t < at("2026-10-13 07:30"); t += HOUR / 2) {
      state.stats.satiety = 80; // fed all along
      model.advance(state, t + HOUR / 2, BEDTIME, null, temp);
      // only waking up starts it: not the cold by itself, and not in its sleep
      assert.ok(t > night || !home.cold(state, state.updated_at));
    }
  }
  assert.ok(home.cold(pet, pet.updated_at) && night < pet.cold_until && other.cold_until === 0);
  // it costs nothing: the cold changes nothing else
  assert.deepEqual({ ...toDict(pet), cold_until: 0 }, toDict(other));
  // petting rubs it warm, and that is worth a little extra
  const [mood, bond] = [pet.stats.mood, pet.bond];
  let t = pet.updated_at;
  act(pet, "pet", t, { temp: 0 });
  near(pet.stats.mood, mood + 5 + home.RUB_MOOD, 0.005);
  assert.ok(pet.bond > bond + 2);
  assert.deepEqual([pet.counters.warmed, home.cold(pet, t)], [1, false]);
  act(pet, "pet", t + 10, { temp: 0 }); // it is warm already
  assert.equal(pet.counters.warmed, 1);
  // left alone, it stops by itself
  home.wakeInCold(pet, 0, t);
  assert.deepEqual([home.cold(pet, t + home.COLD_SECONDS - 1), home.cold(pet, t + home.COLD_SECONDS)], [true, false]);
  // woken by hand counts too, and without weather data or in mild weather it never shivers
  for (const [temp, shivers] of [[0, true], [home.COLD_BELOW, false], [null, false]] as const) {
    pet.asleep = true;
    act(pet, "wake", t, { temp });
    assert.equal(home.cold(pet, t), shivers);
  }
  // the bobble hat, the ember stone and a fire of its own keep it from shivering
  home.wakeInCold(pet, 0, t);
  pet.items = { bobble: 1, emberstone: 1 };
  act(pet, "wear", t, { item: "bobble" });
  assert.equal(home.cold(pet, t), false);
  act(pet, "wear", t, { item: "none" });
  assert.equal(home.cold(pet, t), true);
  act(pet, "deco", t, { item: "emberstone" });
  assert.equal(home.cold(pet, t), false);
  pet.deco = [];
  pet.species = "ember";
  assert.equal(home.cold(pet, t), false);
});
