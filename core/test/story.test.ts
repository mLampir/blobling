// What the pet tells when somebody comes back: a little story, and Grandma's postcard.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as home from "../src/home";
import { I18n } from "../src/i18n";
import * as model from "../src/model";
import type { PetState } from "../src/state";
import * as story from "../src/story";
import { BEDTIME, HOUR, act, at, grown, readLocales } from "./helpers";

const locales = readLocales();
let warnings: string[];
let t: I18n["t"];
let start: number;
let pet: PetState;

beforeEach(() => {
  warnings = [];
  t = new I18n(locales, "en", (message) => warnings.push(message)).t;
  start = at("2026-10-12 08:00");
  pet = grown(start);
  act(pet, "pet", start); // somebody was there
});

function pages(when = start + 8 * HOUR): story.Page[] {
  return story.tell(pet, when, t)!.pages;
}

test("a day is told in a few sentences, in the order it happened", () => {
  model.logEvent(pet, start + HOUR, "solo", "system", { item: "ball" });
  model.logEvent(pet, start + 2 * HOUR, "fruit", "system", { item: "berry" });
  model.logEvent(pet, start + 3 * HOUR, "solo", "system", { item: "ball" });
  model.logEvent(pet, start + 4 * HOUR, "visit", "system", { item: "cyclopuff" });
  assert.deepEqual(pages(), [{
    postcard: false,
    text: "I played with my ball again and again. I picked a ripe berry and ate it right away. "
      + "Cyclopuff came to visit me.",
  }]);
  assert.deepEqual(warnings, []);
});

test("what it built or drew by itself is told as such, not as a trick", () => {
  model.logEvent(pet, start + HOUR, "solo", "system", { item: "tower" });
  model.logEvent(pet, start + 2 * HOUR, "solo", "system", { item: "drawing" });
  model.logEvent(pet, start + 3 * HOUR, "solo", "system", { item: "snowman" });
  assert.deepEqual(pages().map((p) => p.text), [
    "I built a little tower out of stones. I drew a picture in the ground. "
      + "It was snowing, so I built a tiny snowman.",
  ]);
  assert.deepEqual(warnings, []);
});

test("too much for one day: what matters most is told", () => {
  for (let i = 1; i <= 4; i++) {
    model.logEvent(pet, start + i * 600, "fruit", "system", { item: Object.keys(home.PLANTS)[i - 1] });
  }
  model.logEvent(pet, start + 2 * HOUR, "nest", "system", { item: "blob" });
  const [day] = pages();
  assert.equal(day.text.split(/(?<=[.!]) /).length, story.SENTENCES);
  assert.match(day.text, /built a nest/);
});

test("the rain while it was alone opens the day, once", () => {
  const rain = 61;
  model.advance(pet, start + 30 * 60, BEDTIME, rain); // morning
  model.logEvent(pet, start + 6 * HOUR, "solo", "system", { item: "ball" });
  model.advance(pet, start + 7 * HOUR, BEDTIME, rain); // afternoon: no second sentence about it
  assert.equal(pet.weather_seen.length, 2);
  const [day] = pages();
  assert.match(day.text, /^It rained in the morning, so I sat under my umbrella/);
  assert.equal(day.text.match(/rained/g)!.length, 1);

  act(pet, "pet", start + 8 * HOUR); // somebody is back: the old weather goes with the next note
  model.advance(pet, start + 8.5 * HOUR, BEDTIME, rain);
  assert.equal(pet.weather_seen.length, 1);
});

test("each day gets its own paragraph", () => {
  model.logEvent(pet, start + HOUR, "fruit", "system", { item: "berry" });
  model.logEvent(pet, start + 26 * HOUR, "find", "system", { item: "crystal" });
  assert.deepEqual(pages(start + 30 * HOUR).map((p) => p.text), [
    "I picked a ripe berry and ate it right away.",
    "On the way I found something: Crystal.",
  ]);
});

test("after a long time with the Pi off, Grandma writes a postcard", () => {
  model.logEvent(pet, start + HOUR, "solo", "system", { item: "ball" });
  model.advance(pet, start + 3 * 86400 + HOUR, BEDTIME);
  const [before, card] = pages(start + 3 * 86400 + 2 * HOUR);
  assert.equal(before.postcard, false);
  assert.equal(card.postcard, true);
  assert.match(card.text, /^Hello!\n.* stayed with me for 3 days while the display was off\. .+\nLove, Grandma$/);
  assert.deepEqual(warnings, []);
});

test("every kind of thing it can tell has a text in English", () => {
  const told: [string, string][] = [
    ["solo", "spin"], ["gift", "blob"], ["nest", "blob"], ["wild", "blob:friend"], ["wild", "blob:shrug"],
    ["battle", "diggle:win"], ["battle", "diggle:lose"], ["battle", "diggle:draw"], ["battle", "diggle:ball"],
    ["guardian", "diggle"], ["unlock", "forest"], ["trip", "home"], ["trip", "tired"], ["trip", "beaten"],
    ["trip", "snack"], ["evolve", "baby:blob"], ["evolve", "child:blob"], ["evolve", "child:ember"],
    ["evolve", "adult:cyclopuff"], ["found", "fruit_cherry"], ["found", "seed_herb"],
    ...Object.keys(home.PLANTS).map((kind): [string, string] => ["fruit", kind]),
  ];
  for (const grandma of story.GRANDMA) {
    t(`page.story.grandma.${grandma}`, { name: "x" });
  }
  // only the last days are told, so tell them a few at a time
  for (let from = 0; from < told.length; from += story.DAYS) {
    pet.events = [];
    told.slice(from, from + story.DAYS).forEach(([action, item], i) => {
      model.logEvent(pet, start + 86400 * i + HOUR, action, "system", { item });
    });
    assert.equal(story.tell(pet, start + 86400 * story.DAYS, t)!.pages.length,
      Math.min(story.DAYS, told.length - from));
  }
  assert.deepEqual(warnings, []);
});

test("nothing it can put into words: no story", () => {
  model.logEvent(pet, start + HOUR, "something_new", "system");
  assert.equal(story.tell(pet, start + 8 * HOUR, t), null);
  assert.equal(story.tell(pet, start + 2 * HOUR, t), null); // and not long enough anyway
});
