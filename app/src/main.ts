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
import { locales } from "./assets";
import { iconUrl, thingUrl } from "./icons";
import { LocalPet } from "./local";
import { locate, native } from "./native";
import { RemotePet, piAddress } from "./remote";

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

  /** With a Pi: the next frame the panel shows, as a URL for an <img> (the Pi answers once it is drawn). */
  previewUrl(): string {
    return `${remote?.base ?? ""}/preview.png?next&t=${Date.now()}`;
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

  /** In the app from the stores: the pet of a Pi from now on. Throws with the text for the page if none answers. */
  async connect(address: string): Promise<void> {
    const base = piAddress(address);
    if (!base || !await new RemotePet(base, i18n).reachable()) {
      throw new Error(i18n.t("page.app.connect_failed", { address: base ?? address }));
    }
    localStorage.setItem(PI_KEY, base);
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
