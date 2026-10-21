// The trick festival: every second Saturday, the pet shows its tricks to a jury of wild pets.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as care from "../src/care";
import * as festival from "../src/festival";
import * as home from "../src/home";
import * as model from "../src/model";
import { Random } from "../src/random";
import type { PetState } from "../src/state";
import * as wild from "../src/wild";
import { act, ALL_TRICKS, at, BEDTIME, grown, HOUR } from "./helpers";

const DAY = "2026-10-24"; // a festival Saturday
let pet: PetState;

beforeEach(() => {
  pet = grown(at(`${DAY} 08:00`) - 5 * 86400);
});

/** The pet kept well up to `when`. */
function until(when: number): void {
  for (let t = pet.updated_at + HOUR; t < when; t += HOUR) {
    model.advance(pet, t, BEDTIME);
    Object.assign(pet.stats, { satiety: 100, energy: 100, mood: 100, hygiene: 100, health: 100 });
  }
  model.advance(pet, when, BEDTIME);
}

test("every second Saturday, its poster three days before", () => {
  const day = festival.dayOf(at(`${DAY} 12:00`));
  assert.equal(new Date(festival.midnightOf(day) * 1000).getDay(), 6); // a Saturday
  assert.equal(festival.today(at(`${DAY} 00:30`)), true);
  assert.equal(festival.today(at("2026-10-17 12:00")), false);
  assert.equal(festival.today(at("2026-11-07 12:00")), true);
  assert.equal(festival.announced(pet, at("2026-10-20 12:00")), null);
  assert.equal(festival.announced(pet, at("2026-10-21 12:00")), day);
  assert.equal(festival.announced(pet, at(`${DAY} 12:00`)), day);
  pet.counters.festival_day = day; // been there: the poster comes down
  assert.equal(festival.announced(pet, at(`${DAY} 12:00`)), null);
});

test("sent off with the tricks picked: it shows them, the jury judges, and it brings its prize home", () => {
  pet.tricks = { ...ALL_TRICKS };
  const t = at(`${DAY} 10:00`);
  until(t);
  assert.deepEqual(act(pet, "festival", at("2026-10-23 10:00")), [false, "no_festival"]);
  assert.equal(model.availableActions(pet, t).festival, true);
  assert.deepEqual(act(pet, "festival", t, { value: ["flip", "dance", "spin", "bow"] }), [true, null]);
  assert.equal(pet.trip!.area, festival.AREA);
  assert.deepEqual(pet.trip!.tricks, ["flip", "dance", "spin", "bow"]);
  assert.deepEqual(act(pet, "festival", t + 60), [false, "away"]);
  until(pet.trip!.end + 60);
  assert.equal(pet.trip, null);
  const replay = pet.replays.at(-1)!;
  assert.equal(replay.kind, "festival");
  assert.equal(replay.jury!.length, festival.JURY);
  assert.deepEqual(replay.rounds.map(([trick]) => trick), ["flip", "dance", "spin", "bow"]);
  const shown = replay.rounds as festival.Shown[];
  assert.equal(replay.outcome, String(festival.placeFor(festival.score(shown))));
  // all known well: everything works, 4+3+2+1 and three more for the variety, so it wins
  assert.equal(replay.outcome, "1");
  assert.deepEqual(pet.backpack, ["egg_chameleon"]);
  assert.equal(festival.canGo(pet, pet.updated_at), "festival_done"); // once a day
  assert.ok(pet.events.some((e) => e.action === "show" && e.item === "1"));
  assert.ok(pet.travels.at(-1)!.stops.some((s) => s.kind === "festival" && s.jury?.length === festival.JURY));
  // the jury: wild pets of the areas it knows
  const meadow = (wild.WILD.meadow ?? []).map(([form]) => form);
  assert.ok(replay.jury!.every((form) => meadow.includes(form)));
});

test("not sent by six in the evening, it goes by itself and shows its best tricks", () => {
  pet.tricks = { bow: care.TRICKS.bow, spin: care.TRICKS.spin / 4 };
  until(at(`${DAY} 17:58`));
  assert.equal(pet.trip as PetState["trip"], null);
  until(at(`${DAY} 18:01`));
  assert.equal(pet.trip?.area, festival.AREA);
  assert.deepEqual(pet.trip!.tricks, ["bow", "spin", "bow", "bow"]);
  assert.ok(pet.events.some((e) => e.action === "festival" && e.by === "system"));
});

test("babies and sick pets stay home, and away on a trip it misses the festival", () => {
  pet.stage = "baby";
  assert.equal(festival.canGo(pet, at(`${DAY} 18:00`)), "too_young");
  assert.equal(festival.alone(pet, at(`${DAY} 18:00`)), false);
  pet = grown(at(`${DAY} 17:00`));
  pet.sick = true;
  assert.equal(festival.canGo(pet, at(`${DAY} 17:00`)), "sick_trip");
  pet.sick = false;
  assert.deepEqual(act(pet, "trip", at(`${DAY} 17:30`), { item: "meadow" }), [true, null]);
  assert.equal(festival.alone(pet, at(`${DAY} 18:00`)), false);
});

test("the points: what works, one more for every other trick, a form's own trick double", () => {
  assert.equal(festival.score([["bow", true, 1], ["spin", true, 2], ["flip", false, 0], ["bow", true, 1]]), 5);
  assert.deepEqual([10, 9, 6, 5, 3, 2].map(festival.placeFor), [1, 2, 2, 3, 3, 0]);
  assert.equal(festival.points(pet, "flip"), 4);
  Object.assign(pet, { stage: "adult", species: "sneezle" });
  assert.equal(festival.points(pet, "flip"), 8);
  assert.equal(festival.points(pet, "bow"), 1);
});

test("the prizes: two eggs for the first wins, then one of the jury's lines; ribbons once; food", () => {
  const rng = new Random("prize");
  const jury = ["twiggle", "sneezle", "drakwing"];
  assert.equal(festival.prize(pet, 1, jury, rng), "egg_chameleon");
  home.addItem(pet, "egg_chameleon");
  assert.equal(festival.prize(pet, 1, jury, rng), "egg_kite");
  const third = festival.prize(pet, 1, jury, rng);
  assert.ok(["egg_leaf", "egg_blob", "egg_duck"].includes(third), third);
  assert.equal(festival.prize(pet, 2, jury, rng), "ribbon_blue");
  home.addItem(pet, "ribbon_blue");
  assert.equal(festival.prize(pet, 2, jury, rng), festival.FOOD);
  assert.equal(festival.prize(pet, 3, jury, rng), "ribbon_red");
  assert.equal(festival.prize(pet, 0, jury, rng), festival.FOOD);
});
