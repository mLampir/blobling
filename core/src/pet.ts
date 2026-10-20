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

import { API_OLDEST, API_VERSION } from "./api";
import * as battle from "./battle";
import * as care from "./care";
import * as companion from "./companion";
import * as food from "./food";
import * as habits from "./habits";
import * as home from "./home";
import * as life from "./life";
import * as model from "./model";
import * as notify from "./notify";
import { houseArea, type SceneView, type TripView } from "./scene";
import * as sky from "./sky";
import { fromDict, toDict, type Friend, type PetState } from "./state";
import * as story from "./story";
import { isDark, type Location } from "./sun";
import * as trip from "./trip";
import * as wild from "./wild";

export const SAVE_INTERVAL = 300;
export const DEFAULT_BEDTIME: model.Bedtime = ["22:30", "07:00"];
export const VERSION = 1;
// Before this moment the clock has certainly not been set yet.
export const CLOCK_VALID_FROM = 1767225600; // 2026-01-01
export const MAX_NAME = 16;
export const MAX_ANCESTORS = 50;
// How many pets can live at home, each in its own house
export const PLACES = 4;
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
  /**
   * The pet itself, resting, so it can come home again (Pet.bringBack); without the event log
   * and the replays, which only the pet at the front shows. Ancestors from before have none.
   */
  pet?: PetState;
}

/**
 * A pet on its way between a phone and a display (Pet.release): the pet, and what of its house
 * leaves the store with it.
 */
export interface Moving {
  pet: PetState;
  /** Its hat and decorations, {item: count}: they leave the store of one home for the other's. */
  things: Record<string, number>;
}

/**
 * On a display: a pet a phone took along (Pet.handOver), as it was when it left. The display
 * keeps it sealed, to fetch the pet back if the phone is lost (Pet.fetchBack).
 */
export interface AwayPet extends Moving {
  left_at: number;
  /** The phone said it has the pet (Pet.handedOver); until then, asking again hands over the same. */
  confirmed: boolean;
}

/** What is saved. */
export interface SaveFile {
  version: number;
  /** The pet the camera was on last, with the finds and eggs all of them share. */
  pet: PetState;
  /** The other pets at home, each in its own house, without the finds and eggs. Older files have none. */
  others?: PetState[];
  /** Where along the street `pet` lives among `others` (0 = first). */
  place?: number;
  ancestors: Ancestor[];
  /** The album: every form (life.FORMS) one of the pets has been. Older files have none. */
  album?: string[];
  /** Forms one of the pets has seen, {form: where and when}. Older files have none. */
  seen?: Record<string, Sighting>;
  /** Forms one of the pets has mastered (see Pet.collect). Older files have none. */
  mastered?: string[];
  /** Files from before the neighbours had their pet at the back here; it becomes one of `others`. */
  second?: PetState | null;
  /** On a display: the highest move number of every pet that moved, {id: moves}. */
  moved?: Record<string, number>;
  /** On a display: the pets phones took along. */
  away?: AwayPet[];
}

/** Where and when a pet saw a form: the area of the trip, and whether the sun was down. */
export interface Sighting {
  area: string;
  night: boolean;
}

/** The pets as they were saved: the one the camera was on, the others, the ancestors and the album. */
export interface Saved {
  state: PetState;
  others?: PetState[];
  place?: number;
  ancestors: Ancestor[];
  album?: string[];
  seen?: Record<string, Sighting>;
  mastered?: string[];
  moved?: Record<string, number>;
  away?: AwayPet[];
}

/** The pets, their ancestors and the album from what was saved. Throws if it cannot be read. */
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
  const seen = file.seen !== null && typeof file.seen === "object" ? Object.fromEntries(Object.entries(file.seen)
    .filter(([form, s]) => life.FORMS.includes(form) && s !== null && typeof s === "object")
    .map(([form, s]) => [form, { area: String(s.area), night: !!s.night }])) : {};
  const mastered = Array.isArray(file.mastered) ? file.mastered.filter((form) => life.FORMS.includes(form)) : [];
  const others = (Array.isArray(file.others) ? file.others : file.second ? [file.second] : [])
    .filter((pet) => pet !== null && typeof pet === "object")
    .map((pet) => fromDict(pet as unknown as Record<string, unknown>));
  const place = Number.isInteger(file.place) ? Math.max(0, Math.min(others.length, file.place!)) : 0;
  const moved = file.moved !== null && typeof file.moved === "object" ? Object.fromEntries(
    Object.entries(file.moved).filter(([, moves]) => Number.isInteger(moves))) : {};
  const away = (Array.isArray(file.away) ? file.away : [])
    .filter((a) => a !== null && typeof a === "object" && a.pet !== null && typeof a.pet === "object")
    .map((a) => ({
      pet: fromDict(a.pet as unknown as Record<string, unknown>), things: { ...a.things },
      left_at: Number(a.left_at) || 0, confirmed: !!a.confirmed,
    }));
  return {
    state: fromDict(file.pet as unknown as Record<string, unknown>), others, place,
    ancestors: [...(file.ancestors ?? [])], album, seen, mastered, moved, away,
  };
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
  /** Which pet it is for (its id); without it, the one the camera is on. */
  pet?: unknown;
}

/** A new id for a pet: random, so that a pet keeps it wherever it goes. */
export function newId(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * All the pets at home. Each one lives in its own house along a street, with its decorations, its
 * plant and its hat; the finds and the eggs are shared (one store). At most PLACES of them.
 *
 * The camera (`current`) only says which pet a request without an id is for, and which one the
 * host shows: the Pi's panel (pi/src/display.ts), or the phone's scene. All of them live on
 * whichever one it is on, and the ones nobody looks after go to Grandma's by themselves.
 */
export class Pet {
  /** The pets in the order of their houses along the street. */
  pets: PetState[] = [];
  ancestors: Ancestor[];
  /** The forms met so far (see albumList); the pets' own are added on every save. */
  album: string[] = [];
  /** Forms seen on trips but maybe never had, {form: where and when} (see albumLines). */
  seen: Record<string, Sighting> = {};
  /** Forms that learned every trick and showed their special move in a scuffle (see albumLines). */
  mastered: string[] = [];
  /** On a display: the highest move number of every pet that moved (handOver, takeIn), {id: moves}. */
  moved: Record<string, number> = {};
  /** On a display: the pets phones took along, sealed (handOver). */
  away: AwayPet[] = [];
  private currentId = "";
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
      this.ancestors = options.saved.ancestors;
      this.album = startAlbum(options.saved);
      this.seen = { ...options.saved.seen };
      this.mastered = [...options.saved.mastered ?? []];
      this.moved = { ...options.saved.moved };
      this.away = [...options.saved.away ?? []];
      this.take(options.saved);
    } else {
      this.ancestors = [];
      this.state = model.newPet(this.clock(), this.t("pet.default_name"));
    }
  }

  /** The pet the camera is on. Setting it puts a pet in that one's place (and shares the store with it). */
  get state(): PetState {
    return this.pets.find((pet) => pet.id === this.currentId) ?? this.pets[0];
  }

  set state(pet: PetState) {
    pet.id ||= newId();
    const index = this.pets.findIndex((p) => p.id === this.currentId);
    if (index < 0) {
      this.pets.push(pet);
    } else {
      this.pets[index] = pet;
    }
    this.currentId = pet.id;
    this.share(pet);
  }

  /** The id of the pet the camera is on. */
  get current(): string {
    return this.state.id;
  }

  /** The camera goes to another pet; throws a RequestError if there is none with this id. */
  select(id: unknown): void {
    this.currentId = this.find(id).id;
  }

  /** The pet with this id; without one, the pet the camera is on. Throws a RequestError if there is none. */
  find(id?: unknown): PetState {
    if (id === undefined || id === null || id === "") {
      return this.state;
    }
    const pet = this.pets.find((p) => p.id === id);
    if (!pet) {
      throw new model.RequestError("no_pet");
    }
    return pet;
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

  /** Snapshot for the scene of the pet with this id (without one: the camera's). */
  view(now = this.clock(), id?: unknown): SceneView {
    this.advance(now);
    const s = this.find(id);
    const guest = wild.visitor(s, now);
    return {
      species: s.species, stage: s.stage, hint: life.hint(s, model.worldAt(now, this.weather(), this.location, this.temperature(), s)),
      asleep: s.asleep, sick: s.sick, poops: s.poops,
      activity: model.activityOf(s, now), mood: model.moodOf(s), cold: home.cold(s, now), hot: home.hot(s, now),
      needs: model.needs(s), activity_until: s.activity_until,
      activity_item: s.activity_item, ready: life.isDue(s, now),
      weight_status: care.weightStatus(s), game: care.gameActive(s, now),
      tricks: care.learned(s),
      trip: tripView(s, now), grandma: !!s.grandma, hat: s.hat, ...decoView(s),
      look_in: s.house > 0 && now < s.look_in_until && !s.asleep,
      backpack: s.backpack.length > 0,
      // a friend that is visiting right now, or a neighbour that is with it; and the egg in the nest (its line)
      visitor: guest && !s.trip && !s.grandma
        ? { species: guest.species, left: guest.until! - now, age: now - guest.until! + wild.VISIT_SECONDS }
        : this.neighbourView(s, now),
      nest: s.nest ? s.nest.line : null,
      gift: !!s.gift,
      found: s.found,
      plant: s.plant ? { kind: s.plant.kind, stage: home.plantStage(s), ripe: home.ripe(s) } : null,
      trace: s.trace ? { ...s.trace } : null,
      waiting: habits.waiting(s, now),
    };
  }

  /** State for the app, of the pet with this id (without one: the camera's). */
  snapshot(now = this.clock(), id?: unknown) {
    this.advance(now);
    return this.describe(this.find(id), now);
  }

  /** The history of the pet with this id (without one: the camera's), newest first. */
  events(limit = 20, id?: unknown): PetState["events"] {
    return this.find(id).events.slice(-limit).reverse();
  }

  /** When one of them will call for somebody next, if nobody does anything until then (see notify.ts). */
  nextReminder(now = this.clock()): notify.Reminder | null {
    if (!clockValid(now)) {
      return null;
    }
    this.advance(now);
    let next: notify.Reminder | null = null;
    for (const pet of this.pets) {
      const reminder = notify.nextReminder(pet, now, this.bedtime(), this.location);
      if (reminder && (!next || reminder.at < next.at)) {
        next = reminder;
      }
    }
    return next;
  }

  /** The travel diary of the pet with this id (without one: the camera's): its trips, the latest first. */
  travels(id?: unknown): PetState["travels"] {
    return [...this.find(id).travels].reverse();
  }

  /**
   * Carries out an action, for the pet `request.pet` (without it: the camera's); throws a
   * RequestError (a key from the "error" texts) for invalid requests.
   */
  action(action: string, request: ActionRequest = {}) {
    const now = request.now ?? this.clock();
    const by = String(request.by || "app").slice(0, 32);
    const id = request.requestId ?? null;
    const s = this.find(request.pet);
    let result = id === null ? undefined : this.requestIds.get(id);
    if (result === undefined) {
      this.advance(now);
      result = model.applyAction(s, action, now, this.bedtime(),
        { item: request.item, by, throw: request.throw, weather: this.weather(), temp: this.temperature(),
          location: this.location, value: request.value });
      this.share(s);
      if (result.accepted && (action === "wear" || action === "deco")) {
        this.onlyHere(s, String(request.item));
      }
      if (id !== null) {
        this.requestIds.set(id, result);
        while (this.requestIds.size > MAX_REQUEST_IDS) {
          this.requestIds.delete(this.requestIds.keys().next().value!);
        }
      }
      this.write(now);
    }
    const message = result.reason ? this.t(`pet.rejected.${result.reason}`, { name: s.name }) : null;
    return { accepted: result.accepted, reason: result.reason, message, state: this.describe(s, now) };
  }

  /**
   * A new egg. `egg`: which of the eggs that are kept to brood (its "id" in the state for the
   * app), or null to start with a usual one. `place`: the id of the pet whose place it takes, or
   * null for a new house of its own, if there is room (PLACES).
   *
   * In a pet's place, the egg moves into its house and the pet goes to the ancestors' gallery; an
   * egg that hasn't hatched goes nowhere (nextPet keeps a rare one among the eggs). The camera
   * goes to the new egg. Throws a RequestError (a key from the "error" texts) if there is no such
   * egg, no such pet, or no room.
   */
  newEgg(egg: unknown = null, now = this.clock(), place: unknown = null) {
    this.advance(now);
    const old = this.placeFor(place);
    const successor = model.nextPet(old ?? this.blankHome(), now, this.t("pet.default_name"), egg);
    successor.id = newId();
    this.collect();
    this.moveIn(successor, old, now);
    successor.seen_at = now;
    model.logEvent(successor, now, "new_egg", "app");
    this.write(now);
    return this.describe(successor, now);
  }

  /**
   * An ancestor comes home again; `bornAt` says which one (its "born_at"), and `place` where it
   * lives (as in newEgg). Among the ancestors it rested frozen: it comes back as it went, without
   * growing, getting older or losing anything. In another pet's place, it takes over the house and
   * the other goes to rest among the ancestors. The camera goes to it. Returns like action();
   * throws a RequestError if no ancestor that can come back was born then, or there is no room.
   */
  bringBack(bornAt: unknown, place: unknown = null, now = this.clock()) {
    const index = this.ancestors.findIndex((a) => a.pet && a.born_at === bornAt);
    if (index < 0) {
      throw new model.RequestError("no_ancestor");
    }
    this.advance(now);
    const old = this.placeFor(place);
    if (old?.trip) {
      return { accepted: false, reason: "away", message: this.t("pet.rejected.away", { name: old.name }),
        state: this.describe(old, now) };
    }
    const [entry] = this.ancestors.splice(index, 1);
    const back = fromDict(entry.pet as unknown as Record<string, unknown>);
    back.id ||= newId();
    const rested = Math.max(0, now - back.updated_at); // the time among the ancestors doesn't count
    back.stage_since += rested;
    back.born_at += rested;
    if (old) {
      model.moveHome(old, back);
    } else {
      Object.assign(back, { items: this.state.items, eggs: this.state.eggs }); // a new house, and the store of all
    }
    Object.assign(back, { seen_at: now, weather_seen: [], updated_at: now, idle_next: 0.0 });
    this.moveIn(back, old, now);
    model.logEvent(back, now, "bring_back", "app", { item: old && old.stage !== "egg" ? old.name : null });
    this.write(now);
    return { accepted: true, reason: null, message: null, state: this.describe(back, now) };
  }

  /** The pet whose place a new one takes (`place`: its id), or null for a new house; throws if there is no room. */
  private placeFor(place: unknown): PetState | null {
    if (place !== null && place !== undefined) {
      return this.find(place);
    }
    if (this.pets.length >= PLACES) {
      throw new model.RequestError("no_place");
    }
    return null;
  }

  /** A home with nothing in it yet but the shared store: what a pet in a new house starts from. */
  private blankHome(): PetState {
    const blank = model.newPet(this.clock());
    blank.stage = "child"; // not an egg, so nextPet doesn't keep it
    blank.items = this.state.items;
    blank.eggs = this.state.eggs;
    return blank;
  }

  /** `pet` moves into the place of `old` (which goes to the ancestors), or into a new house at the end of the street. */
  private moveIn(pet: PetState, old: PetState | null, now: number): void {
    if (old) {
      if (old.stage !== "egg") {
        this.archive(old, now);
      }
      this.pets[this.pets.indexOf(old)] = pet;
    } else {
      this.pets.push(pet);
    }
    this.currentId = pet.id;
    this.share(pet);
  }

  /** A pet moves to the ancestors' gallery, where it rests frozen until it is brought back (bringBack). */
  private archive(state: PetState, now: number): void {
    if (state.grandma) {
      model.comeBack(state, now); // it says goodbye at home
    }
    const rest = { ...toDict(state), events: [], replays: [] };
    model.clearHome(rest);
    this.ancestors.push({
      name: state.name, species: state.species, stage: state.stage,
      born_at: Math.round(state.born_at), until: Math.round(now),
      age_days: Math.max(0, Math.floor((now - state.born_at) / 86400)),
      counters: { ...state.counters }, tricks: care.learned(state), hat: state.hat,
      pet: rest,
    });
    this.ancestors.splice(0, Math.max(0, this.ancestors.length - MAX_ANCESTORS));
  }

  /** Who the neighbour with `s` is, for the scene, while one is; null while none is. */
  private neighbourView(s: PetState, now: number): SceneView["visitor"] {
    const night = s.asleep;
    const other = companion.partner(this.pets, s.id, now, night);
    const how = other ? companion.out(s, other, now, this.friendThere(other, now)) : null;
    // with a house, the two sleep inside it, and the scene shows the one it belongs to in its bed
    if (!other || !how || (how === "asleep" && s.house > 0)) {
      return null;
    }
    const [start, end] = how === "asleep" ? [Math.max(s.sleep_since, other.sleep_since), now + 3600] : companion.outWindow(now);
    return {
      species: other.species, stage: other.stage, asleep: how === "asleep", tricks: care.learned(other),
      left: end - now, age: now - start,
    };
  }

  /** Is a friend of its own visiting `pet` at the time t? Then it has no time for its neighbour. */
  private friendThere(pet: PetState, t: number): boolean {
    return wild.visiting(pet, t);
  }

  // ---------- Moving between a phone and a display ----------

  /**
   * The pet with this id leaves this home for another one (adopt there): with its house, and its
   * hat and decorations out of the store. Not while it is on a trip; from Grandma's it comes home
   * first. With the last one gone, `pets` is empty, and this Pet is done (the phone's home keeps
   * only its ancestors then; a display never gives its last pet away, see handOver).
   */
  release(id: unknown, now = this.clock()): Moving {
    const pet = this.find(id);
    this.advance(now);
    if (pet.trip) {
      throw new model.RequestError("on_trip");
    }
    if (pet.grandma) {
      model.comeBack(pet, now);
    }
    this.collect();
    const things: Record<string, number> = {};
    for (const item of [pet.hat, ...pet.deco]) {
      if (item && (pet.items[item] ?? 0) > 0) {
        pet.items[item] -= 1; // the store of all of them
        if (!pet.items[item]) {
          delete pet.items[item];
        }
        things[item] = (things[item] ?? 0) + 1;
      }
    }
    const moving = { pet: { ...toDict(pet), items: {}, eggs: [] }, things };
    this.pets = this.pets.filter((p) => p !== pet);
    if (this.pets.length) {
      this.currentId = this.state.id;
      this.write(now);
    }
    return moving;
  }

  /**
   * A pet from another home (release there) moves in: into a new house, or in the place of `place`
   * (as in newEgg). It brings its house; its hat and decorations go into the store. The camera
   * goes to it. Returns like action(); throws a RequestError if there is no room, or it already lives here.
   */
  adopt(moving: Moving, place: unknown = null, now = this.clock()) {
    const pet = fromDict(moving.pet as unknown as Record<string, unknown>);
    pet.id ||= newId();
    this.advance(now);
    const old = this.placeFor(place);
    if (this.pets.some((p) => p.id === pet.id && p !== old)) {
      throw new model.RequestError("already_here");
    }
    if (old?.trip) {
      return { accepted: false, reason: "away", message: this.t("pet.rejected.away", { name: old.name }),
        state: this.describe(old, now) };
    }
    pet.items = this.state.items;
    pet.eggs = this.state.eggs;
    for (const [item, count] of Object.entries(moving.things ?? {})) {
      pet.items[item] = (pet.items[item] ?? 0) + Math.max(0, Math.floor(Number(count) || 0));
    }
    pet.seen_at = now;
    this.moveIn(pet, old, now);
    this.write(now);
    return { accepted: true, reason: null, message: null, state: this.describe(pet, now) };
  }

  /**
   * On a display: the pet with this id goes along with a phone. Its move number goes up, and the
   * display keeps it sealed (fetchBack). Asked again before the phone confirmed (handedOver), it
   * hands over the same pet, so a phone that missed the answer can ask again.
   */
  handOver(id: unknown, now = this.clock()): Moving {
    const waiting = this.away.find((a) => a.pet.id === id && !a.confirmed);
    if (waiting) {
      return structuredClone({ pet: waiting.pet, things: waiting.things });
    }
    const pet = this.find(id);
    if (this.pets.length <= 1) {
      throw new model.RequestError("last_pet"); // the panel always has a pet to show
    }
    const moving = this.release(pet.id, now);
    moving.pet.moves += 1;
    this.moved[pet.id] = moving.pet.moves;
    this.away.push({ ...structuredClone(moving), left_at: Math.round(now), confirmed: false });
    this.write(now);
    return moving;
  }

  /** On a display: the phone has the pet that was handed over with this move number. */
  handedOver(id: unknown, moves: unknown): void {
    const entry = this.away.find((a) => a.pet.id === id && a.pet.moves === moves);
    if (!entry) {
      throw new model.RequestError("no_pet");
    }
    entry.confirmed = true;
    this.write(this.clock());
  }

  /**
   * On a display: a pet from a phone moves in (adopt), and its move number goes up. A copy older
   * than the display knows of this pet is turned away ("stale"): it lives elsewhere by now. The
   * same pet sent again (the phone missed the answer) is taken as already there.
   */
  takeIn(moving: unknown, place: unknown = null, now = this.clock()) {
    const { pet, things } = (moving ?? {}) as Partial<Moving>;
    if (pet === null || typeof pet !== "object" || typeof pet.id !== "string" || !pet.id) {
      throw new model.RequestError("invalid_value");
    }
    const moves = Number.isInteger(pet.moves) ? pet.moves : 0;
    const here = this.pets.find((p) => p.id === pet.id);
    if (here && here.moves === moves + 1) {
      return { accepted: true, reason: null, message: null, state: this.describe(here, now) };
    }
    if (here || moves < (this.moved[pet.id] ?? 0)) {
      throw new model.RequestError("stale");
    }
    const result = this.adopt({ pet: { ...pet, moves: moves + 1 }, things: things ?? {} }, place, now);
    if (result.accepted) {
      this.moved[pet.id] = moves + 1;
      this.away = this.away.filter((a) => a.pet.id !== pet.id);
      this.write(now);
    }
    return result;
  }

  /**
   * On a display: a pet a phone took along comes back as it left, for when the phone is lost. The
   * phone's copy is stale from then on. It moves into a free house, or rests among the ancestors
   * while there is none. Returns its id.
   */
  fetchBack(id: unknown, now = this.clock()): string {
    const index = this.away.findIndex((a) => a.pet.id === id);
    if (index < 0) {
      throw new model.RequestError("no_pet");
    }
    const [entry] = this.away.splice(index, 1);
    // two up: one up would make the phone's copy look like the same pet sent twice (takeIn)
    const moves = Math.max(entry.pet.moves, this.moved[entry.pet.id] ?? 0) + 2;
    this.moved[entry.pet.id] = moves;
    const pet = { ...entry.pet, moves };
    if (this.pets.length < PLACES) {
      this.adopt({ pet, things: entry.things }, null, now);
    } else {
      for (const [item, count] of Object.entries(entry.things)) {
        this.state.items[item] = (this.state.items[item] ?? 0) + count;
      }
      this.archive(fromDict(pet as unknown as Record<string, unknown>), now);
      this.write(now);
    }
    return pet.id;
  }

  /**
   * The pet with this id goes to rest among the ancestors, by hand ("send to the ancestors" in the
   * app, and the second of two copies from before pets moved). An egg that hasn't hatched goes
   * back among the eggs that are kept, as when a new egg takes its place; a usual one just goes. With the last one gone, `pets` is empty, as after
   * release (a display keeps its last one, see Display.petRetire).
   */
  retire(id: unknown, now = this.clock()): void {
    const pet = this.find(id);
    this.advance(now);
    if (pet.trip) {
      throw new model.RequestError("on_trip");
    }
    if (pet.stage !== "egg") {
      this.archive(pet, now);
    } else {
      const egg = model.keptEgg(pet);
      if (egg) {
        pet.eggs.push(egg); // the store all of them share
      }
    }
    this.pets = this.pets.filter((p) => p !== pet);
    if (this.pets.length) {
      this.currentId = this.state.id;
      this.write(now);
    }
  }

  /** The pets at home, in the order of their houses (for the pictures to switch between), and how many fit. */
  street(now = this.clock()) {
    return {
      pets: this.pets.map((pet) => ({
        id: pet.id, name: pet.name, species: pet.species, stage: pet.stage,
        species_label: this.t(`species.${pet.species}`), stage_label: this.t(life.formKey(pet.stage, pet.species)),
        age_days: pet.stage === "egg" ? 0 : Math.max(0, Math.floor((now - pet.born_at) / 86400)),
        grandma: !!pet.grandma, away: !!pet.trip, needs: model.needs(pet).length > 0,
        born_at: Math.round(pet.born_at),
        // an egg that would go back among the kept eggs if it went (retire)
        kept_egg: !!model.keptEgg(pet),
      })),
      // how many pets can live at home (one house each)
      places: PLACES,
    };
  }

  /** On a display: the pets phones took along, for the settings page. */
  awayList() {
    return this.away.map(({ pet, left_at, confirmed }) => ({
      id: pet.id, name: pet.name, species: pet.species, stage: pet.stage, left_at, confirmed,
      form: this.t(pet.stage === "adult" ? `species.${pet.species}` : life.formKey(pet.stage, pet.species)),
    }));
  }

  /** The ancestors, the last one first; `home`: it can come home again (bringBack). */
  ancestorList() {
    return [...this.ancestors].reverse().map(({ pet, ...a }) => ({
      ...a, home: !!pet, species_label: this.t(`species.${a.species}`), stage_label: this.t(life.formKey(a.stage, a.species)),
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
      return { stage, species, label: this.t(life.formKey(stage, species)) };
    });
  }

  /**
   * The album by lines, one page each with its egg, baby, child and adult forms. A slot is null
   * for a form not met yet; a form only seen has its picture for an outline and where it was seen
   * (no name); one that one of the pets has been has its name, and a star once it was mastered.
   */
  albumLines() {
    this.collect();
    return Object.keys(life.LINES).map((line) => ({
      forms: life.FORMS.filter((form) => life.lineOf(form.split(":")[1]) === line).map((form) => {
        const [stage, species] = form.split(":");
        if (this.album.includes(form)) {
          return { stage, species, label: this.t(life.formKey(stage, species)), mastered: this.mastered.includes(form) };
        }
        const seen = this.seen[form];
        return seen ? { stage, species, seen: { ...seen } } : null;
      }),
    }));
  }

  /**
   * The quiet safety net: the lines whose egg the home has never had, once it has kept pets for
   * life.MISSING_AFTER days. Their wild pets come more often (wild.MISSING_WEIGHT); nobody sees it.
   */
  longMissing(now: number): string[] {
    this.collect();
    const born = [...this.pets, ...this.ancestors].map((p) => p.born_at).filter((t) => t > 0);
    if (!born.length || now - Math.min(...born) < life.MISSING_AFTER * 86400) {
      return [];
    }
    return Object.keys(life.LINES).filter((line) => !this.album.includes(`egg:${line}`));
  }

  /** A new name for the pet with this id (without one: the camera's). */
  rename(name: unknown, id?: unknown): void {
    const pet = this.find(id);
    const text = String(name ?? "").split(/\s+/).filter(Boolean).join(" ");
    const length = [...text].length;
    if (length < 1 || length > MAX_NAME) {
      throw new model.RequestError("name_length");
    }
    pet.name = text;
    this.write(this.clock());
  }

  save(): void {
    this.write(this.clock());
  }

  /** What is saved: the pets, their ancestors and the album, as the save file has them. */
  toSave(): SaveFile {
    this.collect();
    const current = this.state;
    return {
      version: VERSION, pet: toDict(current),
      others: this.pets.filter((pet) => pet !== current).map((pet) => ({ ...toDict(pet), items: {}, eggs: [] })),
      place: this.pets.indexOf(current),
      ancestors: structuredClone(this.ancestors), album: [...this.album],
      seen: structuredClone(this.seen), mastered: [...this.mastered],
      ...Object.keys(this.moved).length ? { moved: { ...this.moved } } : {},
      ...this.away.length ? { away: structuredClone(this.away) } : {},
    };
  }

  /** Takes pets that were saved (see readSave) in place of these, ancestors and all. */
  replace(saved: Saved): void {
    // a pet that has moved since the file was saved lives elsewhere now: the file is an old copy
    if ([saved.state, ...saved.others ?? []].some((pet) => pet.id && pet.moves < (this.moved[pet.id] ?? 0))) {
      throw new model.RequestError("stale");
    }
    for (const [id, moves] of Object.entries(saved.moved ?? {})) {
      this.moved[id] = Math.max(moves, this.moved[id] ?? 0);
    }
    this.ancestors = saved.ancestors;
    this.album = startAlbum(saved);
    this.seen = { ...saved.seen };
    this.mastered = [...saved.mastered ?? []];
    this.take(saved);
    this.requestIds.clear();
    this.write(this.clock());
  }

  // ---------- internal ----------

  /** The pets from what was saved, the camera on the one it was on. */
  private take(saved: Saved): void {
    const others = (saved.others ?? []).slice(0, PLACES - 1);
    const place = Math.min(saved.place ?? 0, others.length);
    this.pets = [...others.slice(0, place), saved.state, ...others.slice(place)];
    const seen = new Set<string>();
    for (const pet of this.pets) {
      if (!pet.id || seen.has(pet.id)) {
        pet.id = newId();
      }
      seen.add(pet.id);
    }
    this.currentId = saved.state.id;
    this.share(saved.state);
  }

  /** All pets share the finds and the eggs of `from` (an action may have put new ones in their place). */
  private share(from: PetState): void {
    for (const pet of this.pets) {
      pet.items = from.items;
      pet.eggs = from.eggs;
    }
  }

  /** A hat or a decoration exists only once: once `pet` wears or sets it out, no other pet does. */
  private onlyHere(pet: PetState, item: string): void {
    if (pet.hat !== item && !pet.deco.includes(item)) {
      return; // put away
    }
    for (const other of this.pets) {
      if (other !== pet) {
        if (other.hat === item) {
          other.hat = "";
        }
        other.deco = other.deco.filter((d) => d !== item);
      }
    }
  }

  /**
   * Adds the forms the pets have been to the album, the wild pets they met on their trips to the
   * forms seen, and a pet that knows every trick and has shown its special move to the mastered.
   */
  private collect(): void {
    for (const pet of this.pets) {
      for (const form of life.formsOf(pet.stage, pet.species)) {
        if (!this.album.includes(form)) {
          this.album.push(form);
        }
      }
      for (const travel of pet.travels ?? []) {
        for (const stop of travel.stops.filter((s) => s.kind === "wild" && s.wild)) {
          const form = `adult:${stop.wild}`;
          if (life.FORMS.includes(form) && !this.seen[form]) {
            this.seen[form] = { area: travel.area, night: isDark(stop.at, this.location) };
          }
        }
      }
      const form = `adult:${pet.species}`;
      if (pet.stage === "adult" && (pet.counters.specials ?? 0) > 0 && !this.mastered.includes(form)
          && care.learned(pet).length === Object.keys(care.TRICKS).length) {
        this.mastered.push(form);
      }
    }
  }

  private advance(now: number): void {
    if (!clockValid(now)) {
      return; // clock not set yet: better to wait than to get it wrong
    }
    for (const s of this.pets) {
      if (!clockValid(s.updated_at)) {
        s.updated_at = now;
        if (!clockValid(s.born_at)) {
          s.born_at = now;
        }
        if (!clockValid(s.stage_since)) {
          s.stage_since = now;
        }
      }
    }
    const from = Math.min(...this.pets.map((s) => s.updated_at));
    if (this.pets.length > 1 && now > from && now - from <= model.MAX_CATCH_UP) {
      // two of them play together every time they have been together by day
      for (let end = companion.nextOutEnd(from); end <= now; end = companion.nextOutEnd(end)) {
        this.advanceAll(end);
        this.playedTogether(end);
      }
    }
    this.advanceAll(now);
  }

  private advanceAll(now: number): void {
    const missing = this.longMissing(now);
    for (const s of this.pets) {
      s.missing_lines = [...missing];
      model.advance(s, now, this.bedtime(), this.weather(), this.temperature(), this.location);
    }
  }

  /** A time together has just ended (at `end`): the pairs that could play, did. */
  private playedTogether(end: number): void {
    const at = end - 1;
    const hatched = this.pets.filter((s) => s.stage !== "egg");
    for (const [a, b] of companion.pairs(hatched.map((s) => s.id), at, false, companion.awayFrom(hatched))) {
      const [first, second] = [this.find(a), this.find(b)];
      if (companion.out(first, second, at, this.friendThere(first, at) || this.friendThere(second, at)) !== "awake"
          || !companion.canPlay(first, model.moodOf(first)) || !companion.canPlay(second, model.moodOf(second))) {
        continue;
      }
      for (const [learner, teacher, trick] of companion.together(first, second)) {
        model.logEvent(learner, end, "copied", "self", { item: `${trick}:${teacher.name}` });
      }
    }
  }

  private describe(s: PetState, now: number) {
    const t = this.t;
    const bedtime = this.bedtime();
    const due = life.dueAt(s);
    const placed = home.placeDeco(s);
    const friendView = (f: Friend) => ({
      species: f.species, label: t(`species.${f.species}`), visits: f.visits, needed: wild.VISITS_FOR_NEST,
      visiting: now < (f.until ?? 0), resting: wild.resting(f, now),
    });
    return {
      api: API_VERSION, api_oldest: API_OLDEST,
      now: Math.round(now),
      id: s.id,
      name: s.name, species: s.species, stage: s.stage,
      species_label: t(`species.${s.species}`), stage_label: t(life.formKey(s.stage, s.species)),
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
      hot: home.hot(s, now), // it sweats: a bath cools it down
      asleep: s.asleep, sick: s.sick, poops: s.poops,
      needs: model.needs(s),
      actions: model.availableActions(s, now),
      bedtime: { start: bedtime[0], end: bedtime[1] },
      weight: Number(s.weight.toFixed(1)), ideal_weight: care.ideal(s), weight_status: care.weightStatus(s),
      bond: Math.round(s.bond), bond_level: care.bondLevel(s),
      // What it likes most and what it won't eat, once each has been tried with this form
      favorite_food: food.known(s).favorite, disliked_food: food.known(s).disliked,
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
      // The latest scuffles, to be watched again; last_trip: when the latest trip set off
      replays: s.replays.map((r) => ({ ...r, rounds: r.rounds.map((round) => [...round]) })),
      last_trip: s.recent.trip?.at(-1) ?? null,
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
      // Finds: what there is, which of them are being worn or are set out, and where they stand
      items: Object.entries(s.items).filter(([k]) => k in home.ITEMS).map(([k, n]) => ({
        id: k, label: t(`items.${k}`), kind: home.ITEMS[k], count: n, active: k === s.hat || s.deco.includes(k),
        place: placed.outside.includes(k) ? "outside" : placed.inside.includes(k) ? "inside" : null,
        effects: [...home.effects(k), ...food.effects(k)],
      })),
      // The house (0 = none yet): how far it has grown, its spots for decorations, and where it
      // stands in the scene (parts of the picture: x, y, width, height), for a tap that looks in
      house: s.house ? {
        step: s.house, steps: home.HOUSE_STEPS, spots: home.HOUSE_SPOTS[s.house], area: houseArea(s.house),
        looking_in: now < s.look_in_until,
      } : null,
      // The eggs that are kept; "id" is what newEgg takes. `skills`: what the egg was given
      eggs: s.eggs.map((egg, i) => ({
        id: i, line: egg.line, label: t(`items.${home.eggOf(egg.line)}`), from: egg.from ?? null,
        skills: Object.entries(egg.skills ?? {}).filter(([, v]) => Math.round(v) !== 0)
          .map(([k, v]) => ({ id: k, label: t(`skills.${k}`), value: Math.round(v) })),
      })),
      // its friends; `resting`: they have just built a nest, and visits don't count towards the next one yet
      friends: s.friends.map(friendView),
      // one of them, the one visiting or else the latest, for apps from before there could be several
      friend: s.friends.length ? friendView(wild.visitor(s, now) ?? s.friends.at(-1)!) : null,
      nest: s.nest ? { line: s.nest.line, label: t(`items.${home.eggOf(s.nest.line)}`) } : null,
      // a friend's gift is lying there; what is in it is only told once it is unwrapped
      gift: !!s.gift,
      // what it found at home by itself ("fruit_<plant>" or "seed_<plant>"), until it is picked up
      found: s.found,
      // what found food has left in it and is still waiting to be used (food.FOODS)
      boosts: [...s.boosts],
      item_labels: Object.fromEntries(Object.keys(home.ITEMS).map((k) => [k, t(`items.${k}`)])),
      plant: s.plant ? {
        kind: s.plant.kind, label: t(`plants.${s.plant.kind}`),
        stage: home.plantStage(s), ripe: home.ripe(s), left: s.plant.left,
      } : null,
      // Since when it has been at Grandma's (it waits there to be fetched: action "grandma"), or null
      grandma: s.grandma ? { since: Math.round(s.grandma) } : null,
      // What happened while nobody was there, told as a little story (story.tell), or null
      welcome: story.tell(s, now, t),
      // All the pets at home, in the order of their houses: for switching the camera between them
      // (grandma: it is at Grandma's; away: on a trip; needs: something it needs is running low)
      ...this.street(now),
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
/** The decorations as the scene places them: outside, and in the house. */
function decoView(s: PetState): Pick<SceneView, "deco" | "house" | "house_deco"> {
  const placed = home.placeDeco(s);
  return { deco: placed.outside, house: s.house, house_deco: placed.inside };
}

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
