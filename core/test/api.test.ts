// The pet's JSON API, as the Pi answers it over HTTP and the app in the page.

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";

import { API_OLDEST, API_VERSION, NOT_A_PET_ROUTE, ownTarget, petRequest } from "../src/api";
import { ACTIONS, RequestError } from "../src/model";
import type { Pet } from "../src/pet";
import { at, Disk } from "./helpers";

function ask(pet: Pet, method: string, path: string, body?: unknown): Promise<any> {
  return petRequest(ownTarget(pet), method, new URL(path, "http://pet"), async () => body ?? null);
}

test("the pet is described, acted on, renamed and started over", async () => {
  const pet = new Disk().pet();
  assert.equal((await ask(pet, "GET", "/api/pet")).stage, "egg");
  assert.equal((await ask(pet, "HEAD", "/api/pet")).api, API_VERSION);

  const first = await ask(pet, "POST", "/api/pet/action", { action: "pet", id: "tap-1", by: "test" });
  assert.equal(first.api, API_VERSION);
  assert.equal(first.accepted, true);
  // the same request twice runs once
  await ask(pet, "POST", "/api/pet/action", { action: "pet", id: "tap-1", by: "test" });
  const { events } = await ask(pet, "GET", "/api/pet/events?limit=100");
  assert.equal(events.filter((e: { by: string }) => e.by === "test").length, 1);
  assert.equal((await ask(pet, "GET", "/api/pet/events?limit=many")).api, API_VERSION);

  assert.equal((await ask(pet, "POST", "/api/pet/settings", { name: " Mimi   Mau " })).name, "Mimi Mau");
  const { api, ancestors, album } = await ask(pet, "GET", "/api/pet/ancestors");
  assert.equal(api, API_VERSION);
  assert.deepEqual(ancestors, []);
  assert.equal(album.filter(Boolean).length, 1); // the egg it starts with
  assert.deepEqual(await ask(pet, "GET", "/api/pet/travels"), { api: API_VERSION, travels: [] });
  const egg = await ask(pet, "POST", "/api/pet/new_egg", { confirm: true });
  assert.deepEqual([egg.stage, egg.pets.length], ["egg", 2]);

  // every request can name the pet it is for; switching moves the camera
  const [mimi] = egg.pets;
  assert.equal((await ask(pet, "GET", `/api/pet?pet=${mimi.id}`)).name, "Mimi Mau");
  assert.equal((await ask(pet, "POST", "/api/pet/look", { pet: mimi.id })).id, mimi.id);
  assert.equal((await ask(pet, "GET", "/api/pet")).id, mimi.id);
  // or to a place after the houses: the training ground every home has
  assert.deepEqual((await ask(pet, "POST", "/api/pet/look", { place: "ground" })).ground, { equipment: [], there: [] });
  assert.equal((await ask(pet, "POST", "/api/pet/settings", { name: "Egg", pet: egg.id })).name, "Egg");
  assert.equal((await ask(pet, "GET", `/api/pet/events?pet=${egg.id}`)).events[0].action, "new_egg");
});

test("an invalid request throws the key of its text, and other paths are not the pet's", async () => {
  const pet = new Disk().pet();
  const cases: [string, unknown, string][] = [
    ["/api/pet/action", { action: "fly" }, "unknown_action"],
    ["/api/pet/action", { action: "pet", id: 5 }, "invalid_id"],
    ["/api/pet/new_egg", {}, "confirm"],
    ["/api/pet/new_egg", null, "confirm"],
    ["/api/pet/new_egg", { confirm: true, place: "nobody" }, "no_pet"],
    ["/api/pet/look", { pet: "nobody" }, "no_pet"],
    ["/api/pet/look", { place: "moon" }, "unknown_place"],
    ["/api/pet/action", { action: "pet", pet: "nobody" }, "no_pet"],
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

/** What an app may rely on: the routes, the actions and the fields of what the routes answer. */
async function contract() {
  // a fixed day, with the festival's poster up: what the answers hold must not depend on the date
  const pet = new Disk().pet(() => at("2026-10-22 12:00"));
  const routes = [...readFileSync("core/src/api.ts", "utf-8").matchAll(/case "((?:GET|POST) \/api\/pet[^"]*)"/g)]
    .map((match) => match[1]).sort();
  const answers: Record<string, string> = {};
  for (const route of routes.filter((r) => r.startsWith("GET "))) {
    for (const [path, type] of Object.entries(fields(await ask(pet, "GET", route.slice(4))))) {
      answers[`${route} ${path}`] = type;
    }
  }
  return {
    api: API_VERSION, oldest: API_OLDEST, routes, actions: [...ACTIONS].sort(),
    fields: Object.fromEntries(Object.entries(answers).sort()),
  };
}

test("a change to the API raises its version (API_VERSION, API_OLDEST in core/src/api.ts)", async () => {
  const saved = JSON.parse(readFileSync(CONTRACT, "utf-8"));
  const now = await contract();
  assert.ok(API_OLDEST <= API_VERSION && API_VERSION >= saved.api, "API_VERSION never goes down");

  const lost = (before: string[], after: string[], what: string) =>
    before.filter((x) => !after.includes(x)).map((x) => `${what} ${x}`);
  const gone = [
    ...lost(saved.routes, now.routes, "route"), ...lost(saved.actions, now.actions, "action"),
    ...Object.entries(saved.fields as Record<string, string>).filter(([path, type]) => now.fields[path] !== type)
      .map(([path]) => path),
  ];
  const added = [
    ...lost(now.routes, saved.routes, "route"), ...lost(now.actions, saved.actions, "action"),
    ...Object.keys(now.fields).filter((path) => !(path in saved.fields)),
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
