// The pet's JSON API, as the Pi answers it over HTTP and the app in the page.

import assert from "node:assert/strict";
import { test } from "node:test";

import { NOT_A_PET_ROUTE, petRequest } from "../src/api";
import { RequestError } from "../src/model";
import type { Pet } from "../src/pet";
import { Disk } from "./helpers";

function ask(pet: Pet, method: string, path: string, body?: unknown): Promise<any> {
  return petRequest({ pet, action: pet.action.bind(pet), newEgg: pet.newEgg.bind(pet) },
    method, new URL(path, "http://pet"), async () => body ?? null);
}

test("the pet is described, acted on, renamed and started over", async () => {
  const pet = new Disk().pet();
  assert.equal((await ask(pet, "GET", "/api/pet")).stage, "egg");
  assert.equal((await ask(pet, "HEAD", "/api/pet")).api, 1);

  const first = await ask(pet, "POST", "/api/pet/action", { action: "pet", id: "tap-1", by: "test" });
  assert.equal(first.api, 1);
  assert.equal(first.accepted, true);
  // the same request twice runs once
  await ask(pet, "POST", "/api/pet/action", { action: "pet", id: "tap-1", by: "test" });
  const { events } = await ask(pet, "GET", "/api/pet/events?limit=100");
  assert.equal(events.filter((e: { by: string }) => e.by === "test").length, 1);
  assert.equal((await ask(pet, "GET", "/api/pet/events?limit=many")).api, 1);

  assert.equal((await ask(pet, "POST", "/api/pet/settings", { name: " Mimi   Mau " })).name, "Mimi Mau");
  const { api, ancestors, album } = await ask(pet, "GET", "/api/pet/ancestors");
  assert.equal(api, 1);
  assert.deepEqual(ancestors, []);
  assert.equal(album.filter(Boolean).length, 1); // the egg it starts with
  assert.deepEqual(await ask(pet, "GET", "/api/pet/travels"), { api: 1, travels: [] });
  assert.equal((await ask(pet, "POST", "/api/pet/new_egg", { confirm: true })).stage, "egg");
});

test("an invalid request throws the key of its text, and other paths are not the pet's", async () => {
  const pet = new Disk().pet();
  const cases: [string, unknown, string][] = [
    ["/api/pet/action", { action: "fly" }, "unknown_action"],
    ["/api/pet/action", { action: "pet", id: 5 }, "invalid_id"],
    ["/api/pet/new_egg", {}, "confirm"],
    ["/api/pet/new_egg", null, "confirm"],
    ["/api/pet/settings", { name: "  " }, "name_length"],
  ];
  for (const [path, body, key] of cases) {
    await assert.rejects(ask(pet, "POST", path, body), (error) => error instanceof RequestError && error.message === key);
  }
  assert.equal(await ask(pet, "GET", "/api/state"), NOT_A_PET_ROUTE);
  assert.equal(await ask(pet, "POST", "/api/pet"), NOT_A_PET_ROUTE);
});
