// What the tests share. The tests run in the time zone Europe/Berlin (tools/test.mjs).

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import * as care from "../src/care";
import { I18n } from "../src/i18n";
import * as model from "../src/model";
import { Pet, readSave, type SaveFile } from "../src/pet";
import type { PetState } from "../src/state";

export const BEDTIME: model.Bedtime = ["23:00", "07:00"];
export const HOUR = 3600;
export const ALL_TRICKS: Record<string, number> = { ...care.TRICKS };

/** Unix seconds of a local time written as "2026-10-12 08:00". */
export function at(text: string): number {
  const [year, month, day, hour, minute] = text.split(/[- :]/).map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime() / 1000;
}

/** A hatched pet in the child stage (normal rates, evolution only due in 7 days). */
export function grown(now: number): PetState {
  const pet = model.newPet(now);
  pet.stage = "child";
  pet.stage_since = now;
  return pet;
}

/** An action, with its result as [accepted, reason]. */
export function act(pet: PetState, action: string, when: number,
    options: model.ActionOptions = {}): [boolean, string | null] {
  const result = model.applyAction(pet, action, when, BEDTIME, options);
  return [result.accepted, result.reason];
}

export function near(actual: number, expected: number, delta = 5e-8): void {
  assert.ok(Math.abs(actual - expected) <= delta, `${actual} is not within ${delta} of ${expected}`);
}

/** An invalid request with this key from the "error" texts. */
export function refused(run: () => unknown, key?: string): void {
  assert.throws(run, (error: unknown) =>
    error instanceof model.RequestError && (key === undefined || error.message === key));
}

/** Runs something with other rules (trip.rules, wild.rules) and puts the usual ones back. */
export function withRules<T extends object>(rules: T, changes: Partial<T>, run: () => void): void {
  const usual = { ...rules };
  Object.assign(rules, changes);
  try {
    run();
  } finally {
    Object.assign(rules, usual);
  }
}

// ---------- Language files ----------

export const LOCALE_DIR = "app/locales";

export function readLocales(): Record<string, object> {
  const files = readdirSync(LOCALE_DIR).filter((name) => name.endsWith(".json")).sort();
  return Object.fromEntries(files.map((name) =>
    [name.replace(/\.json$/, ""), JSON.parse(readFileSync(`${LOCALE_DIR}/${name}`, "utf-8"))]));
}

// ---------- A pet with a place to be saved ----------

/** Stands in for the file on the Pi: what was saved last, as text. */
export class Disk {
  text: string | null = null;

  save = (file: SaveFile): void => {
    this.text = JSON.stringify(file);
  };

  /** A pet as it is after a restart: read from what was saved. `clock`: a fixed time instead of the real one. */
  pet(clock?: () => number): Pet {
    const i18n = new I18n(readLocales());
    return new Pet({
      t: i18n.t,
      saved: this.text === null ? null : readSave(JSON.parse(this.text)),
      save: this.save,
      clock,
    });
  }
}
