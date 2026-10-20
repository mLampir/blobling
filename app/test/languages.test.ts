// The phone's settings offer the app's languages from two lists of their own; both have to name
// every language file in app/locales/.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const files = readdirSync("app/locales").filter((name) => name.endsWith(".json"))
  .map((name) => name.slice(0, -".json".length)).sort();

test("Android's locales_config.xml names every language file", () => {
  const config = readFileSync("app/android/app/src/main/res/xml/locales_config.xml", "utf-8");
  const names = [...config.matchAll(/<locale android:name="([\w-]+)"/g)].map((match) => match[1]).sort();
  assert.deepEqual(names, files);
});

test("iOS's CFBundleLocalizations names every language file", () => {
  const plist = readFileSync("app/ios/App/App/Info.plist", "utf-8");
  const list = plist.match(/<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1] ?? "";
  const names = [...list.matchAll(/<string>([\w-]+)<\/string>/g)].map((match) => match[1]).sort();
  assert.deepEqual(names, files);
});

test("every iOS permission text in Info.plist is translated", () => {
  const plist = readFileSync("app/ios/App/App/Info.plist", "utf-8");
  const keys = [...plist.matchAll(/<key>(NS\w+UsageDescription)<\/key>/g)].map((match) => match[1]).sort();
  for (const language of files.filter((name) => name !== "en")) {
    const strings = readFileSync(`app/ios/App/App/${language}.lproj/InfoPlist.strings`, "utf-8");
    const translated = [...strings.matchAll(/^(NS\w+UsageDescription) = /gm)].map((match) => match[1]).sort();
    assert.deepEqual(translated, keys, `${language}.lproj/InfoPlist.strings`);
  }
});
