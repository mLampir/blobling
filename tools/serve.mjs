// Builds the app and serves it on this computer:  npm run app
//
// Opens the pet as the app from the stores has it, with the pet living in the browser (no Pi,
// no panel), at http://localhost:8080. A pet started here stays in this browser's storage.
// Only this computer can open it; the port can be changed with --port.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { port: { type: "string", default: "8080" } } });
const ROOT = "dist/app";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".map": "application/json" };

const built = spawnSync(process.execPath, ["tools/build.mjs"], { stdio: "inherit" });
if (built.status !== 0) {
  process.exit(built.status ?? 1);
}

createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url ?? "/", "http://app").pathname)).replace(/^([/\\])+/, "");
  try {
    if (path.startsWith("..")) {
      throw new Error("outside the app");
    }
    const file = join(ROOT, path || "index.html");
    const body = readFileSync(file);
    response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(Number(values.port), "localhost", () => console.log(`The app: http://localhost:${values.port}`));
