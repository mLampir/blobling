// Balance profiles: the panel and the app.

import assert from "node:assert/strict";
import { test } from "node:test";

import * as balance from "../src/balance";
import { I18n } from "../src/i18n";
import * as model from "../src/model";
import { Pet } from "../src/pet";
import * as trip from "../src/trip";
import { BEDTIME, HOUR, act, at, grown, near, readLocales } from "./helpers";

test("the panel is the reference, an unknown profile is the panel's", () => {
  assert.deepEqual(balance.PROFILES.panel, { decay: 1.0, trip: 1.0 });
  assert.equal(balance.profile("app"), balance.PROFILES.app);
  assert.equal(balance.profile("toaster"), balance.PROFILES.panel);
  assert.equal(balance.profile(undefined), balance.PROFILES.panel);
});

test("the needs drop by the profile's decay factor", () => {
  const start = at("2026-10-12 10:00");
  const panel = grown(start);
  const app = grown(start);
  model.advance(panel, start + 2 * HOUR, BEDTIME);
  model.advance(app, start + 2 * HOUR, BEDTIME, null, null, null, balance.PROFILES.app);
  const before = grown(start).stats;
  for (const key of ["satiety", "hygiene"] as const) {
    const lost = before[key] - panel.stats[key];
    assert.ok(lost > 0, key);
    near(before[key] - app.stats[key], lost * balance.PROFILES.app.decay, 0.1);
  }
});

test("a trip takes the profile's length", () => {
  const now = at("2026-10-12 10:00");
  const pet = grown(now);
  const normal = trip.plan(pet, "meadow", now);
  const long = trip.plan(pet, "meadow", now, [], 2.0);
  assert.equal(long.stations.length, normal.stations.length);
  assert.ok(Math.abs((long.end - now) - 2 * (normal.end - now)) <= normal.stations.length + 1);
});

test("an action passes the profile on to the trip", () => {
  const now = at("2026-10-12 10:00");
  const pet = grown(now);
  const profile = { decay: 1.0, trip: 1.5 };
  assert.deepEqual(act(pet, "trip", now, { item: "meadow", profile }), [true, null]);
  const planned = trip.plan(grown(now), "meadow", now, [], 1.5);
  assert.equal(pet.trip!.end, planned.end);
});

test("a pet in the app uses the app profile", () => {
  const start = at("2026-10-12 10:00");
  const t = new I18n(readLocales()).t;
  let now = start;
  const lost = (profile: balance.ProfileName) => {
    const pet = new Pet({ t, saved: { state: grown(start), ancestors: [] }, clock: () => now, profile });
    now = start + 2 * HOUR;
    pet.action("pet", { now }); // catches it up first
    now = start;
    return grown(start).stats.satiety - pet.state.stats.satiety;
  };
  const panel = lost("panel");
  assert.ok(panel > 0);
  near(lost("app"), panel * balance.PROFILES.app.decay, 0.1); // small effects besides the decay
});
