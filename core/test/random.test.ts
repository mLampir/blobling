import assert from "node:assert/strict";
import { test } from "node:test";

import { Random } from "../src/random";

function draw(seed: number | string) {
  const rng = new Random(seed);
  return [rng.random(), rng.uniform(600, 960), rng.randint(4, 6), rng.choice(["left", "right"]),
    rng.choice(["a", "b", "c", "d", "e"]), rng.weighted(["x", "y", "z"], [4, 2, 1]), rng.random()];
}

test("the same seed gives the same numbers", () => {
  for (const seed of [0, 7, 1791784800, 5000000000, "trip:1791784800", "1791784800.25:3", "ü"]) {
    assert.deepEqual(draw(seed), draw(seed));
  }
});

test("seeds next to each other give unrelated numbers", () => {
  const first = Array.from({ length: 2000 }, (_, i) => new Random(`station:${1791784800 + i}`).random());
  const mean = first.reduce((sum, x) => sum + x, 0) / first.length;
  assert.ok(Math.abs(mean - 0.5) < 0.03, `mean ${mean}`);
  // a time and the second after it: no drift from one to the next
  const rising = first.filter((x, i) => i > 0 && x > first[i - 1]).length / (first.length - 1);
  assert.ok(Math.abs(rising - 0.5) < 0.05, `rising ${rising}`);
  assert.equal(new Set(first).size, first.length);
  assert.notDeepEqual(draw(1), draw("2"));
  assert.deepEqual(draw(1), draw("1")); // a number is seeded as it is written
});

test("the numbers stay in their range and fill it evenly", () => {
  const rng = new Random(42);
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 60000; i++) {
    const x = rng.random();
    assert.ok(x >= 0 && x < 1);
    counts[rng.randint(0, 5)]++;
    const u = rng.uniform(600, 960);
    assert.ok(u >= 600 && u < 960);
  }
  for (const count of counts) {
    assert.ok(Math.abs(count - 10000) < 400, `${counts}`);
  }
  assert.ok(["left", "right"].includes(rng.choice(["left", "right"])));
});

test("weights decide how often an option comes up", () => {
  const rng = new Random("weights");
  const counts: Record<string, number> = { x: 0, y: 0, z: 0, never: 0 };
  for (let i = 0; i < 70000; i++) {
    counts[rng.weighted(["x", "never", "y", "z"], [4, 0, 2, 1])]++;
  }
  assert.equal(counts.never, 0);
  assert.ok(Math.abs(counts.x - 40000) < 800 && Math.abs(counts.y - 20000) < 800 && Math.abs(counts.z - 10000) < 800,
    JSON.stringify(counts));
});
