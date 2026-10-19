/**
 * The pictures for the apps from the stores:  npm run app:icons
 *
 * Draws the app icon (the pet as a baby on the night sky of the app, happy with a heart) and the splash screen into
 * app/native/, then @capacitor/assets cuts them into every size Android and iOS ask for, in
 * app/android/ and app/ios/. The icon for the Google Play listing (512 × 512, uploaded by hand)
 * lands in app/native/ as well. Run it again after the pet's look changes.
 *
 * Android's small icon for the notifications (app/src/notify.ts) is drawn here directly: the
 * pet's outline in white, with its face cut out, as Android wants it in the status bar.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Image, lerp, type Color } from "../core/src/image";
import { APP_BACKGROUND, PetScene, SPRITE, drawHeart } from "../core/src/scene";
import { readAssets } from "../pi/src/assets";
import { encodePng } from "../pi/src/png";

const OUT = join("app", "native");
const HEX = "#" + APP_BACKGROUND.map((part) => part.toString(16).padStart(2, "0")).join("");
const SIZE = 1024;
const SKY: Color = [48, 70, 140]; // the glow behind the pet, fading into the app's night
const NIGHT: Color = [13, 18, 32];
const STAR: Color = [238, 241, 248];
// The stars, as [x, y] on a grid of 64 × 64, kept in the upper half
const STARS: [number, number][] = [[8, 21], [11, 6], [18, 13], [24, 3], [30, 17], [46, 7], [51, 22], [55, 4],
  [57, 14], [42, 25], [4, 12]];

const scene = new PetScene(64, 64, readAssets());
mkdirSync(OUT, { recursive: true });

/**
 * The baby on its own (transparent around it) with the heart it is happy about up at its side,
 * cut to their pixels and enlarged by whole pixels.
 */
function baby(scale: number, heart = true): Image {
  const native = scene.icon(SPRITE + 8, "baby", "blob"); // scene.icon pads the sprite by 4
  for (let i = 0; i < native.data.length; i += 4) {
    if (native.data[i] === APP_BACKGROUND[0] && native.data[i + 1] === APP_BACKGROUND[1] && native.data[i + 2] === APP_BACKGROUND[2]) {
      native.data[i + 3] = 0;
    }
  }
  const [x0, y0, x1, y1] = native.bbox()!;
  const pet = native.crop(x0, y0, x1, y1);
  let group = pet;
  if (heart) {
    // the heart (7 × 6) over the right shoulder, one pixel apart from the head
    group = new Image(pet.width + 3, pet.height + 5);
    group.alphaComposite(pet, 0, 5);
    drawHeart(group, pet.width - 4, 0);
  }
  return group.resized(group.width * scale, group.height * scale);
}

/** The night sky of the app: a glow low in the middle, and a few square stars. */
function sky(): Image {
  const img = new Image(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const t = Math.min(1, Math.hypot(x / SIZE - 0.5, y / SIZE - 0.6) / 0.75);
      img.point(x, y, lerp(SKY, NIGHT, t));
    }
  }
  const cell = SIZE / 64;
  for (const [x, y] of STARS) {
    img.rectangle(x * cell, y * cell, x * cell + cell - 1, y * cell + cell - 1, STAR);
  }
  return img;
}

/** The pet stands in the middle, a little below the center; `scale` sets its size. */
function withPet(base: Image, scale: number): Image {
  const pet = baby(scale);
  const img = base.copy();
  img.alphaComposite(pet, Math.round((SIZE - pet.width) / 2), Math.round(SIZE * 0.6 - pet.height / 2));
  return img;
}

// The whole icon (iOS rounds its corners, older Android versions take it as it is), and the
// one for the Google Play listing
const background = sky();
const icon = withPet(background, 23);
writeFileSync(join(OUT, "icon-only.png"), encodePng(icon));
writeFileSync(join(OUT, "play-store-icon.png"), encodePng(icon.resized(512, 512)));

// Android's adaptive icon: the sky behind, the pet in front, small enough for the circle it is
// cut to (the inner two thirds)
writeFileSync(join(OUT, "icon-background.png"), encodePng(background));
writeFileSync(join(OUT, "icon-foreground.png"), encodePng(withPet(new Image(SIZE, SIZE), 16)));

// Splash screen: the pet small in the middle of the app's background
const splash = Image.filled(2732, 2732, APP_BACKGROUND);
const pet = baby(12, false);
splash.alphaComposite(pet, Math.round((splash.width - pet.width) / 2), Math.round((splash.height - pet.height) / 2));
writeFileSync(join(OUT, "splash.png"), encodePng(splash));
writeFileSync(join(OUT, "splash-dark.png"), encodePng(splash));
console.log(`Drawn into ${OUT}/`);

// The notification icon: white where the pet is, see-through elsewhere and where its face is
const DENSITIES: Record<string, number> = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
const plain = scene.icon(SPRITE + 8, "child", "blob");
const outline = new Image(plain.width, plain.height);
for (let i = 0; i < plain.data.length; i += 4) {
  const [r, g, b] = plain.data.subarray(i, i + 3);
  const background = r === APP_BACKGROUND[0] && g === APP_BACKGROUND[1] && b === APP_BACKGROUND[2];
  if (!background && 0.3 * r + 0.59 * g + 0.11 * b >= 60) { // dark: the eyes and the mouth
    outline.data.set([255, 255, 255, 255], i);
  }
}
const [x0, y0, x1, y1] = outline.bbox()!;
const side = Math.max(x1 - x0, y1 - y0) + 2; // a pixel of room all around
const square = new Image(side, side);
square.blit(outline.crop(x0, y0, x1, y1), Math.floor((side - (x1 - x0)) / 2), Math.floor((side - (y1 - y0)) / 2));
for (const [density, size] of Object.entries(DENSITIES)) {
  const folder = join("app", "android", "app", "src", "main", "res", `drawable-${density}`);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "ic_stat_pet.png"), encodePng(square.resized(size, size)));
}
console.log("Drew the notification icon into app/android/");

const result = spawnSync("npx", ["--yes", "@capacitor/assets@3.0.5", "generate", "--assetPath", OUT,
  "--android", "--ios", "--androidProject", join("app", "android"), "--iosProject", join("app", "ios", "App"),
  "--iconBackgroundColor", HEX, "--iconBackgroundColorDark", HEX,
  "--splashBackgroundColor", HEX, "--splashBackgroundColorDark", HEX], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
