// What the tests of the Pi's side share. They run from the repo folder (tools/test.mjs).

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "node:test";

import { Pet } from "../../core/src/pet";
import { PetScene, type SceneAssets } from "../../core/src/scene";
import { readAssets } from "../src/assets";
import { LOCALE_DIR, parseConfig } from "../src/config";
import { Display, type FrameSink } from "../src/display";
import { Settings, followLocation } from "../src/settings";
import { loadPet, petSaver, readLocales } from "../src/storage";
import { Updates } from "../src/update";
import { Weather } from "../../core/src/weather";

/** An empty folder that is removed after the tests of the file. */
export function tempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "led-matrix-test-"));
  after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

let assets: SceneAssets | null = null;

/** The sprite sheets, without the panel font. */
export function sceneAssets(): SceneAssets {
  return assets ??= readAssets();
}

/** The parts of the app as main.ts puts them together, with their files in `directory` and without weather. */
export function parts(directory: string, panel: FrameSink | null = null, language = "en") {
  const settings = new Settings(join(directory, "settings.json"), parseConfig(`[interface]\nlanguage = ${language}`),
    readLocales(LOCALE_DIR));
  const weather = new Weather(null, null, 15);
  const petFile = join(directory, "pet.json");
  const pet = new Pet({ t: settings.t, saved: loadPet(petFile), save: petSaver(petFile) });
  const scene = (): PetScene => new PetScene(64, 64, sceneAssets());
  const display = new Display({
    panel, pet, weather, scene, defaultBrightness: 50, stateFile: join(directory, "state.json"),
  });
  pet.setBedtimeSource(display.bedtime);
  followLocation(settings, { weather, pet, display });
  // no VERSION in the folder: like a Pi set up from a checkout, it never looks for updates
  const updates = new Updates(directory, () => assert.fail("no request"), async () => "inactive", () => settings.beta);
  return { settings, weather, pet, display, petFile, updates };
}
