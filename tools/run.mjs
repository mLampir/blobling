// Runs a tool that is written in TypeScript:  node tools/run.mjs pet_preview --spoiler-free
//
// tools/<name>.ts is bundled into dist/tools/ and started with the remaining arguments. The time
// zone is fixed unless one is set, because the scene works with local time (the sun times).

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { build } from "esbuild";

const [name, ...args] = process.argv.slice(2);
if (!name || !existsSync(`tools/${name}.ts`)) {
  console.error("Usage: node tools/run.mjs <tool> [arguments]   (a tools/<tool>.ts, from the repo folder)");
  process.exit(1);
}

const file = `dist/tools/${name}.mjs`;
await build({
  entryPoints: [`tools/${name}.ts`],
  outfile: file,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: true,
  logLevel: "warning",
});

const result = spawnSync(process.execPath, ["--enable-source-maps", file, ...args], {
  stdio: "inherit",
  env: { TZ: "Europe/Berlin", ...process.env },
});
process.exit(result.status ?? 1);
