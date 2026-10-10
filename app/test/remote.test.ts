import assert from "node:assert/strict";
import { test } from "node:test";

import { piAddress } from "../src/remote";

test("the address of a Pi, however it is typed in", () => {
  assert.equal(piAddress("blobling.local"), "http://blobling.local");
  assert.equal(piAddress("  192.168.0.42:8080/pet "), "http://192.168.0.42:8080");
  assert.equal(piAddress("https://blobling.local/"), "https://blobling.local");
  assert.equal(piAddress("HTTP://Blobling.Local"), "http://blobling.local");
  assert.equal(piAddress(""), null);
  assert.equal(piAddress("   "), null);
  assert.equal(piAddress("http://"), null);
});
