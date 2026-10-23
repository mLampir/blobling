// Wild pets: making friends, visits, gifts, and the egg a friend brings.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as care from "../src/care";
import * as food from "../src/food";
import * as home from "../src/home";
import * as life from "../src/life";
import * as model from "../src/model";
import { Random } from "../src/random";
import { fromDict, toDict, type Friend, type PetState } from "../src/state";
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
  assert.deepEqual(met(pet, "cave"), new Set([null, "umbrabat", "batbeat"])); // the bat line
  // the stone line and the hippo line
  assert.deepEqual(met(pet, "stream"), new Set([null, "bouldergrin", "glimmerock", "lillypot", "steamo"]));
  // the fox line and the leaf line
  assert.deepEqual(met(pet, "forest"), new Set([null, "filchfox", "roamtail", "twiggle", "needlenub"]));
  assert.deepEqual(met(pet, "mountain"), new Set([null, "prismist"])); // the cloud line; the thundercloud only in the rain
  assert.ok(met(pet, "mountain", 63).has("rumblefluff"));
  // a friend that hasn't built a nest yet, or as many friends as it can have
  const old = { species: "sneezle", visits: 0, next: 0, nests: 1 };
  const changes = [{ stage: "child" }, { friends: [{ species: "sneezle", visits: 0, next: 0 }] },
    { friends: Array(wild.MAX_FRIENDS).fill(old) }, { nest: { line: "blob" } }];
  for (const change of changes) {
    const other = copy(change);
    assert.equal(wild.looking(other), false, JSON.stringify(change));
    assert.deepEqual(met(other, "meadow"), new Set([null]));
  }
  // no line whose egg one of the first five guardians gives lives in the wild; behind the mountain,
  // the octopus and the gargoyle live where their guardian is
  const branches = trip.AREAS.filter((area) => trip.blockedBy(area) === trip.HOUSE_AREA);
  const guarded = Object.entries(trip.GUARDIAN_EGGS).filter(([area]) => !branches.includes(area))
    .map(([, egg]) => home.EGGS[egg]);
  for (const [area, pets] of Object.entries(wild.WILD)) {
    assert.ok(trip.AREAS.includes(area));
    for (const [species] of pets) {
      assert.ok(life.SPECIES.includes(species), species);
      assert.ok(!guarded.includes(life.lineOf(species)));
    }
  }
  assert.deepEqual(branches.map((area) => home.EGGS[trip.GUARDIAN_EGGS[area]]), ["octopus", "gargoyle"]);
});

test("tricks that work make a friend", () => {
  const rng = new Random(1);
  let shown = wild.show(pet, "sneezle", rng, start); // it knows no trick at all
  assert.equal(shown.outcome, "shrug");
  assert.deepEqual(shown.rounds.map(([, worked]) => worked), Array(wild.SHOW).fill(false));
  assert.deepEqual(pet.friends, []);
  pet.tricks = { bow: care.TRICKS.bow, spin: 1.0 };
  const many = Array.from({ length: 200 }, (_, i) => wild.show(copy(), "sneezle", new Random(i), start));
  assert.deepEqual(new Set(many.flatMap((s) => s.rounds.map(([trick]) => trick))), new Set(["bow", "spin"]));
  const friends = many.filter((s) => s.outcome === "friend").length;
  assert.ok(40 < friends && friends < 160, String(friends));
  pet.tricks = { ...ALL_TRICKS };
  shown = wild.show(pet, "sneezle", rng, start);
  assert.equal(shown.outcome, "friend");
  const friend: Friend = pet.friends[0];
  assert.deepEqual([friend.species, friend.visits], ["sneezle", 0]);
  assert.ok(wild.FIRST_VISIT[0] <= friend.next - start && friend.next - start <= wild.FIRST_VISIT[1]);
  pet.friends = [];
  pet.stats.mood = wild.GLUM - 1; // glum: every trick is a coin toss
  const glum = Array.from({ length: 200 }, (_, i) => wild.show(copy(), "sneezle", new Random(i), start))
    .filter((s) => s.outcome === "friend").length;
  assert.ok(60 < glum && glum < 140, String(glum));
});

test("a strong bond gets one try more", () => {
  pet.tricks = { bow: care.TRICKS.bow, spin: 1.0 };
  const tries = (bond: number) => Array.from({ length: 200 },
    (_, i) => wild.show(copy({ bond }), "sneezle", new Random(i), start));
  const weak = tries(0);
  const strong = tries(wild.BOND_SHOWS * 20);
  assert.ok(weak.every((s) => s.rounds.length === wild.SHOW));
  assert.ok(strong.every((s) => s.rounds.length === wild.SHOW + 1));
  const friends = (shows: ReturnType<typeof tries>) => shows.filter((s) => s.outcome === "friend").length;
  assert.ok(friends(strong) > friends(weak) + 20, `${friends(weak)} → ${friends(strong)}`);
});

test("a present it likes and a game of ball count as tricks that worked", () => {
  // it knows no trick at all, so only what it offers can impress
  const shown = wild.show(pet, "sneezle", new Random(1), start, ["gift:fruit_herb", "ball"]);
  assert.deepEqual(shown.rounds.slice(0, 2), [["gift:fruit_herb", true], ["ball", true]]);
  assert.equal(shown.rounds.length, 2 + wild.SHOW);
  assert.equal(shown.outcome, "friend");
});

test("on a trip, the pet offers a wild pet its favorite and the ball from the backpack", () => {
  pet.items = { [food.TASTES.sneezle[0]]: 1, fruit_cherry: 1 };
  withRules(wild.rules, { meetChance: 1.0 }, () => {
    act(pet, "trip", start, { item: "meadow", value: [food.TASTES.sneezle[0], "ball"] });
    const stations = pet.trip!.stations;
    let t = start;
    // the first wild pet it meets: it gives the present only to one that likes it
    while (!pet.trip!.last || pet.trip!.last.kind !== "wild") {
      t = stations[pet.trip!.next] + 60;
      runUntil(t);
    }
    const last = pet.trip!.last!;
    const offered = last.rounds!.map(([thing]) => thing).filter((thing) => thing === "ball" || String(thing).startsWith("gift:"));
    assert.deepEqual(offered, last.wild === "sneezle" ? [`gift:${food.TASTES.sneezle[0]}`, "ball"] : ["ball"]);
    assert.ok(last.wild !== "sneezle" || last.outcome === "friend"); // two that worked, without a trick
  });
});

test("meeting a wild pet on a trip", () => {
  pet.tricks = { ...ALL_TRICKS };
  withRules(wild.rules, { meetChance: 1.0 }, () => {
    assert.deepEqual(act(pet, "trip", start, { item: "meadow" }), [true, null]);
    runUntil(pet.trip!.stations[0] + 60);
    const last = pet.trip!.last!;
    assert.deepEqual([last.kind, last.outcome, last.rounds!.length], ["wild", "friend", wild.SHOW]);
    assert.equal(pet.friends[0].species, last.wild);
    assert.equal(pet.events.at(-1)!.item, `${last.wild}:friend`);
    runUntil(pet.trip!.stations[1] + 60);
    assert.notEqual(pet.trip!.last!.kind, "wild"); // it has a friend now
  });
});

test("visits lead to a nest with an egg", () => {
  pet.skills = { strength: 80.0, speed: 41.0, smarts: 0.0 };
  pet.friends = [{ species: "sneezle", visits: 0, next: start + 600 }];
  runUntil(start + 540);
  assert.equal(wild.visiting(pet, start + 540), false);
  runUntil(start + 660);
  assert.equal(wild.visiting(pet, start + 660), true);
  assert.deepEqual([pet.events.at(-1)!.action, pet.events.at(-1)!.item], ["visit", "sneezle"]);
  const mood = pet.stats.mood;
  runUntil(start + 660 + wild.VISIT_SECONDS);
  const friend = pet.friends[0];
  assert.deepEqual([friend.visits, wild.visiting(pet, pet.updated_at)], [1, false]);
  assert.ok(pet.stats.mood > mood);
  const wait = friend.next - pet.updated_at;
  assert.ok(wild.VISIT_EVERY[0] <= wait && wait <= wild.VISIT_EVERY[1]);
  // a visit while the pet is glum doesn't count; neither does one it sleeps through
  friend.next = pet.updated_at;
  pet.stats.mood = 20;
  runUntil(pet.updated_at + wild.VISIT_SECONDS + 120);
  assert.equal(pet.friends[0].visits, 1);
  Object.assign(pet.stats, { mood: 90, satiety: 90, energy: 90 });
  pet.friends[0].next = pet.updated_at;
  pet.asleep = true;
  pet.sleep_since = pet.updated_at;
  runUntil(pet.updated_at + 300);
  assert.ok(!("until" in pet.friends[0])); // it doesn't come while the pet is asleep
  // the last visit: a nest, and the friend stays
  pet.asleep = false;
  pet.friends[0].visits = wild.VISITS_FOR_NEST - 1;
  runUntil(pet.updated_at + wild.VISIT_SECONDS + 120);
  assert.deepEqual([pet.friends[0].species, pet.friends[0].visits, pet.friends[0].nests], ["sneezle", 0, 1]);
  assert.deepEqual(pet.nest, { line: "blob", from: "Puff", skills: { strength: 8.0, speed: 4.1, smarts: 5.0 } });
  assert.deepEqual([pet.events.at(-1)!.action, pet.events.at(-1)!.item], ["nest", "blob"]);
  assert.equal(wild.looking(pet), false); // not while the egg is still in the nest
  const now = pet.updated_at;
  assert.equal(model.availableActions(pet, now).collect, true);
  assert.deepEqual(act(pet, "collect", now), [true, null]);
  assert.deepEqual([pet.nest, pet.eggs.length, pet.activity_item], [null, 1, "egg_blob"]);
  assert.deepEqual(act(pet, "collect", now + 60), [false, "no_nest"]);
  assert.equal(wild.looking(pet), true);
});

test("after the nest the friend stays, comes less often, and after a rest there is another nest", () => {
  const friend: Friend = { species: "sneezle", visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start };
  pet.friends = [friend];
  assert.deepEqual(wild.step(pet, start, true), [["nest", pet.nest!.line]]);
  assert.deepEqual([friend.visits, friend.nests, friend.rest_until], [0, 1, start + wild.NEST_REST]);
  const wait = friend.next - start;
  assert.ok(wild.OLD_VISIT_EVERY[0] <= wait && wait <= wild.OLD_VISIT_EVERY[1]);
  act(pet, "collect", start + 60);
  // it can make a new friend now, since the old one has built its nest
  assert.equal(wild.looking(pet), true);
  // while it rests, its visits cheer the pet up and may bring a gift, but don't count
  const resting = start + wild.NEST_REST - 60;
  Object.assign(friend, { visits: wild.VISITS_FOR_NEST - 1, until: resting });
  const mood = pet.stats.mood;
  wild.step(pet, resting, true);
  assert.deepEqual([friend.visits, pet.nest], [wild.VISITS_FOR_NEST - 1, null]);
  assert.ok(pet.stats.mood > mood);
  // after it, they do again (once the first egg has left the bag)
  pet.eggs = [];
  const later = start + wild.NEST_REST;
  friend.until = later;
  assert.deepEqual(wild.step(pet, later, true), [["nest", pet.nest!.line]]);
  assert.deepEqual([friend.visits, friend.nests, friend.rest_until], [0, 2, later + wild.NEST_REST]);
});

test("a friend's egg gets more from it the longer they are friends", () => {
  pet.skills = { strength: 50.0, speed: 0.0, smarts: 20.0 };
  // the pet adds a small part of its stats, the friend points in its line's stat
  assert.deepEqual(wild.fromFriend(pet, "bear", 0), { strength: 10.0, speed: 0.0, smarts: 2.0 });
  assert.deepEqual(wild.fromFriend(pet, "owl", 0), { strength: 5.0, speed: 0.0, smarts: 7.0 });
  // each egg it has brought before adds more, up to FRIEND_SKILL_MAX
  const points = [0, 1, 2, 3, 4, 9].map((nests) => wild.fromFriend(pet, "fox", nests).speed);
  assert.deepEqual(points, [5.0, 10.0, 15.0, 20.0, 20.0, 20.0]);
  // the pet's own egg keeps the larger part, and nothing from a friend
  assert.deepEqual(wild.heirloom(pet), { strength: 12.5, speed: 0.0, smarts: 5.0 });
});

test("every line has a stat it is good at", () => {
  assert.deepEqual(Object.keys(life.LINE_SKILL).sort(), Object.keys(life.LINES).sort());
});

test("a nest waits while there is no room for the egg", () => {
  const friend: Friend = { species: "sneezle", visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start };
  pet.friends = [friend];
  pet.nest = { line: "ember" };
  wild.step(pet, start, true);
  assert.deepEqual([pet.nest.line, friend.visits, friend.nests], ["ember", wild.VISITS_FOR_NEST, undefined]);
  pet.nest = null;
  pet.eggs = Array(home.MAX_EGGS).fill({ line: "blob" });
  friend.until = start + 60;
  wild.step(pet, start + 60, true);
  assert.deepEqual([pet.nest, friend.visits], [null, wild.VISITS_FOR_NEST]);
  pet.eggs = [];
  friend.until = start + 120;
  wild.step(pet, start + 120, true);
  assert.deepEqual([pet.nest!.from, friend.visits, friend.nests], ["Puff", 0, 1]);
});

test("several friends visit one at a time", () => {
  pet.friends = [
    { species: "sneezle", visits: 0, next: start, nests: 1 },
    { species: "flicker", visits: 0, next: start },
  ];
  assert.deepEqual(wild.step(pet, start, true), [["visit", "sneezle"]]);
  assert.deepEqual(wild.step(pet, start + 60, true), []); // the other one waits
  assert.equal(wild.visitor(pet, start + 60)!.species, "sneezle");
  wild.step(pet, start + wild.VISIT_SECONDS, true);
  assert.equal(wild.visiting(pet, start + wild.VISIT_SECONDS), false);
  // and comes a while after the first one has left
  assert.equal(pet.friends[1].next, start + wild.VISIT_SECONDS + wild.BETWEEN_VISITS);
  runUntil(start + wild.VISIT_SECONDS + wild.BETWEEN_VISITS + 60);
  assert.equal(wild.visitor(pet, pet.updated_at)!.species, "flicker");
});

test("a pet saved with one friend keeps it", () => {
  const friend = { species: "sneezle", visits: 2, next: start };
  const { friends: _, ...saved } = toDict(pet) as unknown as Record<string, unknown>;
  assert.deepEqual(fromDict({ ...saved, friend }).friends, [friend]);
  assert.deepEqual(fromDict({ ...saved, friend: null }).friends, []);
});

test("the egg a friend brings is always of its own line", () => {
  pet.species = "flarelet";
  for (const [species, line] of [["sneezle", "blob"], ["bouldergrin", "stone"], ["filchfox", "fox"],
    ["rumblefluff", "cloud"]]) {
    const lines = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const other = copy();
      other.friends = [{ species, visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start + i * 60 }];
      wild.step(other, start + i * 60, true);
      lines.add(other.nest!.line);
    }
    assert.deepEqual(lines, new Set([line]), species);
  }
  // and it goes into the home like any other egg
  const other = copy();
  other.friends = [{ species: "bouldergrin", visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start }];
  wild.step(other, start, true);
  act(other, "collect", start + 60);
  assert.deepEqual([other.eggs.at(-1)!.line, other.eggs.at(-1)!.from], ["stone", "Puff"]);
});

test("while the bag holds as many eggs of the friend's line as there may be, its egg waits", () => {
  const other = copy();
  other.eggs = Array(home.MAX_EGGS).fill({ line: "stone" });
  other.friends = [{ species: "bouldergrin", visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start }];
  wild.step(other, start, true);
  assert.equal(other.nest, null);
  assert.equal(other.friends[0].visits, wild.VISITS_FOR_NEST);
  other.eggs = [{ line: "blob" }, { line: "blob" }, { line: "blob" }]; // other lines don't take its room
  other.friends[0].until = start + 3600;
  wild.step(other, start + 3600, true);
  assert.equal(other.nest!.line, "stone");
});

test("some visits bring a gift, and only one lies there at a time", () => {
  const gifts = new Set<string | null>();
  for (let i = 0; i < 200; i++) {
    const other = copy();
    other.friends = [{ species: "sneezle", visits: 0, next: 0, until: start + i * 60 }];
    const happened = wild.step(other, start + i * 60, true);
    gifts.add(other.gift);
    if (other.gift) {
      assert.deepEqual(happened, [["gift", "sneezle"]]);
    }
    // with a gift still lying there, the next visit brings nothing new
    const lying = other.gift;
    other.friends[0].until = start + i * 60 + 1;
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
    glum.friends = [{ species: "sneezle", visits: 0, next: 0, until: start + i * 60 }];
    wild.step(glum, start + i * 60, true);
    const last = copy();
    last.friends = [{ species: "sneezle", visits: wild.VISITS_FOR_NEST - 1, next: 0, until: start + i * 60 }];
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

test("a line the home has long been missing comes more often", () => {
  const leaves = (who: PetState) => Array.from({ length: 4000 }, (_, i) => wild.meet(who, "forest", start + i, null))
    .filter((species) => species === "twiggle" || species === "needlenub").length;
  const usual = leaves(pet);
  const missing = leaves(copy({ missing_lines: ["leaf"] }));
  assert.ok(missing > usual * 1.4, `${usual} → ${missing}`);
  // the slime's old forms are wild pets only: no line to look for
  assert.ok(leaves(copy({ missing_lines: ["blob"] })) === usual);
});
