/**
 * The app: the pet page (app/pet.html) and where its pet lives.
 *
 * The page is the same everywhere. It keeps its pet in one of two places:
 *
 * - **On the phone** (`local`): the core runs in the page, the scene is drawn on a canvas at the
 *   top, the pet is kept in IndexedDB. This is the app from the stores, and the page opened from
 *   any other place than a Pi.
 * - **On the Pi** (`pi`): the page sends its requests to the Pi and the pet shows on the panel.
 *   This is the page the Pi serves at /pet (it says so with data-host="pi"), and the app from the
 *   stores once it has been connected to a Pi.
 *
 * This script runs before the page's own and leaves everything the page needs in
 * `window.blobling`; the texts of the page are filled in here as well.
 */

import { DEFAULT_LANGUAGE, I18n, preferredLanguage } from "../../core/src/i18n";
import { MAX_NAME } from "../../core/src/pet";
import type { Location } from "../../core/src/sun";
import { locales, soundFiles } from "./assets";
import { haptic } from "./haptics";
import { iconUrl, thingUrl } from "./icons";
import { LocalPet } from "./local";
import { locate, native } from "./native";
import { RemotePet, findDisplay, piAddress } from "./remote";
import { playReplays, type Replay } from "./replay";
import { pageSounds, type SoundName } from "./sound";

const PI_KEY = "pi"; // the address of the Pi the app is connected to
const LIVE_KEY = "location.live"; // "1": the pet lives wherever the phone is
const LIVE_EVERY_MS = 30 * 60_000; // how often the live location is looked up again, at most

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}


const root = document.documentElement;
const servedByPi = root.dataset.host === "pi";
// Only the app from the stores can reach a Pi of its own choosing (see remote.ts)
const connectedTo = !servedByPi && native ? stored(PI_KEY) : null;
const mode = servedByPi || connectedTo ? "pi" : "local";

// The Pi's page comes in the Pi's language (its answers are in that one too); otherwise the phone's
const language = servedByPi ? root.lang
  : preferredLanguage(navigator.languages?.join(",") || navigator.language, Object.keys(locales)) ?? DEFAULT_LANGUAGE;
const i18n = new I18n(locales, language);

/** Fills in the texts of the page: data-t (the text), data-t-aria (aria-label), data-t-content (a meta tag). */
function translate(): void {
  root.lang = i18n.language;
  for (const element of document.querySelectorAll<HTMLElement>("[data-t]")) {
    element.textContent = i18n.t(element.dataset.t!);
  }
  for (const element of document.querySelectorAll<HTMLElement>("[data-t-aria]")) {
    element.setAttribute("aria-label", i18n.t(element.dataset.tAria!));
  }
  for (const element of document.querySelectorAll<HTMLElement>("[data-t-content]")) {
    element.setAttribute("content", i18n.t(element.dataset.tContent!));
  }
}
translate();

const remote = mode === "pi" ? new RemotePet(connectedTo ?? "", i18n) : null;
const local = remote ? null : LocalPet.open(i18n);
const sounds = pageSounds(soundFiles);

const app = {
  /** Where the pet lives: "local" (on the phone) or "pi". */
  mode,
  /** The page is the app from the stores. */
  native,
  /** The Pi's address, if the app is connected to one. */
  connectedTo,
  /** All texts in the page's language, {key: text}. */
  strings: i18n.catalog,
  maxName: MAX_NAME,

  /** A request to the pet's API (core/src/api.ts); throws an Error with the text for the page. */
  async request(method: string, path: string, body?: unknown): Promise<any> {
    return remote ? remote.request(method, path, body) : (await local!).request(method, path, body);
  },

  /** A picture of the pet in a form, as a URL for an <img>. */
  icon: iconUrl,

  /** A thing the player hands the pet ("meal", "ball", "sponge", …) as a URL for an <img>; "" if there is no picture. */
  thing: thingUrl,

  /** Plays one of the app's sounds (app/src/sound.ts), unless they are off. */
  sound(name: SoundName): void {
    sounds.play(name);
  },

  /** Whether the sounds are on. */
  soundOn(): boolean {
    return sounds.on;
  },

  setSound(on: boolean): void {
    sounds.on = on;
  },

  /** A short buzz for what the pet just did: "touch", "done", "no", "joy" or "evolve" (haptics.ts). */
  buzz: haptic,

  /** On the phone: the scene goes on this canvas. */
  async showScene(canvas: HTMLCanvasElement): Promise<void> {
    (await local!).show(canvas);
  },

  /**
   * Where the pet is in the scene: [x, y, width, height] as parts (0–1) of the picture, so the page
   * knows where it can be touched. Only on the phone; with a Pi, null (the whole picture counts).
   */
  async petArea(): Promise<[number, number, number, number] | null> {
    return local ? (await local).petArea() : null;
  },

  /** With a Pi: whether it and this app understand each other ("ok", "display_old", "app_old"). */
  fit(): string {
    return remote?.fit ?? "ok";
  },

  /** With a Pi: the next frame the panel shows, as a URL for an <img> (the Pi answers once it is drawn). */
  previewUrl(): string {
    return `${remote?.base ?? ""}/preview.png?next&t=${Date.now()}`;
  },

  /**
   * Plays scuffles from the pet's state (`replays`) on `canvas`, one after the other, wherever the
   * pet lives. `onChange(i, over)` when the i-th begins and when its rounds are over, `onEnd` after
   * the last. Returns a function that stops it.
   */
  async replay(canvas: HTMLCanvasElement, replays: readonly Replay[],
      onChange: (index: number, over: boolean) => void, onEnd: () => void): Promise<() => void> {
    const location = local ? (await local).location : null;
    return playReplays(canvas, replays, location, onChange, onEnd);
  },

  /** On the phone: where it lives (for the weather and the sun times). */
  async location(): Promise<Location> {
    return (await local!).location;
  },

  /** On the phone: takes the phone's location. Throws with the text for the page if there is none. */
  async locate(): Promise<Location> {
    let found: [number, number];
    try {
      found = await locate();
    } catch (error) {
      console.warn("No location", error);
      throw new Error(i18n.t("page.app.locate_failed"));
    }
    const pet = await local!;
    pet.setLocation(found);
    return pet.location;
  },

  async forgetLocation(): Promise<void> {
    app.setLiveLocation(false);
    (await local!).setLocation(null);
  },

  /** On the phone: whether the location follows the phone (looked up when the app is opened). */
  liveLocation(): boolean {
    return stored(LIVE_KEY) === "1";
  },

  setLiveLocation(on: boolean): void {
    try {
      if (on) {
        localStorage.setItem(LIVE_KEY, "1");
      } else {
        localStorage.removeItem(LIVE_KEY);
      }
    } catch {
      // then only for as long as the app is open
    }
  },

  /** In the app from the stores: a display that answers under one of its usual names, as its address, or null. */
  findDisplay(): Promise<string | null> {
    return findDisplay((base) => new RemotePet(base, i18n).reachable());
  },

  /**
   * Before connecting to a display: the pet on the phone and the one on the display (as /api/pet
   * describes them), to choose which of them lives on. null when there is nothing to choose,
   * because the phone only has an egg. Throws with the text for the page if the display is gone.
   */
  async petsToChoose(address: string): Promise<{ phone: any; display: any } | null> {
    const phone = await (await local!).request("GET", "/api/pet") as { stage: string };
    if (phone.stage === "egg") {
      return null;
    }
    return { phone, display: await new RemotePet(piAddress(address) ?? "", i18n).request("GET", "/api/pet") };
  },

  /**
   * In the app from the stores: the pet of a Pi from now on. With `bringPet`, the pet on the phone
   * moves there first (the display keeps its own one aside, like loading a save on its settings
   * page); the phone keeps its copy for when it is disconnected again. Throws with the text for the
   * page if none answers.
   */
  async connect(address: string, bringPet = false): Promise<void> {
    const base = piAddress(address);
    const pi = base ? new RemotePet(base, i18n) : null;
    if (!pi || !await pi.reachable()) {
      throw new Error(i18n.t("page.app.connect_failed", { address: base ?? address }));
    }
    if (bringPet) {
      await pi.request("POST", "/api/pet/save", (await local!).pet.toSave());
    }
    localStorage.setItem(PI_KEY, base!);
    location.reload();
  },

  /** Back to the pet on the phone. */
  disconnect(): void {
    localStorage.removeItem(PI_KEY);
    location.reload();
  },
};

// The live location: looked up when the app starts and when it comes back after a while. A
// failure keeps the last location; the page only says so when the player asks for it.
if (mode === "local") {
  let lastLookup = 0;
  const follow = (): void => {
    if (app.liveLocation() && !document.hidden && Date.now() - lastLookup >= LIVE_EVERY_MS) {
      lastLookup = Date.now();
      app.locate().catch(() => {});
    }
  };
  follow();
  document.addEventListener("visibilitychange", follow);
}

declare global {
  interface Window {
    blobling: typeof app;
  }
}
window.blobling = app;
