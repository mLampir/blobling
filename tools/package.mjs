// Builds the release package for the Pi:  npm run package -- --version v1.2.0 [--repo owner/name]
//
// The package holds the same files that npm run deploy copies to the Pi, plus a VERSION file, so
// a Pi can tell which release it runs. It lands in dist/ as blobling-<version>.tar.gz, next to
// a .sha256 file with its checksum. With --repo, dist/install.sh is install.sh with that
// repository filled in, so it knows where to download the releases from; the package carries it
// too, with a REPO file, so the Pi can update itself. The release workflow
// (.github/workflows/release.yml) runs this and attaches the package, its checksum and
// install.sh to the release.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { BUNDLE_EXCLUDES, BUNDLE_FILES } from "./bundle.mjs";

const { values } = parseArgs({ options: { version: { type: "string" }, repo: { type: "string" } } });
const version = values.version ?? "dev";

function fail(what, detail) {
  console.error(`${what} failed (${detail})`);
  process.exit(1);
}

if (!/^[A-Za-z0-9._-]+$/.test(version)) {
  fail("Packaging", `"${version}" is not a valid version, use letters, digits, dots and dashes`);
}
if (values.repo !== undefined && !/^[\w.-]+\/[\w.-]+$/.test(values.repo)) {
  fail("Packaging", `"${values.repo}" is not a repository, use owner/name`);
}
if (!existsSync("setup.sh")) {
  fail("Packaging", "start it from the repo folder");
}

function run(what, command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error || result.status !== 0) {
    fail(what, result.error?.message ?? `exit code ${result.status}`);
  }
}

// Built without a version: the Pi reads its own from the VERSION file, so a beta's package can be
// released as the final version by changing only that file (.github/workflows/promote.yml).
run("Building", process.execPath, ["tools/build.mjs"], { ...process.env, VERSION: "" });

// Next to the app on the Pi: which release it is, where it came from and how to update it
// (pi/src/update.ts). Without --repo, install.sh keeps its placeholder and asks for LED_MATRIX_REPO.
writeFileSync("dist/VERSION", `${version}\n`);
const extras = ["VERSION", "install.sh"];
writeFileSync("dist/install.sh", readFileSync("install.sh", "utf-8").replace("@REPO@", values.repo ?? "@REPO@"),
  { mode: 0o755 });
rmSync("dist/REPO", { force: true });
if (values.repo) {
  writeFileSync("dist/REPO", `${values.repo}\n`);
  extras.push("REPO");
}

const archive = `dist/blobling-${version}.tar.gz`;
run("Packing", "tar", ["-czf", archive, ...BUNDLE_EXCLUDES, ...BUNDLE_FILES, "-C", "dist", ...extras]);

const name = archive.slice("dist/".length);
const sum = createHash("sha256").update(readFileSync(archive)).digest("hex");
writeFileSync(`${archive}.sha256`, `${sum}  ${name}\n`);
console.log(`${archive} (sha256 ${sum})`);
if (values.repo) {
  console.log(`dist/install.sh (for ${values.repo})`);
}
