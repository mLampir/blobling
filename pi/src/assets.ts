/**
 * Reads what the scene draws with from the disk: the sprite sheets and the panel font.
 *
 * The core only takes them as arguments; where they come from is up to whoever runs it.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { Font } from "../../core/src/font";
import type { SceneAssets } from "../../core/src/scene";
import { Sheet, type SheetData } from "../../core/src/sprites";
import { SHEET_DIR } from "./config";

export const FONT_NAME = "4x6"; // all the pet scene needs

/** Every sheet of a folder (a .json file and the picture it names), by its name. */
export function readSheets(directory = SHEET_DIR): Record<string, Sheet> {
  const sheets: Record<string, Sheet> = {};
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".json")).sort()) {
    const data: SheetData = JSON.parse(readFileSync(join(directory, file), "utf-8"));
    sheets[file.replace(/\.json$/, "")] = new Sheet(data, readFileSync(join(directory, data.meta.image)));
  }
  return sheets;
}

/** A BDF font from the fonts folder of rpi-rgb-led-matrix, or null if it is not there. */
export function readFont(directory: string | undefined, name = FONT_NAME): Font | null {
  const file = directory ? join(directory, `${name}.bdf`) : "";
  return file && existsSync(file) ? new Font(readFileSync(file, "latin1")) : null;
}

/** `fontDirectory`: the folder with the BDF fonts; without it the scene has no clock and no temperature. */
export function readAssets(fontDirectory?: string, sheetDirectory = SHEET_DIR): SceneAssets {
  return { sheets: readSheets(sheetDirectory), font: readFont(fontDirectory) };
}
