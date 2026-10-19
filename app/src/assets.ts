/**
 * What the app brings along: the language files, the sprite sheets and the sounds, built into the script
 * (tools/build.mjs), so the app needs nothing from a server.
 */

import type { SceneAssets } from "../../core/src/scene";
import { Sheet } from "../../core/src/sprites";
import locales from "blobling:locales";
import packed from "blobling:sheets";
import packedSounds from "blobling:sounds";

export { locales };

let assets: SceneAssets | null = null;

function bytes(base64: string): Uint8Array {
  const text = atob(base64);
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i);
  }
  return out;
}

/** The sprite sheets, unpacked the first time they are needed. The app has no panel font: no clock, no temperature. */
export function sceneAssets(): SceneAssets {
  if (!assets) {
    const sheets: Record<string, Sheet> = {};
    for (const [name, { data, png }] of Object.entries(packed)) {
      sheets[name] = new Sheet(data, bytes(png));
    }
    assets = { sheets, font: null };
  }
  return assets;
}

let sounds: Record<string, Uint8Array> | null = null;

/** The sound files (WAV) by name, unpacked the first time they are needed. */
export function soundFiles(): Record<string, Uint8Array> {
  if (!sounds) {
    sounds = {};
    for (const [name, wav] of Object.entries(packedSounds)) {
      sounds[name] = bytes(wav);
    }
  }
  return sounds;
}
