import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, request as httpRequest, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { after, before, test } from "node:test";

import { decodePng } from "../../core/src/png";
import { APP_DIR, TEMPLATE_DIR } from "../src/config";
import { createApp, renderPage } from "../src/web";
import { petSaver } from "../src/storage";
import { parts, sceneAssets, tempDir } from "./helpers";

const directory = tempDir();
const bundleDir = join(directory, "bundle");
mkdirSync(bundleDir);
writeFileSync(join(bundleDir, "app.js"), "window.blobling = {};");
const app = parts(directory, null, "de");
const asideFile = join(directory, "pet.before-load.json");
let server: Server;
let origin: string;

before(async () => {
  server = createServer(createApp({ ...app, assets: sceneAssets(), keepAside: petSaver(asideFile), templateDir: TEMPLATE_DIR,
    appDir: APP_DIR, bundleDir }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const get = (path: string): Promise<Response> => fetch(origin + path);

/** What a request is answered with, read as JSON. */
async function json(response: Response | Promise<Response>): Promise<any> {
  return (await response).json();
}

/** A change, the way the pages send it. */
function post(path: string, body?: unknown,
    headers: Record<string, string> = { "X-Requested-With": "led-matrix" }): Promise<Response> {
  return fetch(origin + path, { method: "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

test("a page is filled in: texts, values and values for its script", () => {
  const t = (key: string): string => ({ "a.b": "Tom & <Jerry>" })[key] ?? key;
  assert.equal(renderPage("<p lang={{ lang }}>{{ t('a.b') }}{{t(\"a.b\")}}</p>", t, { lang: "de" }),
    "<p lang=de>Tom &amp; &lt;Jerry&gt;Tom &amp; &lt;Jerry&gt;</p>");
  // inside a script nothing may end the script or start a tag
  const script = renderPage("const T = {{ strings|tojson }};", t, { strings: { x: "</script>'&" } });
  assert.ok(!/[<>'&]/.test(script));
  assert.deepEqual(JSON.parse(script.slice("const T = ".length, -1)), { x: "</script>'&" });
  assert.throws(() => renderPage("{{ missing }}", t, {}));
  assert.throws(() => renderPage("{{ x.y }}", t, { x: 1 }));
});

test("both pages come in the configured language, with nothing left to fill in", async () => {
  for (const path of ["/", "/pet"]) {
    const response = await get(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type")!, /^text\/html/);
    const html = await response.text();
    assert.ok(!html.includes("{{") && !html.includes("{%"));
  }
  assert.match(await (await get("/")).text(), /<html lang="de">[^]*const T = \{"/);
  // the pet page is the app's: it fills in its texts itself and learns that the Pi keeps the pet
  const pet = await (await get("/pet")).text();
  assert.match(pet, /<html lang="de" data-host="pi">/);
  assert.match(pet, /<script src="app.js"><\/script>/);
  const script = await get("/app.js");
  assert.match(script.headers.get("content-type")!, /javascript/);
  assert.equal(await script.text(), "window.blobling = {};");
});

test("the state of the panel is read and changed", async () => {
  assert.deepEqual(await json(get("/api/state")), {
    mode: "pet", brightness: 50, night_active: false, weather_configured: false, language: "de", location: null,
    update: { current: null, latest: null, available: false, running: false, failed: false },
    night: { enabled: false, start: "23:00", end: "07:00", action: "dim", brightness: 5 },
  });
  assert.equal((await json(post("/api/mode", { mode: "off" }))).mode, "off");
  assert.equal((await json(post("/api/brightness", { value: 30 }))).brightness, 30);
  assert.equal((await json(post("/api/brightness", { value: 70.9 }))).brightness, 70);
  const night = { enabled: false, start: "22:00", end: "06:30", action: "off", brightness: 3 };
  assert.deepEqual((await json(post("/api/night", night))).night, night);
  assert.deepEqual(app.display.state(), { mode: "off", brightness: 70, night });
});

test("language and location are set on the settings page", async () => {
  assert.match(await (await get("/")).text(), /const LANGUAGES = \[\{"code":"de","name":"Deutsch"\}/);
  const placed = await json(post("/api/location", { latitude: 52.52, longitude: 13.4 }));
  assert.deepEqual(placed.location, [52.52, 13.4]);
  assert.equal(placed.weather_configured, true);
  assert.deepEqual([app.weather.latitude, app.weather.longitude], [52.52, 13.4]);
  assert.equal((await json(post("/api/location", { latitude: null, longitude: null }))).weather_configured, false);

  assert.equal((await json(post("/api/language", { language: "en" }))).language, "en");
  assert.match(await (await get("/pet")).text(), /<html lang="en" data-host="pi">/);
  assert.equal((await json(post("/api/language", { language: "de" }))).language, "de");
});

test("an invalid request gets 400 and a text in the configured language", async () => {
  const cases: [string, unknown, string][] = [
    ["/api/mode", { mode: "disco" }, "error.unknown_mode"],
    ["/api/mode", undefined, "error.unknown_mode"],
    ["/api/brightness", { value: "30" }, "error.invalid_value"],
    ["/api/brightness", {}, "error.invalid_value"],
    ["/api/night", [1], "error.invalid_settings"],
    ["/api/night", { start: "25:00" }, "error.invalid_time"],
    ["/api/pet/action", { action: "fly" }, "error.unknown_action"],
    ["/api/pet/action", { action: "pet", id: 5 }, "error.invalid_id"],
    ["/api/pet/new_egg", {}, "error.confirm"],
    ["/api/pet/settings", { name: "  " }, "error.name_length"],
    ["/api/language", { language: "xx" }, "error.unknown_language"],
    ["/api/update", undefined, "error.no_update"],
    ["/api/location", { latitude: 100, longitude: 0 }, "error.invalid_location"],
    ["/api/location", { latitude: "", longitude: "" }, "error.invalid_location"],
    ["/api/pet/save", { version: 1 }, "error.not_a_save"],
    ["/api/pet/save", undefined, "error.not_a_save"],
  ];
  for (const [path, body, key] of cases) {
    const response = await post(path, body);
    assert.equal(response.status, 400, path);
    assert.deepEqual(await json(response), { error: app.settings.t(key, { max: 16 }) }, path);
  }
  assert.equal(app.settings.t("error.name_length", { max: 16 }), "Name: 1 bis 16 Zeichen.");
});

test("a change needs the header that other websites cannot send", async () => {
  assert.equal((await post("/api/mode", { mode: "off" }, {})).status, 403);
  assert.equal((await post("/api/pet/action", { action: "pet" }, { "X-Requested-With": "other" })).status, 403);
});

test("the pet is described, acted on and renamed", async () => {
  const state = await json(get("/api/pet"));
  assert.equal(state.api, 1);
  assert.equal(state.stage, "egg");
  assert.equal(state.stage_label, "Ei");

  const first = await json(post("/api/pet/action", { action: "pet", id: "tap-1", by: "test" }));
  assert.equal(first.api, 1);
  assert.equal(typeof first.accepted, "boolean");
  assert.equal(first.state.name, state.name);
  // sent twice, carried out once
  await post("/api/pet/action", { action: "pet", id: "tap-1", by: "test" });
  const { events } = await json(get("/api/pet/events?limit=100"));
  assert.equal(events.filter((event: { by: string }) => event.by === "test").length, 1);
  assert.equal((await json(get("/api/pet/events?limit=1"))).events.length, 1);
  assert.equal((await json(get("/api/pet/events?limit=many"))).api, 1);

  assert.equal((await json(post("/api/pet/settings", { name: " Mimi   Mau " }))).name, "Mimi Mau");
  assert.equal((await json(post("/api/pet/new_egg", { confirm: true }))).stage, "egg");
  assert.deepEqual(await json(get("/api/pet/ancestors")), { api: 1, ancestors: [] });
});

test("the pictures: what the panel shows, and the app icon", async () => {
  const preview = await get("/preview.png");
  assert.equal(preview.headers.get("cache-control"), "no-store");
  const frame = decodePng(new Uint8Array(await preview.arrayBuffer()));
  assert.deepEqual([frame.width, frame.height], [64, 64]);

  for (const [query, size] of [["", 192], ["?size=512&maskable=1", 512], ["?stage=adult&species=cyclopuff", 192],
    ["?stage=adult&species=dragon", 192]] as const) {
    const response = await get(`/pet-icon.png${query}`);
    assert.equal(response.headers.get("content-type"), "image/png");
    const icon = decodePng(new Uint8Array(await response.arrayBuffer()));
    assert.deepEqual([icon.width, icon.height], [size, size]);
  }
});

test("anything else is not there, and a request that is too big is cut off", async () => {
  assert.equal((await get("/api/nothing")).status, 404);
  assert.equal((await post("/api/state", {})).status, 404);
  assert.equal((await fetch(origin + "/api/pet", { method: "HEAD" })).status, 200);
  const status = await new Promise((resolve, reject) => {
    const request = httpRequest(origin + "/api/night", { method: "POST", headers: { "X-Requested-With": "led-matrix" } },
      (response) => resolve(response.statusCode));
    request.on("error", reject);
    request.end("x".repeat(70 * 1024));
  });
  assert.equal(status, 413);
});

test("the save file is downloaded and loaded again on the settings page", async () => {
  await post("/api/pet/settings", { name: "Erster" });
  const download = await get("/api/pet/save");
  assert.match(download.headers.get("content-disposition")!, /^attachment; filename="blobling-\d{4}-\d\d-\d\d\.json"$/);
  const save = await json(download);
  assert.equal(save.pet.name, "Erster");

  await post("/api/pet/settings", { name: "Zweiter" });
  assert.equal((await post("/api/pet/save", save)).status, 200);
  assert.equal((await json(get("/api/pet"))).name, "Erster");
  // the one it replaced is kept aside, and the loaded one is saved at once
  assert.equal(JSON.parse(readFileSync(asideFile, "utf-8")).pet.name, "Zweiter");
  assert.equal(JSON.parse(readFileSync(app.petFile, "utf-8")).pet.name, "Erster");
  // loading needs the header as well
  assert.equal((await post("/api/pet/save", save, {})).status, 403);
});
