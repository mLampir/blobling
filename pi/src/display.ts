/**
 * The central display loop.
 *
 * Exactly one loop draws to the panel. The web interface only changes the state (mode,
 * brightness, night mode) and wakes the loop; the loop then renders whatever is due and sleeps
 * until the next update is needed.
 *
 * What gets rendered, in order of priority: the pet reacting to a command > night mode "off" >
 * the selected mode (pet or off).
 */

import { readFileSync } from "node:fs";

import { Image } from "../../core/src/image";
import { RequestError, inWindow, type Bedtime } from "../../core/src/model";
import { DEFAULT_BEDTIME, type ActionRequest, type Pet } from "../../core/src/pet";
import type { PetScene } from "../../core/src/scene";
import { getLog, reason } from "./log";
import { writeAtomic } from "./storage";
import type { Weather } from "../../core/src/weather";

const log = getLog("display");

export const MODES = ["pet", "off"] as const;
export type Mode = (typeof MODES)[number];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface Night {
  enabled: boolean;
  start: string;
  end: string;
  action: "dim" | "off";
  brightness: number;
}

export interface DisplayState {
  mode: Mode;
  brightness: number;
  night: Night;
}

export const DEFAULT_NIGHT: Night = { enabled: false, start: "23:00", end: "07:00", action: "dim", brightness: 5 };

// How long the panel shows the pet when a command arrives while it is off
const PET_REACTION_SECONDS = 10;

const isBrightness = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100;

/** Validates night mode settings. Throws a RequestError with a key from the "error" texts. */
export function cleanNight(value: unknown): Night {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestError("invalid_settings");
  }
  const { enabled, start, end, action, brightness } = value as Record<string, unknown>;
  if (typeof start !== "string" || typeof end !== "string" || !TIME.test(start) || !TIME.test(end)) {
    throw new RequestError("invalid_time");
  }
  if (action !== "dim" && action !== "off") {
    throw new RequestError("invalid_night_action");
  }
  if (!isBrightness(brightness)) {
    throw new RequestError("invalid_brightness");
  }
  return { enabled: Boolean(enabled), start, end, action, brightness };
}

export function nightActive(night: Night, now: Date): boolean {
  return night.enabled && inWindow(now.getTime() / 1000, night.start, night.end);
}

/** Where the frames go: the panel driver (pi/src/panel.ts). */
export interface FrameSink {
  show(frame: Image): Promise<void>;
  brightness(percent: number): void;
}

export interface DisplayOptions {
  /** Null: no panel, the frames only show in the web interface's preview. */
  panel: FrameSink | null;
  scene: PetScene;
  weather: Weather;
  pet: Pet;
  /** The brightness until one is chosen in the web interface. */
  defaultBrightness: number;
  /** Where mode, brightness and night mode are kept. */
  stateFile: string;
}

const monotonic = (): number => performance.now() / 1000;

export class Display {
  readonly width: number;
  readonly height: number;
  /** What the panel is showing right now (for the live preview). */
  lastFrame: Image;
  /** Who waits for the next frame (the live preview of the app). */
  private frameWaiters: (() => void)[] = [];
  private readonly panel: FrameSink | null;
  private readonly scene: PetScene;
  private readonly weather: Weather;
  private readonly pet: Pet;
  private readonly stateFile: string;
  private current: DisplayState;
  private petUntil = 0.0;
  private running = false;
  private woken = false;
  private wakeUp: (() => void) | null = null;

  constructor(options: DisplayOptions) {
    this.panel = options.panel;
    this.scene = options.scene;
    this.weather = options.weather;
    this.pet = options.pet;
    this.stateFile = options.stateFile;
    this.width = this.scene.width;
    this.height = this.scene.height;
    this.current = { mode: "pet", brightness: options.defaultBrightness, night: { ...DEFAULT_NIGHT } };
    this.loadState();
    this.lastFrame = this.blank();
  }

  // ---------- State (called from the web interface) ----------

  /** Starts the display loop; it runs until stop(). */
  start(): void {
    if (!this.running) {
      this.running = true;
      void this.run();
    }
  }

  /** Ends the loop after the frame it is working on. */
  stop(): void {
    this.running = false;
    this.wake();
  }

  state(): DisplayState {
    return { ...this.current, night: { ...this.current.night } };
  }

  nightActive(): boolean {
    return nightActive(this.current.night, new Date());
  }

  setMode(mode: unknown): void {
    if (!MODES.includes(mode as Mode)) {
      throw new RequestError("unknown_mode");
    }
    this.current.mode = mode as Mode;
    this.saveState();
    this.wake();
  }

  setBrightness(value: number): void {
    this.current.brightness = Math.min(100, Math.max(1, Math.trunc(value)));
    this.saveState();
    this.wake();
  }

  setNight(value: unknown): void {
    this.current.night = cleanNight(value);
    this.saveState();
    this.wake();
  }

  /** The pet's bedtime: night mode, if it is switched on. */
  bedtime = (): Bedtime => {
    const night = this.current.night;
    return night.enabled ? [night.start, night.end] : DEFAULT_BEDTIME;
  };

  petNewEgg(egg: unknown = null, keep: unknown = null): ReturnType<Pet["newEgg"]> {
    const state = this.pet.newEgg(egg, undefined, keep);
    this.showPet();
    return state;
  }

  petSwap(): ReturnType<Pet["swap"]> {
    const result = this.pet.swap();
    this.showPet();
    return result;
  }

  petAction(action: string, request: ActionRequest = {}): ReturnType<Pet["action"]> {
    const result = this.pet.action(action, request);
    this.showPet();
    return result;
  }

  /** Another pet in place of this one (a save file loaded on the settings page). */
  petReplace(saved: Parameters<Pet["replace"]>[0]): void {
    this.pet.replace(saved);
    this.showPet();
  }

  private showPet(): void {
    this.petUntil = monotonic() + PET_REACTION_SECONDS;
    this.wake();
  }

  private wake(): void {
    this.woken = true;
    this.wakeUp?.();
  }

  private loadState(): void {
    let saved: Record<string, unknown>;
    try {
      saved = JSON.parse(readFileSync(this.stateFile, "utf-8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        log.warning(`Could not read the saved state (${reason(error)}), using defaults`);
      }
      return;
    }
    if (saved === null || typeof saved !== "object") {
      return;
    }
    if (MODES.includes(saved.mode as Mode)) {
      this.current.mode = saved.mode as Mode;
    }
    if (typeof saved.brightness === "number" && Number.isInteger(saved.brightness)) {
      this.current.brightness = Math.min(100, Math.max(1, saved.brightness));
    }
    if ("night" in saved) {
      try {
        this.current.night = cleanNight(saved.night);
      } catch {
        log.warning("Saved night mode is invalid, using defaults");
      }
    }
  }

  private saveState(): void {
    try {
      writeAtomic(this.stateFile, JSON.stringify(this.current));
    } catch (error) {
      log.error("Could not save the state", error);
    }
  }

  // ---------- Display loop ----------

  private async run(): Promise<void> {
    let appliedBrightness: number | null = null;

    while (this.running) {
      this.woken = false;
      const { mode, brightness: usual, night } = this.current;
      let delay: number | null;
      try {
        const isNight = nightActive(night, new Date());
        const brightness = isNight ? night.brightness : usual;
        if (brightness !== appliedBrightness) {
          this.panel?.brightness(brightness);
          appliedBrightness = brightness;
        }

        this.pet.update();
        let frame: Image;
        if (monotonic() < this.petUntil) {
          [frame, delay] = this.renderPet();
          delay = Math.min(delay, this.petUntil - monotonic() + 0.01);
        } else if ((isNight && night.action === "off") || mode === "off") {
          [frame, delay] = [this.blank(), null];
        } else {
          [frame, delay] = this.renderPet();
        }
        await this.panel?.show(frame);
        this.lastFrame = frame;
        this.frameDone();

        if (night.enabled) {
          // Catch the start and end of the night to the minute
          const toNextMinute = 60.0 - ((Date.now() / 1000) % 60.0) + 0.01;
          delay = delay === null ? toNextMinute : Math.min(delay, toNextMinute);
        }
      } catch (error) {
        log.error("Rendering failed", error);
        delay = 5.0;
      }

      // Sleep until the next update or until the state changes.
      await this.sleep(delay);
    }
  }

  /**
   * The next frame the loop draws, or the one it shows if none comes within `seconds` (the loop
   * sleeps while the panel is off). The app asks for one frame after the other this way, so it
   * gets each one as soon as it is drawn instead of guessing when that will be.
   */
  nextFrame(seconds: number): Promise<Image> {
    return new Promise((resolve) => {
      const done = (): void => {
        clearTimeout(timer);
        this.frameWaiters = this.frameWaiters.filter((waiter) => waiter !== done);
        resolve(this.lastFrame);
      };
      const timer = setTimeout(done, seconds * 1000);
      this.frameWaiters.push(done);
    });
  }

  private frameDone(): void {
    for (const waiter of [...this.frameWaiters]) {
      waiter();
    }
  }

  /** `seconds`: null = until somebody wakes the loop. */
  private sleep(seconds: number | null): Promise<void> {
    if (this.woken) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timer = seconds === null ? undefined : setTimeout(done, Math.max(0, seconds) * 1000);
      this.wakeUp = done;
      function done(): void {
        clearTimeout(timer);
        resolve();
      }
    }).then(() => {
      this.wakeUp = null;
    });
  }

  private blank(): Image {
    return Image.filled(this.width, this.height, [0, 0, 0]);
  }

  private renderPet(): [Image, number] {
    const weather = this.weather;
    if (weather.configured && weather.needsRefresh()) {
      // In the background, so the animation doesn't stutter
      void weather.refresh();
    }
    return this.scene.render(this.pet.view(), weather.current());
  }
}
