// Runs the tests of the TypeScript code:  npm test  (or: npm test -- model, for one file)
//
// Every *.test.ts in core/test/, pi/test/ and app/test/ is bundled into dist/test/ and handed to Node's own
// test runner. The time zone is fixed, because the game works with local time.

import { spawnSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { build } from "esbuild";

const wanted = process.argv.slice(2);
// the bundle's name in dist/test/ ("core/model.test") -> the file ("core/test/model.test.ts")
const tests = Object.fromEntries(["core", "pi", "app"].flatMap((part) => readdirSync(`${part}/test`)
  .filter((name) => name.endsWith(".test.ts"))
  .filter((name) => !wanted.length || wanted.some((text) => name.includes(text)))
  .map((name) => [`${part}/${name.slice(0, -3)}`, `${part}/test/${name}`])));
const names = Object.keys(tests);
if (!names.length) {
  console.error("No test file matches.");
  process.exit(1);
}

rmSync("dist/test", { recursive: true, force: true });
await build({
  entryPoints: tests,
  outdir: "dist/test",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  logLevel: "warning",
});

const files = names.map((name) => `dist/test/${name}.mjs`);
const result = spawnSync(process.execPath, ["--enable-source-maps", "--test", "--test-reporter=spec", ...files], {
  stdio: "inherit",
  env: { ...process.env, TZ: "Europe/Berlin" },
});
process.exit(result.status ?? 1);
