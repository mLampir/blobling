/**
 * The pictures for the apps from the stores:  npm run app:icons
 *
 * Draws the app icon (the pet as a child, as the Pi's pet page has it) and the splash screen into
 * app/native/, then @capacitor/assets cuts them into every size Android and iOS ask for, in
 * app/android/ and app/ios/. Run it again after the pet's look changes.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Image } from "../core/src/image";
import { APP_BACKGROUND, PetScene } from "../core/src/scene";
import { readAssets } from "../pi/src/assets";
import { encodePng } from "../pi/src/png";

const OUT = join("app", "native");
const HEX = "#" + APP_BACKGROUND.map((part) => part.toString(16).padStart(2, "0")).join("");

const scene = new PetScene(64, 64, readAssets());
mkdirSync(OUT, { recursive: true });

// The icon with room around the pet, so Android can cut it to a circle (maskable)
const icon = scene.icon(1024, "child", "blob", true);
writeFileSync(join(OUT, "icon-only.png"), encodePng(icon));

// Android's adaptive icon: the pet on its own in front, the background behind it
const front = icon.copy();
for (let i = 0; i < front.data.length; i += 4) {
  if (front.data[i] === APP_BACKGROUND[0] && front.data[i + 1] === APP_BACKGROUND[1] && front.data[i + 2] === APP_BACKGROUND[2]) {
    front.data[i + 3] = 0;
  }
}
writeFileSync(join(OUT, "icon-foreground.png"), encodePng(front));
writeFileSync(join(OUT, "icon-background.png"), encodePng(Image.filled(1024, 1024, APP_BACKGROUND)));

// Splash screen: the pet small in the middle of the app's background
const splash = Image.filled(2732, 2732, APP_BACKGROUND);
const pet = scene.icon(416, "child", "blob");
splash.paste(pet, (splash.width - pet.width) / 2, (splash.height - pet.height) / 2);
writeFileSync(join(OUT, "splash.png"), encodePng(splash));
writeFileSync(join(OUT, "splash-dark.png"), encodePng(splash));
console.log(`Drawn into ${OUT}/`);

const result = spawnSync("npx", ["--yes", "@capacitor/assets@3.0.5", "generate", "--assetPath", OUT,
  "--android", "--ios", "--androidProject", join("app", "android"), "--iosProject", join("app", "ios", "App"),
  "--iconBackgroundColor", HEX, "--iconBackgroundColorDark", HEX,
  "--splashBackgroundColor", HEX, "--splashBackgroundColorDark", HEX], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
