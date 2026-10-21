// The pet as the app and the scene see it, saving, and loading.

import assert from "node:assert/strict";
import { test } from "node:test";

import { I18n } from "../src/i18n";
import * as life from "../src/life";
import { PLACES, Pet, VERSION, readSave } from "../src/pet";
import { toDict } from "../src/state";
import * as wild from "../src/wild";
import { Disk, at, grown, readLocales, refused } from "./helpers";

test("trip in snapshot and view", () => {
  const now = at("2026-10-12 10:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  pet.state.items = { seed_berry: 2, daisy: 1, fruit_berry: 1 };
  pet.setWeatherSource(() => ({ temp: 20.0, code: 95 }));
  assert.equal(pet.action("trip", { item: "meadow", now }).reason, "thunder");
  pet.setWeatherSource(() => null);
  assert.deepEqual(pet.snapshot(now).packable, [{ id: "ball", count: 1, label: "Ball" }, { id: "fruit_berry", count: 1, label: "Berry" }]);
  const state = pet.action("trip", { item: "meadow", now, value: ["fruit_berry"] }).state;
  assert.deepEqual([state.trip!.label, state.trip!.where], ["Meadow", "out in the meadow"]);
  assert.deepEqual([state.trip!.hearts, state.trip!.pack], [3, ["fruit_berry"]]);
  assert.deepEqual([state.packable.map((p) => p.id), state.max_pack], [["ball"], 2]); // the berry is in the backpack
  assert.deepEqual(state.skills[0], { id: "strength", label: "Strength", value: 0.0 });
  assert.equal(state.training, null);
  const view = pet.view(now + 1).trip!;
  assert.deepEqual([view.foe, view.rounds, view.outcome], [null, null, null]);
  assert.deepEqual(state.areas.map((a) => [a.id, a.unlocked]),
    [["meadow", true], ["forest", false], ["stream", false], ["cave", false], ["mountain", false]]);
  assert.deepEqual(state.areas[1],
    { id: "forest", label: "Mushroom forest", unlocked: false, blocked_by: "Meadow", guardian: true, keeper: "mosswart",
      finds: ["glowshroom", "lantern", "cap", "woodpile", "snailshell"].map((id) => ({ id, found: false })), wild_left: true });
  assert.equal(state.areas[0].wild_left, null); // only wild pets of no line live on the meadow
  assert.deepEqual(state.guardians, { passed: 0, all: 5 });
  assert.deepEqual(state.items[0], { id: "seed_berry", label: "Berry seed", kind: "seed", count: 2, active: false, place: null, effects: ["satiety"] });
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
  assert.deepEqual(pet.action("train", { item: "speed", now: now + 125 }).state.training, { kind: "speed" });
  assert.equal(pet.action("train", { item: "tap", now: now + 3600 }).reason, "no_training");
});

test("a new egg gets a house of its own, or takes a pet's place, which then moves to the ancestors", () => {
  const now = at("2026-10-12 12:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "grumpcap", name: "Grumpy", house: 2, deco: ["flag"] });
  pet.state.items = { flag: 1 };
  pet.state.tricks = { bow: 3.0, flip: 2.0 };
  assert.deepEqual(pet.view(now).tricks, ["bow"]);
  assert.deepEqual(pet.snapshot(now).tricks.map((t) => t.progress), [100, 0, 0, 20]);
  const grumpy = pet.current;
  const egg = pet.newEgg(null, now + 60);
  assert.deepEqual([egg.stage, egg.house, egg.items.map((i) => i.id), egg.pets.length, egg.places], ["egg", null, ["flag"], 2, PLACES]);
  const loaded = disk.pet();
  assert.deepEqual([loaded.state.stage, loaded.current], ["egg", egg.id]); // the camera went to the egg
  assert.deepEqual(loaded.pets.map((p) => [p.name, p.house, p.deco]), [["Grumpy", 2, ["flag"]], ["Blobby", 0, []]]);
  assert.deepEqual(loaded.find(grumpy).tricks, { bow: 3.0, flip: 2.0 });
  assert.equal(loaded.ancestors.length, 0);
  // in Grumpy's place: the egg moves into the house, Grumpy goes to the ancestors
  const next = loaded.newEgg(null, now + 120, grumpy);
  assert.deepEqual([next.house?.step, loaded.pets.length, loaded.pets[0].id], [2, 2, next.id]);
  assert.deepEqual(loaded.ancestorList().map((a) => [a.name, a.species_label, a.tricks]), [["Grumpy", "Grumpcap", ["bow"]]]);
  // an egg in a place goes nowhere
  loaded.newEgg(null, now + 180, next.id);
  assert.equal(loaded.ancestors.length, 1);
  loaded.newEgg(null, now + 240);
  loaded.newEgg(null, now + 300);
  assert.equal(loaded.pets.length, PLACES);
  refused(() => loaded.newEgg(null, now + 360), "no_place");
  refused(() => loaded.newEgg(null, now + 360, "nobody"), "no_pet");
});

test("an ancestor comes home again, to a house of its own or in another pet's place", () => {
  const now = at("2026-10-12 12:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "grumpcap", name: "Grumpy", hat: "bobble" });
  pet.state.items = { daisy: 1, bobble: 1 };
  pet.state.tricks = { bow: 3.0 };
  pet.state.stats.satiety = 10;
  const grumpy = pet.current;
  const kid = pet.newEgg(null, now).id;
  Object.assign(pet.state, { stage: "child", name: "Kid" });
  pet.newEgg(null, now + 60, grumpy); // Grumpy goes to rest among the ancestors
  const [rests] = pet.ancestorList();
  assert.deepEqual([rests.name, rests.home, "pet" in rests], ["Grumpy", true, false]);
  refused(() => pet.bringBack(12345, null, now + 120), "no_ancestor");
  refused(() => pet.bringBack(rests.born_at, "nobody", now + 120), "no_pet");

  pet.save();
  const later = now + 5 * 86400;
  const result = disk.pet().bringBack(rests.born_at, null, later); // it was saved; it gets a new house
  assert.equal(result.accepted, true);
  const loaded = disk.pet();
  assert.deepEqual([loaded.state.name, loaded.pets.map((p) => p.name), loaded.ancestors.length], ["Grumpy", ["Blobby", "Kid", "Grumpy"], 0]);
  assert.deepEqual([loaded.state.tricks, loaded.state.items, loaded.state.hat], [{ bow: 3.0 }, { daisy: 1, bobble: 1 }, ""]);
  assert.equal(Math.round(loaded.state.stats.satiety), 10); // as it went to rest
  assert.deepEqual(loaded.events(1)[0], { at: later, action: "bring_back", by: "app", accepted: true });

  // with the street full, Grumpy rests once more and then comes back into Kid's place and house
  loaded.find(kid).house = 1;
  loaded.newEgg(null, later + 30); // a fourth one, so the street is full
  refused(() => loaded.newEgg(null, later + 40), "no_place");
  const grumpyAgain = loaded.pets.find((p) => p.name === "Grumpy")!.id;
  loaded.newEgg(null, later + 50, grumpyAgain); // Grumpy rests once more
  const back = loaded.bringBack(loaded.ancestors.at(-1)!.born_at, kid, later + 60);
  assert.deepEqual([back.state.name, back.state.house?.step, loaded.ancestors.map((a) => a.name)], ["Grumpy", 1, ["Kid"]]);
  assert.equal(loaded.events(1)[0].item, "Kid");

  // Kid rested frozen: a month later it is still the child it was, with its values
  const resting = loaded.ancestors[0];
  resting.pet!.stats.mood = 77;
  const due = life.dueAt(resting.pet!)! - resting.until;
  const month = later + 30 * 86400;
  assert.equal(loaded.bringBack(resting.born_at, loaded.current, month).accepted, true);
  assert.deepEqual([loaded.state.name, loaded.state.stage, loaded.state.stats.mood], ["Kid", "child", 77]);
  assert.equal(life.dueAt(loaded.state)! - month, due);
  assert.equal(loaded.snapshot(month).age_days, resting.age_days); // and no older
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
  assert.deepEqual([state.friends, state.friend, state.nest, state.actions.collect], [[], null, null, false]);
  state = pet.newEgg(null, now + 60); // starting over with a usual egg leaves them where they are
  assert.deepEqual([state.species, state.eggs.length, state.items.map((i) => i.id)], ["blob", 2, ["daisy"]]);
  pet.state.stage = "child";
  state = pet.newEgg(1, now + 120);
  assert.deepEqual([state.stage, state.species, state.eggs.map((e) => e.line)], ["egg", "ember", ["blob"]]);
  assert.equal(disk.pet().state.species, "ember");
  assert.deepEqual([pet.pets.length, pet.ancestors.length], [3, 0]); // each one in a house of its own
  pet.state.stage = "baby";
  refused(() => pet.newEgg(1, now + 180), "no_egg");
  assert.deepEqual([pet.state.species, pet.pets.length], ["ember", 3]); // nothing happened
});

test("friend and nest in snapshot and view", () => {
  const now = at("2026-10-12 12:00");
  const pet = new Disk().pet();
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "cyclopuff" });
  pet.state.friends = [{ species: "sneezle", visits: 1, next: now + 9999, until: now + 200 }];
  pet.state.nest = { line: "ember", skills: {} };
  const state = pet.snapshot(now);
  const view = pet.view(now);
  const friend = { species: "sneezle", label: "Sneezle", visits: 1, needed: wild.VISITS_FOR_NEST, visiting: true, resting: false };
  assert.deepEqual([state.friends, state.friend], [[friend], friend]);
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
  assert.equal(slots.length, life.FORMS.length);
  assert.deepEqual(slots[0], { stage: "egg", species: "blob", label: "Egg" });
  assert.ok(slots.slice(1).every((form) => form === null)); // a form not met yet gives nothing away
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "gemperor" });
  pet.state.eggs = [{ line: "ember" }];
  pet.newEgg(0, now + 60);
  const forms = ["egg:blob", "baby:blob", "child:blob", "adult:gemperor", "egg:ember"];
  assert.deepEqual(met(disk.pet()), forms);
  const again = disk.pet();
  again.newEgg(null, now + 120); // the ember egg goes back to the eggs, the album stays
  assert.equal(again.albumList().find((form) => form?.species === "gemperor")!.label, "Gemperor");
  assert.equal(again.albumList().length, slots.length);
  assert.deepEqual(met(disk.pet()), forms);
});

test("a save from before the album fills it in from the ancestors", () => {
  const now = at("2026-10-12 12:00");
  const ancestor = { name: "Old", species: "purrloop", stage: "adult", born_at: now, until: now, age_days: 0,
    counters: {}, tricks: [], hat: "" };
  const file = { version: VERSION, pet: toDict(grown(now)), ancestors: [ancestor] };
  const pet = new Pet({ t: new I18n(readLocales()).t, saved: readSave(file) });
  const forms = ["adult:purrloop", "egg:blob", "baby:blob", "child:blob"];
  assert.deepEqual([...pet.toSave().album!].sort(), [...forms].sort());
  assert.deepEqual(readSave({ ...file, album: ["adult:purrloop", "adult:nobody"] }).album, ["adult:purrloop"]);
});

test("every child shows the name of its line", () => {
  const now = at("2026-10-12 12:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  for (const [line, name] of [["blob", "Bloblet"], ["ember", "Cindlet"], ["stone", "Pebblet"], ["fox", "Kitlet"], ["cloud", "Nimbit"]]) {
    pet.state.species = line;
    assert.equal(pet.snapshot(now).stage_label, name);
    assert.equal(pet.albumList().find((form) => form?.stage === "child" && form.species === line)!.label, name);
  }
  // and a line added later cannot forget it
  const texts = readLocales().en as Record<string, Record<string, string>>;
  assert.deepEqual(Object.keys(texts.children).sort(), Object.keys(life.LINES).sort());
});

test("the album has a page per line, with forms seen on trips and forms mastered", () => {
  const now = at("2026-10-12 12:00");
  const disk = new Disk();
  const pet = disk.pet();
  pet.state = grown(now);
  Object.assign(pet.state, { stage: "adult", species: "gemperor" });
  pet.state.travels = [{ area: "forest", start: now - 7200, end: now - 3600, stops: [
    { kind: "wild", wild: "roamtail", outcome: "shrug", at: now - 5000 },
    { kind: "wild", wild: "sneezle", outcome: "shrug", at: now - 4000 }, // a wild pet only: no slot for it
  ] }];
  pet.save();
  const lines = disk.pet().albumLines();
  assert.equal(lines.length, Object.keys(life.LINES).length);
  const [blob, , , fox, cloud] = lines;
  assert.deepEqual(blob.forms.filter(Boolean).map((form) => form!.species), ["blob", "blob", "blob", "gemperor"]);
  assert.equal(blob.forms.find((form) => form?.species === "gemperor")!.mastered, false);
  // a form seen is an outline with where it was seen, and no name
  assert.deepEqual(fox.forms.filter(Boolean), [{ stage: "adult", species: "roamtail", seen: { area: "forest", night: false } }]);
  assert.ok(cloud.forms.every((form) => form === null)); // a line nothing is known of: an empty page

  // mastered: every trick, and the special move shown in a scuffle
  pet.state.tricks = { bow: 3, spin: 5, dance: 7, flip: 10 };
  pet.save();
  assert.equal(disk.pet().albumLines()[0].forms.find((form) => form?.species === "gemperor")!.mastered, false);
  pet.state.counters.specials = 1;
  pet.save();
  assert.equal(disk.pet().albumLines()[0].forms.find((form) => form?.species === "gemperor")!.mastered, true);
  assert.deepEqual(readSave({ ...pet.toSave(), seen: { "adult:nobody": { area: "x", night: true } } }).seen, {});
});

test("after a month, the lines whose egg never came are long missing", () => {
  const now = at("2026-10-12 12:00");
  const pet = new Disk().pet();
  pet.state = grown(now);
  pet.state.born_at = now;
  assert.deepEqual(pet.longMissing(now + 29 * 86400), []);
  const missing = pet.longMissing(now + 31 * 86400);
  assert.ok(!missing.includes("blob") && missing.includes("leaf") && missing.length === Object.keys(life.LINES).length - 1);
});

test("an area shows whether a wild pet of a line the home never had still lives there", () => {
  const pet = new Disk().pet();
  assert.equal(pet.wildLeft("meadow"), null); // only wild pets of no line
  assert.equal(pet.wildLeft("cave"), null); // nobody wild in there
  assert.equal(pet.wildLeft("mountain"), true);
  for (const [form] of wild.WILD.mountain) {
    pet.album.push(`egg:${life.lineOf(form)}`);
  }
  assert.equal(pet.wildLeft("mountain"), false);
});
