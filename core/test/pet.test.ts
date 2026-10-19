// The pet as the app and the scene see it, saving, and loading.

import assert from "node:assert/strict";
import { test } from "node:test";

import { I18n } from "../src/i18n";
import * as life from "../src/life";
import { Pet, VERSION, readSave } from "../src/pet";
import { toDict } from "../src/state";
import * as wild from "../src/wild";
import { Disk, at, grown, readLocales, refused } from "./helpers";

test("trip in snapshot and view", () => {
  const now = at("2026-10-12 10:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  pet.state.items = { seed_berry: 2, daisy: 1 };
  pet.setWeatherSource(() => ({ temp: 20.0, code: 95 }));
  assert.equal(pet.action("trip", { item: "meadow", now }).reason, "thunder");
  pet.setWeatherSource(() => null);
  const state = pet.action("trip", { item: "meadow", now, value: ["snack"] }).state;
  assert.deepEqual([state.trip!.label, state.trip!.where], ["Meadow", "out in the meadow"]);
  assert.deepEqual([state.trip!.hearts, state.trip!.pack], [3, ["snack"]]);
  assert.deepEqual([state.packable.map((p) => p.id), state.max_pack], [["snack", "ball"], 2]);
  assert.deepEqual(state.skills[0], { id: "strength", label: "Strength", value: 0.0 });
  assert.equal(state.training, null);
  const view = pet.view(now + 1).trip!;
  assert.deepEqual([view.foe, view.rounds, view.outcome], [null, null, null]);
  assert.deepEqual(state.areas.map((a) => [a.id, a.unlocked]),
    [["meadow", true], ["forest", false], ["stream", false], ["cave", false], ["mountain", false]]);
  assert.deepEqual(state.areas[1],
    { id: "forest", label: "Mushroom forest", unlocked: false, blocked_by: "Meadow", guardian: true });
  assert.deepEqual(state.guardians, { passed: 0, all: 5 });
  assert.deepEqual(state.items[0], { id: "seed_berry", label: "Berry seed", kind: "seed", count: 2, active: false, effects: [] });
  assert.equal(view.area, "meadow");
  assert.deepEqual(disk.pet().state.trip, pet.state.trip);
});

test("save, load and duplicate requests", () => {
  const now = at("2026-10-12 12:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  pet.state.stats.satiety = 40;
  const first = pet.action("feed", { item: "meal", requestId: "abc", now });
  const second = pet.action("feed", { item: "meal", requestId: "abc", now: now + 1 });
  assert.equal(first.accepted, true);
  assert.equal(second.state.stats.satiety, 80);
  assert.equal(pet.state.events.length, 1);

  const loaded = disk.pet();
  assert.deepEqual(loaded.state.stats, pet.state.stats);
  assert.equal(loaded.snapshot(now + 60).stats.satiety, 80);
});

test("training in the snapshot", () => {
  const now = at("2026-10-12 12:00");
  const pet = new Disk().pet();
  pet.state = grown(now);
  const state = pet.action("train", { item: "smarts", now }).state;
  assert.deepEqual(state.training, { kind: "smarts", length: 3, shown_in: 3.0 });
  assert.ok(!JSON.stringify(state.training).includes("sequence")); // the sequence only shows in the scene
  const answer = pet.action("train", { item: "answer", value: pet.state.training!.sequence, now: now + 5 });
  assert.deepEqual([answer.accepted, answer.state.skills[2].value], [true, 4.0]);
  assert.deepEqual(pet.action("train", { item: "speed", now: now + 65 }).state.training, { kind: "speed" });
  assert.equal(pet.action("train", { item: "tap", now: now + 3600 }).reason, "no_training");
});

test("new egg archives the old pet", () => {
  const now = at("2026-10-12 12:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "grumpcap", name: "Grumpy" });
  pet.state.tricks = { bow: 3.0, flip: 2.0 };
  assert.deepEqual(pet.view(now).tricks, ["bow"]);
  assert.deepEqual(pet.snapshot(now).tricks.map((t) => t.progress), [100, 0, 0, 20]);
  assert.equal(pet.newEgg(null, now + 60).stage, "egg");
  const loaded = disk.pet();
  assert.equal(loaded.state.stage, "egg");
  assert.deepEqual(loaded.state.tricks, {});
  assert.deepEqual(loaded.ancestors[0].tricks, ["bow"]);
  assert.deepEqual(loaded.ancestorList().map((a) => [a.name, a.species, a.species_label]),
    [["Grumpy", "grumpcap", "Grumpcap"]]);
  loaded.newEgg(null, now + 120); // an egg doesn't go into the gallery
  assert.equal(loaded.ancestors.length, 1);
});

test("a rare egg is kept until it is brooded", () => {
  const now = at("2026-10-12 12:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  pet.state.items = { daisy: 1 };
  pet.state.eggs = [{ line: "blob", from: "Mum", skills: { strength: 20.0, speed: 0.2 } }, { line: "ember" }];
  let state = pet.snapshot(now);
  assert.equal(state.item_labels.egg_ember, "Ember egg");
  assert.deepEqual(state.eggs, [
    { id: 0, line: "blob", label: "Slime egg", from: "Mum", skills: [{ id: "strength", label: "Strength", value: 20 }] },
    { id: 1, line: "ember", label: "Ember egg", from: null, skills: [] }]);
  assert.deepEqual([state.friend, state.nest, state.actions.collect], [null, null, false]);
  state = pet.newEgg(null, now + 60); // starting over with a usual egg leaves them where they are
  assert.deepEqual([state.species, state.eggs.length, state.items.map((i) => i.id)], ["blob", 2, ["daisy"]]);
  pet.state.stage = "child";
  state = pet.newEgg(1, now + 120);
  assert.deepEqual([state.stage, state.species, state.eggs.map((e) => e.line)], ["egg", "ember", ["blob"]]);
  assert.equal(disk.pet().state.species, "ember");
  assert.equal(pet.ancestors.length, 2);
  pet.state.stage = "baby";
  refused(() => pet.newEgg(1, now + 180), "no_egg");
  assert.deepEqual([pet.state.species, pet.ancestors.length], ["ember", 2]); // nothing happened
});

test("friend and nest in snapshot and view", () => {
  const now = at("2026-10-12 12:00");
  const pet = new Disk().pet();
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "cyclopuff" });
  pet.state.friend = { species: "sneezle", visits: 1, next: now + 9999, until: now + 200 };
  pet.state.nest = { line: "ember", skills: {} };
  const state = pet.snapshot(now);
  const view = pet.view(now);
  assert.deepEqual(state.friend,
    { species: "sneezle", label: "Sneezle", visits: 1, needed: wild.VISITS_FOR_NEST, visiting: true });
  assert.deepEqual([state.nest, state.actions.collect], [{ line: "ember", label: "Ember egg" }, true]);
  assert.deepEqual([view.nest, view.visitor],
    ["ember", { species: "sneezle", left: 200, age: wild.VISIT_SECONDS - 200 }]);
  assert.equal(pet.view(now + 260).visitor, null);
  const result = pet.action("collect", { now: now + 300 });
  assert.deepEqual([result.accepted, result.state.nest, result.state.eggs[0].label], [true, null, "Ember egg"]);
});

test("a rejected action comes with its text, and a name has its limits", () => {
  const now = at("2026-10-12 12:00");
  const pet = new Disk().pet();
  pet.state = grown(now);
  pet.rename("  Blobby \n the  First ");
  assert.equal(pet.state.name, "Blobby the First");
  pet.state.stats.satiety = 95;
  assert.equal(pet.action("feed", { item: "meal", now }).message, "Blobby the First is full.");
  for (const bad of ["", "   ", "x".repeat(17), null]) {
    refused(() => pet.rename(bad), "name_length");
  }
});

test("a pet that cannot be saved right now carries on", () => {
  const now = at("2026-10-12 12:00");
  const problems: string[] = [];
  const pet = new Pet({
    t: new I18n(readLocales()).t,
    save: () => {
      throw new Error("disk full");
    },
    log: (message) => problems.push(message),
  });
  pet.state = grown(now);
  assert.equal(pet.action("pet", { now }).accepted, true);
  assert.deepEqual(problems, ["Could not save the pet"]);
});

test("a save file that cannot be read is refused", () => {
  const file = { version: VERSION, pet: toDict(grown(at("2026-10-12 12:00"))), ancestors: [] };
  assert.equal(readSave(file).state.stage, "child");
  assert.throws(() => readSave({ ...file, version: 99 }), /unknown version 99/);
  assert.throws(() => readSave({ version: VERSION }), /no pet/);
  assert.throws(() => readSave("{broken"), /not a save file/);
  assert.throws(() => readSave(null), /not a save file/);
});

test("the cold in snapshot and view", () => {
  const now = at("2026-10-12 10:00");
  const pet = new Disk().pet();
  pet.state = grown(now);
  pet.state.asleep = true;
  pet.state.items = { emberstone: 1, bobble: 1 };
  pet.setWeatherSource(() => ({ temp: -3.0, code: 0 }));
  assert.equal(pet.action("wake", { now }).state.cold, true); // woken up in the cold
  assert.equal(pet.view(now).cold, true);
  // what a find does is told, apart from what is left to find out
  assert.deepEqual(pet.snapshot(now).items.map((item) => item.effects), [["growth"], []]);
  const state = pet.action("pet", { now }).state; // rubbed warm
  assert.deepEqual([state.cold, pet.view(now).cold, state.counters.warmed], [false, false, 1]);
});

test("the album keeps every form met, across new eggs and restarts", () => {
  const now = at("2026-10-12 12:00");
  const disk = new Disk();
  const pet = disk.pet();
  const met = (p: Pet) => p.albumList().filter((form) => form !== null).map((form) => `${form.stage}:${form.species}`);
  const slots = pet.albumList();
  assert.equal(slots.length, life.FORMS.length - Object.keys(life.REFORMED).length); // no slots for forms that no longer grow
  assert.deepEqual(slots[0], { stage: "egg", species: "blob", label: "Egg" });
  assert.ok(slots.slice(1).every((form) => form === null)); // a form not met yet gives nothing away
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "grumpcap" });
  pet.state.eggs = [{ line: "ember" }];
  pet.newEgg(0, now + 60);
  const forms = ["egg:blob", "baby:blob", "child:blob", "adult:grumpcap", "egg:ember"];
  assert.deepEqual(met(disk.pet()), forms);
  const again = disk.pet();
  again.newEgg(null, now + 120); // the ember egg goes back to the eggs, the album stays
  assert.equal(again.albumList().find((form) => form?.species === "grumpcap")!.label, "Grumpcap"); // met: it keeps its slot
  assert.equal(again.albumList().length, slots.length + 1);
  assert.deepEqual(met(disk.pet()), forms);
});

test("a save from before the album fills it in from the ancestors", () => {
  const now = at("2026-10-12 12:00");
  const ancestor = { name: "Old", species: "lumoth", stage: "adult", born_at: now, until: now, age_days: 0,
    counters: {}, tricks: [], hat: "" };
  const file = { version: VERSION, pet: toDict(grown(now)), ancestors: [ancestor] };
  const pet = new Pet({ t: new I18n(readLocales()).t, saved: readSave(file) });
  const forms = ["adult:lumoth", "egg:blob", "baby:blob", "child:blob"];
  assert.deepEqual([...pet.toSave().album!].sort(), [...forms].sort());
  assert.deepEqual(readSave({ ...file, album: ["adult:lumoth", "adult:nobody"] }).album, ["adult:lumoth"]);
});

test("every child shows the name of its line", () => {
  const now = at("2026-10-12 12:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  for (const [line, name] of [["blob", "Blobling"], ["ember", "Cindlet"], ["stone", "Pebblet"], ["fox", "Kitlet"]]) {
    pet.state.species = line;
    assert.equal(pet.snapshot(now).stage_label, name);
    assert.equal(pet.albumList().find((form) => form?.stage === "child" && form.species === line)!.label, name);
  }
  // and a line added later cannot forget it
  const texts = readLocales().en as Record<string, Record<string, string>>;
  assert.deepEqual(Object.keys(texts.children).sort(), Object.keys(life.LINES).sort());
});
