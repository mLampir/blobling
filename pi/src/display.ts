/**
 * The central display loop.
 *
 * Exactly one loop draws to the panel. The web interface only changes the state (mode,
 * brightness, night mode) and wakes the loop; the loop then renders whatever is due and sleeps
 * until the next update is needed.
 *
 * What gets rendered, in order of priority: the pet reacting to a command > night mode "off" >
 * the selected mode (pet or off).
 *
 * The panel shows one house of the street (core/src/street.ts) at a time: its camera follows the
 * phones. Switching to another pet moves it there at once; doing something with another pet moves
 * it only once the pet it shows has been left alone for CAMERA_HOLD, so that two people playing at
 * the same time don't make it jump back and forth. On the settings page a pet can be pinned, and
 * the camera stays with it. Each pet has a scene of its own, which also draws the frames for a
 * phone that looks at a pet the panel doesn't show.
 */

import { readFileSync } from "node:fs";

import { Image } from "../../core/src/image";
import { RequestError, inWindow, type Bedtime } from "../../core/src/model";
import { DEFAULT_BEDTIME, type ActionRequest, type Pet } from "../../core/src/pet";
import type { PetScene } from "../../core/src/scene";
import { pan, panSeconds } from "../../core/src/street";
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
  /** The pet the camera stays with (its id), or null: it follows the phones. */
  pinned: string | null;
}

export const DEFAULT_NIGHT: Night = { enabled: false, start: "23:00", end: "07:00", action: "dim", brightness: 5 };

// How long the panel shows the pet when a command arrives while it is off
const PET_REACTION_SECONDS = 10;
// Something done with another pet moves the camera only once the one it shows has been left alone this long
export const CAMERA_HOLD = 30;
const PAN_FRAME = 1 / 30;

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
  /** Makes a scene, one for each pet. */
  scene: () => PetScene;
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
  private readonly newScene: () => PetScene;
  private readonly scenes = new Map<string, PetScene>();
  private location: readonly [number, number] | null;
  /** When somebody last did something with the pet the camera is on (monotonic). */
  private lastHere = -Infinity;
  /** The camera is on its way from the picture `from`, `steps` houses along the street. */
  private panning: { from: Image; steps: number; start: number; seconds: number } | null = null;
  /** The next frame of a pet the panel doesn't show, for a phone that looks at it. */
  private previews = new Map<string, { frame: Image; due: number; next?: Promise<Image> }>();
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
    this.newScene = options.scene;
    this.weather = options.weather;
    this.pet = options.pet;
    this.stateFile = options.stateFile;
    const first = this.newScene();
    this.location = first.location;
    this.width = first.width;
    this.height = first.height;
    this.current = { mode: "pet", brightness: options.defaultBrightness, night: { ...DEFAULT_NIGHT }, pinned: null };
    this.loadState();
    this.scenes.set(this.pet.current, first);
    this.keepPinned();
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

  /** The pet the camera is on (its id). */
  get camera(): string {
    return this.pet.current;
  }

  /** Where the pets live, for the sun times of every scene. */
  setLocation(location: readonly [number, number] | null): void {
    this.location = location;
    for (const scene of this.scenes.values()) {
      scene.location = location;
    }
    this.wake();
  }

  /** The camera stays with this pet (its id), or follows the phones again (null). */
  pin(id: unknown): void {
    if (id === null || id === undefined || id === "") {
      this.current.pinned = null;
    } else {
      this.current.pinned = this.pet.find(id).id;
      this.moveCamera(this.current.pinned);
    }
    this.saveState();
    this.showPet();
  }

  /** A phone switched to the pet with this id: the camera follows, unless it is pinned. */
  look(id: unknown): void {
    const pet = this.pet.find(id);
    if (!this.current.pinned) {
      this.moveCamera(pet.id);
      this.lastHere = monotonic();
    }
    this.showPet();
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

  petNewEgg(egg: unknown = null, place: unknown = null): ReturnType<Pet["newEgg"]> {
    const before = this.camera;
    const state = this.pet.newEgg(egg, undefined, place);
    this.cameraMoved(before);
    this.showPet();
    return state;
  }

  petBringBack(bornAt: unknown, place: unknown = null): ReturnType<Pet["bringBack"]> {
    const before = this.camera;
    const result = this.pet.bringBack(bornAt, place);
    this.cameraMoved(before);
    this.showPet();
    return result;
  }

  /** A phone takes the pet with this id along: the camera goes on to another house. */
  petHandOver(id: unknown): ReturnType<Pet["handOver"]> {
    const before = this.camera;
    const moving = this.pet.handOver(id);
    this.cameraMoved(before);
    this.showPet();
    return moving;
  }

  /** A pet from a phone moves in: the camera goes to it, as for a new egg. */
  petTakeIn(moving: unknown, place: unknown = null): ReturnType<Pet["takeIn"]> {
    const before = this.camera;
    const result = this.pet.takeIn(moving, place);
    this.cameraMoved(before);
    this.showPet();
    return result;
  }

  /** A pet a phone took along comes back without it (the settings page, for a lost phone). */
  petFetchBack(id: unknown): void {
    const before = this.camera;
    this.pet.fetchBack(id);
    this.cameraMoved(before);
    this.showPet();
  }

  petAction(action: string, request: ActionRequest = {}): ReturnType<Pet["action"]> {
    const id = this.pet.find(request.pet).id;
    const result = this.pet.action(action, request);
    if (id === this.camera) {
      this.lastHere = monotonic();
    } else if (!this.current.pinned && monotonic() - this.lastHere >= CAMERA_HOLD) {
      this.moveCamera(id);
      this.lastHere = monotonic();
    }
    this.showPet();
    return result;
  }

  /** Other pets in place of these (a save file loaded on the settings page). */
  petReplace(saved: Parameters<Pet["replace"]>[0]): void {
    this.pet.replace(saved);
    this.panning = null;
    this.keepPinned();
    this.showPet();
  }

  /** The camera goes to the pet with this id, panning along the street from where it was. */
  private moveCamera(id: string): void {
    const before = this.camera;
    if (id === before) {
      return;
    }
    this.pet.select(id);
    this.cameraMoved(before);
  }

  /**
   * The pet has moved the camera (a new egg, a pet brought back) or it was moved here, from the
   * pet `before`: a pinned pet keeps it, otherwise it pans over.
   */
  private cameraMoved(before: string): void {
    if (this.keepPinned()) {
      return;
    }
    const ids = this.pet.pets.map((pet) => pet.id);
    const [from, to] = [ids.indexOf(before), ids.indexOf(this.camera)];
    if (from === to) {
      return;
    }
    // the house it leaves as it looks now (one that just got a new pet: as it was last shown)
    const frame = from >= 0 ? this.sceneFor(before).render(this.pet.view(undefined, before), this.weather.current())[0]
      : this.lastFrame;
    const steps = from >= 0 ? to - from : 1;
    this.panning = { from: frame, steps, start: monotonic(), seconds: panSeconds(steps) };
  }

  /** A pinned pet that is still there keeps the camera (true); one that is gone is unpinned. */
  private keepPinned(): boolean {
    const pinned = this.current.pinned;
    if (pinned && this.pet.pets.some((pet) => pet.id === pinned)) {
      this.pet.select(pinned);
      return true;
    }
    if (pinned) {
      this.current.pinned = null;
      this.saveState();
    }
    return false;
  }

  /** The scene of the pet with this id. */
  private sceneFor(id: string): PetScene {
    let scene = this.scenes.get(id);
    if (!scene) {
      scene = this.newScene();
      scene.location = this.location;
      this.scenes.set(id, scene);
    }
    return scene;
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
    if (typeof saved.pinned === "string") {
      this.current.pinned = saved.pinned;
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
    this.forgetGone();
    let [frame, delay] = this.sceneFor(this.camera).render(this.pet.view(undefined, this.camera), weather.current());
    const panning = this.panning;
    if (panning) {
      const progress = (monotonic() - panning.start) / panning.seconds;
      if (progress < 1) {
        frame = pan(panning.from, frame, progress, panning.steps);
        delay = Math.min(delay, PAN_FRAME);
      } else {
        this.panning = null;
      }
    }
    return [frame, delay];
  }

  /** The scenes of pets that no longer live here go. */
  private forgetGone(): void {
    const ids = new Set(this.pet.pets.map((pet) => pet.id));
    for (const id of [...this.scenes.keys(), ...this.previews.keys()]) {
      if (!ids.has(id)) {
        this.scenes.delete(id);
        this.previews.delete(id);
      }
    }
  }

  /**
   * A frame of the pet with this id for a phone (the live preview): of the one the panel shows,
   * what nextFrame gives; of another one, its own scene's next frame, when the scene asks for it
   * (at most `seconds` later). Throws a RequestError if there is no such pet.
   */
  async frameOf(id: unknown, next: boolean, seconds: number): Promise<Image> {
    const pet = id === null || id === undefined ? this.camera : this.pet.find(id).id;
    if (pet === this.camera) {
      return next ? this.nextFrame(seconds) : this.lastFrame;
    }
    let preview = this.previews.get(pet);
    if (preview && !next) {
      return preview.frame;
    }
    if (preview?.next) {
      return preview.next; // somebody else is waiting for the same frame
    }
    const wait = preview ? Math.min(seconds, Math.max(0, preview.due - monotonic())) : 0;
    const promise = new Promise<void>((resolve) => setTimeout(resolve, wait * 1000)).then(() => {
      this.pet.update();
      const [frame, delay] = this.sceneFor(pet).render(this.pet.view(undefined, pet), this.weather.current());
      this.previews.set(pet, { frame, due: monotonic() + delay });
      return frame;
    });
    preview ??= { frame: this.lastFrame, due: 0 };
    this.previews.set(pet, { ...preview, next: promise });
    return promise;
  }
}
