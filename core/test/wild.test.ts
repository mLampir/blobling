// Wild pets: making friends, visits, gifts, and the nest.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as care from "../src/care";
import * as home from "../src/home";
import * as life from "../src/life";
import * as model from "../src/model";
import { Random } from "../src/random";
import { fromDict, toDict, type PetState } from "../src/state";
import * as trip from "../src/trip";
import * as wild from "../src/wild";
import { ALL_TRICKS, BEDTIME, act, at, grown, withRules } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
  pet.stage = "adult";
  pet.species = "cyclopuff";
  pet.name = "Puff";
  Object.assign(pet.stats, { satiety: 95, energy: 95 });
  pet.guardians = ["meadow"]; // so that nobody is waiting at the end of the path
});

function runUntil(when: number, weather: number | null = null): void {
  model.advance(pet, when, BEDTIME, weather);
}

/** A copy of the pet, with some fields changed. */
function copy(changes: Record<string, unknown> = {}): PetState {
  return fromDict({ ...toDict(pet), ...changes });
}

function met(who: PetState, area: string, weather: number | null = null): Set<string | null> {
  return new Set(Array.from({ length: 400 }, (_, i) => wild.meet(who, area, start + i, weather)));
}

test("only an adult without a friend is looking", () => {
  assert.equal(wild.looking(pet), true);
  assert.deepEqual(met(pet, "meadow"), new Set([null, "cyclopuff", "sneezle", "flicker", "lumoth"]));
  assert.ok(met(pet, "meadow", 63).has("grumpcap"));
  assert.deepEqual(met(pet, "cave"), new Set([null]));
  // the stone line and the hippo line
  assert.deepEqual(met(pet, "stream"), new Set([null, "bouldergrin", "glimmerock", "lillypot", "steamo"]));
  // the fox line and the leaf line
  assert.deepEqual(met(pet, "forest"), new Set([null, "filchfox", "roamtail", "twiggle", "needlenub"]));
  assert.deepEqual(met(pet, "mountain"), new Set([null, "prismist"])); // the cloud line; the thundercloud only in the rain
  assert.ok(met(pet, "mountain", 63).has("rumblefluff"));
  const changes = [{ stage: "child" }, { friend: { species: "sneezle" } }, { nest: { line: "blob" } },
    { eggs: Array(home.MAX_EGGS).fill({ line: "blob" }) }];
  for (const change of changes) {
    const other = copy(change);
    assert.equal(wild.looking(other), false, JSON.stringify(change));
    assert.deepEqual(met(other, "meadow"), new Set([null]));
  }
  // no line whose egg a guardian gives lives in the wild
  const guarded = Object.values(trip.GUARDIAN_EGGS).map((egg) => home.EGGS[egg]);
  for (const [area, pets] of Object.entries(wild.WILD)) {
    assert.ok(trip.AREAS.includes(area));
    for (const [species] of pets) {
      assert.ok(life.SPECIES.includes(species));
      assert.ok(!guarded.includes(life.lineOf(species)));
    }
  }
});

test("tricks that work make a friend", () => {
  const rng = new Random(1);
  let shown = wild.show(pet, "sneezle", rng, start); // it knows no trick at all
  assert.equal(shown.outcome, "shrug");
  assert.deepEqual(shown.rounds.map(([, worked]) => worked), Array(wild.SHOW).fill(false));
  assert.equal(pet.friend, null);
  pet.tricks = { bow: care.TRICKS.bow, spin: 1.0 };
  const many = Array.from({ length: 200 }, (_, i) => wild.show(copy(), "sneezle", new Random(i), start));
  assert.deepEqual(new Set(many.flatMap((s) => s.rounds.map(([trick]) => trick))), new Set(["bow", "spin"]));
  const friends = many.filter((s) => s.outcome === "friend").length;
  assert.ok(40 < friends && friends < 160, String(friends));
  pet.tricks = { ...ALL_TRICKS };
  shown = wild.show(pet, "sneezle", rng, start);
  assert.equal(shown.outcome, "friend");
  const friend = pet.friend!;
  assert.deepEqual([friend.species, friend.visits], ["sneezle", 0]);
  assert.ok(wild.FIRST_VISIT[0] <= friend.next - start && friend.next - start <= wild.FIRST_VISIT[1]);
  pet.friend = null;
  pet.stats.mood = wild.GLUM - 1; // glum: every trick is a coin toss
  const glum = Array.from({ length: 200 }, (_, i) => wild.show(copy(), "sneezle", new Random(i), start))
    .filter((s) => s.outcome === "friend").length;
  assert.ok(60 < glum && glum < 140, String(glum));
});

test("meeting a wild pet on a trip", () => {
  pet.tricks = { ...ALL_TRICKS };
  withRules(wild.rules, { meetChance: 1.0 }, () => {
    assert.deepEqual(act(pet, "trip", start, { item: "meadow" }), [true, null]);
    runUntil(pet.trip!.stations[0] + 60);
    const last = pet.trip!.last!;
    assert.deepEqual([last.kind, last.outcome, last.rounds!.length], ["wild", "friend", wild.SHOW]);
    assert.equal(pet.friend!.species, last.wild);
    assert.equal(pet.events.at(-1)!.item, `${last.wild}:friend`);
    runUntil(pet.trip!.stations[1] + 60);
    assert.notEqual(pet.trip!.last!.kind, "wild"); // it has a friend now
  });
});

test("visits lead to a nest with an egg", () => {
  pet.skills = { strength: 80.0, speed: 41.0, smarts: 0.0 };
  pet.friend = { species: "sneezle", visits: 0, next: start + 600 };
  runUntil(start + 540);
  assert.equal(wild.visiting(pet, start + 540), false);
  runUntil(start + 660);
  assert.equal(wild.visiting(pet, start + 660), true);
  assert.deepEqual([pet.events.at(-1)!.action, pet.events.at(-1)!.item], ["visit", "sneezle"]);
  const mood = pet.stats.mood;
  runUntil(start + 660 + wild.VISIT_SECONDS);
  const friend = pet.friend!;
  assert.deepEqual([friend.visits, wild.visiting(pet, pet.updated_at)], [1, false]);
  assert.ok(pet.stats.mood > mood);
  const wait = friend.next - pet.updated_at;
  assert.ok(wild.VISIT_EVERY[0] <= wait && wait <= wild.VISIT_EVERY[1]);
  // a visit while the pet is glum doesn't count; neither does one it sleeps through
  friend.next = pet.updated_at;
  pet.stats.mood = 20;
  runUntil(pet.updated_at + wild.VISIT_SECONDS + 120);
  assert.equal(pet.friend!.visits, 1);
  Object.assign(pet.stats, { mood: 90, satiety: 90, energy: 90 });
  pet.friend!.next = pet.updated_at;
  pet.asleep = true;
  pet.sleep_since = pet.updated_at;
  runUntil(pet.updated_at + 300);
  assert.ok(!("until" in pet.friend!)); // it doesn't come while the pet is asleep
  // the last visit: a nest, the friend moves on
  pet.asleep = false;
  pet.friend!.visits = wild.VISITS_FOR_NEST - 1;
  runUntil(pet.updated_at + wild.VISIT_SECONDS + 120);
  assert.equal(pet.friend, null);
  assert.deepEqual(pet.nest, { line: "blob", from: "Puff", skills: { strength: 20.0, speed: 10.3, smarts: 0.0 } });
  assert.deepEqual([pet.events.at(-1)!.action, pet.events.at(-1)!.item], ["nest", "blob"]);
  assert.equal(wild.looking(pet), false); // not while the egg is still in the nest
  const now = pet.updated_at;
  assert.equal(model.availableActions(pet, now).collect, true);
  assert.deepEqual(act(pet, "collect", now), [true, null]);
  assert.deepEqual([pet.nest, pet.eggs.length, pet.activity_item], [null, 1, "egg_blob"]);
  assert.deepEqual(act(pet, "collect", now + 60), [false, "no_nest"]);
  assert.equal(wild.looking(pet), true);
});

test("the egg is of either line", () => {
  pet.species = "flarelet";
  const lines = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const other = copy();
    other.friend = { species: "sneezle", visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start + i * 60 };
    wild.step(other, start + i * 60, true);
    lines.add(other.nest!.line);
  }
  assert.deepEqual(lines, new Set(["blob", "ember"]));
});

test("a friend of the stone line can bring its egg into the home", () => {
  const lines = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const other = copy();
    other.friend = { species: "bouldergrin", visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start + i * 60 };
    wild.step(other, start + i * 60, true);
    lines.add(other.nest!.line);
    if (other.nest!.line === "stone") {
      act(other, "collect", start + i * 60 + 60);
      assert.deepEqual(other.eggs.at(-1)!.line, "stone");
      assert.equal(home.eggOf("stone"), "egg_stone");
    }
  }
  assert.deepEqual(lines, new Set(["blob", "stone"]));
});

test("a friend of the fox line can bring its egg into the home", () => {
  const lines = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const other = copy();
    other.friend = { species: "filchfox", visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start + i * 60 };
    wild.step(other, start + i * 60, true);
    lines.add(other.nest!.line);
  }
  assert.deepEqual(lines, new Set(["blob", "fox"]));
  assert.equal(home.eggOf("fox"), "egg_fox");
});

test("a friend of the cloud line can bring its egg into the home", () => {
  const lines = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const other = copy();
    other.friend = { species: "rumblefluff", visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start + i * 60 };
    wild.step(other, start + i * 60, true);
    lines.add(other.nest!.line);
  }
  assert.deepEqual(lines, new Set(["blob", "cloud"]));
  assert.equal(home.eggOf("cloud"), "egg_cloud");
});

test("some visits bring a gift, and only one lies there at a time", () => {
  const gifts = new Set<string | null>();
  for (let i = 0; i < 200; i++) {
    const other = copy();
    other.friend = { species: "sneezle", visits: 0, next: 0, until: start + i * 60 };
    const happened = wild.step(other, start + i * 60, true);
    gifts.add(other.gift);
    if (other.gift) {
      assert.deepEqual(happened, [["gift", "sneezle"]]);
    }
    // with a gift still lying there, the next visit brings nothing new
    const lying = other.gift;
    other.friend!.until = start + i * 60 + 1;
    wild.step(other, start + i * 60 + 1, true);
    if (lying) {
      assert.equal(other.gift, lying);
    }
  }
  assert.ok(gifts.has(null));
  assert.ok(gifts.has("fruit_berry") && gifts.has("fruit_herb"));
  assert.ok([...gifts].some((gift) => gift?.startsWith("seed_"))); // rarely
  // a visit that doesn't count brings nothing, and neither does the one that builds the nest
  for (let i = 0; i < 40; i++) {
    const glum = copy({ stats: { ...pet.stats, mood: 20 } });
    glum.friend = { species: "sneezle", visits: 0, next: 0, until: start + i * 60 };
    wild.step(glum, start + i * 60, true);
    const last = copy();
    last.friend = { species: "sneezle", visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start + i * 60 };
    wild.step(last, start + i * 60, true);
    assert.deepEqual([glum.gift, last.gift], [null, null]);
  }
});

test("a seed is only brought while there is room for it", () => {
  const full = copy({ items: Object.fromEntries(home.ids("seed").map((seed) => [seed, home.MAX_SEEDS])) });
  for (let i = 0; i < 100; i++) {
    assert.ok(wild.giftFrom(full, new Random(`gift:${i}`)).startsWith("fruit_"));
  }
});

test("unwrapping: it goes into the bag", () => {
  const now = start + 60;
  pet.gift = "fruit_herb";
  assert.deepEqual(model.availableActions(pet, now).unwrap, true);
  assert.deepEqual(act(pet, "unwrap", now), [true, null]);
  assert.deepEqual([pet.gift, pet.items.fruit_herb], [null, 1]);
  assert.deepEqual([pet.activity, pet.activity_item], ["unwrap", "fruit_herb"]);
  assert.deepEqual([pet.events.at(-1)!.action, pet.events.at(-1)!.item], ["unwrap", "fruit_herb"]);
  assert.deepEqual(act(pet, "unwrap", now + 60), [false, "no_gift"]);
  pet.gift = "seed_cherry";
  assert.deepEqual(act(pet, "unwrap", now + 120), [true, null]);
  assert.equal(pet.items.seed_cherry, 1);
  // it stays where it is for the next pet
  pet.gift = "fruit_berry";
  assert.equal(model.nextPet(pet, now + 180).gift, "fruit_berry");
});
