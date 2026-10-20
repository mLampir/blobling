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
import { eased, panSeconds } from "../../core/src/street";
import type { Location } from "../../core/src/sun";
import { locales, soundFiles } from "./assets";
import { haptic } from "./haptics";
import { iconUrl, thingUrl } from "./icons";
import { LocalPet } from "./local";
import { locate, native } from "./native";
import { reminders } from "./notify";
import { RemotePet, findDisplay, piAddress } from "./remote";
import { playReplays, type Replay } from "./replay";
import { pageSounds, type SoundName } from "./sound";

const PI_KEY = "pi"; // the address of the Pi the app is connected to
const CAMERA_KEY = "camera"; // with a Pi: the pet this phone looks at (its id); each phone has its own
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
// The phone's own pets: on its own, all of them. Connected to a display (in the app from the
// stores), the phone keeps its home next to the display's; no egg turns up there unasked.
const local = remote && !connectedTo ? null : LocalPet.open(i18n, !remote);
let phone: LocalPet | null = null;
void local?.then((pet) => { phone = pet; });
const TWINS_KEY = "twins.done"; // the copies from before pets moved that have been sorted out (their born_at)
const sounds = pageSounds(soundFiles);
// The pet on the phone calls when it needs somebody (notify.ts); one on a Pi doesn't, the app
// can't know what happens there. A call the phone's pet left before the app was connected goes.
if (remote) {
  reminders(i18n)?.clear();
}

/** With a Pi: the pets of the display, as its last answer had them, and whether it was out of reach. */
let display: { pets: any[]; places: number } | null = null;
let displayAway = false;
let displayAsked = 0;
let sceneCanvas: HTMLCanvasElement | null = null;

/** With a Pi: whether the camera is on one of the phone's own pets. */
function onPhone(): boolean {
  return !!phone && !!camera && phone.street().pets.some((pet) => pet.id === camera);
}

/** The phone draws the scene of its own pet; for one of the display, the page shows the panel's. */
function showScene(): void {
  if (!phone || !sceneCanvas) {
    return;
  }
  if (!remote || onPhone()) {
    phone.show(sceneCanvas);
  } else {
    phone.hide();
  }
}

/**
 * The pictures to switch between show the pets of both homes: the display's, and the phone's own
 * (marked `phone`); while the display is out of reach, only the phone's.
 */
function bothHomes(answer: any): void {
  const state = answer?.state ?? answer;
  if (!Array.isArray(state?.pets)) {
    return;
  }
  if (!onPhone()) {
    display = { pets: state.pets, places: state.places };
  }
  const own = phone ? phone.street().pets.map((pet) => ({ ...pet, phone: true })) : [];
  const shown = displayAway || !display ? [] : display.pets;
  state.pets = [...shown, ...own];
  state.home = onPhone() ? "phone" : "display";
}

/** While the camera is on a phone's pet: the display's pets now and then, for the pictures. */
function askDisplay(): void {
  if (!remote || Date.now() - displayAsked < 20_000) {
    return;
  }
  displayAsked = Date.now();
  remote.request("GET", "/api/pet").then((answer: any) => {
    display = { pets: answer.pets, places: answer.places };
    displayAway = false;
  }, () => { displayAway = true; });
}

/** A request for the pet with this id: `?pet=` for GET, "pet" in the JSON for the others (core/src/api.ts). */
function forPet(method: string, path: string, body: unknown, id: string | null): [string, unknown] {
  if (!id || !path.startsWith("/api/pet")) {
    return [path, body];
  }
  if (method === "GET") {
    return [`${path}${path.includes("?") ? "&" : "?"}pet=${encodeURIComponent(id)}`, body];
  }
  if (body !== null && typeof body === "object" && !("pet" in body)) {
    return [path, { ...body, pet: id }];
  }
  return [path, body];
}

/** With a Pi: the pet this phone looks at, or null for the one the panel shows. */
let camera = remote ? stored(CAMERA_KEY) : null;

function setCamera(id: string | null): void {
  camera = id;
  try {
    if (id) {
      localStorage.setItem(CAMERA_KEY, id);
    } else {
      localStorage.removeItem(CAMERA_KEY);
    }
  } catch {
    // then only for as long as the app is open
  }
}

/** A request to a Pi, for the pet this phone looks at (core/src/api.ts: "pet"). */
async function askPi(method: string, path: string, body?: unknown): Promise<any> {
  const forCamera = camera && path.startsWith("/api/pet");
  const [url, sent] = forPet(method, path, body, camera);
  try {
    return await remote!.request(method, url, sent);
  } catch (error) {
    if (!forCamera || (error as { offline?: boolean }).offline) {
      throw error;
    }
    // the pet may no longer live there (a new egg took its place on another phone): look at the
    // one the panel shows; if that fails too, it was something else
    const answer = await remote!.request("GET", "/api/pet") as { pets?: { id: string }[] };
    if (answer.pets?.some((pet) => pet.id === camera)) {
      throw error;
    }
    setCamera(null);
    return remote!.request(method, path, body);
  }
}

// Answers that bring the camera to a pet: a new egg, an ancestor brought back, a switch
const MOVES_CAMERA = ["/api/pet/new_egg", "/api/pet/bring_back", "/api/pet/look"];

const app = {
  /** Where the pet lives: "local" (on the phone) or "pi". */
  mode,
  /** The page is the app from the stores. */
  native,
  /** The app's version in a build for the stores, "" otherwise. */
  version: __APP_VERSION__,
  /** The Pi's address, if the app is connected to one. */
  connectedTo,
  /** All texts in the page's language, {key: text}. */
  strings: i18n.catalog,
  maxName: MAX_NAME,

  /**
   * A request to the pet's API (core/src/api.ts), for the pet the phone looks at; throws an Error
   * with the text for the page.
   */
  async request(method: string, path: string, body?: unknown): Promise<any> {
    if (!remote) {
      return (await local!).request(method, path, body);
    }
    if (local) {
      await local; // the phone's own pets are known from here on
    }
    let answer: any;
    if (onPhone()) {
      answer = await phone!.request(method, ...forPet(method, path, body, camera));
      askDisplay();
    } else {
      try {
        answer = await askPi(method, path, body);
        displayAway = false;
      } catch (error) {
        // the display is out of reach (away from home): the phone's own pets, if it has any
        if (!(error as { offline?: boolean }).offline || !phone || phone.empty) {
          throw error;
        }
        displayAway = true;
        setCamera(phone.street().pets[0].id);
        answer = await phone.request(method, ...forPet(method, path, body, camera));
      }
    }
    const id = answer?.state?.id ?? answer?.id;
    if (MOVES_CAMERA.includes(path) && typeof id === "string") {
      setCamera(id);
    } else if (path === "/api/pet/retire" && (body as { pet?: unknown })?.pet === camera) {
      setCamera(null); // it rests among the ancestors now: back to the pet the panel shows
    }
    if (path.startsWith("/api/pet")) {
      bothHomes(answer);
    }
    showScene();
    return answer;
  },

  /** Where the pet the phone looks at lives: "phone" (drawn on the phone) or "display" (the panel's picture). */
  home(): "phone" | "display" {
    return !remote || onPhone() ? "phone" : "display";
  },

  /** The pets of each home and how many fit, for choosing a place; null for a home that isn't there. */
  homes(): { display: { pets: any[]; places: number } | null; phone: { pets: any[]; places: number } | null } {
    return { display: remote && !displayAway ? display : null, phone: phone ? phone.street() : null };
  },

  /**
   * Connected to a display: the pet with this id goes along with the phone, into a new house or in
   * the place of the phone's pet `place`. It answers like GET /api/pet, for the pet on the phone.
   */
  async takeAlong(id: string, place: string | null): Promise<any> {
    const pet = await local!;
    const { moving } = await remote!.request("POST", "/api/pet/hand_over", { pet: id }) as { moving: any };
    pet.adopt(moving, place);
    if (display) {
      display.pets = display.pets.filter((there) => there.id !== id);
    }
    // the display keeps it sealed until the phone confirms; asked again, it hands over the same
    await remote!.request("POST", "/api/pet/handed_over", { pet: id, moves: moving.pet.moves }).catch(() => {});
    setCamera(id);
    return app.request("GET", "/api/pet");
  },

  /**
   * Connected to a display: the phone's pet with this id moves to the display, into a new house or
   * in the place of the display's pet `place`. An old copy of a pet that lives elsewhere by now is
   * turned away; it rests among the phone's ancestors then. Answers like POST /api/pet/take_in.
   */
  async bringToDisplay(id: string, place: string | null): Promise<any> {
    const pet = await local!;
    const moving = pet.release(id);
    let answer: any;
    try {
      answer = await remote!.request("POST", "/api/pet/take_in", { moving, place });
    } catch (error) {
      pet.adopt(moving, null); // back where it was
      if ((error as { key?: string }).key === "stale") {
        pet.retire(id);
      }
      throw error;
    }
    if (!answer.accepted) {
      pet.adopt(moving, null);
      return answer;
    }
    setCamera(id);
    bothHomes(answer);
    showScene();
    return answer;
  },

  /**
   * Connected to a display: pets that live on both, copied there before pets moved (the same
   * born_at), as [the phone's, the display's], until one of each pair is chosen (keepTwin).
   */
  twins(): [any, any][] {
    if (!phone || !display || displayAway) {
      return [];
    }
    const done = (stored(TWINS_KEY) ?? "").split(",");
    return phone.street().pets.flatMap((own) => display!.pets
      .filter((there) => there.id !== own.id && there.born_at === own.born_at && !done.includes(String(own.born_at)))
      .map((there) => [own, there] as [any, any]));
  },

  /** Of two copies (twins), `keep` is the real one: "phone" or "display". The other rests among the ancestors. */
  async keepTwin(twin: [any, any], keep: "phone" | "display"): Promise<void> {
    const [own, there] = twin;
    if (keep === "display") {
      (await local!).retire(own.id);
    } else {
      await app.bringToDisplay(own.id, there.id);
    }
    try {
      localStorage.setItem(TWINS_KEY, [stored(TWINS_KEY), own.born_at].filter(Boolean).join(","));
    } catch {
      // then it asks again next time
    }
  },

  /**
   * Switches to the pet with this id: the phone looks at it from now on (and a display follows,
   * unless a pet is pinned there). Returns its state, like GET /api/pet.
   */
  async look(id: string): Promise<any> {
    if (remote) {
      // on the phone's own pet, the display goes on showing what it shows
      setCamera(id);
    }
    return app.request("POST", "/api/pet/look", { pet: id });
  },

  /** How long the camera takes along the street, and how far it has come (core/src/street.ts). */
  panSeconds,
  eased,

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
    sceneCanvas = canvas;
    if (local) {
      await local;
      showScene();
    }
  },

  /**
   * Where the pet is in the scene: [x, y, width, height] as parts (0–1) of the picture, so the page
   * knows where it can be touched. Only on the phone; with a Pi, null (the whole picture counts).
   */
  async petArea(): Promise<[number, number, number, number] | null> {
    return local && app.home() === "phone" ? (await local).petArea() : null;
  },

  /** With a Pi: whether it and this app understand each other ("ok", "display_old", "app_old"). */
  fit(): string {
    return remote?.fit ?? "ok";
  },

  /** With a Pi: the next frame the panel shows, as a URL for an <img> (the Pi answers once it is drawn). */
  previewUrl(): string {
    const pet = camera ? `&pet=${encodeURIComponent(camera)}` : "";
    return `${remote?.base ?? ""}/preview.png?next${pet}&t=${Date.now()}`;
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
   * In the app from the stores: the pets of a Pi from now on. No pet moves: the phone's own stay on
   * the phone, for when it is disconnected again. Throws with the text for the page if none answers.
   */
  async connect(address: string): Promise<void> {
    const base = piAddress(address);
    const pi = base ? new RemotePet(base, i18n) : null;
    if (!pi || !await pi.reachable()) {
      throw new Error(i18n.t("page.app.connect_failed", { address: base ?? address }));
    }
    localStorage.setItem(PI_KEY, base!);
    setCamera(null);
    location.reload();
  },

  /** While no pet lives on the phone: the ancestors that can come home, latest first. */
  async restingAncestors(): Promise<{ name: string; stage: string; species: string; born_at: number }[]> {
    return (await local!).restingAncestors();
  },

  /** While no pet lives on the phone: this ancestor (its born_at) comes home. */
  async bringHome(bornAt: number): Promise<void> {
    (await local!).bringHome(bornAt);
    showScene();
  },

  /** A new egg on the phone, when no pet lives there (LocalPet.hatch). */
  async hatch(): Promise<void> {
    (await local!).hatch();
    showScene();
  },

  /** Back to the pets on the phone; the display keeps its own. */
  disconnect(): void {
    localStorage.removeItem(PI_KEY);
    setCamera(null);
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
