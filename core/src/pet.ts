/**
 * The virtual pet: state, saving, actions.
 *
 * The simulation has no clock of its own; every access catches it up to the present (see
 * model.advance). The result is exactly the same as running non-stop, whether or not anybody is
 * looking at the pet at the moment.
 *
 * Where the pet is kept is up to whoever creates it: a file on the Pi, the browser's storage in
 * the app. This class is handed what was saved and a function that saves.
 */

import * as battle from "./battle";
import * as care from "./care";
import * as habits from "./habits";
import * as home from "./home";
import * as idle from "./idle";
import * as life from "./life";
import * as model from "./model";
import * as notify from "./notify";
import type { SceneView, TripView } from "./scene";
import * as sky from "./sky";
import { fromDict, toDict, type PetState } from "./state";
import type { Location } from "./sun";
import * as trip from "./trip";
import * as wild from "./wild";

export const SAVE_INTERVAL = 300;
export const DEFAULT_BEDTIME: model.Bedtime = ["22:30", "07:00"];
export const VERSION = 1;
// Before this moment the clock has certainly not been set yet.
export const CLOCK_VALID_FROM = 1767225600; // 2026-01-01
export const MAX_NAME = 16;
export const MAX_ANCESTORS = 50;
const MAX_REQUEST_IDS = 50;

export function clockValid(now: number): boolean {
  return now >= CLOCK_VALID_FROM;
}

/** A pet of before, for the ancestors' gallery. */
export interface Ancestor {
  name: string;
  species: string;
  stage: string;
  born_at: number;
  until: number;
  age_days: number;
  counters: Record<string, number>;
  tricks: string[];
  hat: string;
}

/** What is saved. */
export interface SaveFile {
  version: number;
  pet: PetState;
  ancestors: Ancestor[];
  /** The album: every form (life.FORMS) one of the pets has been. Older files have none. */
  album?: string[];
}

/** A pet as it was saved: the pet itself, its ancestors and the album. */
export interface Saved {
  state: PetState;
  ancestors: Ancestor[];
  album?: string[];
}

/** The pet, its ancestors and the album from what was saved. Throws if it cannot be read. */
export function readSave(data: unknown): Saved {
  const file = data as Partial<SaveFile> | null;
  if (file === null || typeof file !== "object") {
    throw new Error("not a save file");
  }
  if (file.version !== VERSION) {
    throw new Error(`unknown version ${file.version}`);
  }
  if (file.pet === null || typeof file.pet !== "object") {
    throw new Error("no pet in the save file");
  }
  const album = Array.isArray(file.album) ? file.album.filter((form) => life.FORMS.includes(form)) : [];
  return { state: fromDict(file.pet as unknown as Record<string, unknown>), ancestors: [...(file.ancestors ?? [])], album };
}

/** The weather as the weather service reports it: temperature in °C and a WMO code. */
export interface WeatherData {
  temp?: number | null;
  code?: number | null;
}

export interface PetOptions {
  /** Text for a key (I18n.t). */
  t: (key: string, values?: Record<string, unknown>) => string;
  /** What was saved (see readSave); without it a new egg is waiting. */
  saved?: Saved | null;
  /** Keeps the pet. May throw; the pet then tries again later. */
  save?: (file: SaveFile) => void;
  /** Returns [start, end] as "HH:MM". */
  bedtime?: () => model.Bedtime;
  /** Returns the current weather ({temp: 12.3, code: 61}) or null. */
  weather?: () => WeatherData | null;
  /** Where the pet lives, for the sun times; without it they are estimated from the time zone. */
  location?: Location;
  /** The time in Unix seconds. */
  clock?: () => number;
  /** Where problems are reported. */
  log?: (message: string, error?: unknown) => void;
}

export interface ActionRequest extends Omit<model.ActionOptions, "weather" | "temp"> {
  /** A command that was sent twice runs only once. */
  requestId?: string | null;
  now?: number;
}

export class Pet {
  state: PetState;
  ancestors: Ancestor[];
  /** The forms met so far (see albumList); the current pet's are added on every save. */
  album: string[] = [];
  private readonly t: PetOptions["t"];
  private readonly saveFile: (file: SaveFile) => void;
  private readonly clock: () => number;
  private readonly log: (message: string, error?: unknown) => void;
  private bedtimeSource: () => model.Bedtime;
  private weatherSource: () => WeatherData | null;
  private location: Location;
  private savedAt = 0.0;
  private readonly requestIds = new Map<string, model.ActionResult>();

  constructor(options: PetOptions) {
    this.t = options.t;
    this.saveFile = options.save ?? (() => {});
    this.clock = options.clock ?? (() => Date.now() / 1000);
    this.log = options.log ?? ((message, error) => console.error(message, error ?? ""));
    this.bedtimeSource = options.bedtime ?? (() => DEFAULT_BEDTIME);
    this.weatherSource = options.weather ?? (() => null);
    this.location = options.location ?? null;
    if (options.saved) {
      this.state = options.saved.state;
      this.ancestors = options.saved.ancestors;
      this.album = startAlbum(options.saved);
    } else {
      this.state = model.newPet(this.clock(), this.t("pet.default_name"));
      this.ancestors = [];
    }
  }

  /** Where the pet lives from now on (sun times). */
  setLocation(location: Location): void {
    this.location = location;
  }

  setBedtimeSource(source: () => model.Bedtime): void {
    this.bedtimeSource = source;
  }

  bedtime(): model.Bedtime {
    try {
      return this.bedtimeSource();
    } catch (error) {
      this.log("Could not determine the bedtime", error);
      return DEFAULT_BEDTIME;
    }
  }

  setWeatherSource(source: () => WeatherData | null): void {
    this.weatherSource = source;
  }

  private weatherNow(): WeatherData | null {
    try {
      return this.weatherSource();
    } catch (error) {
      this.log("Could not determine the weather", error);
      return null;
    }
  }

  /** WMO code of the current weather, or null if there is none right now. */
  weather(): sky.WeatherCode {
    return sky.codeOf(this.weatherNow());
  }

  /** The temperature in °C, or null if there is no weather right now. */
  temperature(): number | null {
    return sky.tempOf(this.weatherNow());
  }

  // ---------- public ----------

  /** Catch the simulation up to now and save every once in a while. */
  update(now = this.clock()): void {
    this.advance(now);
    if (now - this.savedAt >= SAVE_INTERVAL) {
      this.write(now);
    }
  }

  /** Snapshot for the scene. */
  view(now = this.clock()): SceneView {
    this.advance(now);
    const s = this.state;
    return {
      species: s.species, stage: s.stage, hint: life.hint(s),
      asleep: s.asleep, sick: s.sick, poops: s.poops,
      activity: model.activityOf(s, now), mood: model.moodOf(s), cold: home.cold(s, now),
      needs: model.needs(s), activity_until: s.activity_until,
      activity_item: s.activity_item, ready: life.isDue(s, now),
      weight_status: care.weightStatus(s), game: care.gameActive(s, now),
      tricks: care.learned(s),
      trip: tripView(s, now), hat: s.hat, deco: [...s.deco],
      backpack: s.backpack.length > 0,
      // a friend that is visiting right now, and the egg in the nest (its line)
      visitor: s.friend && wild.visiting(s, now) && !s.trip
        ? { species: s.friend.species, left: s.friend.until! - now, age: now - s.friend.until! + wild.VISIT_SECONDS }
        : null,
      nest: s.nest ? s.nest.line : null,
      gift: !!s.gift,
      plant: s.plant ? { kind: s.plant.kind, stage: home.plantStage(s), ripe: home.ripe(s) } : null,
      waiting: habits.waiting(s, now),
    };
  }

  /** State for the app. */
  snapshot(now = this.clock()) {
    this.advance(now);
    return this.describe(now);
  }

  /** The history, newest first. */
  events(limit = 20): PetState["events"] {
    return this.state.events.slice(-limit).reverse();
  }

  /** When it will call for somebody next, if nobody does anything until then (see notify.ts). */
  nextReminder(now = this.clock()): notify.Reminder | null {
    if (!clockValid(now)) {
      return null;
    }
    this.advance(now);
    return notify.nextReminder(this.state, now, this.bedtime(), this.location);
  }

  /** The travel diary: the trips it has been on, the latest first. */
  travels(): PetState["travels"] {
    return [...this.state.travels].reverse();
  }

  /** Carries out an action; throws a RequestError (a key from the "error" texts) for invalid requests. */
  action(action: string, request: ActionRequest = {}) {
    const now = request.now ?? this.clock();
    const by = String(request.by || "app").slice(0, 32);
    const id = request.requestId ?? null;
    let result = id === null ? undefined : this.requestIds.get(id);
    if (result === undefined) {
      this.advance(now);
      result = model.applyAction(this.state, action, now, this.bedtime(),
        { item: request.item, by, throw: request.throw, weather: this.weather(), temp: this.temperature(),
          value: request.value });
      if (id !== null) {
        this.requestIds.set(id, result);
        while (this.requestIds.size > MAX_REQUEST_IDS) {
          this.requestIds.delete(this.requestIds.keys().next().value!);
        }
      }
      this.write(now);
    }
    const message = result.reason ? this.t(`pet.rejected.${result.reason}`, { name: this.state.name }) : null;
    return { accepted: result.accepted, reason: result.reason, message, state: this.describe(now) };
  }

  /**
   * Start a new egg; the current pet moves to the ancestors' gallery. `egg`: which of the eggs
   * that are kept to brood (its "id" in the state for the app), or null to start over with a
   * usual one. The finds stay (model.nextPet).
   * Throws a RequestError (a key from the "error" texts) if there is no such egg.
   */
  newEgg(egg: unknown = null, now = this.clock()) {
    this.advance(now);
    const s = this.state;
    const successor = model.nextPet(s, now, this.t("pet.default_name"), egg);
    this.collect();
    if (s.stage !== "egg") {
      this.ancestors.push({
        name: s.name, species: s.species, stage: s.stage,
        born_at: Math.round(s.born_at), until: Math.round(now),
        age_days: Math.max(0, Math.floor((now - s.born_at) / 86400)),
        counters: { ...s.counters }, tricks: care.learned(s), hat: s.hat,
      });
      this.ancestors.splice(0, Math.max(0, this.ancestors.length - MAX_ANCESTORS));
    }
    this.state = successor;
    this.state.seen_at = now;
    model.logEvent(this.state, now, "new_egg", "app");
    this.write(now);
    return this.describe(now);
  }

  /** The ancestors, the last one first. */
  ancestorList() {
    return [...this.ancestors].reverse().map((a) => ({
      ...a, species_label: this.t(`species.${a.species}`), stage_label: this.t(`stages.${a.stage}`),
    }));
  }

  /**
   * The album: one slot per form there is (life.FORMS), in a fixed order. A form one of the pets
   * has been shows its stage, species and name; one not met yet is null and gives nothing away.
   */
  albumList() {
    this.collect();
    return life.FORMS.map((form) => {
      if (!this.album.includes(form)) {
        return null;
      }
      const [stage, species] = form.split(":");
      return { stage, species, label: this.t(stage === "adult" ? `species.${species}` : `stages.${stage}`) };
    });
  }

  rename(name: unknown): void {
    const text = String(name ?? "").split(/\s+/).filter(Boolean).join(" ");
    const length = [...text].length;
    if (length < 1 || length > MAX_NAME) {
      throw new model.RequestError("name_length");
    }
    this.state.name = text;
    this.write(this.clock());
  }

  save(): void {
    this.write(this.clock());
  }

  /** What is saved: the pet, its ancestors and the album, as the save file has them. */
  toSave(): SaveFile {
    this.collect();
    return {
      version: VERSION, pet: toDict(this.state), ancestors: structuredClone(this.ancestors), album: [...this.album],
    };
  }

  /** Takes a pet that was saved (see readSave) in place of this one, ancestors and all. */
  replace(saved: Saved): void {
    this.state = saved.state;
    this.ancestors = saved.ancestors;
    this.album = startAlbum(saved);
    this.requestIds.clear();
    this.write(this.clock());
  }

  // ---------- internal ----------

  /** Adds the forms the current pet has been to the album. */
  private collect(): void {
    for (const form of life.formsOf(this.state.stage, this.state.species)) {
      if (!this.album.includes(form)) {
        this.album.push(form);
      }
    }
  }

  private advance(now: number): void {
    if (!clockValid(now)) {
      return; // clock not set yet: better to wait than to get it wrong
    }
    const s = this.state;
    if (!clockValid(s.updated_at)) {
      s.updated_at = now;
      if (!clockValid(s.born_at)) {
        s.born_at = now;
      }
      if (!clockValid(s.stage_since)) {
        s.stage_since = now;
      }
    }
    model.advance(s, now, this.bedtime(), this.weather(), this.temperature(), this.location);
  }

  private describe(now: number) {
    const s = this.state;
    const t = this.t;
    const bedtime = this.bedtime();
    const due = life.dueAt(s);
    return {
      api: 1,
      now: Math.round(now),
      name: s.name, species: s.species, stage: s.stage,
      species_label: t(`species.${s.species}`), stage_label: t(`stages.${s.stage}`),
      age_days: s.stage === "egg" ? 0 : Math.max(0, Math.floor((now - s.born_at) / 86400)),
      // Next evolution: when it is due, and from when it happens by itself
      evolution: due === null ? null : {
        next: life.NEXT_STAGE[s.stage], due_at: Math.round(due),
        due: now >= due, auto_at: Math.round(due + life.AUTO_EVOLVE_AFTER),
      },
      stats: Object.fromEntries(Object.entries(s.stats).map(([k, v]) => [k, Math.round(v)])),
      activity: model.activityOf(s, now),
      activity_item: now < s.activity_until ? s.activity_item : "",
      mood: model.moodOf(s),
      cold: home.cold(s, now), // it shivers: petting rubs it warm
      asleep: s.asleep, sick: s.sick, poops: s.poops,
      needs: model.needs(s),
      actions: model.availableActions(s, now),
      bedtime: { start: bedtime[0], end: bedtime[1] },
      weight: Number(s.weight.toFixed(1)), ideal_weight: care.ideal(s), weight_status: care.weightStatus(s),
      bond: Math.round(s.bond), bond_level: care.bondLevel(s),
      snacks: Object.keys(care.SNACKS).map((k) => ({ id: k, label: t(`snacks.${k}`) })),
      // The favorite snack only shows once it has been fed
      favorite_snack: s.counters.favorite_found ? care.favorite(s) : null,
      game: gameInfo(s, now),
      tricks: Object.keys(care.TRICKS).map((k) => ({
        id: k, label: t(`tricks.${k}`), progress: Math.round(care.trickProgress(s, k) * 100), learned: care.knows(s, k),
      })),
      skills: battle.SKILLS.map((k) => ({ id: k, label: t(`skills.${k}`), value: Number(s.skills[k].toFixed(1)) })),
      training: trainingInfo(s, now),
      counters: { ...s.counters },
      trip: s.trip ? {
        area: s.trip.area, label: t(`areas.${s.trip.area}.name`),
        where: t(`areas.${s.trip.area}.away`), end: Math.round(s.trip.end),
        returning: trip.returning(s.trip), found: [...s.trip.found],
        hearts: s.trip.hearts, pack: [...s.trip.pack],
      } : null,
      // What can go into the backpack before a trip
      packable: trip.PACKABLE.map((k) => ({ id: k, label: t(`pack.${k}`) })),
      max_pack: trip.MAX_PACK,
      backpack: s.backpack.length, // this many finds are waiting to be unpacked
      // blocked_by: the area whose guardian is still in the way; guardian: one is waiting here
      areas: trip.AREAS.map((k) => ({
        id: k, label: t(`areas.${k}.name`), unlocked: trip.unlocked(s, k),
        blocked_by: trip.unlocked(s, k) ? null : t(`areas.${trip.blockedBy(k)}.name`),
        guardian: trip.guardianWaiting(s, k) !== null,
      })),
      guardians: { passed: s.guardians.length, all: trip.AREAS.length },
      // Finds: what there is, and which of them are being worn or are set out
      items: Object.entries(s.items).filter(([k]) => k in home.ITEMS).map(([k, n]) => ({
        id: k, label: t(`items.${k}`), kind: home.ITEMS[k], count: n, active: k === s.hat || s.deco.includes(k),
        effects: home.effects(k),
      })),
      // The eggs that are kept; "id" is what newEgg takes. `skills`: what the egg was given
      eggs: s.eggs.map((egg, i) => ({
        id: i, line: egg.line, label: t(`items.${home.eggOf(egg.line)}`), from: egg.from ?? null,
        skills: Object.entries(egg.skills ?? {}).filter(([, v]) => Math.round(v) !== 0)
          .map(([k, v]) => ({ id: k, label: t(`skills.${k}`), value: Math.round(v) })),
      })),
      friend: s.friend ? {
        species: s.friend.species, label: t(`species.${s.friend.species}`),
        visits: s.friend.visits, needed: wild.VISITS_FOR_NEST, visiting: wild.visiting(s, now),
      } : null,
      nest: s.nest ? { line: s.nest.line, label: t(`items.${home.eggOf(s.nest.line)}`) } : null,
      // a friend's gift is lying there; what is in it is only told once it is unwrapped
      gift: !!s.gift,
      item_labels: Object.fromEntries(Object.keys(home.ITEMS).map((k) => [k, t(`items.${k}`)])),
      plant: s.plant ? {
        kind: s.plant.kind, label: t(`plants.${s.plant.kind}`),
        stage: home.plantStage(s), ripe: home.ripe(s), left: s.plant.left,
      } : null,
      // What happened while nobody was there (the history's action and item, and how often), or null
      welcome: idle.welcome(s, now),
    };
  }

  private write(now: number): void {
    try {
      this.saveFile(this.toSave());
      this.savedAt = now;
    } catch (error) {
      this.log("Could not save the pet", error);
    }
  }
}

/** The album of a saved pet; a file from before the album has it filled in from the ancestors. */
function startAlbum(saved: Saved): string[] {
  const album = new Set(saved.album ?? []);
  for (const a of saved.ancestors) {
    life.formsOf(a.stage, a.species).forEach((form) => album.add(form));
  }
  return [...album];
}

/** For the scene: where it is travelling and what happened there last. */
function tripView(s: PetState, now: number): TripView | null {
  if (!s.trip) {
    return null;
  }
  const last = s.trip.last;
  return {
    area: s.trip.area, returning: trip.returning(s.trip), event: last?.kind ?? null,
    item: last?.item ?? null, event_age: now - (last?.at ?? 0),
    wild: last?.wild ?? null, // a wild pet: the tricks it is shown are in "rounds"
    // an opponent: who it is, and the rounds of the scuffle to play back
    foe: last?.foe ?? null, rounds: last?.rounds ?? null, outcome: last?.outcome ?? null,
  };
}

function gameInfo(s: PetState, now: number) {
  const game = s.game;
  if (game && care.gameActive(s, now)) {
    return {
      active: true, round: game.round, rounds: care.GAME_ROUNDS,
      wins: game.wins, last: s.activity === "game_turn" ? s.activity_item : null,
    };
  }
  if (game && game.result !== undefined && now - game.last < 30) {
    return { active: false, result: game.result, rounds: care.GAME_ROUNDS, won: game.result >= care.GAME_WIN };
  }
  return null;
}

/** The exercise that is waiting for a tap or an answer (the sequence itself only shows in the scene). */
function trainingInfo(s: PetState, now: number) {
  const training = s.training;
  if (!training || !battle.trainingActive(s, now)) {
    return null;
  }
  if (training.kind === "speed") {
    return { kind: "speed" };
  }
  const steps = training.sequence!.length;
  return {
    kind: "smarts", length: steps,
    shown_in: Math.max(0.0, Number((training.at + steps * battle.SHOW_STEP - now).toFixed(1))),
  };
}
