// The app's sounds: short, soft tones, nothing at all while they are off or before a touch.

import assert from "node:assert/strict";
import { test } from "node:test";

import { SOUNDS, Sounds, type Audio, type Storage } from "../src/sound";

function memory(): Storage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

/** A stand-in for an AudioContext that counts the tones started. */
function fakeAudio(): Audio & { started: number; resumed: number } {
  const param = { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
  const node = (): any => ({ gain: { ...param }, frequency: { ...param }, type: "sine", connect: (next: unknown) => next });
  const audio = {
    currentTime: 0,
    state: "suspended" as AudioContextState,
    destination: node(),
    started: 0,
    resumed: 0,
    async resume() {
      audio.resumed++;
      audio.state = "running";
    },
    createGain: node,
    createOscillator: () => ({ ...node(), start: () => void audio.started++, stop() {} }),
  };
  return audio as unknown as Audio & { started: number; resumed: number };
}

test("every sound is short and soft", () => {
  for (const [name, tones] of Object.entries(SOUNDS)) {
    assert.ok(tones.length > 0, name);
    for (const { from, to, at, length, volume } of tones) {
      for (const hz of [from, to ?? from]) assert.ok(hz >= 80 && hz <= 4500, `${name}: ${hz} Hz`);
      assert.ok(at + length <= 1.2, `${name} is too long`);
      assert.ok(volume > 0 && volume <= 1, `${name}: volume ${volume}`);
    }
  }
});

test("sounds play only after a touch has started the audio", async () => {
  const audio = fakeAudio();
  const sounds = new Sounds(() => memory(), () => audio);
  sounds.play("boop");
  assert.equal(audio.started, 0);
  sounds.wake();
  await Promise.resolve();
  sounds.play("ok");
  assert.equal(audio.started, SOUNDS.ok.length);
});

test("turned off, they stay off, also after the app is opened again", async () => {
  const storage = memory(), audio = fakeAudio();
  const sounds = new Sounds(() => storage, () => audio);
  assert.equal(sounds.on, true);
  sounds.on = false;
  sounds.wake();
  sounds.play("tada");
  assert.equal(audio.started, 0);
  assert.equal(audio.resumed, 0);
  assert.equal(new Sounds(() => storage, () => audio).on, false);

  sounds.on = true;  // a tap on "On" starts the audio by itself
  await Promise.resolve();
  sounds.play("tada");
  assert.equal(audio.started, SOUNDS.tada.length);
  assert.equal(storage.items.size, 0);
});

test("nothing plays while the page is hidden, or without audio", () => {
  const audio = fakeAudio();
  const hidden = new Sounds(() => memory(), () => audio, () => true);
  hidden.wake();
  hidden.play("boop");
  assert.equal(audio.started, 0);

  const none = new Sounds(() => undefined, () => null);
  none.wake();
  none.play("boop");  // no error
  assert.equal(none.on, true);
});
