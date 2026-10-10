// Hardware test: draws test pictures in Node and sends them through
// panel_driver.py to the LED panel. It shows whether the picture is right and
// measures how fast frames get onto the panel and what that costs in CPU.
//
// On the Pi it is started through panel-test.sh, which stops the display
// service first. On a PC it runs without hardware:
//   LED_MATRIX_PYTHON=python node pi/panel-test.mjs

import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = process.env.LED_MATRIX_CONFIG ?? "/etc/led-matrix/config.ini";
const DATA_DIR = process.env.LED_MATRIX_DATA ?? "/var/lib/led-matrix";
const PYTHON = process.env.LED_MATRIX_PYTHON ?? "/opt/led-matrix/venv/bin/python";

const SCENE_FPS = 10; // what the pet scene runs at
const TICKS_PER_SECOND = 100; // unit of the CPU times in /proc

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

// ---------------------------------------------------------------- Settings

/** The [matrix] section of config.ini, and the brightness and night mode saved by the web interface. */
function loadSettings() {
  const cfg = { rows: 64, cols: 64, hardware_mapping: "adafruit-hat", gpio_slowdown: 2, brightness: 50 };
  let text = "";
  try {
    text = readFileSync(CONFIG_FILE, "utf8");
  } catch {
    console.log(`No ${CONFIG_FILE} – using the defaults.`);
  }
  let section = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const head = line.match(/^\[(.+)\]$/);
    if (head) {
      section = head[1];
      continue;
    }
    const pair = line.match(/^([^#;=]+?)\s*=\s*(.*)$/);
    if (section === "matrix" && pair && pair[1] in cfg) {
      cfg[pair[1]] = typeof cfg[pair[1]] === "number" ? Number(pair[2]) : pair[2];
    }
  }
  let nightBrightness = 5;
  try {
    const saved = JSON.parse(readFileSync(join(DATA_DIR, "state.json"), "utf8"));
    if (Number.isInteger(saved.brightness)) cfg.brightness = saved.brightness;
    if (Number.isInteger(saved.night?.brightness)) nightBrightness = saved.night.brightness;
  } catch {
    // No saved state yet: the initial value from the configuration applies.
  }
  return { ...cfg, nightBrightness };
}

// ---------------------------------------------------------------- Panel driver

class Panel {
  constructor(cfg) {
    this.output = "";
    this.answers = [];
    this.waiting = [];
    this.child = spawn(
      PYTHON,
      [
        join(HERE, "panel_driver.py"),
        "--rows", String(cfg.rows),
        "--cols", String(cfg.cols),
        "--hardware-mapping", cfg.hardware_mapping,
        "--gpio-slowdown", String(cfg.gpio_slowdown),
        "--brightness", String(cfg.brightness),
        "--show-refresh-rate",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    this.child.stdout.on("data", (chunk) => {
      for (const byte of chunk) {
        const waiter = this.waiting.shift();
        if (waiter) waiter.resolve(byte);
        else this.answers.push(byte);
      }
    });
    this.child.stderr.on("data", (chunk) => {
      // The library keeps overwriting one line with its refresh rate, so this is sorted out at the end.
      this.output += chunk.toString();
    });
    this.child.stdin.on("error", () => {}); // a dead driver is reported through `exited`
    this.exited = new Promise((resolve) => {
      const done = (what) => {
        for (const waiter of this.waiting.splice(0)) waiter.reject(new Error(`The panel driver stopped (${what}).`));
        this.stopped = what;
        resolve(what);
      };
      this.child.on("error", (error) => done(error.message));
      this.child.on("exit", (code, sig) => done(sig ?? `exit code ${code}`));
    });
  }

  answer() {
    if (this.answers.length) return Promise.resolve(this.answers.shift());
    if (this.stopped) return Promise.reject(new Error(`The panel driver stopped (${this.stopped}).`));
    return new Promise((resolve, reject) => this.waiting.push({ resolve, reject }));
  }

  async ready() {
    const timeout = sleep(30000).then(() => {
      throw new Error("The panel driver did not get ready within 30 seconds.");
    });
    await Promise.race([this.answer(), timeout]);
  }

  /** Sends one frame and waits until it is on the panel. Returns the milliseconds that took. */
  async show(frame) {
    const sent = performance.now();
    this.child.stdin.write("F");
    this.child.stdin.write(frame);
    await this.answer();
    return performance.now() - sent;
  }

  brightness(percent) {
    this.child.stdin.write(Buffer.from([0x42, percent]));
  }

  async close() {
    this.child.stdin.end();
    await this.exited;
  }

  /** What the driver and the matrix library printed: the refresh rates, and everything else as text. */
  report() {
    const rate = /\x08*\s*(\d+\.\d)Hz(?: \(lowest: (\d+\.\d)Hz\))?/g;
    const current = [];
    let lowest = null;
    for (const match of this.output.matchAll(rate)) {
      current.push(Number(match[1]));
      if (match[2]) lowest = Number(match[2]);
    }
    current.sort((a, b) => a - b);
    return {
      typical: current.length ? current[Math.floor(current.length / 2)] : null,
      lowest,
      messages: this.output.replace(rate, "").replace(/\x08/g, "").trim(),
    };
  }
}

// ---------------------------------------------------------------- Pictures

class Picture {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 3);
  }

  set(x, y, [r, g, b]) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 3;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
  }

  rect(x0, y0, w, h, color) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, color);
  }
}

const WHITE = [255, 255, 255];
const RED = [255, 0, 0];
const GREEN = [0, 255, 0];
const BLUE = [0, 0, 255];
const YELLOW = [255, 255, 0];
const BARS = [WHITE, YELLOW, [0, 255, 255], GREEN, [255, 0, 255], RED, BLUE, [0, 0, 0]];

/** Border, a color in every corner, color bars, ramps: shows orientation, swapped colors and dead rows. */
function stillPicture(width, height) {
  const p = new Picture(width, height);
  p.rect(0, 0, width, 1, WHITE);
  p.rect(0, height - 1, width, 1, WHITE);
  p.rect(0, 0, 1, height, WHITE);
  p.rect(width - 1, 0, 1, height, WHITE);
  p.rect(2, 2, 6, 6, RED);
  p.rect(width - 8, 2, 6, 6, GREEN);
  p.rect(2, height - 8, 6, 6, BLUE);
  p.rect(width - 8, height - 8, 6, 6, YELLOW);
  // Single pixels next to each other: smeared if the panel ghosts
  for (let y = 2; y < 8; y++) for (let x = 10; x < width - 10; x++) if ((x + y) % 2) p.set(x, y, WHITE);
  const inner = width - 4;
  for (let x = 0; x < inner; x++) {
    p.rect(2 + x, 12, 1, 16, BARS[Math.floor((x * BARS.length) / inner)]);
    const v = Math.round((x * 255) / (inner - 1));
    p.rect(2 + x, 30, 1, 6, [v, v, v]);
    p.rect(2 + x, 37, 1, 5, [v, 0, 0]);
    p.rect(2 + x, 42, 1, 5, [0, v, 0]);
    p.rect(2 + x, 47, 1, 5, [0, 0, v]);
  }
  return p.data;
}

/** A block bouncing up and down, a line sweeping across, in front of slowly changing colors. */
function movingPicture(width, height, seconds) {
  const p = new Picture(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wave = (offset) => Math.round(30 + 30 * Math.sin((x + y) / 12 + seconds + offset));
      p.set(x, y, [wave(0), wave(2.1), wave(4.2)]);
    }
  }
  p.rect(Math.floor(seconds * 16) % width, 0, 1, height, WHITE);
  const range = height - 8;
  const phase = (seconds * 24) % (2 * range);
  p.rect((width - 8) / 2, Math.round(phase < range ? phase : 2 * range - phase), 8, 8, YELLOW);
  return p.data;
}

// ---------------------------------------------------------------- CPU load

function coreTimes() {
  try {
    return readFileSync("/proc/stat", "utf8")
      .split("\n")
      .filter((line) => /^cpu\d+ /.test(line))
      .map((line) => {
        const [name, ...fields] = line.trim().split(/\s+/);
        const values = fields.slice(0, 8).map(Number);
        const total = values.reduce((a, b) => a + b, 0);
        return { name, busy: total - values[3] - values[4], total };
      });
  } catch {
    return null; // not Linux
  }
}

/** CPU time of every thread of a process so far, in ticks. */
function threadTimes(pid) {
  try {
    const times = {};
    for (const tid of readdirSync(`/proc/${pid}/task`)) {
      const stat = readFileSync(`/proc/${pid}/task/${tid}/stat`, "utf8");
      const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
      times[tid] = Number(fields[11]) + Number(fields[12]);
    }
    return times;
  } catch {
    return null;
  }
}

function startLoadMeter(driverPid) {
  const start = { at: performance.now(), node: process.cpuUsage(), cores: coreTimes(), threads: threadTimes(driverPid) };
  return () => {
    const seconds = (performance.now() - start.at) / 1000;
    const node = process.cpuUsage(start.node);
    const parts = [`Node ${percent((node.user + node.system) / 1e6 / seconds)}`];
    const threads = threadTimes(driverPid);
    if (start.threads && threads) {
      let main = 0;
      let library = 0;
      for (const [tid, ticks] of Object.entries(threads)) {
        const used = ticks - (start.threads[tid] ?? 0);
        if (Number(tid) === driverPid) main += used;
        else library += used;
      }
      parts.push(`driver ${percent(main / TICKS_PER_SECOND / seconds)}`);
      parts.push(`threads of the matrix library ${percent(library / TICKS_PER_SECOND / seconds)}`);
    }
    const cores = coreTimes();
    if (start.cores && cores) {
      const each = cores.map((core, i) => {
        const total = core.total - start.cores[i].total;
        return `${core.name} ${percent(total ? (core.busy - start.cores[i].busy) / total : 0)}`;
      });
      parts.push(`cores: ${each.join(", ")}`);
    }
    return parts.join(" | ");
  };
}

const percent = (share) => `${Math.round(share * 100)} %`;
const ms = (value) => `${value.toFixed(1)} ms`;

// ---------------------------------------------------------------- Test

/** Shows the moving picture for a while. fps = null: as fast as the panel takes the frames. */
async function animate(panel, cfg, seconds, fps) {
  const load = startLoadMeter(panel.child.pid);
  const start = performance.now();
  const took = [];
  let late = 0;
  for (let i = 0; ; i++) {
    if (fps) await sleep(start + (i * 1000) / fps - performance.now());
    const now = (performance.now() - start) / 1000;
    if (now >= seconds) break;
    const duration = await panel.show(movingPicture(cfg.cols, cfg.rows, now));
    took.push(duration);
    if (fps && duration > 1000 / fps) late++;
  }
  const elapsed = (performance.now() - start) / 1000;
  took.sort((a, b) => a - b);
  const at = (share) => took[Math.min(took.length - 1, Math.floor(took.length * share))];
  console.log(`    ${took.length} frames in ${elapsed.toFixed(1)} s = ${(took.length / elapsed).toFixed(1)} per second`);
  console.log(`    Until a frame is on the panel: median ${ms(at(0.5))}, 95 % under ${ms(at(0.95))}, longest ${ms(at(1))}` +
    (fps ? `, too late for the next frame: ${late}` : ""));
  console.log(`    CPU: ${load()}`);
}

async function main() {
  const cfg = loadSettings();
  console.log(`Panel ${cfg.cols}x${cfg.rows}, ${cfg.hardware_mapping}, gpio_slowdown ${cfg.gpio_slowdown}, ` +
    `brightness ${cfg.brightness} %, Node ${process.version}`);

  panel = new Panel(cfg);
  await panel.ready();
  const still = stillPicture(cfg.cols, cfg.rows);

  console.log("\n1/5  Still picture, 10 seconds. It should show, without flicker:");
  console.log("     a white border all around; corners: red top left, green top right,");
  console.log("     blue bottom left, yellow bottom right; a fine checkerboard at the top;");
  console.log("     bars white, yellow, cyan, green, magenta, red, blue, black;");
  console.log("     then ramps from dark to bright in gray, red, green and blue.");
  await panel.show(still);
  await sleep(10000);

  console.log(`\n2/5  Animation at ${SCENE_FPS} frames per second, as the pet scene, 10 seconds.`);
  console.log("     A yellow block bounces up and down, a white line sweeps to the right.");
  await animate(panel, cfg, 10, SCENE_FPS);

  console.log("\n3/5  The same at 30 frames per second, 10 seconds. It should look smoother.");
  await animate(panel, cfg, 10, 30);

  console.log("\n4/5  As fast as the panel takes the frames, 5 seconds.");
  await animate(panel, cfg, 5, null);

  console.log("\n5/5  Brightness, 4 seconds each. Watch for flicker, above all at the lowest one.");
  for (const value of [100, cfg.brightness, cfg.nightBrightness]) {
    console.log(`     ${value} %`);
    panel.brightness(value);
    await panel.show(still);
    await sleep(4000);
  }

  await panel.close();
  const { typical, lowest, messages } = panel.report();
  if (messages) console.log(`\nMessages of the panel driver:\n${messages}`);
  if (typical !== null) {
    console.log(`\nRefresh rate of the panel, as the matrix library reports it: typically ${typical.toFixed(0)} Hz` +
      (lowest !== null ? `, lowest ${lowest.toFixed(0)} Hz` : ""));
  }
  console.log("\nDone. The panel is dark now.");
}

let panel;
main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  const messages = panel?.report().messages;
  if (messages) console.error(messages);
  process.exit(1);
});
