// Builds the TypeScript code:  npm run build
//
// The server for the Pi becomes one file, dist/pi/server.mjs; that file is all of the TypeScript
// code the Pi needs. The app becomes dist/app/: its page (index.html, from app/pet.html) and one
// script with the core, the language files, the sprite sheets and the sounds in it, so it runs from any
// folder; the Pi serves the same script with its own copy of the page, and Capacitor packs the
// folder into the apps for the stores. The core alone becomes one file for Node and one for the
// browser, both in dist/. The browser build doubles as a check that the core uses nothing that
// only Node has.

import { copyFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const LOCALE_DIR = "app/locales";
const SHEET_DIR = "app/pet/assets";
const SOUND_DIR = "app/pet/sounds";

const shared = {
  bundle: true,
  format: "esm",
  sourcemap: true,
  logLevel: "info",
};

const core = { ...shared, entryPoints: ["core/src/index.ts"] };

/**
 * What the app takes from the repo's files: "blobling:locales" (every language file),
 * "blobling:sheets" (every sprite sheet, its picture as base64) and "blobling:sounds" (every
 * sound, its WAV file as base64). Declared in app/src/virtual.d.ts.
 */
const appFiles = {
  name: "app-files",
  setup(builder) {
    builder.onResolve({ filter: /^blobling:/ }, (args) => ({ path: args.path.slice("blobling:".length), namespace: "blobling" }));
    builder.onLoad({ filter: /.*/, namespace: "blobling" }, (args) => {
      const files = [];
      const content = {};
      if (args.path === "locales") {
        // only a plain language code counts as a language file (as on the Pi, pi/src/storage.ts)
        for (const file of readdirSync(LOCALE_DIR).filter((name) => /^[a-z]{2,3}(-[a-z0-9]{2,8})*\.json$/.test(name))) {
          files.push(join(LOCALE_DIR, file));
          content[file.slice(0, -".json".length)] = JSON.parse(readFileSync(join(LOCALE_DIR, file), "utf-8"));
        }
      } else if (args.path === "sheets") {
        for (const file of readdirSync(SHEET_DIR).filter((name) => name.endsWith(".json")).sort()) {
          const data = JSON.parse(readFileSync(join(SHEET_DIR, file), "utf-8"));
          files.push(join(SHEET_DIR, file), join(SHEET_DIR, data.meta.image));
          content[file.slice(0, -".json".length)] = { data, png: readFileSync(join(SHEET_DIR, data.meta.image)).toString("base64") };
        }
      } else if (args.path === "sounds") {
        for (const file of readdirSync(SOUND_DIR).filter((name) => name.endsWith(".wav")).sort()) {
          files.push(join(SOUND_DIR, file));
          content[file.slice(0, -".wav".length)] = readFileSync(join(SOUND_DIR, file)).toString("base64");
        }
      } else {
        return { errors: [{ text: `Unknown file set blobling:${args.path}` }] };
      }
      return { contents: `export default ${JSON.stringify(content)};`, loader: "js", watchFiles: files };
    });
  },
};

await build({ ...shared, entryPoints: ["pi/src/main.ts"], platform: "node", target: "node22",
  outfile: "dist/pi/server.mjs" });
await build({ ...shared, entryPoints: ["app/src/main.ts"], platform: "browser", format: "iife", minify: true, sourcemap: false,
  // what the phones of the last few years run (Android WebView, iOS Safari 15)
  target: ["es2020", "chrome90", "safari15"], plugins: [appFiles], outfile: "dist/app/app.js",
  // the version from the release tag when Codemagic builds the app for the stores (codemagic.yaml), else ""
  define: { __APP_VERSION__: JSON.stringify(process.env.VERSION ?? "") } });
mkdirSync("dist/app", { recursive: true });
copyFileSync("app/pet.html", "dist/app/index.html");
await build({ ...core, platform: "node", target: "node22", outfile: "dist/core.node.mjs" });
await build({ ...core, platform: "browser", target: "es2022", outfile: "dist/core.browser.js" });
