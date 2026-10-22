/**
 * The pet on the phone: the core runs in the page, keeps the pet on the phone (store.ts) and
 * draws the scene on a canvas, the way the Pi draws it on the panel.
 *
 * The page talks to it with the same requests it sends to the Pi (core/src/api.ts), so it does
 * not need to know which of the two keeps its pet. With several pets, each has a scene of its
 * own, and switching pans along the street to it (core/src/street.ts), as on the panel. The yard
 * after the last house is drawn the same way, when the page looks at it or the pet goes over.
 *
 * While the app is in the background, the pet calls with a notification when it needs somebody
 * (notify.ts).
 *
 * Connected to a display, the phone keeps its own home next to the display's: its pets stay on the
 * phone, and pets move between the two only on purpose (release, adopt). That home can be empty
 * then; it keeps its ancestors and album until a pet moves in again, or a new egg is asked for
 * (hatch). It stays empty when the app is disconnected, too: no egg turns up unasked.
 */

import { NOT_A_PET_ROUTE, ownTarget, petRequest } from "../../core/src/api";
import type { Image } from "../../core/src/image";
import type { I18n } from "../../core/src/i18n";
import { RequestError } from "../../core/src/model";
import { MAX_NAME, PLACES, Pet, VERSION, readSave, type Ancestor, type Moving, type Sighting } from "../../core/src/pet";
import { PetScene } from "../../core/src/scene";
import { fromDict, type Egg, type PetState } from "../../core/src/state";
import { YARD, pan, panSeconds, place } from "../../core/src/street";
import { checkLocation, type Location } from "../../core/src/sun";
import { Weather } from "../../core/src/weather";
import { readYard, type Yard } from "../../core/src/yard";
import { sceneAssets } from "./assets";
import { imageData } from "./canvas";
import { reminders, type Reminders } from "./notify";
import { BROKEN_KEY, PET_KEY, openStore, type Store } from "./store";

const SIZE = 64; // the panel's resolution: the scene looks exactly as it does there
const WEATHER_MINUTES = 15;
const LOCATION_KEY = "location";

function savedLocation(): Location {
  try {
    const value = JSON.parse(localStorage.getItem(LOCATION_KEY) ?? "null");
    return Array.isArray(value) ? checkLocation(value[0], value[1]) : null;
  } catch {
    return null;
  }
}

/**
 * The ancestors and the album, which a home keeps even while it is empty, and the store (finds and
 * eggs) and the yard for the next pet.
 */
interface Album {
  ancestors: Ancestor[];
  album: string[];
  seen: Record<string, Sighting>;
  mastered: string[];
  items?: Record<string, number>;
  eggs?: Egg[];
  yard?: Yard;
}

/** What an empty home keeps (Album). */
interface EmptyHome {
  version: number;
  pet: null;
  ancestors: Ancestor[];
  album: string[];
  items?: Record<string, number>;
  eggs?: Egg[];
  seen?: Record<string, Sighting>;
  mastered?: string[];
  yard?: Yard;
}

export class LocalPet {
  /** The pets on the phone, or null while none lives here (after the last one left, or connected to a display). */
  private home: Pet | null = null;
  private rest: Album = { ancestors: [], album: [], seen: {}, mastered: [] };
  private readonly scenes = new Map<string, PetScene>();
  private sceneLocation: Location;
  /** The pet the scene showed last (or YARD), and its last frame: where a switch pans from. */
  private shown: { id: string; frame: Image } | null = null;
  /** The page looks at the yard: the scene stays there until it goes to a pet. */
  private yardOpen = false;
  private panning: { from: Image; steps: number; start: number; seconds: number } | null = null;
  private readonly weather: Weather;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private canvas: HTMLCanvasElement | null = null;
  private listening = false;
  private readonly reminders: Reminders | null;

  private constructor(private readonly store: Store, private readonly i18n: I18n, saved: unknown, create: boolean) {
    const location = savedLocation();
    let restored: ReturnType<typeof readSave> | null = null;
    const empty = saved as Partial<EmptyHome> | undefined;
    const emptied = !!empty && typeof empty === "object" && empty.pet === null;
    if (emptied) {
      this.rest = {
        ancestors: [...empty.ancestors ?? []], album: [...empty.album ?? []], seen: { ...empty.seen },
        mastered: [...empty.mastered ?? []], items: { ...empty.items }, eggs: [...empty.eggs ?? []],
        yard: readYard(empty.yard),
      };
    } else if (saved !== undefined) {
      try {
        restored = readSave(saved);
      } catch (error) {
        // never overwrite a save that cannot be read: keep it aside and start with a new egg
        console.error("Could not read the saved pet, kept it aside", error);
        void store.put(BROKEN_KEY, saved);
      }
    }
    this.weather = new Weather(location?.[0] ?? null, location?.[1] ?? null, WEATHER_MINUTES);
    this.sceneLocation = location;
    if (restored) {
      this.home = this.newHome(restored);
    } else if (create && !emptied) {
      // nothing saved yet: a new egg, which is there from now on (connected to a display, the home
      // stays empty instead; a home whose last pet left stays empty until somebody asks, hatch)
      this.hatch();
    }
    this.reminders = reminders(i18n);
    this.reminders?.clear(); // the pet is right here now
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.home) {
        this.reminders?.leave(this.home);
      } else {
        this.reminders?.clear();
      }
    });
  }

  /**
   * The pets on the phone. `create`: start with a new egg if there are none (on its own); connected
   * to a display, a phone that never kept pets has an empty home.
   */
  static async open(i18n: I18n, create = true): Promise<LocalPet> {
    const store = await openStore();
    const saved = await store.get(PET_KEY);
    return new LocalPet(store, i18n, saved, create);
  }

  private newHome(saved: ReturnType<typeof readSave> | null): Pet {
    return new Pet({
      t: this.i18n.t, saved, location: this.sceneLocation, weather: () => this.weather.current(),
      save: (file) => this.store.put(PET_KEY, file).catch((error) => console.error("Could not save the pet", error)),
    });
  }

  /** The pets on the phone; throws while none lives here. */
  get pet(): Pet {
    if (!this.home) {
      throw new Error(this.i18n.t("error.no_pet"));
    }
    return this.home;
  }

  /** Whether no pet lives on the phone. */
  get empty(): boolean {
    return !this.home;
  }

  /** The pets on the phone, for the pictures to switch between (Pet.street); none while it is empty. */
  street(): ReturnType<Pet["street"]> {
    return this.home ? this.home.street() : { pets: [], places: PLACES };
  }

  // ---------- Pets moving between the phone and a display ----------

  /** The pet with this id leaves the phone (Pet.release), for a display. */
  release(id: string): Moving {
    const store = this.pet.state;
    const moving = this.pet.release(id);
    this.emptied(store);
    return moving;
  }

  /** The pet with this id goes to rest among the ancestors (Pet.retire). */
  retire(id: string): void {
    const store = this.pet.state;
    this.pet.retire(id);
    this.emptied(store);
  }

  /** A pet from a display moves in, into a new house or in the place of `place` (Pet.adopt). */
  adopt(moving: Moving, place: string | null): void {
    if (this.home) {
      this.home.adopt(moving, place);
    } else {
      const items = { ...this.rest.items };
      for (const [item, count] of Object.entries(moving.things)) {
        items[item] = (items[item] ?? 0) + count;
      }
      const pet = fromDict({ ...moving.pet, items, eggs: [...this.rest.eggs ?? []] } as unknown as Record<string, unknown>);
      pet.seen_at = Date.now() / 1000;
      const { ancestors, album, seen, mastered, yard } = this.rest;
      this.home = this.newHome({ state: pet, ancestors, album, seen, mastered, yard });
      this.home.save();
    }
    this.draw();
  }

  /** A new egg in an empty home, which keeps its ancestors and album. */
  hatch(): void {
    if (this.home) {
      return;
    }
    this.home = this.newHome(null);
    this.home.ancestors.push(...this.rest.ancestors);
    this.home.album.push(...this.rest.album);
    Object.assign(this.home.seen, this.rest.seen);
    this.home.mastered.push(...this.rest.mastered);
    Object.assign(this.home.state.items, this.rest.items);
    this.home.state.eggs.push(...this.rest.eggs ?? []);
    this.home.yard = readYard(this.rest.yard);
    this.home.save();
    this.draw();
  }

  /** While the home is empty: the ancestors that can come home again (Pet.bringBack), the latest first. */
  restingAncestors(): { name: string; stage: string; species: string; born_at: number }[] {
    return this.rest.ancestors.filter((a) => a.pet).reverse()
      .map(({ name, stage, species, born_at }) => ({ name, stage, species, born_at }));
  }

  /** An ancestor comes home into the empty home (by way of a new egg, which makes room for it at once). */
  bringHome(bornAt: number): void {
    if (this.home || !this.rest.ancestors.some((a) => a.pet && a.born_at === bornAt)) {
      throw new Error(this.i18n.t("error.no_ancestor"));
    }
    this.hatch();
    this.pet.bringBack(bornAt, this.pet.current);
    this.pet.save();
    this.draw();
  }

  /** After a pet left: with the last one gone, the home keeps its ancestors, album and store. */
  private emptied(store: PetState): void {
    if (this.home && !this.home.pets.length) {
      // with the last one gone, the pet that comes next finds the store as it was
      const { ancestors, album, seen, mastered, yard } = this.home;
      this.rest = { ancestors, album, seen, mastered, items: store.items, eggs: store.eggs, yard };
      this.home = null;
      const file: EmptyHome = { version: VERSION, pet: null, ...this.rest };
      void this.store.put(PET_KEY, file).catch((error) => console.error("Could not save the pet", error));
    }
    this.draw();
  }

  // ---------- The requests of the page ----------

  /** Answers a request of the page like the Pi would; throws an Error with the text for the page. */
  async request(method: string, path: string, body?: unknown): Promise<unknown> {
    if (!this.home) {
      throw Object.assign(new Error(this.i18n.t("error.no_pet")), { empty: true }); // the page offers a new egg
    }
    const store = this.home.state; // finds and eggs, shared by all pets here
    let answer: unknown;
    try {
      const pet = this.pet;
      const target = {
        ...ownTarget(pet),
        look: (id: unknown) => {
          pet.select(id);
          this.yardOpen = false;
        },
        lookYard: () => {
          this.yardOpen = true;
        },
      };
      const asked = body as { action?: unknown } | undefined;
      if (path === "/api/pet/action" && asked?.action !== "fill") {
        this.yardOpen = false; // something done with a pet: the scene goes back to it
      }
      answer = await petRequest(target, method, new URL(path, "http://app"), async () => body ?? null);
    } catch (error) {
      if (error instanceof RequestError) {
        throw new Error(this.i18n.t(`error.${error.message}`, { max: MAX_NAME }));
      }
      throw error;
    }
    if (answer === NOT_A_PET_ROUTE) {
      throw new Error(this.i18n.t("error.http", { status: 404 }));
    }
    if (method === "POST") {
      if (!this.pet.pets.length) {
        this.emptied(store); // the last one went to the ancestors
        return answer;
      }
      this.draw(); // the scene shows the answer at once
      const sent = body as { action?: unknown } | undefined;
      if (path === "/api/pet/action" && sent?.action === "feed" && (answer as { accepted?: boolean }).accepted) {
        this.reminders?.ask(); // now it is clear why it would call
      }
    }
    return answer;
  }

  // ---------- The scene ----------

  /** Draws the scene on `canvas` from now on, as long as the page is visible. */
  show(canvas: HTMLCanvasElement): void {
    const first = !this.listening;
    this.listening = true;
    this.canvas = canvas;
    canvas.width = SIZE;
    canvas.height = SIZE;
    if (!first) {
      this.draw();
      return;
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearTimeout(this.timer);
        this.home?.save(); // the app may be closed from here without another word
      } else {
        this.draw();
      }
    });
    addEventListener("pagehide", () => this.home?.save());
    this.draw();
  }

  /** Stops drawing: the page shows a pet of the display meanwhile. */
  hide(): void {
    clearTimeout(this.timer);
    this.canvas = null;
    this.shown = null;
    this.panning = null;
  }

  /** One frame now, and the next one when the scene asks for it. */
  private draw(): void {
    clearTimeout(this.timer);
    if (!this.canvas || document.hidden || !this.home) {
      return;
    }
    let delay = 1;
    try {
      this.pet.update();
      if (this.weather.configured && this.weather.needsRefresh()) {
        void this.weather.refresh();
      }
      const yard = this.atYard() ? this.pet.yardView() : null;
      const id = yard ? YARD : this.pet.current;
      let [frame, next] = yard ? this.sceneFor(YARD).renderYard(yard, this.weather.current())
        : this.sceneFor(id).render(this.pet.view(), this.weather.current());
      if (this.shown && this.shown.id !== id) {
        // switched: the camera pans along the street from the house it showed (the yard is after the last one)
        const ids = this.pet.pets.map((pet) => pet.id);
        const from = place(ids, this.shown.id);
        const steps = from >= 0 ? place(ids, id) - from : 1;
        this.panning = { from: this.shown.frame, steps, start: performance.now() / 1000, seconds: panSeconds(steps) };
      }
      this.shown = { id, frame };
      const panning = this.panning;
      if (panning) {
        const progress = (performance.now() / 1000 - panning.start) / panning.seconds;
        if (progress < 1) {
          frame = pan(panning.from, frame, progress, panning.steps);
          next = Math.min(next, 1 / 30);
        } else {
          this.panning = null;
        }
      }
      this.canvas.getContext("2d")!.putImageData(imageData(frame), 0, 0);
      delay = next;
    } catch (error) {
      console.error("Drawing the scene failed", error);
      delay = 5;
    }
    this.timer = setTimeout(() => this.draw(), delay * 1000);
  }

  /**
   * Whether the scene shows the yard: the page looks at it, or the pet the camera is on is over
   * there; only while there is a yard.
   */
  atYard(): boolean {
    return !!this.home && (this.yardOpen || this.home.inYard()) && this.home.yardView() !== null;
  }

  /** The scene of the pet with this id (or of the yard); the ones of pets that no longer live here go. */
  private sceneFor(id: string): PetScene {
    let scene = this.scenes.get(id);
    if (!scene) {
      const ids = new Set(this.pet.pets.map((pet) => pet.id));
      for (const old of this.scenes.keys()) {
        if (!ids.has(old) && old !== YARD) {
          this.scenes.delete(old);
        }
      }
      scene = new PetScene(SIZE, SIZE, sceneAssets(), { location: this.sceneLocation });
      this.scenes.set(id, scene);
    }
    return scene;
  }

  /** Where the pet is in the scene: [x, y, width, height] as parts (0–1) of the picture. */
  petArea(): [number, number, number, number] {
    if (!this.home) {
      return [0, 0, 1, 1];
    }
    const [x, y, width, height] = this.sceneFor(this.home.current).petArea();
    return [x / SIZE, y / SIZE, width / SIZE, height / SIZE];
  }

  // ---------- Settings of the app ----------

  get location(): Location {
    return savedLocation();
  }

  /** Where the pet lives (weather and sun times); null forgets it. */
  setLocation(location: Location): void {
    const rounded = location && [Number(location[0].toFixed(2)), Number(location[1].toFixed(2))] as const;
    try {
      if (rounded) {
        localStorage.setItem(LOCATION_KEY, JSON.stringify(rounded));
      } else {
        localStorage.removeItem(LOCATION_KEY);
      }
    } catch {
      // without storage it holds until the app is closed
    }
    this.weather.setLocation(rounded);
    this.home?.setLocation(rounded);
    this.sceneLocation = rounded;
    for (const scene of this.scenes.values()) {
      scene.location = rounded;
    }
    this.draw();
  }
}
