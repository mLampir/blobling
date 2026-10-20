// Scuffles with opponents, guardians, and what the next pet keeps.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as battle from "../src/battle";
import * as care from "../src/care";
import * as home from "../src/home";
import * as life from "../src/life";
import * as model from "../src/model";
import { Random } from "../src/random";
import { STATS, fromDict, toDict, type PetState, type Trip } from "../src/state";
import * as trip from "../src/trip";
import { ALL_TRICKS, BEDTIME, HOUR, act, at, grown, refused, withRules } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 10:00");
  pet = grown(start);
  pet.weight = care.ideal(pet);
});

function runUntil(when: number, weather: number | null = null): void {
  model.advance(pet, when, BEDTIME, weather);
}

function fights(foe = "bumblebop", count = 300): battle.Fight[] {
  return Array.from({ length: count }, (_, seed) => battle.fight(pet, foe, new Random(seed)));
}

function wins(foe = "bumblebop"): number {
  return fights(foe).filter((fight) => fight.outcome === "win").length;
}

function results(): string[] {
  return fights().flatMap((fight) => fight.rounds.map(([, , result]) => result));
}

function allSkills(value: number): Record<string, number> {
  return Object.fromEntries(battle.SKILLS.map((skill) => [skill, value]));
}

/** A scuffle that always goes the same way. */
function fixedFight(round: battle.Round, rounds: number, outcome: battle.Fight["outcome"]): () => battle.Fight {
  return () => ({ rounds: Array.from({ length: rounds }, () => [...round] as battle.Round), outcome });
}

test("training and tricks decide a scuffle", () => {
  pet.bond = 0;
  const all = fights();
  const outcomes = all.map((fight) => fight.outcome);
  assert.ok(!outcomes.includes("win")); // without a single trick nothing ever works
  assert.ok(outcomes.includes("draw"));
  for (const fight of all) {
    assert.ok(fight.rounds.length <= battle.ROUNDS);
    for (const [move, trick, result] of fight.rounds) {
      assert.ok(move in battle.MOVES);
      assert.ok(Object.values(battle.MOVES).includes(trick));
      assert.ok(["dodge", "ouch"].includes(result));
    }
  }
  assert.deepEqual(battle.fight(pet, "diggle", new Random(7)), battle.fight(pet, "diggle", new Random(7)));
  pet.tricks = { ...ALL_TRICKS };
  const untrained = wins();
  pet.skills = allSkills(80.0);
  const trained = wins();
  assert.ok(trained > untrained);
  assert.ok(trained > 270);
});

test("the right trick answers the move", () => {
  pet.tricks = { ...ALL_TRICKS };
  for (const fight of fights()) {
    for (const [move, trick, result] of fight.rounds) {
      assert.equal(battle.damageOf(result) > 0, trick === battle.MOVES[move]);
    }
  }
});

test("bond holds out once and dancers have a special move", () => {
  pet.bond = 100;
  const holds = fights().map((fight) => fight.rounds.filter(([, , result]) => result === "hold").length);
  assert.equal(Math.max(...holds), 1);
  pet.bond = 0;
  assert.ok(!results().includes("hold"));
  pet.tricks = { ...ALL_TRICKS };
  pet.skills.smarts = 100.0;
  assert.ok(!results().includes("special")); // a child
  pet.stage = "adult";
  pet.species = "sneezle";
  pet.weight = care.ideal(pet);
  assert.ok(results().includes("special"));
});

test("weight trades speed for force", () => {
  pet.skills = allSkills(60.0);
  assert.deepEqual(battle.battleStats(pet), [60, 60, 60]);
  pet.weight = care.ideal(pet) * 1.4;
  const [strength, speed, smarts] = battle.battleStats(pet);
  assert.ok(strength > 60 && 60 > speed);
  assert.equal(smarts, 60);
});

test("who lives where", () => {
  const rng = new Random(1);
  const met = (area: string, weather: number | null = null, dusk = false) =>
    new Set(Array.from({ length: 50 }, () => battle.encounter(area, rng, weather, dusk)));
  assert.deepEqual(met("meadow"), new Set(["bumblebop", "diggle"]));
  assert.deepEqual(met("forest"), new Set(["prickleroll"]));
  assert.deepEqual(met("forest", 63), new Set(["prickleroll", "drizzleshell"])); // rain
  assert.deepEqual(met("stream"), new Set(["ribbop", "sidleclaw"]));
  assert.deepEqual(met("cave"), new Set(["echoflit", "glintbug"]));
  assert.deepEqual(met("mountain"), new Set(["tumblesnow", "craghorn"]));
  // some only come out in some weather, or at dusk
  assert.deepEqual(met("meadow", 73), new Set(["bumblebop", "diggle", "carrotnose"])); // snow
  assert.deepEqual(met("meadow", 63), new Set(["bumblebop", "diggle"]));
  assert.deepEqual(met("stream", 63), new Set(["ribbop", "sidleclaw", "puddlin"]));
  assert.deepEqual(met("mountain", null, true), new Set(["tumblesnow", "craghorn", "duskwisp"]));
  assert.deepEqual(met("meadow", null, true), new Set(["bumblebop", "diggle"]));
  // every area has a guardian, who lives there and is tougher than the others
  assert.deepEqual(Object.keys(battle.GUARDIANS), trip.AREAS);
  for (const [area, guardian] of Object.entries(battle.GUARDIANS)) {
    const [where, , hearts] = battle.FOES[guardian];
    assert.equal(where, area);
    const others = Object.entries(battle.FOES).filter(([name, foe]) => foe[0] === area && !battle.isGuardian(name));
    assert.ok(hearts > Math.max(...others.map(([, foe]) => foe[2])));
  }
});

test("a guardian takes more rounds and more training", () => {
  pet.tricks = { ...ALL_TRICKS };
  const untrained = wins("frostfluff");
  assert.equal(Math.max(...fights("frostfluff").map((fight) => fight.rounds.length)), battle.GUARDIAN_ROUNDS);
  assert.ok(untrained < 15);
  assert.ok(wins("crowcomb") > untrained);
  pet.skills = allSkills(90.0);
  assert.ok(wins("frostfluff") > 200);
});

test("the guardian waits at the end and opens the next area", () => {
  const won = fixedFight(["pounce", "bow", "strong"], 2, "win");
  const draw = fixedFight(["pounce", "spin", "dodge"], battle.GUARDIAN_ROUNDS, "draw");
  pet.stats.mood = 50;
  withRules(trip.rules, { encounterChance: 0.0, fight: draw }, () => {
    assert.deepEqual(act(pet, "trip", start, { item: "meadow", value: ["ball"] }), [true, null]);
    const stations = [...pet.trip!.stations];
    assert.equal(pet.trip!.guardian, "crowcomb");
    runUntil(stations.at(-2)! + 60);
    assert.notEqual(pet.trip!.last!.kind, "battle"); // nobody on the way there
    runUntil(stations.at(-1)! + 60);
    const last = pet.trip!.last!;
    assert.deepEqual([last.kind, last.foe, last.outcome], ["battle", "crowcomb", "draw"]);
    assert.deepEqual(pet.trip!.pack, ["ball"]); // a guardian doesn't run after a ball
    assert.deepEqual(pet.guardians, []);
    runUntil(start + 3 * HOUR);
  });
  withRules(trip.rules, { encounterChance: 0.0, fight: won }, () => {
    assert.equal(trip.unlocked(pet, "forest"), false);
    const now = start + 26 * HOUR;
    runUntil(now);
    pet.stats = Object.fromEntries(STATS.map((k) => [k, 90.0])) as PetState["stats"];
    pet.asleep = false;
    pet.backpack = [];
    act(pet, "trip", now, { item: "meadow" });
    runUntil(pet.trip!.stations.at(-1)! + 60);
    assert.deepEqual(pet.guardians, ["meadow"]);
    assert.deepEqual(pet.events.slice(-4, -1).map((e) => [e.action, e.item]),
      [["battle", "crowcomb:win"], ["guardian", "crowcomb"], ["unlock", "forest"]]);
    assert.equal(trip.unlocked(pet, "forest"), true);
    runUntil(now + 3 * HOUR);
    // from now on it lets the pet pass
    assert.equal(trip.plan(pet, "meadow", now + 30 * HOUR).guardian, null);
    assert.equal(trip.plan(pet, "forest", now + 30 * HOUR).guardian, "mosswart");
  });
});

test("a guardian leaves its rare egg behind", () => {
  const won = fixedFight(["pounce", "bow", "strong"], 4, "win");
  const [[area, egg]] = Object.entries(trip.GUARDIAN_EGGS);
  pet.guardians = trip.AREAS.filter((a) => a !== area);
  withRules(trip.rules, { encounterChance: 0.0, fight: won }, () => {
    act(pet, "trip", start, { item: area });
    runUntil(pet.trip!.stations.at(-1)! + 60);
    assert.deepEqual([pet.trip!.last!.item, pet.trip!.found.at(-1)], [egg, egg]);
    assert.deepEqual([pet.events.at(-1)!.action, pet.events.at(-1)!.item], ["find", egg]);
    runUntil(start + 3 * HOUR);
  });
  assert.ok(pet.backpack.includes(egg));
  assert.deepEqual(act(pet, "unpack", start + 3 * HOUR), [true, null]);
  assert.deepEqual([pet.eggs, pet.items[egg]], [[{ line: home.EGGS[egg] }], undefined]);
  assert.equal(home.canAdd(pet, egg), true); // eggs are kept, the next pet can earn another one
  pet.eggs = Array.from({ length: home.MAX_EGGS }, () => pet.eggs[0]);
  assert.equal(home.canAdd(pet, egg), false);
  assert.ok(home.EGGS[egg] in life.LINES);
  assert.equal(home.eggOf(home.EGGS[egg]), egg);
});

test("a guardian it got past before it had an egg leaves the egg at the end of the path", () => {
  pet.guardians = [...trip.AREAS]; // got past them all, from a save before the stream had an egg
  pet.guardian_eggs = ["cave"];
  withRules(trip.rules, { encounterChance: 0.0, fight: battle.fight }, () => {
    assert.deepEqual(act(pet, "trip", start, { item: "stream" }), [true, null]);
    assert.equal(pet.trip!.guardian, null);
    runUntil(pet.trip!.stations.at(-1)! + 60);
    assert.equal(pet.trip!.found.at(-1), "egg_duck");
    runUntil(start + 3 * HOUR);
    assert.deepEqual(pet.guardian_eggs, ["cave", "stream"]);
    assert.deepEqual(act(pet, "unpack", start + 3 * HOUR), [true, null]);
    assert.deepEqual(act(pet, "trip", start + 30 * HOUR, { item: "stream" }), [true, null]); // only once
    runUntil(start + 33 * HOUR);
    assert.equal(pet.trip, null);
    assert.ok(!pet.backpack.includes("egg_duck"));
  });
  // a save from before: only the cave's guardian had an egg to give
  const { guardian_eggs: _, ...old } = toDict(pet);
  assert.deepEqual(fromDict({ ...old, guardians: ["meadow", "cave"] }).guardian_eggs, ["cave"]);
});

test("the next pet keeps what is at home", () => {
  const old = pet;
  old.items = { daisy: 1, flag: 1, seed_berry: 2 };
  old.hat = "daisy";
  old.deco = ["flag"];
  old.eggs = [{ line: "ember" }];
  old.plant = { kind: "berry", grown: 5.0, ripening: 0.0, left: 3 };
  old.backpack = ["cap", "seed_berry"];
  old.skills.strength = 40.0;
  old.guardians = ["meadow"];
  const next = model.nextPet(old, start + 60, "Egg");
  assert.deepEqual([next.stage, next.species, next.name], ["egg", "blob", "Egg"]);
  assert.deepEqual([next.items, next.eggs], [{ daisy: 1, flag: 1, seed_berry: 3, cap: 1 }, old.eggs]);
  assert.deepEqual([next.deco, next.plant, next.hat], [["flag"], old.plant, ""]);
  assert.deepEqual([next.skills.strength, next.guardians, next.backpack], [0.0, [], []]);
  // brooding a rare egg uses it up; a rare egg that never hatched goes back to the finds
  const ember = model.nextPet(next, start + 120, "", 0);
  assert.deepEqual([ember.species, ember.eggs], ["ember", []]);
  assert.deepEqual(model.nextPet(ember, start + 180).eggs, [{ line: "ember", skills: ember.skills }]);
  ember.stage = "baby";
  for (const missing of [0, -1, 0.5, true, "egg_ember", "0"]) {
    refused(() => model.nextPet(ember, start + 180, "", missing), "no_egg");
  }
  // what it has found on a trip it never came back from isn't lost either
  // and what it took along to eat goes back into the bag (the ball is its own)
  old.trip = { found: ["windmill"], pack: ["fruit_berry", "ball"] } as Trip;
  const after = model.nextPet(old, start + 60).items;
  assert.deepEqual([after.windmill, after.fruit_berry, after.ball], [1, 1, undefined]);
});

test("an egg passes on what it was given", () => {
  const old = pet;
  old.eggs = [{ line: "ember" }, { line: "blob", from: "Mum", skills: { strength: 20.0, smarts: 5.0 } }];
  old.nest = { line: "blob", from: "Blobby", skills: { speed: 3.0 } };
  const next = model.nextPet(old, start, "", 1);
  assert.deepEqual([next.species, next.skills], ["blob", { strength: 20.0, speed: 0.0, smarts: 5.0 }]);
  assert.deepEqual(next.eggs, [{ line: "ember" }, old.nest]); // the egg in the nest isn't lost either
  assert.deepEqual([next.nest, next.friends], [null, []]);
  // replaced before it has hatched: the egg goes back with what it was given
  assert.deepEqual(model.nextPet(next, start + 60).eggs.at(-1),
    { line: "blob", skills: { strength: 20.0, speed: 0.0, smarts: 5.0 } });
});

test("called home it never gets to the guardian", () => {
  withRules(trip.rules, { encounterChance: 0.0 }, () => {
    act(pet, "trip", start, { item: "meadow" });
    const first = pet.trip!.stations[0];
    runUntil(first + 60);
    act(pet, "trip", first + 60, { item: "recall" });
    runUntil(first + 2 * HOUR);
  });
  assert.ok(!("battles" in pet.counters));
});

test("hearts follow the condition of the day", () => {
  Object.assign(pet.stats, { satiety: 100, energy: 100, health: 100 });
  assert.equal(trip.startHearts(pet), 3);
  Object.assign(pet.stats, { satiety: 60, energy: 60, health: 60 });
  assert.equal(trip.startHearts(pet), 2);
  Object.assign(pet.stats, { satiety: 50, energy: 50, health: 30 });
  assert.equal(trip.startHearts(pet), 1);
});

test("lost scuffles cost hearts until it goes home", () => {
  const lost = fixedFight(["pounce", "spin", "ouch"], 3, "lose");
  Object.assign(pet.stats, { satiety: 60, energy: 60, health: 60, mood: 50 });
  withRules(trip.rules, { encounterChance: 1.0, fight: lost }, () => {
    act(pet, "trip", start, { item: "meadow" });
    const stations = [...pet.trip!.stations];
    assert.deepEqual([pet.trip!.hearts, pet.trip!.pack], [2, []]);
    runUntil(stations[0] + 60);
    assert.equal(pet.trip!.hearts, 1);
    assert.deepEqual([pet.trip!.last!.kind, pet.trip!.last!.outcome], ["battle", "lose"]);
    assert.match(pet.events.at(-1)!.item!, /^(bumblebop|diggle):lose$/);
    assert.equal(trip.returning(pet.trip!), false);
    runUntil(stations[1] + 60);
    assert.equal(trip.returning(pet.trip!), true); // beaten: it turns back
    assert.equal(pet.events.at(-1)!.item, "beaten");
    assert.ok(pet.trip!.end <= stations[1] + 60 + trip.WAY_HOME);
    runUntil(stations[1] + 2 * HOUR);
  });
  assert.equal(pet.trip, null);
  assert.deepEqual([pet.counters.battles, pet.counters.battles_won ?? 0], [2, 0]);
  assert.equal(pet.counters.trips, 1);
});

test("what it eats from the backpack heals a heart, and the ball doesn't get it out of a scuffle", () => {
  const lost = fixedFight(["charge", "bow", "ouch"], 3, "lose");
  Object.assign(pet.stats, { satiety: 60, energy: 60, health: 60 });
  pet.items = { fruit_berry: 2 };
  withRules(trip.rules, { encounterChance: 1.0, fight: lost }, () => {
    assert.deepEqual(act(pet, "trip", start, { item: "meadow", value: ["fruit_berry", "ball"] }), [true, null]);
    assert.equal(pet.items.fruit_berry, 1); // taken from the bag
    const stations = [...pet.trip!.stations];
    runUntil(stations[0] + 60);
    assert.equal(pet.trip!.last!.kind, "battle");
    assert.deepEqual([pet.trip!.hearts, pet.trip!.pack], [2, ["ball"]]); // lost a heart, ate the berry
    assert.equal(pet.events.at(-1)!.item, "snack");
    assert.equal(pet.trip!.log!.at(-1)!.item, "fruit_berry");
    runUntil(stations[1] + 60);
    assert.equal(pet.trip!.hearts, 1);
  });
  for (const bad of [["rocket"], ["ball", "ball", "ball"], "ball"]) {
    refused(() => act(grown(start), "trip", start, { item: "meadow", value: bad }), "invalid_value");
  }
  // an app from before packing from the bag still sends its snack: it is left out
  assert.deepEqual(act(grown(start), "trip", start, { item: "meadow", value: ["snack", "ball"] }), [true, null]);
  // only what is in the bag, and two things at most
  const other = grown(start);
  other.items = { fruit_berry: 1 };
  assert.deepEqual(act(other, "trip", start, { item: "meadow", value: ["fruit_berry", "fruit_berry"] }),
    [false, "not_in_bag"]);
  assert.deepEqual(act(other, "trip", start, { item: "meadow", value: ["ball", "ball"] }), [false, "not_in_bag"]);
});

test("what it took along and didn't need goes back into the bag", () => {
  pet.items = { hazelnut: 1 };
  pet.guardians = ["meadow"]; // nobody in the way, so it needs nothing to eat
  withRules(trip.rules, { encounterChance: 0 }, () => {
    act(pet, "trip", start, { item: "meadow", value: ["hazelnut", "ball"] });
    assert.equal(pet.items.hazelnut, undefined);
    runUntil(start + 3 * HOUR);
  });
  assert.equal(pet.trip, null);
  assert.deepEqual([pet.items.hazelnut, pet.items.ball], [1, undefined]);
});

test("an opponent it chased off leaves a find", () => {
  const won = (): battle.Fight => ({ rounds: [["pounce", "bow", "strong"], ["pounce", "bow", "hit"]], outcome: "win" });
  pet.stats.mood = 50;
  withRules(trip.rules, { encounterChance: 1.0, fight: won }, () => {
    act(pet, "trip", start, { item: "meadow" });
    runUntil(pet.trip!.stations[0] + 60);
  });
  assert.equal(pet.trip!.found.length, 1);
  assert.equal(pet.trip!.last!.item, pet.trip!.found[0]);
  assert.deepEqual(pet.events.slice(-2).map((e) => e.action), ["battle", "find"]);
  assert.deepEqual([pet.counters.battles, pet.counters.battles_won], [1, 1]);
});

test("scuffles are kept to be watched again", () => {
  const won = (): battle.Fight => ({ rounds: [["pounce", "bow", "strong"], ["pounce", "bow", "hit"]], outcome: "win" });
  pet.hat = "cap";
  withRules(trip.rules, { encounterChance: 1.0, fight: won }, () => {
    act(pet, "trip", start, { item: "meadow", value: ["ball"] });
    runUntil(pet.trip!.stations[0] + 60, 61);
  });
  // the ball doesn't get it out of a scuffle
  assert.equal(pet.replays.length, 1);
  const [replay] = pet.replays;
  const event = pet.events.find((e) => e.action === "battle" && e.item!.endsWith(":win"))!;
  assert.equal(replay.at, event.at); // the history finds it by the time
  assert.deepEqual(replay.rounds, won().rounds);
  assert.equal(replay.item, pet.trip!.found[0]);
  assert.deepEqual([replay.trip, replay.area, replay.species, replay.stage, replay.hat, replay.weather],
    [start, "meadow", pet.species, pet.stage, "cap", 61]);

  pet.replays = Array.from({ length: trip.REPLAYS }, () => ({ ...replay, at: 0 }));
  withRules(trip.rules, { encounterChance: 1.0, fight: won }, () => runUntil(pet.trip!.stations[2] + 60));
  assert.equal(pet.replays.length, trip.REPLAYS);
  assert.ok(pet.replays.at(-1)!.at > 0); // the oldest makes room
});

test("trips with opponents are the same after catching up", () => {
  const other = grown(start);
  withRules(trip.rules, { encounterChance: 1.0 }, () => {
    for (const p of [pet, other]) {
      p.tricks = { bow: 3.0 };
      p.weight = 35.0;
      p.items = { fruit_cherry: 1 };
      act(p, "trip", start, { item: "meadow", value: ["fruit_cherry", "ball"] });
    }
    runUntil(start + 3 * HOUR);
    let t = start;
    while (t < start + 3 * HOUR) {
      t += 600;
      model.advance(other, t, BEDTIME);
    }
  });
  assert.deepEqual(toDict(pet), toDict(other));
  assert.ok(pet.counters.battles >= 1);
});

test("the travel diary tells the scuffles", () => {
  const lost = fixedFight(["charge", "bow", "ouch"], 3, "lose");
  Object.assign(pet.stats, { satiety: 60, energy: 60, health: 60 });
  withRules(trip.rules, { encounterChance: 1.0, fight: lost }, () => {
    pet.items = { fruit_berry: 1 };
    act(pet, "trip", start, { item: "meadow", value: ["fruit_berry"] });
    runUntil(start + 3 * HOUR);
  });
  const stops = pet.travels.at(-1)!.stops;
  // lost and ate the berry, lost twice more and had enough
  assert.deepEqual(stops.map((stop) => stop.kind), ["battle", "snack", "battle", "battle", "beaten"]);
  assert.deepEqual(stops.filter((stop) => stop.kind === "battle").map((stop) => stop.outcome), ["lose", "lose", "lose"]);
  assert.ok(stops.every((stop) => stop.kind === "snack" || stop.kind === "beaten" || stop.foe));
});
