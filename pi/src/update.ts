/**
 * Updates from the GitHub releases.
 *
 * A Pi that was installed from a release knows its version and where it came from (VERSION and
 * REPO, which setup.sh puts next to the app). It looks for a newer release now and then: an
 * outgoing request, nothing is opened towards the internet. The settings page shows what it
 * found and has a button for it (so has the app). The button looks once more and starts the systemd unit led-matrix-update, which
 * runs install.sh --app as a unit of its own, so it keeps going while this service is restarted.
 * Nothing is taken from the request: it only ever installs the newest official release, and only
 * when it is newer than the running one (a Pi on a pre-release isn't offered the release before it).
 *
 * With [update] betas = yes in config.ini, the newest pre-release counts too. The version
 * that was found is written to UPDATE_ENV for the unit, so it installs exactly that one.
 *
 * A Pi set up from a checkout of the repo has neither file, and nothing here does anything.
 */

import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { writeAtomic } from "./storage";

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
  /** Betas are installed too. */
  beta: boolean;
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

/** A version like v1.2.0 or v1.2.0-beta.1: its numbers, and the pre-release part (none for a final release). */
function parse(version: string): { core: number[]; pre: string[] } | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version);
  return match ? { core: match.slice(1, 4).map(Number), pre: match[4]?.split(".") ?? [] } : null;
}

/**
 * Is `latest` newer than `current`? Versions compare as in semver: v1.2.0-beta.1 comes before
 * v1.2.0, which comes before v1.2.1. A Pi on a pre-release is so never offered an older release.
 * A version that can't be read is newer whenever it is different.
 */
export function newer(latest: string, current: string): boolean {
  const a = parse(latest);
  const b = parse(current);
  if (!a || !b) {
    return latest !== current;
  }
  for (let i = 0; i < 3; i++) {
    if (a.core[i] !== b.core[i]) {
      return a.core[i] > b.core[i];
    }
  }
  if (!a.pre.length || !b.pre.length) {
    return !a.pre.length && b.pre.length > 0; // the final release comes after its betas
  }
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const [x, y] = [a.pre[i], b.pre[i]];
    if (x === undefined || y === undefined) {
      return y === undefined; // more parts come later: beta.1.1 after beta.1
    }
    if (x !== y) {
      const [xNumber, yNumber] = [/^\d+$/.test(x), /^\d+$/.test(y)];
      if (xNumber && yNumber) {
        return Number(x) > Number(y);
      }
      return xNumber === yNumber ? x > y : yNumber; // a word comes after a number
    }
  }
  return false;
}

export class Updates {
  readonly current: string | null;
  readonly repo: string | null;
  latest: string | null = null;
  private running = false;
  private failed = false;

  /**
   * `directory`: where VERSION and REPO are (the app's folder). `beta`: whether betas are wanted
   * (config.ini, [update] betas). `envFile`: where the version to install is written for the update unit.
   */
  constructor(directory: string, private readonly request: typeof fetch = fetch,
      private readonly run: Systemctl = systemctl, private readonly beta: () => boolean = () => false,
      private readonly envFile: string | null = null) {
    this.current = readLine(`${directory}/VERSION`, VERSION);
    this.repo = readLine(`${directory}/REPO`, REPO);
  }

  /** Installed from a release, so it can be updated from the releases. */
  get enabled(): boolean {
    return this.current !== null && this.repo !== null;
  }

  state(): UpdateState {
    return {
      current: this.current, latest: this.latest, running: this.running, failed: this.failed, beta: this.beta(),
      available: this.enabled && !this.running && this.latest !== null && newer(this.latest, this.current!),
    };
  }

  /** Looks up the newest release and whether the update unit is busy. Never throws. */
  async check(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await this.checkUnit();
    try {
      const tag = this.beta() ? await this.newestBeta() : await this.newestRelease();
      if (tag !== this.latest && newer(tag, this.current!)) {
        log.info(`Release ${tag} is available (running ${this.current})`);
      }
      this.latest = tag;
    } catch (error) {
      log.warning(`Could not look for a new release: ${reason(error)}`);
    }
  }

  /** The newest release: .../releases/latest redirects to .../releases/tag/<version> (it skips pre-releases). */
  private async newestRelease(): Promise<string> {
    const response = await this.request(`https://github.com/${this.repo}/releases/latest`,
      { method: "HEAD", signal: AbortSignal.timeout(TIMEOUT * 1000) });
    const tag = decodeURIComponent(response.url.split("/releases/tag/")[1] ?? "");
    if (!response.ok || !VERSION.test(tag)) {
      throw new Error(response.ok ? "no release yet" : `HTTP ${response.status}`);
    }
    return tag;
  }

  /** The newest of the latest releases and pre-releases (GitHub's API, drafts left out). */
  private async newestBeta(): Promise<string> {
    const response = await this.request(`https://api.github.com/repos/${this.repo}/releases?per_page=20`,
      { headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(TIMEOUT * 1000) });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const releases = await response.json() as { tag_name?: unknown; draft?: unknown }[];
    const tags = (Array.isArray(releases) ? releases : [])
      .filter((r) => !r.draft && typeof r.tag_name === "string" && VERSION.test(r.tag_name))
      .map((r) => r.tag_name as string);
    if (!tags.length) {
      throw new Error("no release yet");
    }
    return tags.reduce((best, tag) => (newer(tag, best) ? tag : best));
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
    if (this.envFile) {
      writeAtomic(this.envFile, `LED_MATRIX_VERSION=${this.latest}\n`); // VERSION-checked, see check()
    }
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
