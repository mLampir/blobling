import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { Image } from "../../core/src/image";
import { RequestError } from "../../core/src/model";
import { DEFAULT_BEDTIME } from "../../core/src/pet";
import { DEFAULT_NIGHT, cleanNight, nightActive, type FrameSink } from "../src/display";
import { parts, tempDir } from "./helpers";

const NIGHT = { enabled: true, start: "23:00", end: "07:00", action: "dim", brightness: 5 };

function refused(run: () => unknown, key: string): void {
  assert.throws(run, (error: unknown) => error instanceof RequestError && error.message === key);
}

/** Stands in for the panel: keeps what it was sent. */
class FakePanel implements FrameSink {
  frames: Image[] = [];
  levels: number[] = [];
  private waiting: (() => void) | null = null;

  async show(frame: Image): Promise<void> {
    this.frames.push(frame);
    this.waiting?.();
  }

  brightness(percent: number): void {
    this.levels.push(percent);
  }

  /** The next frame that arrives. */
  next(): Promise<Image> {
    return new Promise((resolve) => {
      this.waiting = () => {
        this.waiting = null;
        resolve(this.frames.at(-1)!);
      };
    });
  }
}

const lit = (frame: Image): boolean => frame.data.some((value, i) => i % 4 !== 3 && value !== 0);

test("night mode settings are checked", () => {
  assert.deepEqual(cleanNight({ ...NIGHT, enabled: 1, extra: true }), NIGHT);
  refused(() => cleanNight(null), "invalid_settings");
  refused(() => cleanNight([]), "invalid_settings");
  refused(() => cleanNight({ ...NIGHT, start: "24:00" }), "invalid_time");
  refused(() => cleanNight({ ...NIGHT, end: 7 }), "invalid_time");
  refused(() => cleanNight({ ...NIGHT, action: "sleep" }), "invalid_night_action");
  refused(() => cleanNight({ ...NIGHT, brightness: 0 }), "invalid_brightness");
  refused(() => cleanNight({ ...NIGHT, brightness: 5.5 }), "invalid_brightness");
  refused(() => cleanNight({ ...NIGHT, brightness: "5" }), "invalid_brightness");
});

test("the night runs from its start to its end, over midnight too", () => {
  const at = (hour: number, minute: number): Date => new Date(2026, 9, 12, hour, minute);
  const night = cleanNight(NIGHT);
  assert.ok(nightActive(night, at(23, 0)));
  assert.ok(nightActive(night, at(3, 30)));
  assert.ok(!nightActive(night, at(7, 0)));
  assert.ok(!nightActive(night, at(22, 59)));
  const nap = cleanNight({ ...NIGHT, start: "13:00", end: "14:00" });
  assert.ok(nightActive(nap, at(13, 30)));
  assert.ok(!nightActive(nap, at(14, 0)));
  assert.ok(!nightActive({ ...night, enabled: false }, at(3, 30)));
  assert.ok(!nightActive({ ...night, end: "23:00" }, at(23, 0)));
});

test("mode, brightness and night mode survive a restart", () => {
  const directory = tempDir();
  const { display } = parts(directory);
  assert.deepEqual(display.state(), { mode: "pet", brightness: 50, night: DEFAULT_NIGHT, pinned: null });
  assert.deepEqual(display.bedtime(), DEFAULT_BEDTIME);

  display.setMode("off");
  display.setBrightness(250);
  display.setNight(NIGHT);
  refused(() => display.setMode("disco"), "unknown_mode");
  const expected = { mode: "off", brightness: 100, night: NIGHT, pinned: null };
  assert.deepEqual(JSON.parse(readFileSync(join(directory, "state.json"), "utf-8")), expected);

  const restarted = parts(directory).display;
  assert.deepEqual(restarted.state(), expected);
  assert.deepEqual(restarted.bedtime(), ["23:00", "07:00"]); // the pet sleeps when the panel does
});

test("a saved state that is broken falls back to the defaults, part by part", () => {
  const directory = tempDir();
  writeFileSync(join(directory, "state.json"), JSON.stringify({ mode: "off", brightness: "bright", night: 5 }));
  assert.deepEqual(parts(directory).display.state(), { mode: "off", brightness: 50, night: DEFAULT_NIGHT, pinned: null });
  writeFileSync(join(directory, "state.json"), "not json");
  assert.deepEqual(parts(directory).display.state(), { mode: "pet", brightness: 50, night: DEFAULT_NIGHT, pinned: null });
});

test("the loop draws the pet, goes dark when switched off and shows the pet when it is given something", async () => {
  const panel = new FakePanel();
  const { display } = parts(tempDir(), panel);
  try {
    let frame = panel.next();
    display.start();
    assert.ok(lit(await frame));
    assert.equal(display.lastFrame, panel.frames.at(-1));
    assert.deepEqual([(await panel.next()).width, panel.frames[0].height], [64, 64]); // and it keeps drawing
    assert.deepEqual(panel.levels, [50]);

    frame = panel.next();
    display.setMode("off");
    assert.ok(!lit(await frame));
    const shown = panel.frames.length;
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(panel.frames.length, shown); // nothing to draw while it is off

    frame = panel.next();
    display.setBrightness(20);
    await frame;
    assert.deepEqual(panel.levels, [50, 20]);

    frame = panel.next();
    display.petAction("pet");
    assert.ok(lit(await frame));
  } finally {
    display.stop();
  }
});

test("the preview gets the next frame as soon as it is drawn, or the last one if none comes", async () => {
  const panel = new FakePanel();
  const { display } = parts(tempDir(), panel);
  const shown = display.lastFrame;
  assert.equal(await display.nextFrame(0.05), shown); // the loop is not running: nothing new comes
  try {
    const next = display.nextFrame(5);
    const drawn = panel.next();
    display.start();
    assert.equal(await next, await drawn);
    assert.notEqual(await next, shown);
  } finally {
    display.stop();
  }
});

test("the camera follows a switch at once, and something done with another pet once its pet is left alone", () => {
  const { display, pet } = parts(tempDir());
  const first = pet.current;
  const second = display.petNewEgg().id; // a new egg: the camera goes to it
  assert.equal(display.camera, second);
  display.look(first);
  assert.equal(display.camera, first);
  display.petAction("pet", { pet: first });
  display.petAction("pet", { pet: second }); // somebody else, while the first one is being played with
  assert.equal(display.camera, first);
  refused(() => display.look("nobody"), "no_pet");
});

test("a pinned pet keeps the camera until it is unpinned or gone", () => {
  const directory = tempDir();
  const { display, pet } = parts(directory);
  const first = pet.current;
  const second = display.petNewEgg().id;
  display.pin(first);
  assert.equal(display.camera, first);
  display.look(second);
  display.petNewEgg();
  assert.equal(display.camera, first);
  assert.equal(parts(directory).display.state().pinned, first); // it is kept
  display.petNewEgg(null, first); // a new egg in its place: nothing to pin any more
  assert.equal(display.state().pinned, null);
  display.pin(second);
  display.pin(null);
  display.look(pet.pets[0].id);
  assert.equal(display.camera, pet.pets[0].id);
});

test("the panel pans along the street, and a phone gets the frames of a pet the panel doesn't show", async () => {
  const panel = new FakePanel();
  const { display, pet } = parts(tempDir(), panel);
  const first = pet.current;
  const second = display.petNewEgg().id;
  try {
    display.look(first);
    let frame = panel.next();
    display.start();
    await frame;
    frame = panel.next();
    assert.ok(lit(await frame)); // still panning: drawn quickly, one frame after the other
    const own = await display.frameOf(second, true, 1);
    assert.equal(own.width, 64);
    assert.equal(await display.frameOf(second, false, 1), own);
    assert.equal(await display.frameOf(null, false, 1), display.lastFrame);
  } finally {
    display.stop();
  }
});
