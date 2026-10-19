// What the pet does by itself, and what it tells when somebody comes back.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as care from "../src/care";
import * as idle from "../src/idle";
import * as model from "../src/model";
import type { PetState, Trace } from "../src/state";
import { BEDTIME, HOUR, act, at, grown } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 08:00");
  pet = grown(start);
  pet.stats = { satiety: 100, mood: 60, energy: 100, hygiene: 100, health: 100 };
});

function solo(p: PetState, from = 0): string[] {
  return p.events.filter((e) => e.action === "solo" && e.at > from).map((e) => e.item!);
}

/** What it has left behind (read through a function, so that it isn't narrowed by an earlier check). */
function traceOf(p: PetState): Trace | null {
  return p.trace;
}

const PLAY = ["ball", ...idle.BUILDS, "snowman"]; // what it does by itself that is no trick
const SNOW = 73;

test("left to itself, it plays now and then", () => {
  model.advance(pet, start + 6 * HOUR, BEDTIME);
  const done = solo(pet);
  assert.ok(done.length >= 2 && done.length <= 7, `${done.length} times`);
  assert.ok(done.every((item) => PLAY.includes(item))); // it hasn't been shown any trick yet
  assert.ok(pet.events.filter((e) => e.action === "solo").every((e) => e.by === "system"));
});

test("not while somebody is busy with it, and not in its sleep", () => {
  for (let t = start; t < start + 6 * HOUR; t += 10 * 60) {
    act(pet, "pet", t);
    model.advance(pet, t + 10 * 60 - 1, BEDTIME);
  }
  assert.deepEqual(solo(pet), []);

  const night = at("2026-10-12 23:30");
  model.advance(pet, night, BEDTIME);
  assert.ok(pet.asleep);
  const before = pet.events.length;
  model.advance(pet, at("2026-10-13 06:30"), BEDTIME);
  assert.deepEqual(solo(pet, pet.events[before - 1].at), []);
});

test("it only practices tricks it has been shown, and only a little", () => {
  act(pet, "trick", start, { item: "dance" });
  const shown = pet.tricks.dance;
  for (let hours = 12; hours <= 72; hours += 12) { // looked after now and then, but no more practice
    model.advance(pet, start + hours * HOUR, BEDTIME);
    Object.assign(pet.stats, { satiety: 100, hygiene: 100 });
  }
  assert.ok(solo(pet).includes("dance"));
  assert.ok(!solo(pet).some((item) => item !== "dance" && !PLAY.includes(item)));
  assert.equal(pet.tricks.dance, shown + idle.SOLO_LIMIT); // no further without practicing together
  assert.ok(!care.knows(pet, "dance"));

  act(pet, "trick", start + 3 * 86400 + 60, { item: "dance" });
  assert.equal(pet.solo.dance, undefined); // now it may practice alone again
});

test("it leaves something behind, one thing at a time, until somebody does something with it", () => {
  const kinds = new Set<string>();
  for (let day = 0; day < 6; day++) {
    const morning = start + day * 86400;
    act(pet, "pet", morning); // somebody was there: whatever lay around is cleared away
    assert.equal(pet.trace, null);
    let first: string | null = null;
    for (let t = morning; t < morning + 12 * HOUR; t += HOUR) {
      model.advance(pet, t, BEDTIME);
      Object.assign(pet.stats, { satiety: 100, hygiene: 100, energy: 100 });
      const trace = traceOf(pet);
      if (trace) {
        first ??= trace.kind;
        kinds.add(trace.kind);
        // what it built stays; only the ball may roll somewhere else when it plays again
        assert.ok(first === "ball" || trace.kind === first, `${first} then ${trace.kind}`);
        assert.ok(trace.spot >= 0 && trace.spot < 1);
      }
    }
  }
  assert.ok(kinds.has("ball") && kinds.has("tower") && kinds.has("drawing"), [...kinds].join());
  assert.ok(!kinds.has("snowman")); // no snow, no snowman
});

test("now and then it finds something small, one at a time, and keeps it until somebody picks it up", () => {
  const found = new Set<string>();
  for (let day = 0; day < 20; day++) {
    const morning = start + day * 86400;
    pet.seen_at = morning - HOUR; // somebody was there last night
    let first: string | null = null;
    for (let t = morning; t < morning + 12 * HOUR; t += HOUR) {
      model.advance(pet, t, BEDTIME);
      Object.assign(pet.stats, { satiety: 100, hygiene: 100, energy: 100 });
      if (pet.found) {
        first ??= pet.found;
        assert.equal(pet.found, first); // nothing new turns up while it lies there
      }
    }
    if (first) {
      found.add(first);
      const event = pet.events.filter((e) => e.action === "found").at(-1)!;
      assert.deepEqual([event.item, event.by], [first, "system"]);
      act(pet, "pet", morning + 12 * HOUR); // somebody was there: unlike a trace, it stays
      assert.equal(pet.found, first);
      assert.deepEqual(act(pet, "pickup", morning + 12 * HOUR + 60), [true, null]);
      assert.deepEqual([pet.found, pet.activity, pet.activity_item], [null, "pickup", first]);
    }
  }
  assert.ok(found.size >= 3, [...found].join()); // mostly a fruit, rarely a seed
  assert.ok([...found].every((thing) => thing.startsWith("fruit_") || thing.startsWith("seed_")));
  assert.deepEqual(act(pet, "pickup", start + 30 * 86400), [false, "nothing_found"]);
});

test("picking it up: it goes into the bag, and it stays for the next pet", () => {
  pet.found = "fruit_berry";
  assert.equal(model.availableActions(pet, start).pickup, true);
  assert.deepEqual(act(pet, "pickup", start), [true, null]);
  assert.equal(pet.items.fruit_berry, 1);
  assert.deepEqual([pet.events.at(-1)!.action, pet.events.at(-1)!.item], ["pickup", "fruit_berry"]);
  pet.found = "seed_cherry";
  act(pet, "pickup", start + 60);
  assert.equal(pet.items.seed_cherry, 1);
  pet.found = "fruit_cherry";
  assert.equal(model.nextPet(pet, start + 120).found, "fruit_cherry");
  pet.asleep = true;
  assert.equal(model.availableActions(pet, start + 180).pickup, false);
  assert.deepEqual(act(pet, "pickup", start + 180), [false, "asleep"]);
});

test("a snowman only in real snow, and it melts once it is warm", () => {
  let built = 0;
  for (let day = 0; day < 4; day++) {
    const morning = start + day * 86400;
    act(pet, "pet", morning);
    for (let t = morning; t < morning + 12 * HOUR && !pet.trace; t += 10 * 60) {
      model.advance(pet, t, BEDTIME, SNOW, -2);
      Object.assign(pet.stats, { satiety: 100, hygiene: 100, energy: 100 });
    }
    built += pet.trace?.kind === "snowman" ? 1 : 0;
  }
  assert.ok(built >= 2, `${built} snowmen`);
  pet.trace = { kind: "snowman", spot: 0.5, look: 0 };
  pet.seen_at = pet.updated_at; // nobody does anything, but the sun comes out
  model.advance(pet, pet.updated_at + 5 * 60, BEDTIME, SNOW, -1);
  assert.equal(pet.trace?.kind, "snowman");
  model.advance(pet, pet.updated_at + 5 * 60, BEDTIME, 0, idle.MELT_ABOVE + 2);
  assert.equal(pet.trace, null);
});

test("it never learns a trick alone", () => {
  pet.tricks.bow = care.TRICKS.bow - idle.PRACTICE_STEP; // one step short
  assert.deepEqual(idle.practicable(pet), []);
  pet.tricks.bow = care.TRICKS.bow - 2 * idle.PRACTICE_STEP - 0.01;
  assert.deepEqual(idle.practicable(pet), ["bow"]);
});

test("catching up gives the same as running non-stop", () => {
  const stepwise = grown(start);
  const atOnce = grown(start);
  act(stepwise, "trick", start, { item: "spin" });
  act(atOnce, "trick", start, { item: "spin" });
  for (let t = start; t <= start + 12 * HOUR; t += 7 * 60) {
    model.advance(stepwise, t, BEDTIME);
  }
  model.advance(stepwise, start + 12 * HOUR, BEDTIME);
  model.advance(atOnce, start + 12 * HOUR, BEDTIME);
  assert.deepEqual(stepwise, atOnce);
});

test("coming back after a while, it tells what happened", () => {
  act(pet, "feed", start, { item: "meal" });
  assert.equal(idle.welcome(pet, start + HOUR), null); // somebody was just there
  model.logEvent(pet, start + HOUR, "fruit", "system", { item: "berry" });
  model.logEvent(pet, start + 2 * HOUR, "fruit", "system", { item: "berry" });
  model.logEvent(pet, start + 3 * HOUR, "visit", "system", { item: "cyclopuff" });
  model.logEvent(pet, start + 3 * HOUR, "heart", "system");
  model.logEvent(pet, start + 4 * HOUR, "feed", "app", { item: "meal", accepted: false, reason: "full" });

  assert.equal(idle.welcome(pet, start + 5 * HOUR), null); // not long enough
  assert.deepEqual(idle.welcome(pet, start + 7 * HOUR), {
    since: start,
    told: [
      { action: "fruit", item: "berry", count: 2 },
      { action: "visit", item: "cyclopuff", count: 1 },
    ],
  });

  act(pet, "pet", start + 7 * HOUR);
  assert.equal(idle.welcome(pet, start + 7 * HOUR + 60), null); // told once somebody is back
});

test("nothing to tell: no welcome", () => {
  pet.seen_at = start;
  assert.equal(idle.welcome(pet, start + 8 * HOUR), null);
  pet.seen_at = 0; // an old save: not known when somebody was last there
  model.logEvent(pet, start + HOUR, "fruit", "system", { item: "berry" });
  assert.equal(idle.welcome(pet, start + 8 * HOUR), null);
});
