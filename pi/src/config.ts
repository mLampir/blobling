/** Configuration and fixed paths of the app. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getLog } from "./log";

const log = getLog("config");

// Environment variables override the paths (e.g. for testing on a PC). What belongs to the app
// itself is looked up from the folder the server is started in: /opt/led-matrix on the Pi, the
// repo folder on a PC.
export const APP_DIR = "app";
export const LOCALE_DIR = join(APP_DIR, "locales");
export const TEMPLATE_DIR = join(APP_DIR, "templates");
export const SHEET_DIR = join(APP_DIR, "pet", "assets");
// The app's script, built from app/src/ (npm run build)
export const APP_BUNDLE_DIR = join("dist", "app");
export const DRIVER_FILE = join("pi", "panel_driver.py");
export const CONFIG_FILE = process.env.LED_MATRIX_CONFIG ?? "/etc/led-matrix/config.ini";
export const DATA_DIR = process.env.LED_MATRIX_DATA ?? "/var/lib/led-matrix";
export const BDF_FONT_DIR = process.env.LED_MATRIX_BDF_DIR ?? "/opt/led-matrix/rpi-rgb-led-matrix/fonts";
// The Python that has the matrix library, for the panel driver
export const PYTHON = process.env.LED_MATRIX_PYTHON ?? "/opt/led-matrix/venv/bin/python";

export const STATE_FILE = join(DATA_DIR, "state.json");
export const PET_FILE = join(DATA_DIR, "pet.json");
// The pet before a save file took its place (settings page)
export const PET_ASIDE_FILE = join(DATA_DIR, "pet.before-load.json");
// What the settings page changes (language, location), see settings.ts
export const SETTINGS_FILE = join(DATA_DIR, "settings.json");

export interface Config {
  /** "" = not chosen: the first browser decides (settings.ts) */
  language: string;
  latitude: number | null;
  longitude: number | null;
  weatherRefreshMinutes: number;
  rows: number;
  cols: number;
  hardwareMapping: string;
  gpioSlowdown: number;
  brightness: number;
  port: number;
  /** Updates include betas (pre-releases), see update.ts */
  updateBetas: boolean;
}

/** [latitude, longitude], or null if no location is set. */
export function locationOf(cfg: Config): [number, number] | null {
  return cfg.latitude === null || cfg.longitude === null ? null : [cfg.latitude, cfg.longitude];
}

/** The sections of an INI file: section -> key -> value. Lines starting with # or ; are comments. */
export function parseIni(text: string): Record<string, Record<string, string>> {
  const sections: Record<string, Record<string, string>> = {};
  let section: Record<string, string> | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) {
      continue;
    }
    const head = line.match(/^\[(.+)\]$/);
    if (head) {
      section = sections[head[1]] ??= {};
      continue;
    }
    const pair = line.match(/^([^=:]+?)\s*[=:]\s*(.*)$/);
    if (section && pair) {
      section[pair[1].toLowerCase()] = pair[2];
    }
  }
  return sections;
}

/** The configuration from the text of a config.ini; whatever is missing or invalid gets its default. */
export function parseConfig(text: string, warn: (message: string) => void = log.warning): Config {
  const sections = parseIni(text);

  const get = (section: string, key: string, fallback: string): string =>
    (sections[section]?.[key] ?? fallback).trim();

  const getBool = (section: string, key: string, fallback: boolean): boolean => {
    const value = get(section, key, "").toLowerCase();
    if (!value) {
      return fallback;
    }
    if (!["yes", "no", "true", "false", "on", "off", "1", "0"].includes(value)) {
      warn(`[${section}] ${key} = ${value} is not yes or no, using ${fallback ? "yes" : "no"}`);
      return fallback;
    }
    return ["yes", "true", "on", "1"].includes(value);
  };

  const getInt = (section: string, key: string, fallback: number): number => {
    const value = get(section, key, "");
    if (!value) {
      return fallback;
    }
    if (!/^[+-]?\d+$/.test(value)) {
      warn(`[${section}] ${key} = ${value} is not a whole number, using ${fallback}`);
      return fallback;
    }
    return Number(value);
  };

  /** Latitude or longitude; empty or invalid means null (no weather). */
  const getCoordinate = (key: string, limit: number): number | null => {
    const value = get("location", key, "");
    if (!value) {
      return null;
    }
    const text = value.replace(",", ".");
    const number = /^[+-]?(\d+\.?\d*|\.\d+)$/.test(text) ? Number(text) : NaN;
    if (Number.isNaN(number) || number < -limit || number > limit) {
      warn(`[location] ${key} = ${value} is invalid (allowed: -${limit} to ${limit})`);
      return null;
    }
    return number;
  };

  return {
    language: get("interface", "language", "").toLowerCase(),
    latitude: getCoordinate("latitude", 90),
    longitude: getCoordinate("longitude", 180),
    weatherRefreshMinutes: Math.max(5, getInt("weather", "refresh_minutes", 15)),
    rows: getInt("matrix", "rows", 64),
    cols: getInt("matrix", "cols", 64),
    hardwareMapping: get("matrix", "hardware_mapping", "adafruit-hat"),
    gpioSlowdown: getInt("matrix", "gpio_slowdown", 2),
    brightness: Math.min(100, Math.max(1, getInt("matrix", "brightness", 50))),
    port: getInt("web", "port", 80),
    updateBetas: getBool("update", "betas", false),
  };
}

export function loadConfig(file = CONFIG_FILE): Config {
  // A missing file is not an error: the defaults apply (no weather).
  return parseConfig(existsSync(file) ? readFileSync(file, "utf-8") : "");
}
