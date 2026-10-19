/**
 * Updates from the GitHub releases.
 *
 * A Pi that was installed from a release knows its version and where it came from (VERSION and
 * REPO, which setup.sh puts next to the app). It looks for a newer release now and then: an
 * outgoing request, nothing is opened towards the internet. The settings page shows what it
 * found and has a button for it (so has the app). The button looks once more and starts the systemd unit led-matrix-update, which
 * runs install.sh --app as a unit of its own, so it keeps going while this service is restarted.
 * Nothing is taken from the request: it only ever installs the newest official release.
 *
 * A Pi set up from a checkout of the repo has neither file, and nothing here does anything.
 */

import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { getLog, reason } from "./log";

const log = getLog("update");

const TIMEOUT = 10;
export const UPDATE_UNIT = "led-matrix-update";
const VERSION = /^[A-Za-z0-9._-]+$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;

export interface UpdateState {
  /** The running version, or null if this Pi was not installed from a release. */
  current: string | null;
  /** The newest release, once it has been looked up. */
  latest: string | null;
  available: boolean;
  /** The update unit is running right now. */
  running: boolean;
  /** The last update failed (see journalctl -u led-matrix-update). */
  failed: boolean;
}

/** Runs systemctl with the given arguments; resolves with its output, also when it fails. */
export type Systemctl = (args: string[]) => Promise<string>;

const systemctl: Systemctl = (args) => new Promise((resolve) => {
  execFile("systemctl", args, { timeout: TIMEOUT * 1000 }, (_, stdout) => resolve(String(stdout).trim()));
});

/** The first line of a small file, or null if it is missing or does not match `pattern`. */
function readLine(file: string, pattern: RegExp): string | null {
  try {
    const line = existsSync(file) ? readFileSync(file, "utf-8").trim() : "";
    return pattern.test(line) ? line : null;
  } catch {
    return null;
  }
}

export class Updates {
  readonly current: string | null;
  readonly repo: string | null;
  latest: string | null = null;
  private running = false;
  private failed = false;

  /** `directory`: where VERSION and REPO are (the app's folder). */
  constructor(directory: string, private readonly request: typeof fetch = fetch,
      private readonly run: Systemctl = systemctl) {
    this.current = readLine(`${directory}/VERSION`, VERSION);
    this.repo = readLine(`${directory}/REPO`, REPO);
  }

  /** Installed from a release, so it can be updated from the releases. */
  get enabled(): boolean {
    return this.current !== null && this.repo !== null;
  }

  state(): UpdateState {
    return {
      current: this.current, latest: this.latest, running: this.running, failed: this.failed,
      available: this.enabled && !this.running && this.latest !== null && this.latest !== this.current,
    };
  }

  /** Looks up the newest release and whether the update unit is busy. Never throws. */
  async check(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await this.checkUnit();
    try {
      // .../releases/latest redirects to .../releases/tag/<version>
      const response = await this.request(`https://github.com/${this.repo}/releases/latest`,
        { method: "HEAD", signal: AbortSignal.timeout(TIMEOUT * 1000) });
      const tag = decodeURIComponent(response.url.split("/releases/tag/")[1] ?? "");
      if (!response.ok || !VERSION.test(tag)) {
        throw new Error(response.ok ? "no release yet" : `HTTP ${response.status}`);
      }
      if (tag !== this.latest && tag !== this.current) {
        log.info(`Release ${tag} is available (running ${this.current})`);
      }
      this.latest = tag;
    } catch (error) {
      log.warning(`Could not look for a new release: ${reason(error)}`);
    }
  }

  /**
   * Starts the update to the newest release; false if there is nothing to start. It looks again
   * first, so a release from a minute ago is found without waiting for the next regular look.
   */
  async start(): Promise<boolean> {
    if (!this.enabled || this.running) {
      return false;
    }
    await this.check();
    if (!this.state().available) {
      return false;
    }
    log.info(`Updating from ${this.current} to ${this.latest}`);
    this.running = true;
    this.failed = false;
    // --no-block: the unit restarts this service, so don't wait for it
    await this.run(["start", "--no-block", `${UPDATE_UNIT}.service`]);
    return true;
  }

  /** Whether the update unit is busy or has failed (cheap; while it runs, every few seconds). */
  async checkUnit(): Promise<void> {
    const active = await this.run(["is-active", `${UPDATE_UNIT}.service`]);
    this.running = active === "activating" || active === "active";
    this.failed = active === "failed";
  }
}
