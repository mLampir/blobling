/**
 * What the app brings along: the language files and the sprite sheets, built into the script
 * (tools/build.mjs), so the app needs nothing from a server.
 */

import type { SceneAssets } from "../../core/src/scene";
import { Sheet } from "../../core/src/sprites";
import locales from "blobling:locales";
import packed from "blobling:sheets";

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
