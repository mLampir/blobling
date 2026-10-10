import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { LOCALE_DIR } from "../src/config";
import { loadPet, readLocales, writeAtomic } from "../src/storage";
import { parts, tempDir } from "./helpers";

test("a pet is saved and is there again after a restart", () => {
  const directory = tempDir();
  const first = parts(directory);
  assert.equal(loadPet(first.petFile), null);
  first.pet.rename("Mimi");
  assert.deepEqual(readdirSync(directory), ["pet.json"]); // the temporary file is gone

  const second = parts(directory);
  assert.equal(second.pet.state.name, "Mimi");
  assert.equal(second.pet.state.born_at, first.pet.state.born_at);
});

test("a save file that cannot be read is moved aside, not overwritten", () => {
  const directory = tempDir();
  const file = join(directory, "pet.json");
  for (const broken of ["{ half a fi", '{"version": 99, "pet": {}}', "[]"]) {
    writeFileSync(file, broken);
    assert.equal(loadPet(file), null);
    assert.ok(!existsSync(file));
    assert.equal(readFileSync(join(directory, "pet.broken"), "utf-8"), broken);
  }
});

test("writing replaces the file as a whole and creates its folder", () => {
  const file = join(tempDir(), "deeper", "state.json");
  writeAtomic(file, "one");
  writeAtomic(file, "two");
  assert.equal(readFileSync(file, "utf-8"), "two");
});

test("the language files: every one in the folder, English first", () => {
  assert.deepEqual(Object.keys(readLocales(LOCALE_DIR)), ["en", "de"]);
  const directory = tempDir();
  for (const name of ["en.json", "fr.json", "notes.txt", "Fr-copy.json"]) {
    writeFileSync(join(directory, name), "{}");
  }
  writeFileSync(join(directory, "it.json"), "{ broken");
  assert.deepEqual(Object.keys(readLocales(directory)), ["en", "fr"]);
});
