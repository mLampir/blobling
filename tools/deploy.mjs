// Builds the app, copies it to the Pi and updates it there:  npm run deploy
//
//   npm run deploy                              app and configuration only (fast)
//   npm run deploy -- --full                    full setup including the system update
//   npm run deploy -- --host pi@192.168.0.42    a different Pi, or by IP address
//
// Without --host the environment variable LED_MATRIX_PI applies, otherwise pi@raspberrypi.local.
// It needs the build tools (npm ci, once) and ssh and tar, which Windows, macOS and Linux all
// bring along. On the Pi it runs setup.sh, and sudo there asks for the password.

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { BUNDLE_EXCLUDES, BUNDLE_FILES } from "./bundle.mjs";

const { values } = parseArgs({ options: { full: { type: "boolean" }, host: { type: "string" } } });
const host = values.host ?? process.env.LED_MATRIX_PI ?? "pi@raspberrypi.local";

const REMOTE_ARCHIVE = "/tmp/led-matrix-pi-update.tar.gz";
const REMOTE_DIR = "~/led-matrix-pi";
const files = [...BUNDLE_FILES];
// config.ini is not in Git, but should go to the Pi as well.
if (existsSync("config.ini")) {
  files.push("config.ini");
}

const step = (text) => console.log(`\x1b[36m==> ${text}\x1b[0m`);

function fail(what, detail) {
  console.error(`${what} failed (${detail})`);
  process.exit(1);
}

function run(what, command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    fail(what, result.error?.message ?? `exit code ${result.status}`);
  }
}

/** Packs the files and sends the archive straight to the Pi, without a file in between. */
function copy() {
  return new Promise((resolve) => {
    const tar = spawn("tar", ["-czf", "-", ...BUNDLE_EXCLUDES, ...files], { stdio: ["ignore", "pipe", "inherit"] });
    const ssh = spawn("ssh", [host, `cat > ${REMOTE_ARCHIVE}`], { stdio: ["pipe", "inherit", "inherit"] });
    tar.stdout.pipe(ssh.stdin);
    ssh.stdin.on("error", () => {}); // a connection that fails is reported by ssh's exit code
    let left = 2;
    for (const [name, child] of [["Packing", tar], ["Copying", ssh]]) {
      child.on("error", (error) => fail(name, error.message));
      child.on("exit", (code) => {
        if (code !== 0) {
          fail(name, `exit code ${code}`);
        }
        if (--left === 0) {
          resolve();
        }
      });
    }
  });
}

if (!existsSync("setup.sh")) {
  fail("Deploying", "start it from the repo folder");
}
if (!existsSync("node_modules/esbuild")) {
  fail("Deploying", "the build tools are missing: run `npm ci` once");
}

step("Building the server");
run("Building", process.execPath, ["tools/build.mjs"]);

step(`Copying to ${host}: ${files.join(", ")}`);
await copy();

step("Installing on the Pi (sudo asks for the password)");
// Replace the folder on the Pi completely, so deleted files don't linger.
run("Setup on the Pi", "ssh", ["-t", host, [
  "set -e",
  `rm -rf ${REMOTE_DIR}`,
  `mkdir ${REMOTE_DIR}`,
  `tar -xzf ${REMOTE_ARCHIVE} -C ${REMOTE_DIR} --warning=no-unknown-keyword`,
  `rm -f ${REMOTE_ARCHIVE}`,
  `chmod 600 ${REMOTE_DIR}/config.ini 2>/dev/null || true`,
  `cd ${REMOTE_DIR}`,
  `sudo bash setup.sh${values.full ? "" : " --app"}`,
].join("; ")]);
