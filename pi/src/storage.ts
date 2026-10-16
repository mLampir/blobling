/**
 * What the Pi keeps on its disk: the pet's save file and the language files.
 *
 * The core only takes them as arguments (see core/src/pet.ts and core/src/i18n.ts).
 */

import {
  closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, writeSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { DEFAULT_LANGUAGE } from "../../core/src/i18n";
import { readSave, type SaveFile, type Saved } from "../../core/src/pet";
import { getLog, reason } from "./log";

const log = getLog("storage");

/** The file with another ending: pet.json -> pet.tmp */
function withSuffix(file: string, suffix: string): string {
  return file.replace(/\.[^./\\]*$/, "") + suffix;
}

/** Writes atomically, so a power cut never leaves half a file behind. */
export function writeAtomic(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = withSuffix(file, ".tmp");
  const fd = openSync(tmp, "w");
  try {
    writeSync(fd, text);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, file);
}

/** The saved pet, or null if there is none yet. A file that cannot be read is moved aside. */
export function loadPet(file: string): Saved | null {
  if (!existsSync(file)) {
    log.info("No saved pet yet – a new egg is waiting");
    return null;
  }
  try {
    const saved = readSave(JSON.parse(readFileSync(file, "utf-8")));
    log.info(`Loaded pet ${saved.state.name} (${saved.state.stage})`);
    return saved;
  } catch (error) {
    // Don't overwrite a broken file, move it aside instead
    const backup = withSuffix(file, ".broken");
    log.error(`Could not read the pet file (${reason(error)}), kept it as ${backup}`);
    try {
      renameSync(file, backup);
    } catch {
      // then it stays where it is until the next save
    }
    return null;
  }
}

/** For the `save` of the core's Pet. Throws if the file cannot be written; the pet then tries again later. */
export function petSaver(file: string): (save: SaveFile) => void {
  return (save) => writeAtomic(file, JSON.stringify(save));
}

/**
 * Every language file in the folder (code -> content), English always. The language can be
 * changed on the settings page, so all of them are read. A file that cannot be read is left out.
 */
export function readLocales(directory: string): Record<string, object> {
  const read = (code: string): object => JSON.parse(readFileSync(join(directory, `${code}.json`), "utf-8"));
  const locales: Record<string, object> = { [DEFAULT_LANGUAGE]: read(DEFAULT_LANGUAGE) };
  for (const file of readdirSync(directory).sort()) {
    const code = file.slice(0, -".json".length);
    // only a plain language code counts as a language file
    if (!file.endsWith(".json") || code === DEFAULT_LANGUAGE || !/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(code)) {
      continue;
    }
    try {
      locales[code] = read(code);
    } catch (error) {
      log.warning(`Could not read the language file for "${code}" (${reason(error)})`);
    }
  }
  return locales;
}
