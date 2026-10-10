import assert from "node:assert/strict";
import { test } from "node:test";

import { Weather } from "../src/weather";

/** Stands in for Open-Meteo. */
function answer(status: number, body: unknown, asked: string[] = []): typeof fetch {
  return async (url) => {
    asked.push(String(url));
    return new Response(JSON.stringify(body), { status });
  };
}

test("without a location there is no weather", () => {
  const weather = new Weather(null, 13.4, 15);
  assert.ok(!weather.configured);
  assert.equal(weather.current(), null);
});

test("the weather is fetched for the location and kept", async () => {
  const asked: string[] = [];
  const weather = new Weather(52.52, 13.4, 15,
    answer(200, { current: { temperature_2m: 12.4, weather_code: 61 } }, asked));
  assert.ok(weather.needsRefresh());
  await weather.refresh();
  assert.deepEqual(weather.current(), { temp: 12.4, code: 61 });
  assert.equal(weather.error, null);
  assert.ok(!weather.needsRefresh());
  assert.match(asked[0], /latitude=52\.52&longitude=13\.4&current=temperature_2m,weather_code$/);
});

test("a failed request is not repeated straight away", async () => {
  const weather = new Weather(52.52, 13.4, 15, async () => {
    throw new Error("offline");
  });
  await weather.refresh();
  assert.equal(weather.current(), null);
  assert.equal(weather.error, "no connection");
  assert.ok(!weather.needsRefresh());
});

test("Open-Meteo's reason for refusing a location is kept", async () => {
  const weather = new Weather(52.52, 13.4, 15, answer(400, { error: true, reason: "Latitude must be in range" }));
  await weather.refresh();
  assert.equal(weather.error, "Latitude must be in range");
});

test("an answer without the weather counts as failed", async () => {
  const weather = new Weather(52.52, 13.4, 15, answer(200, { current: {} }));
  await weather.refresh();
  assert.equal(weather.current(), null);
});
