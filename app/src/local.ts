/**
 * The pet on the phone: the core runs in the page, keeps the pet on the phone (store.ts) and
 * draws the scene on a canvas, the way the Pi draws it on the panel.
 *
 * The page talks to it with the same requests it sends to the Pi (core/src/api.ts), so it does
 * not need to know which of the two keeps its pet.
 */

import { NOT_A_PET_ROUTE, petRequest } from "../../core/src/api";
import type { I18n } from "../../core/src/i18n";
import { RequestError } from "../../core/src/model";
import { MAX_NAME, Pet, readSave } from "../../core/src/pet";
import { PetScene } from "../../core/src/scene";
import { checkLocation, type Location } from "../../core/src/sun";
import { Weather } from "../../core/src/weather";
import { sceneAssets } from "./assets";
import { imageData } from "./canvas";
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

export class LocalPet {
  readonly pet: Pet;
  private readonly scene: PetScene;
  private readonly weather: Weather;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private canvas: HTMLCanvasElement | null = null;

  private constructor(store: Store, private readonly i18n: I18n, saved: unknown) {
    const location = savedLocation();
    let restored: ReturnType<typeof readSave> | null = null;
    if (saved !== undefined) {
      try {
        restored = readSave(saved);
      } catch (error) {
        // never overwrite a save that cannot be read: keep it aside and start with a new egg
        console.error("Could not read the saved pet, kept it aside", error);
        void store.put(BROKEN_KEY, saved);
      }
    }
    this.weather = new Weather(location?.[0] ?? null, location?.[1] ?? null, WEATHER_MINUTES);
    this.pet = new Pet({
      t: i18n.t, saved: restored, location, weather: () => this.weather.current(),
      save: (file) => store.put(PET_KEY, file).catch((error) => console.error("Could not save the pet", error)),
    });
    this.scene = new PetScene(SIZE, SIZE, sceneAssets(), { location });
    if (!restored) {
      this.pet.save(); // the new egg is there from now on
    }
  }

  static async open(i18n: I18n): Promise<LocalPet> {
    const store = await openStore();
    return new LocalPet(store, i18n, await store.get(PET_KEY));
  }

  // ---------- The requests of the page ----------

  /** Answers a request of the page like the Pi would; throws an Error with the text for the page. */
  async request(method: string, path: string, body?: unknown): Promise<unknown> {
    let answer: unknown;
    try {
      answer = await petRequest(
        { pet: this.pet, action: this.pet.action.bind(this.pet), newEgg: this.pet.newEgg.bind(this.pet) },
        method, new URL(path, "http://app"), async () => body ?? null);
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
      this.draw(); // the scene shows the answer at once
    }
    return answer;
  }

  // ---------- The scene ----------

  /** Draws the scene on `canvas` from now on, as long as the page is visible. */
  show(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.width = SIZE;
    canvas.height = SIZE;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearTimeout(this.timer);
        this.pet.save(); // the app may be closed from here without another word
      } else {
        this.draw();
      }
    });
    addEventListener("pagehide", () => this.pet.save());
    this.draw();
  }

  /** One frame now, and the next one when the scene asks for it. */
  private draw(): void {
    clearTimeout(this.timer);
    if (!this.canvas || document.hidden) {
      return;
    }
    let delay = 1;
    try {
      this.pet.update();
      if (this.weather.configured && this.weather.needsRefresh()) {
        void this.weather.refresh();
      }
      const [frame, next] = this.scene.render(this.pet.view(), this.weather.current());
      this.canvas.getContext("2d")!.putImageData(imageData(frame), 0, 0);
      delay = next;
    } catch (error) {
      console.error("Drawing the scene failed", error);
      delay = 5;
    }
    this.timer = setTimeout(() => this.draw(), delay * 1000);
  }

  /** Where the pet is in the scene: [x, y, width, height] as parts (0–1) of the picture. */
  petArea(): [number, number, number, number] {
    const [x, y, width, height] = this.scene.petArea();
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
    this.pet.setLocation(rounded);
    this.scene.location = rounded;
    this.draw();
  }
}
