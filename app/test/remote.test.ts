import assert from "node:assert/strict";
import { test } from "node:test";

import { API_VERSION } from "../../core/src/api";
import { apiFit, piAddress } from "../src/remote";

test("the address of a Pi, however it is typed in", () => {
  assert.equal(piAddress("blobling.local"), "http://blobling.local");
  assert.equal(piAddress("  192.168.0.42:8080/pet "), "http://192.168.0.42:8080");
  assert.equal(piAddress("https://blobling.local/"), "https://blobling.local");
  assert.equal(piAddress("HTTP://Blobling.Local"), "http://blobling.local");
  assert.equal(piAddress(""), null);
  assert.equal(piAddress("   "), null);
  assert.equal(piAddress("http://"), null);
});

test("whether a Pi and the app understand each other", () => {
  const v = API_VERSION;
  assert.equal(apiFit({ api: v, api_oldest: v }), "ok");
  assert.equal(apiFit({ api: v + 1, api_oldest: v }), "ok");
  assert.equal(apiFit({ api: v + 1, api_oldest: v + 1 }), "app_old");
  assert.equal(apiFit({ api: v - 1, api_oldest: 1 }), "display_old");
  // an action's answer carries the pet in "state"; a Pi from before api_oldest only tells when it is too old
  assert.equal(apiFit({ api: v, accepted: true, state: { api: v + 1, api_oldest: v + 1 } }), "app_old");
  assert.equal(apiFit({ api: v - 1 }), "display_old");
  assert.equal(apiFit({ api: v }), null);
  assert.equal(apiFit({ mode: "pet" }), null);
  assert.equal(apiFit(null), null);
});
