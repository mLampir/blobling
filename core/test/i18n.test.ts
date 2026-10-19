// The language files and the text lookup.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

import * as battle from "../src/battle";
import * as care from "../src/care";
import * as home from "../src/home";
import { DEFAULT_LANGUAGE, I18n, flatten } from "../src/i18n";
import * as life from "../src/life";
import * as trip from "../src/trip";
import { readLocales } from "./helpers";

const locales = readLocales();
const english = flatten(locales[DEFAULT_LANGUAGE]);
const others = Object.fromEntries(Object.entries(locales).filter(([language]) => language !== DEFAULT_LANGUAGE)
  .map(([language, content]) => [language, flatten(content)]));

function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
}

/** An I18n that collects its warnings instead of printing them. */
function quiet(language?: string, files: Record<string, object> = locales): [I18n, string[]] {
  const warnings: string[] = [];
  return [new I18n(files, language, (message) => warnings.push(message)), warnings];
}

test("translations only use known keys and placeholders", () => {
  assert.ok("de" in others);
  for (const [language, texts] of Object.entries(others)) {
    for (const [key, text] of Object.entries(texts)) {
      assert.ok(key in english, `${language}: unknown key ${key}`);
      assert.deepEqual(placeholders(text), placeholders(english[key]), `${language}: placeholders of ${key}`);
    }
  }
});

test("German is complete", () => {
  assert.deepEqual(Object.keys(others.de).sort(), Object.keys(english).sort());
});

test("everything the game names has a text", () => {
  const keys = [
    ...life.STAGES.map((stage) => `stages.${stage}`),
    ...life.SPECIES.map((species) => `species.${species}`),
    ...Object.keys(care.TRICKS).map((trick) => `tricks.${trick}`),
    ...Object.keys(home.ITEMS).map((item) => `items.${item}`),
    ...Object.keys(home.PLANTS).flatMap((plant) => [`plants.${plant}`, `fruits.${plant}`]),
    ...trip.AREAS.flatMap((area) => ["name", "away", "trip"].map((part) => `areas.${area}.${part}`)),
    ...battle.SKILLS.flatMap((skill) => [`skills.${skill}`, `page.train.how.${skill}`]),
    ...Object.keys(battle.FOES).map((foe) => `foes.${foe}`),
    ...trip.PACKABLE.map((thing) => `pack.${thing}`),
  ];
  for (const key of keys) {
    assert.ok(key in english, key);
  }
});

test("every error has a text", () => {
  const source = readdirSync("core/src").map((name) => readFileSync(`core/src/${name}`, "utf-8")).join("");
  const keys = [...source.matchAll(/RequestError\("(\w+)"\)|"(unknown_\w+)"\]/g)].map((match) => match[1] ?? match[2]);
  assert.ok(keys.length > 10, String(keys));
  for (const key of keys) {
    assert.ok(`error.${key}` in english, key);
  }
});

test("placeholders and unknown keys", () => {
  const [i18n, warnings] = quiet();
  assert.equal(i18n.t("pet.rejected.full", { name: "Blobby" }), "Blobby is full.");
  assert.deepEqual(warnings, []);
  assert.equal(i18n.t("no.such.key"), "no.such.key");
  assert.equal(warnings.length, 1);
  // a placeholder nobody filled in: the text stays as it is
  assert.equal(i18n.t("pet.rejected.full", { pet: "Blobby" }), english["pet.rejected.full"]);
  assert.equal(warnings.length, 2);
});

test("language can be switched", () => {
  const [i18n] = quiet("de");
  assert.deepEqual([i18n.language, i18n.t("stages.egg")], ["de", "Ei"]);
});

test("missing entries fall back to English", () => {
  const [i18n] = quiet("zz", { ...locales, zz: { stages: { egg: "Zz" } } });
  assert.deepEqual([i18n.t("stages.egg"), i18n.t("stages.baby")], ["Zz", "Baby"]);
});

test("unknown language falls back to English", () => {
  for (const language of ["xx", "../en", "toString", ""]) {
    const [i18n, warnings] = quiet(language);
    assert.deepEqual([i18n.language, i18n.t("stages.egg")], ["en", "Egg"], language);
    assert.equal(warnings.length, language ? 1 : 0, language);
  }
});
