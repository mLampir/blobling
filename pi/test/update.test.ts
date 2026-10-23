import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { Updates, newer } from "../src/update";
import { tempDir } from "./helpers";

/** A folder like /opt/led-matrix after installing `version` from a release. */
function release(version: string | null, repo: string | null = "someone/blobling"): string {
  const directory = tempDir();
  if (version !== null) {
    writeFileSync(join(directory, "VERSION"), `${version}\n`);
  }
  if (repo !== null) {
    writeFileSync(join(directory, "REPO"), `${repo}\n`);
  }
  return directory;
}

/** GitHub's answer to .../releases/latest: where the redirect ended. */
function github(url: string, status = 200): typeof fetch {
  return (async () => ({ ok: status < 400, status, url })) as unknown as typeof fetch;
}

/** systemctl that answers is-active with `state` and keeps what it was asked. */
function systemctl(state: string, calls: string[][] = []) {
  return async (args: string[]): Promise<string> => {
    calls.push(args);
    return args[0] === "is-active" ? state : "";
  };
}

test("installed from a checkout, nothing is looked up", async () => {
  for (const directory of [release(null), release("v1.0.0", null), release("v1.0.0", "not a repo")]) {
    const updates = new Updates(directory, () => assert.fail("no request"), systemctl("inactive"));
    assert.equal(updates.enabled, false);
    await updates.check();
    assert.equal(await updates.start(), false);
    assert.equal(updates.state().available, false);
  }
});

test("a newer release is found and installed through the update unit", async () => {
  const asked: string[] = [];
  const calls: string[][] = [];
  const request = (async (url: string) => {
    asked.push(url);
    return { ok: true, status: 200, url: "https://github.com/someone/blobling/releases/tag/v1.1.0" };
  }) as unknown as typeof fetch;
  const updates = new Updates(release("v1.0.0"), request, systemctl("inactive", calls));
  assert.deepEqual(updates.state(),
    { current: "v1.0.0", latest: null, available: false, running: false, failed: false, beta: false });

  await updates.check();
  assert.deepEqual(asked, ["https://github.com/someone/blobling/releases/latest"]);
  assert.deepEqual(updates.state(),
    { current: "v1.0.0", latest: "v1.1.0", available: true, running: false, failed: false, beta: false });

  assert.equal(await updates.start(), true);
  assert.deepEqual(calls.at(-1), ["start", "--no-block", "led-matrix-update.service"]);
  assert.equal(updates.state().running, true);
  // not twice
  assert.equal(await updates.start(), false);
});

test("the button looks again, so a release that came out since the last look is installed at once", async () => {
  let tag = "v1.0.0";
  const request = (async () => ({ ok: true, status: 200,
    url: `https://github.com/someone/blobling/releases/tag/${tag}` })) as unknown as typeof fetch;
  const updates = new Updates(release("v1.0.0"), request, systemctl("inactive"));
  await updates.check();
  assert.equal(updates.state().available, false);
  tag = "v1.1.0";
  assert.equal(await updates.start(), true);
  assert.equal(updates.state().latest, "v1.1.0");
});

test("up to date, no release yet, or GitHub out of reach: nothing to install", async () => {
  const same = new Updates(release("v1.1.0"), github("https://github.com/someone/blobling/releases/tag/v1.1.0"),
    systemctl("inactive"));
  await same.check();
  assert.equal(same.state().latest, "v1.1.0");
  assert.equal(same.state().available, false);

  for (const request of [github("https://github.com/someone/blobling/releases"), github("https://github.com/x", 404),
    (async () => { throw new Error("offline"); }) as unknown as typeof fetch]) {
    const updates = new Updates(release("v1.0.0"), request, systemctl("inactive"));
    await updates.check();
    assert.equal(updates.state().latest, null);
    assert.equal(await updates.start(), false);
  }
});

test("a running or failed update unit is reported", async () => {
  const newer = github("https://github.com/someone/blobling/releases/tag/v2.0.0");
  const busy = new Updates(release("v1.0.0"), newer, systemctl("activating"));
  await busy.check();
  assert.equal(busy.state().running, true);
  assert.equal(busy.state().available, false);

  const failed = new Updates(release("v1.0.0"), newer, systemctl("failed"));
  await failed.check();
  assert.equal(failed.state().failed, true);
  assert.equal(failed.state().available, true);
});

test("only a newer release is offered: a beta comes before its release, not after the one before", async () => {
  const cases: [string, string, boolean][] = [
    ["v1.1.0", "v1.0.0", true], ["v1.0.0", "v1.1.0", false], ["v1.0.0", "v1.0.0", false],
    ["v1.10.0", "v1.9.0", true], ["v2.0.0", "v1.99.99", true],
    ["v0.2.0", "v0.2.0-beta.1", true], ["v0.1.1", "v0.2.0-beta.1", false], ["v0.2.0-beta.1", "v0.2.0", false],
    ["v0.2.0-beta.2", "v0.2.0-beta.1", true], ["v0.2.0-beta.10", "v0.2.0-beta.9", true],
    ["v0.2.0-rc.1", "v0.2.0-beta.3", true], ["v0.2.0-beta.1.1", "v0.2.0-beta.1", true],
    ["v1.0.0", "dev-abc", true], ["dev-abc", "dev-abc", false],
  ];
  for (const [latest, current, expected] of cases) {
    assert.equal(newer(latest, current), expected, `${latest} after ${current}`);
  }
  const updates = new Updates(release("v0.2.0-beta.1"), github("https://github.com/someone/blobling/releases/tag/v0.1.1"),
    systemctl("inactive"));
  await updates.check();
  assert.equal(updates.state().available, false);
  assert.equal(await updates.start(), false);
});

test("with betas, the newest release or pre-release is installed, exactly that version", async () => {
  const asked: string[] = [];
  const releases = [
    { tag_name: "v1.1.0-beta.2", draft: true }, { tag_name: "v1.1.0-beta.1" }, { tag_name: "v1.0.1" },
    { tag_name: "not a version!" }, {},
  ];
  const request = (async (url: string) => {
    asked.push(url);
    return { ok: true, status: 200, json: async () => releases };
  }) as unknown as typeof fetch;
  let beta = true;
  const directory = release("v1.0.0");
  const env = join(directory, "update.env");
  const calls: string[][] = [];
  const updates = new Updates(directory, request, systemctl("inactive", calls), () => beta, env);
  await updates.check();
  assert.deepEqual(asked, ["https://api.github.com/repos/someone/blobling/releases?per_page=20"]);
  assert.deepEqual(updates.state(),
    { current: "v1.0.0", latest: "v1.1.0-beta.1", available: true, running: false, failed: false, beta: true });
  assert.equal(await updates.start(), true);
  assert.equal(readFileSync(env, "utf-8"), "LED_MATRIX_VERSION=v1.1.0-beta.1\n");
  assert.deepEqual(calls.at(-1), ["start", "--no-block", "led-matrix-update.service"]);

  // switched off again: only releases, so a Pi on a beta waits for its release
  beta = false;
  const onBeta = new Updates(release("v1.1.0-beta.1"), github("https://github.com/someone/blobling/releases/tag/v1.0.1"),
    systemctl("inactive"), () => beta);
  await onBeta.check();
  assert.equal(onBeta.state().available, false);
});
