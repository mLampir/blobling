// Weather codes, and sunrise and sunset.

import assert from "node:assert/strict";
import { test } from "node:test";

import * as sky from "../src/sky";
import * as sun from "../src/sun";
import { near } from "./helpers";

test("WMO codes", () => {
  assert.deepEqual([null, 0, 3, 45, 53, 63, 81, 95, 73, 86].map(sky.precipitation),
    [null, null, null, null, "rain", "rain", "rain", "rain", "snow", "snow"]);
  assert.deepEqual([null, 63, 95, 99].map(sky.isThunder), [false, false, true, true]);
  assert.deepEqual([null, 0, 1, 2, 3, 48, 61, 71].map(sky.clouds),
    [[0, 0], [0, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 1], [1, 1]]);
  assert.equal(sky.codeOf({ temp: 3.0, code: 71 } as { code: number }), 71);
  assert.equal(sky.codeOf(null), null);
});

test("sun: location and fallback", () => {
  const day = new Date(2026, 5, 21);
  let [rise, set] = sun.sunTimes(day, [52.52, 13.40]); // Berlin, daylight saving time
  near(rise, 4 * 60 + 43, 5);
  near(set, 21 * 60 + 33, 5);
  const north = sun.sunTimes(day, [60.0, 15.0]);
  const south = sun.sunTimes(day, [-35.0, 15.0]);
  assert.ok(north[1] - north[0] > south[1] - south[0]); // in June the days are longer in the north
  // without a location: noon fits the time zone (CET → 15° east), day length as at 45° latitude
  [rise, set] = sun.sunTimes(day);
  near((rise + set) / 2, 13 * 60, 5);
  near(set - rise, 15.5 * 60, 20);
});

test("sun: dusk is the time around sunset", () => {
  const berlin = [52.52, 13.40] as const;
  const at = (hour: number, minute: number) => new Date(2026, 5, 21, hour, minute).getTime() / 1000;
  assert.deepEqual([at(20, 40), at(20, 55), at(21, 33), at(22, 10), at(22, 25), at(4, 43)]
    .map((t) => sun.isDusk(t, berlin)), [false, true, true, true, false, false]);
  assert.equal(sun.isDusk(at(22, 10)), false); // without a location the estimate applies: sunset is earlier there
});
