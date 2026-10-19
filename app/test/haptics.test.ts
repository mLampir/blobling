// The buzz stays a small touch: touches close together are left out, answers always come through.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Buzzer, type Feel, TOUCH_GAP_MS } from "../src/haptics";

function buzzer(): { buzzer: Buzzer; played: Feel[]; at: { now: number } } {
  const played: Feel[] = [];
  const at = { now: 1000 };
  return { buzzer: new Buzzer((feel) => played.push(feel), () => at.now), played, at };
}

test("touches closer than the gap are left out", () => {
  const { buzzer: b, played, at } = buzzer();
  b.buzz("touch");
  at.now += TOUCH_GAP_MS - 1;
  b.buzz("touch");
  at.now += 1;
  b.buzz("touch");
  assert.deepEqual(played, ["touch", "touch"]);
});

test("an answer always buzzes, and a touch right after it waits", () => {
  const { buzzer: b, played, at } = buzzer();
  b.buzz("touch");
  b.buzz("no");
  at.now += 10;
  b.buzz("touch");
  b.buzz("joy");
  assert.deepEqual(played, ["touch", "no", "joy"]);
});

test("a phone that can't buzz is no error", () => {
  const b = new Buzzer(() => { throw new Error("no vibrator"); });
  assert.doesNotThrow(() => b.buzz("done"));
});
