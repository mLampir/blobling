// The pet page asks for its texts by key; every key it names has to be in the English file.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { flatten } from "../../core/src/i18n";

test("every text the page asks for is in en.json", () => {
  const page = readFileSync("app/pet.html", "utf-8");
  const strings = flatten(JSON.parse(readFileSync("app/locales/en.json", "utf-8")));
  const keys = new Set([
    ...[...page.matchAll(/data-t(?:-aria|-content)?="([\w.]+)"/g)].map((match) => match[1]),
    // t("…") and tn("…") with a key written out (keys put together in the script are left out)
    ...[...page.matchAll(/\btn?\("([\w.]+)"/g)].map((match) => match[1]),
  ]);
  assert.ok(keys.size > 100);
  const counted = (key: string): boolean => `${key}.one` in strings && `${key}.other` in strings;
  const missing = [...keys].filter((key) => !(key in strings) && !counted(key));
  assert.deepEqual(missing, []);
});
