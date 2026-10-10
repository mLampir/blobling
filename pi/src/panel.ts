/**
 * The LED panel, through the panel driver.
 *
 * The matrix library has no bindings for Node, so pi/panel_driver.py is all that talks to the
 * panel. It is started here and gets the finished frames through a pipe; its protocol is
 * described at the top of that file.
 */

import { spawn, type ChildProcess } from "node:child_process";

import type { Image } from "../../core/src/image";
import type { Config } from "./config";
import { getLog } from "./log";

const log = getLog("panel");

const READY_SECONDS = 30;

export class Panel {
  private readonly child: ChildProcess;
  private answers = 0; // answers that nobody has waited for yet
  private waiting: { resolve: () => void; reject: (error: Error) => void }[] = [];
  private stopped: string | null = null;
  /** Resolves with the reason once the driver has ended. */
  readonly exited: Promise<string>;

  constructor(python: string, driverFile: string, cfg: Config) {
    this.child = spawn(python, [
      driverFile,
      "--rows", String(cfg.rows),
      "--cols", String(cfg.cols),
      "--hardware-mapping", cfg.hardwareMapping,
      "--gpio-slowdown", String(cfg.gpioSlowdown),
      "--brightness", String(cfg.brightness),
    ], { stdio: ["pipe", "pipe", "inherit"] }); // what the driver and the matrix library print goes to the log
    this.child.stdout!.on("data", (chunk: Buffer) => {
      for (let i = 0; i < chunk.length; i++) {
        const waiter = this.waiting.shift();
        if (waiter) {
          waiter.resolve();
        } else {
          this.answers++;
        }
      }
    });
    this.child.stdin!.on("error", () => {}); // a driver that has ended is reported through `exited`
    this.exited = new Promise((resolve) => {
      const done = (what: string): void => {
        if (this.stopped === null) {
          this.stopped = what;
          for (const waiter of this.waiting.splice(0)) {
            waiter.reject(this.gone());
          }
          resolve(what);
        }
      };
      this.child.on("error", (error) => done(error.message));
      this.child.on("exit", (code, signal) => done(signal ?? `exit code ${code}`));
    });
  }

  private gone(): Error {
    return new Error(`The panel driver has stopped (${this.stopped})`);
  }

  private answer(): Promise<void> {
    if (this.answers) {
      this.answers--;
      return Promise.resolve();
    }
    if (this.stopped !== null) {
      return Promise.reject(this.gone());
    }
    return new Promise((resolve, reject) => this.waiting.push({ resolve, reject }));
  }

  /** Waits until the driver has set up the panel. */
  async ready(): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`The panel driver did not get ready within ${READY_SECONDS} seconds`)),
        READY_SECONDS * 1000);
    });
    try {
      await Promise.race([this.answer(), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Sends one frame and waits until it is on the panel. */
  async show(frame: Image): Promise<void> {
    if (this.stopped !== null) {
      throw this.gone();
    }
    const { width, height, data } = frame;
    const message = Buffer.alloc(1 + width * height * 3);
    message[0] = 0x46; // "F"
    for (let from = 0, to = 1; from < data.length; from += 4) {
      message[to++] = data[from];
      message[to++] = data[from + 1];
      message[to++] = data[from + 2];
    }
    this.child.stdin!.write(message);
    await this.answer();
  }

  /** Brightness in percent (1-100), from the next frame on. */
  brightness(percent: number): void {
    this.child.stdin!.write(Buffer.from([0x42, Math.min(100, Math.max(1, Math.round(percent)))])); // "B"
  }

  /** Ends the driver, which clears the panel on its way out. */
  async close(): Promise<void> {
    this.child.stdin!.end();
    await this.exited;
  }
}

/** The running panel, or null if the driver cannot be started at all (development on a PC without Python). */
export async function startPanel(python: string, driverFile: string, cfg: Config): Promise<Panel | null> {
  const panel = new Panel(python, driverFile, cfg);
  try {
    await panel.ready();
    return panel;
  } catch (error) {
    const stopped = await Promise.race([panel.exited, Promise.resolve(null)]);
    if (stopped !== null && /ENOENT/.test(stopped)) {
      log.warning(`${python} is not there – starting without a panel (LED_MATRIX_PYTHON names another Python)`);
      return null;
    }
    throw error;
  }
}
