/**
 * The app's sounds:  npm run sounds
 *
 * Writes every recipe of tools/sfx.ts to app/pet/sounds/<name>.wav (mono, 16 bit, 22050 Hz).
 * The recipes are the only source of the sounds: change them there and run this again, don't
 * edit the WAV files. The build puts the files into the app's script (tools/build.mjs).
 */

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { RECIPES, encodeWav, render } from "./sfx";

const OUT = join("app", "pet", "sounds");

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT).filter((name) => name.endsWith(".wav"))) {
  rmSync(join(OUT, file));
}
let total = 0;
for (const [name, recipe] of Object.entries(RECIPES)) {
  const wav = encodeWav(render(recipe));
  writeFileSync(join(OUT, `${name}.wav`), wav);
  total += wav.length;
  console.log(`${name.padEnd(8)} ${((wav.length - 44) / 2 / 22050).toFixed(2)} s  ${(wav.length / 1024).toFixed(1)} KB`);
}
console.log(`Written to ${OUT}/: ${(total / 1024).toFixed(1)} KB in all`);
