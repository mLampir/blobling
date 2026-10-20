/**
 * The settings that are made on the web interface instead of in config.ini: the language and the
 * location.
 *
 * They are kept in their own file next to the pet (settings.json in the data folder), so the
 * settings page never writes to /etc. What is saved there wins over config.ini; config.ini only
 * gives the starting values. Without any language, the first phone that opens a page decides
 * (its browser language, if there is a file for it).
 */

import { existsSync, readFileSync } from "node:fs";

import { DEFAULT_LANGUAGE, I18n, preferredLanguage } from "../../core/src/i18n";
import { RequestError } from "../../core/src/model";
import type { Pet } from "../../core/src/pet";
import { checkLocation, type Location } from "../../core/src/sun";
import type { Config } from "./config";
import type { Display } from "./display";
import { getLog, reason } from "./log";
import { writeAtomic } from "./storage";
import type { Weather } from "../../core/src/weather";

const log = getLog("settings");

interface Saved {
  language?: string;
  /** [latitude, longitude], or null for "no location" (overrides one from config.ini) */
  location?: [number, number] | null;
}

export class Settings {
  /** The interface text in the current language. */
  i18n: I18n;
  private saved: Saved;
  private readonly locationListeners: ((location: Location) => void)[] = [];

  /** `locales`: every language file there is (code -> content), see readLocales. */
  constructor(private readonly file: string, private readonly cfg: Config,
      private readonly locales: Record<string, object>) {
    this.saved = this.load();
    this.i18n = this.makeI18n();
  }

  /** Text for a key in the current language (for the core's Pet, which keeps this function). */
  t: I18n["t"] = (key, values) => this.i18n.t(key, values);

  /** The chosen language, or null while nobody has chosen one. */
  get language(): string | null {
    const language = this.saved.language ?? this.cfg.language;
    return language || null;
  }

  /** Every language there is a file for: code and its own name ("Deutsch"). */
  languages(): { code: string; name: string }[] {
    return Object.keys(this.locales).sort().map((code) => {
      const own = new I18n(this.locales, code, () => {});
      return { code, name: own.catalog["language.name"] ?? code };
    });
  }

  setLanguage(code: unknown): void {
    if (typeof code !== "string" || !Object.hasOwn(this.locales, code)) {
      throw new RequestError("unknown_language");
    }
    this.saved.language = code;
    this.i18n = this.makeI18n();
    this.save();
  }

  /** Before the first page: takes the browser's language while none is chosen yet. */
  adoptLanguage(acceptLanguage: string | undefined): void {
    if (this.language !== null) {
      return;
    }
    const code = preferredLanguage(acceptLanguage, Object.keys(this.locales));
    if (code) {
      log.info(`Language taken from the first browser: ${code}`);
      this.setLanguage(code);
    }
  }

  /** [latitude, longitude], or null without a location. */
  get location(): Location {
    if (this.saved.location !== undefined) {
      return this.saved.location;
    }
    return this.cfg.latitude === null || this.cfg.longitude === null ? null : [this.cfg.latitude, this.cfg.longitude];
  }

  /** A new location; null and null remove it. */
  setLocation(latitude: unknown, longitude: unknown): void {
    let location: [number, number] | null = null;
    if (latitude !== null || longitude !== null) {
      location = checkLocation(latitude, longitude);
      if (!location) {
        throw new RequestError("invalid_location");
      }
    }
    this.saved.location = location;
    this.save();
    for (const listener of this.locationListeners) {
      listener(location);
    }
  }

  /** `listener` hears about every new location (weather, sun times). */
  onLocation(listener: (location: Location) => void): void {
    this.locationListeners.push(listener);
  }

  private makeI18n(): I18n {
    return new I18n(this.locales, this.language ?? DEFAULT_LANGUAGE, log.warning);
  }

  private load(): Saved {
    if (!existsSync(this.file)) {
      return {};
    }
    try {
      const data = JSON.parse(readFileSync(this.file, "utf-8")) as Record<string, unknown>;
      const saved: Saved = {};
      if (typeof data.language === "string" && Object.hasOwn(this.locales, data.language)) {
        saved.language = data.language;
      }
      if (data.location === null) {
        saved.location = null;
      } else if (Array.isArray(data.location)) {
        saved.location = checkLocation(data.location[0], data.location[1]) ?? undefined;
      }
      return saved;
    } catch (error) {
      log.error(`Could not read ${this.file} (${reason(error)}), using config.ini`);
      return {};
    }
  }

  private save(): void {
    writeAtomic(this.file, JSON.stringify(this.saved));
  }
}

/** A new location from the settings page reaches the weather and the sun times at once. */
export function followLocation(settings: Settings,
    { weather, pet, display }: { weather: Weather; pet: Pet; display: Display }): void {
  settings.onLocation((location) => {
    weather.setLocation(location);
    pet.setLocation(location);
    display.setLocation(location);
  });
}
