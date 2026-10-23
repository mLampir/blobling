import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { preferredLanguage } from "../../core/src/i18n";
import { RequestError } from "../../core/src/model";
import { checkLocation } from "../../core/src/sun";
import { LOCALE_DIR, parseConfig } from "../src/config";
import { Settings } from "../src/settings";
import { readLocales } from "../src/storage";
import { tempDir } from "./helpers";

const locales = readLocales(LOCALE_DIR);
const quiet = (): void => {};

test("the browser's favourite language that has a file", () => {
  assert.equal(preferredLanguage("de-AT,de;q=0.9,en;q=0.8", ["en", "de"]), "de");
  assert.equal(preferredLanguage("fr-FR, en;q=0.5, de;q=0.7", ["en", "de"]), "de");
  assert.equal(preferredLanguage("fr, *;q=0.1", ["en", "de"]), null);
  assert.equal(preferredLanguage("de;q=0, en", ["en", "de"]), "en");
  assert.equal(preferredLanguage(undefined, ["en"]), null);
});

test("a location is two numbers within their limits", () => {
  assert.deepEqual(checkLocation(52.52, -13.4), [52.52, -13.4]);
  assert.equal(checkLocation(91, 0), null);
  assert.equal(checkLocation(0, -180.5), null);
  assert.equal(checkLocation("52", 13), null);
  assert.equal(checkLocation(Number.NaN, 13), null);
});

test("without a language, the first browser chooses it, and it is kept", () => {
  const file = join(tempDir(), "settings.json");
  const settings = new Settings(file, parseConfig("", quiet), locales);
  assert.equal(settings.language, null);
  assert.equal(settings.i18n.language, "en");
  settings.adoptLanguage("de-DE,de;q=0.9");
  assert.equal(settings.t("settings.language"), "Sprache");
  // once chosen, other browsers don't change it
  settings.adoptLanguage("en-US");
  assert.equal(settings.language, "de");
  assert.equal(new Settings(file, parseConfig("", quiet), locales).language, "de");
});

test("a browser without a known language leaves it open", () => {
  const settings = new Settings(join(tempDir(), "settings.json"), parseConfig("", quiet), locales);
  settings.adoptLanguage("fr-FR");
  assert.equal(settings.language, null);
});

test("the settings page wins over config.ini, and survives a restart", () => {
  const file = join(tempDir(), "settings.json");
  const cfg = parseConfig("[interface]\nlanguage = de\n[location]\nlatitude = 48.2\nlongitude = 16.37\n", quiet);
  const settings = new Settings(file, cfg, locales);
  assert.equal(settings.language, "de");
  assert.deepEqual(settings.location, [48.2, 16.37]);

  const heard: unknown[] = [];
  settings.onLocation((location) => heard.push(location));
  settings.setLanguage("en");
  settings.setLocation(52.52, 13.4);
  assert.deepEqual(heard, [[52.52, 13.4]]);
  const again = new Settings(file, cfg, locales);
  assert.equal(again.language, "en");
  assert.deepEqual(again.location, [52.52, 13.4]);

  // removed on the page: no location, even though config.ini has one
  again.setLocation(null, null);
  assert.equal(new Settings(file, cfg, locales).location, null);
  assert.deepEqual(JSON.parse(readFileSync(file, "utf-8")), { language: "en", location: null });
});

test("invalid values are turned down and change nothing", () => {
  const settings = new Settings(join(tempDir(), "settings.json"), parseConfig("", quiet), locales);
  assert.throws(() => settings.setLanguage("xx"), RequestError);
  assert.throws(() => settings.setLanguage("../en"), RequestError);
  assert.throws(() => settings.setLocation(52.52, null), RequestError);
  assert.throws(() => settings.setLocation("", ""), RequestError);
  assert.equal(settings.language, null);
  assert.equal(settings.location, null);
});

test("a broken settings file is ignored", () => {
  const file = join(tempDir(), "settings.json");
  writeFileSync(file, "{ broken");
  const cfg = parseConfig("[interface]\nlanguage = de\n", quiet);
  assert.equal(new Settings(file, cfg, locales).language, "de");
  writeFileSync(file, JSON.stringify({ language: "xx", location: [500, 0] }));
  const settings = new Settings(file, cfg, locales);
  assert.equal(settings.language, "de");
  assert.equal(settings.location, null);
});

test("every language names itself", () => {
  const settings = new Settings(join(tempDir(), "settings.json"), parseConfig("", quiet), locales);
  assert.deepEqual(settings.languages(), [{ code: "de", name: "Deutsch" }, { code: "en", name: "English" }]);
});
