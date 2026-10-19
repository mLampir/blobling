// The app's sounds: soft chiptune files, each one generated, nothing at all while they are off or before a touch.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { RECIPES, SAMPLE_RATE, decodeWav, render } from "../../tools/sfx";
import { SOUND_NAMES, Sounds, type Audio, type Storage } from "../src/sound";

const SOUND_DIR = join("app", "pet", "sounds");

function memory(): Storage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

/** One small stand-in file per sound. */
const files = () => Object.fromEntries(SOUND_NAMES.map((name) => [name, new Uint8Array([1, 2, 3])]));

/** A stand-in for an AudioContext that "decodes" every file and counts the sounds started. */
function fakeAudio(): Audio & { started: string[]; resumed: number; decoded: number } {
  const node = (): any => ({ gain: { value: 0 }, connect: (next: unknown) => next });
  const audio = {
    state: "suspended" as AudioContextState,
    destination: node(),
    started: [] as string[],
    resumed: 0,
    decoded: 0,
    async resume() {
      audio.resumed++;
      audio.state = "running";
    },
    createGain: node,
    async decodeAudioData(data: ArrayBuffer) {
      audio.decoded++;
      return { length: data.byteLength, id: audio.decoded } as unknown as AudioBuffer;
    },
    createBufferSource() {
      const source = { ...node(), buffer: null as AudioBuffer | null, start: () => void audio.started.push(String((source.buffer as any)?.id)) };
      return source;
    },
  };
  return audio as unknown as Audio & { started: string[]; resumed: number; decoded: number };
}

const settle = () => new Promise((done) => setTimeout(done, 0));

test("every sound has its generated file, and nothing more is in the folder", () => {
  assert.deepEqual(Object.keys(RECIPES).sort(), [...SOUND_NAMES].sort());
  const wavs = readdirSync(SOUND_DIR).filter((name) => name.endsWith(".wav")).sort();
  assert.deepEqual(wavs, SOUND_NAMES.map((name) => `${name}.wav`).sort(), "run npm run sounds");
});

test("the files are what the recipes make (npm run sounds after a change)", () => {
  for (const name of SOUND_NAMES) {
    const file = decodeWav(readFileSync(join(SOUND_DIR, `${name}.wav`)));
    const fresh = render(RECIPES[name]);
    assert.equal(file.samples.length, fresh.length, `${name} is out of date: run npm run sounds`);
    // a sample may differ in the last bit between machines, not more
    const off = file.samples.findIndex((value, i) => Math.abs(value - fresh[i]) > 3 / 32767);
    assert.equal(off, -1, `${name} is out of date: run npm run sounds`);
  }
});

test("every sound is short, soft and small", () => {
  let total = 0;
  for (const name of SOUND_NAMES) {
    const path = join(SOUND_DIR, `${name}.wav`);
    const { rate, channels, bits, samples } = decodeWav(readFileSync(path));
    assert.deepEqual([rate, channels, bits], [SAMPLE_RATE, 1, 16], name);
    assert.ok(samples.length / rate <= 1.2, `${name} is too long`);
    const peak = Math.max(...samples.map(Math.abs));
    assert.ok(peak > 0.05 && peak <= 0.51, `${name}: peak ${peak.toFixed(2)}`);
    total += statSync(path).size;
  }
  assert.ok(total < 300 * 1024, `the sounds take ${Math.round(total / 1024)} KB`);
});

test("sounds play only after a touch has started the audio", async () => {
  const audio = fakeAudio();
  const sounds = new Sounds(() => memory(), () => audio, files);
  sounds.play("boop");
  assert.equal(audio.started.length, 0);
  sounds.wake();
  await settle();
  assert.equal(audio.decoded, SOUND_NAMES.length);
  sounds.play("ok");
  assert.deepEqual(audio.started, [String(SOUND_NAMES.indexOf("ok") + 1)]);
  sounds.wake();  // decoded once only
  assert.equal(audio.decoded, SOUND_NAMES.length);
});

test("turned off, they stay off, also after the app is opened again", async () => {
  const storage = memory(), audio = fakeAudio();
  const sounds = new Sounds(() => storage, () => audio, files);
  assert.equal(sounds.on, true);
  sounds.on = false;
  sounds.wake();
  sounds.play("tada");
  assert.equal(audio.started.length, 0);
  assert.equal(audio.resumed, 0);
  assert.equal(new Sounds(() => storage, () => audio, files).on, false);

  sounds.on = true;  // a tap on "On" starts the audio by itself
  await settle();
  sounds.play("tada");
  assert.equal(audio.started.length, 1);
  assert.equal(storage.items.size, 0);
});

test("nothing plays while the page is hidden, or without audio, or with a file that won't decode", async () => {
  const audio = fakeAudio();
  const hidden = new Sounds(() => memory(), () => audio, files, () => true);
  hidden.wake();
  await settle();
  hidden.play("boop");
  assert.equal(audio.started.length, 0);

  const none = new Sounds(() => undefined, () => null, files);
  none.wake();
  none.play("boop");  // no error
  assert.equal(none.on, true);

  const broken = fakeAudio();
  broken.decodeAudioData = (async () => { throw new Error("not a sound"); }) as unknown as Audio["decodeAudioData"];
  const warn = console.warn;
  console.warn = () => {};
  try {
    const sounds = new Sounds(() => memory(), () => broken, files);
    sounds.wake();
    await settle();
    sounds.play("boop");  // no error, no sound
    assert.equal(broken.started.length, 0);
  } finally {
    console.warn = warn;
  }
});
