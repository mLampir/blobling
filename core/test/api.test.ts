// The pet's JSON API, as the Pi answers it over HTTP and the app in the page.

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";

import { API_OLDEST, API_VERSION, NOT_A_PET_ROUTE, petRequest } from "../src/api";
import { ACTIONS, RequestError } from "../src/model";
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
  assert.deepEqual(await ask(pet, "GET", "/api/pet/ancestors"), { api: 1, ancestors: [] });
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

// ---------- The contract between app and Pi ----------

const CONTRACT = "core/test/api-contract.json";

/** Fields whose keys are data (one per item), not part of the API. */
const DICTIONARIES = ["item_labels"];

/** Every field of an answer as "path": "type" ("stats.food": "number"); lists count as one field. */
function fields(value: unknown, path = "", into: Record<string, string> = {}): Record<string, string> {
  if (value !== null && typeof value === "object" && !Array.isArray(value) && !DICTIONARIES.includes(path)) {
    for (const [key, inner] of Object.entries(value)) {
      fields(inner, path ? `${path}.${key}` : key, into);
    }
  } else {
    into[path] = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  }
  return into;
}

/** What an app may rely on: the actions and the fields of the pet's description. */
async function contract() {
  const pet = new Disk().pet();
  return {
    api: API_VERSION, oldest: API_OLDEST, actions: [...ACTIONS].sort(),
    pet: Object.fromEntries(Object.entries(fields(await ask(pet, "GET", "/api/pet"))).sort()),
  };
}

test("a change to the API raises its version (API_VERSION, API_OLDEST in core/src/api.ts)", async () => {
  const saved = JSON.parse(readFileSync(CONTRACT, "utf-8"));
  const now = await contract();
  assert.ok(API_OLDEST <= API_VERSION && API_VERSION >= saved.api, "API_VERSION never goes down");

  const gone = [
    ...saved.actions.filter((a: string) => !now.actions.includes(a)).map((a: string) => `action ${a}`),
    ...Object.entries(saved.pet as Record<string, string>).filter(([path, type]) => now.pet[path] !== type)
      .map(([path]) => path),
  ];
  const added = [
    ...now.actions.filter((a) => !saved.actions.includes(a)).map((a) => `action ${a}`),
    ...Object.keys(now.pet).filter((path) => !(path in saved.pet)),
  ];
  assert.ok(!gone.length || API_OLDEST > saved.api, `Removed or changed: ${gone.join(", ")}. Apps rely on it: `
    + `raise API_VERSION and set API_OLDEST to it, so an older app asks to be updated.`);
  assert.ok(!added.length || API_VERSION > saved.api, `New: ${added.join(", ")}. Raise API_VERSION, so an app `
    + `that uses it asks for an older display to be updated.`);

  if (JSON.stringify(now) !== JSON.stringify(saved)) {
    assert.ok(process.env.UPDATE_API_CONTRACT, `The version fits the change; now write the new contract: `
      + `UPDATE_API_CONTRACT=1 npm test -- api`);
    writeFileSync(CONTRACT, `${JSON.stringify(now, null, 2)}\n`);
  }
});
