import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { locationOf, parseConfig, parseIni } from "../src/config";

const quiet = (): void => {};

test("an empty configuration gives the defaults", () => {
  assert.deepEqual(parseConfig("", quiet), {
    language: "", latitude: null, longitude: null, weatherRefreshMinutes: 15, rows: 64, cols: 64,
    hardwareMapping: "adafruit-hat", gpioSlowdown: 2, brightness: 50, port: 80,
  });
});

test("the template is read as it is", () => {
  const cfg = parseConfig(readFileSync("config.example.ini", "utf-8"), (message) => assert.fail(message));
  assert.deepEqual(cfg, parseConfig("", quiet));
  assert.equal(locationOf(cfg), null);
});

test("sections, comments and both ways of writing a pair", () => {
  assert.deepEqual(parseIni("# top\n[a]\nKey = 1\n; note\nother: two words\n\n[b]\nempty =\n"),
    { a: { key: "1", other: "two words" }, b: { empty: "" } });
});

test("values are read and kept within their limits", () => {
  const cfg = parseConfig([
    "[interface]", "language = DE", "[location]", "latitude = 52,52", "longitude = -13.4",
    "[weather]", "refresh_minutes = 1", "[matrix]", "brightness = 250", "gpio_slowdown = 4",
    "hardware_mapping = adafruit-hat-pwm", "[web]", "port = 8080",
  ].join("\n"), quiet);
  assert.equal(cfg.language, "de");
  assert.deepEqual(locationOf(cfg), [52.52, -13.4]);
  assert.equal(cfg.weatherRefreshMinutes, 5);
  assert.equal(cfg.brightness, 100);
  assert.equal(cfg.gpioSlowdown, 4);
  assert.equal(cfg.hardwareMapping, "adafruit-hat-pwm");
  assert.equal(cfg.port, 8080);
});

test("an invalid location or number is reported and left out", () => {
  const warnings: string[] = [];
  const cfg = parseConfig("[location]\nlatitude = 91\nlongitude = east\n[web]\nport = eighty\n",
    (message) => warnings.push(message));
  assert.equal(cfg.latitude, null);
  assert.equal(cfg.longitude, null);
  assert.equal(cfg.port, 80);
  assert.equal(warnings.length, 3);
});
