/**
 * The collection check:  npm run collection
 *
 * Plays a whole home for months in fast-forward, the way somebody who wants to find every line
 * would play it, and prints when each line's egg came home, where it came from, when it hatched and
 * which adult forms grew out of it. Where the balance check (tools/balance.ts) looks at one pet and
 * its needs, this one looks at the game around it: the trips and their guardians, the friends and
 * their nests, the garden guests, fishing, the shooting stars, the trick festival, digging and
 * Grandma. Everything goes through the real Pet (core/src/pet.ts), with weather that changes with
 * the seasons, so it shows the game as it is, not a model of it.
 *
 *   npm run collection                          all owners, four seasons, 120 days, four houses (takes a while)
 *   npm run collection -- --days=60 --seeds=2   shorter, two starts per season
 *   npm run collection -- --only=workday        some owners (ids in OWNERS)
 *   npm run collection -- --houses=2            how many houses the owner keeps (default: all, pet.PLACES)
 *   npm run collection -- --seasons=1,7         start months (1 = January)
 *   npm run collection -- --log                 also every egg and adult of every run
 *
 * The output names every form: it is meant for working on the values, not for the docs.
 */

import * as battle from "../core/src/battle";
import * as care from "../core/src/care";
import * as digging from "../core/src/digging";
import * as festival from "../core/src/festival";
import * as food from "../core/src/food";
import * as home from "../core/src/home";
import * as life from "../core/src/life";
import * as model from "../core/src/model";
import { DEFAULT_BEDTIME, PLACES, Pet } from "../core/src/pet";
import { Random } from "../core/src/random";
import type { PetState } from "../core/src/state";
import type { Location } from "../core/src/sun";
import * as trip from "../core/src/trip";
import * as wild from "../core/src/wild";

const LOCATION: Location = [48.21, 16.37]; // Vienna: the sun, the moon and the climate below
const GAP = 150; // seconds between two things the owner does on a visit
const STEP = 15 * 60; // the weather changes at most this often while time runs on
const ACTIVE_FROM = 35; // the owner only plays, trains or practices with this much energy
const FEED_BELOW = 70;
const WAIT_DAYS = 4; // a child that is due waits this long for a form the home hasn't had
const ADULT_DAYS = 2; // an adult in a house that changes hands stays this long before a new egg takes its place
const FULL_BAG = 8; // from this many eggs in the bag, the owner broods one of a line it has had too
// Decorations the owner sets out, the first ones first: what draws the garden guests and lets it
// fish, then what glows at night, the ember stone and the snow globe
const DECO_ORDER = ["pond", "woodpile", "lantern", "crystal", "glowshroom", "star_shard", "emberstone", "snowglobe"];

// ---------- Weather ----------

// Month (1–12): [mean °C, half the swing between night and day, chance of a wet day, chance of a
// thunderstorm on a wet afternoon]. Roughly Vienna.
const CLIMATE: Record<number, readonly [number, number, number, number]> = {
  1: [0.5, 3, 0.3, 0], 2: [2, 4, 0.3, 0], 3: [6, 5, 0.32, 0.02], 4: [11, 6, 0.35, 0.05],
  5: [16, 6, 0.4, 0.15], 6: [19.5, 6, 0.4, 0.25], 7: [21.5, 6, 0.35, 0.3], 8: [21, 6, 0.35, 0.25],
  9: [16, 5, 0.3, 0.1], 10: [10.5, 4, 0.3, 0.02], 11: [5, 3, 0.35, 0], 12: [1.5, 3, 0.35, 0],
};

interface Day {
  /** Hours of the day with rain or snow: [from, to). */
  wet: [number, number] | null;
  /** The hour a thunderstorm starts (it lasts two), or null. */
  storm: number | null;
  /** Clear (codes 0–1) or cloudy (2–3) when it doesn't rain. */
  clear: boolean;
  /** How much warmer or colder than usual the day is. */
  offset: number;
}

class Weather {
  private readonly days = new Map<number, Day>();

  constructor(private readonly seed: string) {}

  private day(t: number): [Day, number] {
    const date = new Date(t * 1000);
    const number = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
    let day = this.days.get(number);
    if (!day) {
      const yesterday = this.days.get(number - 1);
      const rng = new Random(`weather:${this.seed}:${number}`);
      const [, , wetChance, stormChance] = CLIMATE[date.getMonth() + 1];
      // weather keeps for a while: a wet day after a wet day is likelier
      const wetToday = rng.random() < (yesterday?.wet ? Math.min(0.8, wetChance + 0.3) : wetChance * 0.8);
      const from = rng.randint(0, 20);
      const storm = wetToday && rng.random() < stormChance ? rng.randint(13, 19) : null;
      day = {
        wet: wetToday ? [from, Math.min(24, from + rng.randint(2, 8))] : null,
        storm,
        clear: rng.random() < (yesterday?.clear ? 0.65 : 0.4),
        offset: (yesterday?.offset ?? 0) * 0.6 + rng.uniform(-3.5, 3.5),
      };
      this.days.set(number, day);
    }
    return [day, date.getHours() + date.getMinutes() / 60];
  }

  temp(t: number): number {
    const [day, hour] = this.day(t);
    const [mean, swing] = CLIMATE[new Date(t * 1000).getMonth() + 1];
    // coldest at 5, warmest at 15
    return mean + day.offset + swing * Math.cos((hour - 15) / 24 * 2 * Math.PI) - (day.wet && hour >= day.wet[0] && hour < day.wet[1] ? 2 : 0);
  }

  code(t: number): number {
    const [day, hour] = this.day(t);
    if (day.storm !== null && hour >= day.storm && hour < day.storm + 2) {
      return 95;
    }
    if (day.wet && hour >= day.wet[0] && hour < day.wet[1]) {
      return this.temp(t) < 1 ? 71 : 61;
    }
    return day.clear ? (hour % 5 < 3 ? 0 : 1) : 3;
  }
}

// ---------- Owners ----------

interface Visit {
  hour: number;
  minute: number;
  label: string;
  pets: number;
  /** Games: play, then hide and seek, then fishing, each only with enough energy. */
  plays: number;
  tricks: number;
  trainings: number;
  /** Chance of a trip on this visit. */
  trip: number;
  bed?: boolean;
}

interface Owner {
  id: string;
  title: string;
  day(weekday: number, rng: Random): Visit[];
  warms: number;
  /** Takes a pet to Grandma's for a day: on this weekday, at the visit with this label (fetched a day later). */
  grandma: [number, string] | null;
}

const v = (hour: number, minute: number, label: string, pets: number, plays: number, tricks: number,
  trainings: number, tripChance = 0, bed = false): Visit => ({ hour, minute, label, pets, plays, tricks, trainings, trip: tripChance, bed });

function workday(weekday: number, rng: Random): Visit[] {
  if (weekday === 0 || weekday === 6) {
    return [
      v(8, 30, "morning", 2, 1, 1, 0), v(12, 0, "midday", 2, 1, 0, 1, 1), v(15, 30, "afternoon", 2, 1, 1, 0),
      v(18, 0, "evening", 2, 1, 0, 1), v(20, 0, "late", 2, 0, 1, 0), v(22, 0, "bed", 1, 0, 0, 0, 0, true),
    ];
  }
  return [
    v(7, 0, "morning", 2, 0, 0, 0),
    ...(rng.random() < 0.3 ? [v(12, 30, "lunch", 2, 0, 0, 0)] : []),
    v(18, 0, "evening", 2, 1, 1, 1, 0.6), v(20, 0, "late", 2, 1, 1, 0), v(22, 0, "bed", 1, 0, 0, 0, 0, true),
  ];
}

export const OWNERS: Owner[] = [
  {
    id: "attentive",
    title: "Attentive: every two hours while awake, a trip a day, Grandma every second Saturday",
    day: () => [
      v(7, 15, "morning", 2, 1, 1, 0), v(9, 15, "9:15", 2, 0, 1, 1), v(11, 15, "11:15", 2, 1, 0, 0, 1),
      v(13, 15, "13:15", 2, 0, 1, 1), v(15, 15, "15:15", 2, 1, 0, 0, 0.3), v(17, 15, "17:15", 2, 0, 1, 1),
      v(19, 15, "19:15", 2, 1, 0, 0), v(21, 0, "21:00", 2, 0, 1, 0), v(22, 15, "bed", 1, 0, 0, 0, 0, true),
    ],
    warms: 4,
    grandma: [6, "morning"],
  },
  {
    id: "workday",
    title: "Workday: 7:00, sometimes lunch, 18:00–22:00, weekends at home; Grandma on Friday evenings",
    day: workday,
    warms: 2,
    grandma: [5, "evening"],
  },
  {
    id: "evenings",
    title: "Evenings only: 19:00–22:00; Grandma on Sunday evenings",
    day: () => [v(19, 0, "19:00", 2, 1, 1, 1, 0.6), v(20, 30, "20:30", 2, 1, 1, 0), v(22, 0, "bed", 1, 0, 0, 0, 0, true)],
    warms: 1,
    grandma: [0, "19:00"],
  },
];

// ---------- Measuring ----------

interface Arrival {
  line: string;
  day: number;
  /** What brought it: the action or event that put it into the bag. */
  source: string;
}

interface Grown {
  line: string;
  species: string;
  day: number;
  /** The house it lived in: the first one is kept, the others change hands. */
  keeper: boolean;
  /** The care diary of its child stage (life.newDiary). */
  diary: Record<string, number>;
}

interface Run {
  owner: string;
  month: number;
  seed: number;
  days: number;
  arrivals: Arrival[];
  hatched: Record<string, number>; // line -> day its first egg hatched
  grown: Grown[];
  guardians: Record<string, number>; // area -> day the keeper got past it first
  /** Days on which some line had as many eggs in the bag as it may (home.MAX_EGGS), so that more of it waited. */
  storeFullDays: number;
  pets: number; // eggs brooded
  grandmaVisits: number;
  festivals: number;
  digs: number;
  casts: number;
  friends: string[]; // the friends and guests, in the order they came
}

// ---------- The home ----------

class Home {
  now: number;
  readonly pet: Pet;
  readonly weather: Weather;
  readonly run: Run;
  private readonly start: number;
  private readonly bag = new Map<string, number>(); // line -> eggs of it in the bag, as last seen
  private readonly known = new Set<string>();
  private readonly adults = new Set<string>();
  private readonly friendsSeen = new Set<string>();
  private lastSource = "start";
  private fullSince: number | null = null;
  keeper = "";
  /** Pets at Grandma's on purpose: id -> when they went. */
  readonly atGrandmas = new Map<string, number>();
  /** Children that are due and wait for a form not had yet: id -> since when. */
  readonly waiting = new Map<string, number>();

  constructor(start: number, run: Run, seed: string) {
    this.now = start;
    this.start = start;
    this.run = run;
    this.weather = new Weather(seed);
    this.pet = new Pet({
      t: (key) => key, clock: () => this.now, location: LOCATION, log: () => {},
      bedtime: () => DEFAULT_BEDTIME,
      weather: () => ({ temp: Number(this.weather.temp(this.now).toFixed(1)), code: this.weather.code(this.now) }),
    });
    this.keeper = this.pet.current;
    this.run.pets = 1;
    this.run.hatched.blob = 0; // the first egg is always a slime, and it is there from the start
    this.known.add("blob");
  }

  day(t = this.now): number {
    return Math.floor((t - this.start) / 86400);
  }

  /** Time runs on to t, in steps so that the weather can change. */
  runTo(t: number): void {
    while (this.now < t) {
      this.now = Math.min(t, this.now + STEP);
      this.pet.update(this.now);
      this.observe("by itself");
    }
  }

  /** One action of the owner, then a short pause. Returns whether it was accepted. */
  act(id: string, action: string, options: Record<string, unknown> = {}): boolean {
    this.runTo(this.now);
    let accepted = false;
    try {
      accepted = this.pet.action(action, { pet: id, by: "owner", now: this.now, ...options }).accepted;
    } catch (error) {
      if (!(error instanceof model.RequestError)) {
        throw error;
      }
    }
    this.observe(options.item ? `${action}:${String(options.item)}` : action);
    this.now += GAP;
    return accepted;
  }

  /** Looks at what changed: new eggs in the bag, hatched eggs, new adults, friends. */
  observe(source: string): void {
    const store = this.pet.state.eggs;
    const counts = new Map<string, number>();
    for (const egg of store) {
      counts.set(egg.line, (counts.get(egg.line) ?? 0) + 1);
    }
    for (const [line, n] of counts) {
      for (let i = this.bag.get(line) ?? 0; i < n; i++) {
        this.run.arrivals.push({ line, day: this.day(), source: source === "by itself" ? this.eventSource() : source });
      }
    }
    this.bag.clear();
    for (const [line, n] of counts) {
      this.bag.set(line, n);
    }
    if ([...counts.values()].some((n) => n >= home.MAX_EGGS)) {
      this.fullSince ??= this.now;
    } else if (this.fullSince !== null) {
      this.run.storeFullDays += (this.now - this.fullSince) / 86400;
      this.fullSince = null;
    }
    for (const s of this.pet.pets) {
      const line = life.lineOf(s.species);
      if (s.stage !== "egg" && this.run.hatched[line] === undefined) {
        this.run.hatched[line] = this.day();
      }
      if (s.stage === "adult" && !this.adults.has(s.id)) {
        this.adults.add(s.id);
        this.run.grown.push({ line, species: s.species, day: this.day(), keeper: s.id === this.keeper, diary: { ...s.diary } });
      }
      for (const friend of s.friends) {
        const key = `${s.id}:${friend.species}`;
        if (!this.friendsSeen.has(key)) {
          this.friendsSeen.add(key);
          this.run.friends.push(friend.species);
        }
      }
    }
  }

  /** What a pet did last by itself or on a trip, for an egg that came without the owner. */
  private eventSource(): string {
    const latest = this.pet.pets.flatMap((s) => s.events).filter((e) => e.at <= this.now)
      .sort((a, b) => b.at - a.at)[0];
    if (latest && latest.at !== Math.round(this.now)) {
      this.lastSource = latest.item ? `${latest.action}:${latest.item}` : latest.action;
    }
    return this.lastSource;
  }

  /** Lines the home has had a pet of (hatched or not). */
  had(line: string): boolean {
    return this.known.has(line);
  }

  /** Broods an egg from the bag: in a new house, or in the place of the pet `place`. */
  brood(index: number, place: string | null): void {
    const line = this.pet.state.eggs[index].line;
    this.runTo(this.now);
    this.pet.newEgg(index, this.now, place);
    this.known.add(line);
    this.run.pets += 1;
    this.observe("brood");
    this.now += GAP;
  }

  finish(): void {
    if (this.fullSince !== null) {
      this.run.storeFullDays += (this.now - this.fullSince) / 86400;
    }
  }
}

// ---------- A visit ----------

function find(h: Home, id: string): PetState {
  return h.pet.find(id);
}

/** Before the visit to the pets: a new egg into a house, if there is one worth it. */
function broodIfWorth(h: Home, houses: number): void {
  const eggs = h.pet.state.eggs;
  if (!eggs.length) {
    return;
  }
  // a line never had first, then (when the bag is about to overflow) the line with the fewest forms grown
  let index = eggs.findIndex((egg) => !h.had(egg.line));
  if (index < 0 && eggs.length >= FULL_BAG) {
    const grownOf = (line: string) => new Set(h.run.grown.filter((g) => g.line === line).map((g) => g.species)).size;
    index = eggs.map((egg, i) => [grownOf(egg.line), i] as const).sort((a, b) => a[0] - b[0])[0][1];
  }
  if (index < 0) {
    return;
  }
  if (h.pet.pets.length < houses) {
    h.brood(index, null);
    return;
  }
  // the house that changes hands: the oldest adult there that has had its days
  const free = h.pet.pets.filter((s) => s.id !== h.keeper && s.stage === "adult" && !s.trip && !s.grandma
    && h.now - s.stage_since >= ADULT_DAYS * 86400).sort((a, b) => a.stage_since - b.stage_since)[0];
  if (free) {
    h.brood(index, free.id);
  }
}

/** The area for a trip: a guardian still waiting first, then wild pets of a line never had, then any. */
function chooseArea(h: Home, s: PetState, rng: Random): string {
  const open = trip.AREAS.filter((area) => trip.unlocked(s, area));
  const guarded = [...open].reverse().find((area) => !s.guardians.includes(area));
  if (guarded) {
    return guarded;
  }
  const missing = open.filter((area) => h.pet.wildLeft(area));
  if (missing.length && wild.looking(s)) {
    return rng.choice(missing);
  }
  return rng.choice(open);
}

/**
 * A child that is due grows up into a form the home hasn't had (the secret one first), if one can
 * be picked now. Otherwise it waits up to WAIT_DAYS for one, and then takes the second form if it
 * can, else the base.
 */
function growUp(h: Home, id: string): void {
  const s = find(h, id);
  if (s.stage !== "child") {
    h.act(id, "evolve");
    return;
  }
  const choices = h.pet.snapshot(h.now, id).evolution?.choices ?? [];
  const ready = choices.filter((c) => c.ready && c.form).reverse(); // the secret, the second, the base
  const fresh = ready.find((c) => !h.pet.album.includes(`adult:${c.form}`));
  const since = h.waiting.get(id) ?? h.now;
  h.waiting.set(id, since);
  const someMissing = choices.some((c) => !c.form || !h.pet.album.includes(`adult:${c.form}`));
  if (!fresh && someMissing && h.now - since < WAIT_DAYS * 86400) {
    return; // later
  }
  const pick = fresh ?? ready.find((c) => c.kind !== "secret") ?? ready[0];
  h.act(id, "evolve", { item: pick.form });
  h.waiting.delete(id);
}

function visitPet(h: Home, owner: Owner, id: string, plan: Visit, rng: Random, weekday: number): void {
  let s = find(h, id);
  if (s.grandma) {
    const went = h.atGrandmas.get(id);
    if (went !== undefined && h.now - went >= 86400) {
      h.act(id, "grandma"); // fetched after a whole day
      h.atGrandmas.delete(id);
      s = find(h, id);
    } else {
      return;
    }
  }
  if (s.stage === "egg") {
    for (let i = 0; i < owner.warms; i++) {
      h.act(id, "pet");
    }
    if (life.isDue(s, h.now)) {
      h.act(id, "evolve");
    }
    return;
  }
  if (life.isDue(s, h.now) && !s.asleep && !s.trip) {
    growUp(h, id);
  }
  if (s.trip) {
    return;
  }
  if (s.backpack.length && !s.asleep) {
    h.act(id, "unpack");
  }
  if (!s.asleep) {
    tidy(h, id);
  }
  if (s.sick) {
    h.act(id, "medicine");
  }
  if (s.poops || s.stats.hygiene < 70) {
    h.act(id, "clean");
  }
  for (let i = 0; i < 2 && !s.asleep && s.stats.satiety < FEED_BELOW; i++) {
    // now and then something from the bag instead of a meal
    const bag = food.EDIBLE.filter((item) => (s.items[item] ?? 0) > 0);
    h.act(id, "feed", { item: bag.length && rng.random() < 0.3 ? rng.choice(bag) : "meal" });
  }
  if (home.cold(s, h.now)) {
    h.act(id, "pet");
  }
  for (let i = 0; i < plan.pets; i++) {
    h.act(id, "pet");
  }
  if (s.asleep && !plan.bed) {
    return;
  }
  // a festival day: off to the festival with its best tricks, at the first visit it can go
  if (festival.canGo(s, h.now) === null && !s.backpack.length) {
    if (h.act(id, "festival")) {
      h.run.festivals += 1;
      return;
    }
  }
  if (owner.grandma && owner.grandma[0] === weekday && owner.grandma[1] === plan.label && id !== h.keeper
      && !h.atGrandmas.size) {
    if (h.act(id, "visit_grandma")) {
      h.atGrandmas.set(id, h.now);
      h.run.grandmaVisits += 1;
      return;
    }
  }
  if (plan.trip > 0 && s.stage !== "baby" && rng.random() < plan.trip) {
    if (s.stats.satiety < 70) {
      h.act(id, "feed", { item: "meal" });
    }
    const snack = food.EDIBLE.find((item) => (s.items[item] ?? 0) > 0);
    if (h.act(id, "trip", { item: chooseArea(h, s, rng), value: [trip.BALL, ...snack ? [snack] : []] })) {
      return;
    }
  }
  if ((s.items[digging.MAP] ?? 0) > 0 && digging.canDig(s) === null && s.stats.energy >= ACTIVE_FROM) {
    if (h.act(id, "dig")) {
      h.run.digs += 1;
    }
  }
  for (let i = 0; i < plan.plays && s.stats.energy >= ACTIVE_FROM; i++) {
    const kind = rng.randint(0, 2);
    if (kind === 1) {
      hideAndSeek(h, id, rng);
    } else if (kind === 2 && home.placeDeco(s).outside.includes("pond")) {
      fish(h, id);
    } else {
      h.act(id, "play");
    }
  }
  for (let i = 0; i < plan.tricks && s.stats.energy >= ACTIVE_FROM; i++) {
    const trick = Object.keys(care.TRICKS).find((name) => !care.knows(s, name));
    const rest = model.restLeft(s, ["trick"], h.now);
    if (trick && rest > 0) {
      h.runTo(h.now + rest);
    }
    h.act(id, "trick", { item: trick ?? rng.choice(care.learned(s)) });
  }
  for (let i = 0; i < plan.trainings && s.stats.energy >= ACTIVE_FROM; i++) {
    train(h, id, rng);
  }
  if (plan.bed && !s.asleep && !s.trip) {
    h.act(id, "sleep");
  }
}

/** Gifts, nests, what lies around, the plant, the decorations, a hat. */
function tidy(h: Home, id: string): void {
  const s = find(h, id);
  if (s.gift) {
    h.act(id, "unwrap");
  }
  if (s.nest) {
    h.act(id, "collect");
  }
  if (s.found || s.fallen) {
    h.act(id, "pickup");
    if (s.fallen) {
      h.act(id, "pickup", { item: "star" });
    }
  }
  const seed = Object.keys(home.PLANTS).filter((kind) => s.items[`seed_${kind}`])
    .sort((a, b) => s.items[`seed_${b}`] - s.items[`seed_${a}`])[0];
  if (!s.plant && seed) {
    h.act(id, "plant", { item: seed });
  }
  if (id === h.keeper) {
    // the keeper's house gets the decorations, in the order of DECO_ORDER
    const wanted = DECO_ORDER.filter((item) => (s.items[item] ?? 0) > 0).slice(0, home.decoSpots(s));
    for (const item of wanted) {
      if (!s.deco.includes(item)) {
        h.act(id, "deco", { item });
      }
    }
  }
  if (!s.hat) {
    const hats = home.ids("hat").filter((hat) => (s.items[hat] ?? 0) > 0);
    if (hats.length) {
      h.act(id, "wear", { item: hats[0] });
    }
  }
}

function hideAndSeek(h: Home, id: string, rng: Random): void {
  if (!h.act(id, "game", { item: "start" })) {
    return;
  }
  const s = find(h, id);
  const spots = care.hidingSpots(s, home.placeDeco(s).outside);
  const left = [...spots];
  while (left.length) {
    const spot = left.splice(rng.randint(0, left.length - 1), 1)[0];
    h.now -= GAP - 5; // a look takes seconds, not minutes
    if (!care.gameActive(s, h.now) || !h.act(id, "game", { item: spot })) {
      break;
    }
  }
}

function fish(h: Home, id: string): void {
  h.now -= GAP - 2;
  if (!h.act(id, "fish", { item: "cast" })) {
    return;
  }
  h.run.casts += 1;
  const line = find(h, id).fishing;
  if (line?.bite == null) {
    return;
  }
  h.now = line.at + line.bite + 0.6; // a tap a moment after the dip
  h.act(id, "fish", { item: "pull" });
}

/** One exercise, the way a person does it: not perfect. */
function train(h: Home, id: string, rng: Random): void {
  const s = find(h, id);
  const skill = battle.SKILLS[(s.counters.trainings ?? 0) % battle.SKILLS.length];
  const rest = model.restLeft(s, battle.SKILLS.map((name) => `train_${name}`), h.now);
  if (rest > 0) {
    h.runTo(h.now + rest);
  }
  if (skill === "strength") {
    h.act(id, "train", { item: "strength", value: Number(rng.uniform(0.55, 0.95).toFixed(2)) });
    return;
  }
  if (!h.act(id, "train", { item: skill })) {
    return;
  }
  const training = s.training;
  if (!training) {
    return;
  }
  if (skill === "speed") {
    h.now = training.at + training.delay! + rng.uniform(0.45, 0.9);
    h.act(id, "train", { item: "tap" });
  } else {
    const steps = [...training.sequence!];
    if (rng.random() < 0.35) {
      steps[rng.randint(0, steps.length - 1)] = steps[0] === "left" ? "right" : "left";
    }
    h.now = training.at + steps.length * battle.SHOW_STEP + 5;
    h.act(id, "train", { item: "answer", value: steps });
  }
}

// ---------- One run ----------

function simulate(owner: Owner, month: number, seed: number, days: number, houses: number): Run {
  // a Monday in the middle of the month
  let base = new Date(2026, month - 1, 10);
  base = new Date(2026, month - 1, 10 + ((8 - base.getDay()) % 7));
  base.setDate(base.getDate() + seed * 3);
  const rng = new Random(`collection:${owner.id}:${month}:${seed}`);
  const run: Run = {
    owner: owner.id, month, seed, days, arrivals: [], hatched: {}, grown: [], guardians: {}, storeFullDays: 0,
    pets: 0, grandmaVisits: 0, festivals: 0, digs: 0, casts: 0, friends: [],
  };
  const at = (day: number, hour: number, minute: number) =>
    new Date(base.getFullYear(), base.getMonth(), base.getDate() + day, hour, minute).getTime() / 1000;
  const first = owner.day(base.getDay(), rng)[0];
  const h = new Home(at(0, first.hour, first.minute) - 60, run, `${owner.id}:${month}:${seed}`);
  for (let day = 0; day < days; day++) {
    const weekday = new Date(base.getFullYear(), base.getMonth(), base.getDate() + day).getDay();
    for (const plan of owner.day(weekday, rng)) {
      h.runTo(at(day, plan.hour, plan.minute) + rng.randint(-15, 15) * 60);
      broodIfWorth(h, houses);
      // the trough and the basin in the yard, once there is one (they belong to the home)
      h.act(h.keeper, "fill", { item: "trough" });
      h.act(h.keeper, "fill", { item: "basin" });
      for (const s of [...h.pet.pets]) {
        visitPet(h, owner, s.id, plan, rng, weekday);
      }
    }
    const keeper = h.pet.pets.find((s) => s.id === h.keeper);
    for (const area of keeper?.guardians ?? []) {
      run.guardians[area] ??= day;
    }
  }
  h.runTo(at(days, 0, 0));
  h.finish();
  return run;
}

// ---------- Report ----------

function median(values: number[]): number | null {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

function fmt(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined || Number.isNaN(value) ? "–" : value.toFixed(digits);
}

function table(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => (i ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join("  ");
  return [line(header), widths.map((w) => "-".repeat(w)).join("  "), ...rows.map(line)].join("\n");
}

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function report(owner: Owner, runs: Run[]): string {
  const out: string[] = [`## ${owner.id}: ${owner.title}`, ""];
  out.push(`${runs.length} runs (start months ${[...new Set(runs.map((r) => MONTHS[r.month]))].join(", ")}), ${runs[0].days} days each.`);
  out.push("");
  // per line: how many runs had its egg, the day of the first one (median, range), what brought
  // it, the day it first hatched, and the adult forms that grew
  const rows = Object.entries(life.LINES).map(([line, adults]) => {
    const firsts = runs.map((r) => r.arrivals.find((a) => a.line === line)).filter((a) => a !== undefined);
    const days = firsts.map((a) => a.day);
    const sources = new Map<string, number>();
    for (const a of firsts) {
      const key = a.source.replace(/^(unpack|pickup|trip|collect|unwrap|dig|grandma).*$/, "$1");
      sources.set(key, (sources.get(key) ?? 0) + 1);
    }
    const hatched = runs.map((r) => r.hatched[line]).filter((d) => d !== undefined);
    const forms = adults.map((adult, i) => {
      const n = runs.filter((r) => r.grown.some((g) => g.species === adult)).length;
      return `${adult}${i === 2 ? "*" : ""} ${n}`;
    });
    return [
      line,
      `${line === "blob" ? runs.length : firsts.length}/${runs.length}`,
      line === "blob" ? "0" : fmt(median(days)),
      days.length ? `${Math.min(...days)}–${Math.max(...days)}` : "–",
      [...sources].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ") || (line === "blob" ? "start" : "–"),
      `${hatched.length}/${runs.length}`,
      fmt(median(hatched)),
      forms.join(", "),
    ];
  });
  out.push("Eggs and forms per line (days since the start; forms: in how many runs it grew, * = special):");
  out.push(table(["line", "egg", "day", "range", "first came by", "hatched", "day", "adult forms (runs)"], rows));
  out.push("");
  // how the collection grows over time
  const marks = [7, 14, 30, 60, 90, 120, 180, 240, 365].filter((d) => d <= runs[0].days);
  const lineCount = Object.keys(life.LINES).length;
  out.push("Lines over time (median over the runs):");
  out.push(table(["day", ...marks.map(String)], [
    ["eggs had", ...marks.map((d) => fmt(median(runs.map((r) =>
      new Set(["blob", ...r.arrivals.filter((a) => a.day < d).map((a) => a.line)]).size))))],
    ["hatched", ...marks.map((d) => fmt(median(runs.map((r) => Object.values(r.hatched).filter((x) => x < d).length))))],
    ["adult forms", ...marks.map((d) => fmt(median(runs.map((r) =>
      new Set(r.grown.filter((g) => g.day < d).map((g) => g.species)).size))))],
  ]));
  out.push(`(${lineCount} lines, ${lineCount * 3} adult forms)`);
  out.push("");
  const areas = trip.AREAS.map((area) => {
    const beaten = runs.map((r) => r.guardians[area]).filter((d) => d !== undefined);
    return `${area} ${beaten.length}/${runs.length} (day ${fmt(median(beaten))})`;
  });
  // what the children's diaries came to, next to the rules that read them
  const grown = runs.flatMap((r) => r.grown).filter((g) => (g.diary.minutes ?? 0) > 0);
  const perDay = (kind: string) => avg(grown.map((g) => (g.diary[kind] ?? 0) / (g.diary.minutes / 1440)));
  const total = (kind: string) => avg(grown.map((g) => g.diary[kind] ?? 0));
  const share = (test: (g: Grown) => boolean) => `${grown.filter(test).length}/${grown.length}`;
  out.push(`Child diaries of the ${grown.length} pets that grew up (average; the rule in brackets, share that reached it):`);
  out.push(table(["", "value", "rule", "reached"], [
    ["care %", fmt(100 * avg(grown.map((g) => g.diary.good_minutes / g.diary.minutes))), `${100 * life.GEMPEROR_CARE} (gemperor)`,
      share((g) => g.diary.good_minutes / g.diary.minutes >= life.GEMPEROR_CARE)],
    ...([
      ["love", life.NEEDLENUB_LOVE_PER_DAY, "needlenub"],
      ["plays", life.FLARELET_PLAYS_PER_DAY, "flarelet"], ["trips", life.ROAMTAIL_TRIPS_PER_DAY, "roamtail"],
      ["battles", life.DRAKWING_BATTLES_PER_DAY, "drakwing"], ["baths", life.STEAMO_BATHS_PER_DAY, "steamo"],
    ] as const).map(([kind, rule, form]) => [`${kind} per day`, fmt(perDay(kind), 1), `${rule} (${form})`,
      share((g) => (g.diary[kind] ?? 0) / (g.diary.minutes / 1440) >= rule)]),
    ...([
      ["games", life.HIDEWELL_GAMES, "hidewell"], ["baths", life.JEWELWING_BATHS, "jewelwing"],
      ["food_honeycomb", life.SNORBEAR_HONEYCOMBS, "snorbear"], ["food_glowberry", life.SALAMBER_GLOWBERRIES, "salamber*"],
      ["trips_forest", life.FOXFIRE_FOREST_TRIPS, "foxfire*"], ["plant_fruits", life.SAKURIN_PLANT_FRUITS, "sakurin*"],
      ["rain_trips", life.BUBBLEHELM_RAIN_TRIPS, "bubblehelm*"], ["tucked", life.HIPPULA_TUCKED, "hippula*"],
      ["guardians", life.ACEWING_GUARDIANS, "acewing*"], ["clean_battles", life.NINJOWL_CLEAN_BATTLES, "ninjowl*"],
      ["festival_wins", 1, "illusionna*"], ["tricks", life.RAPIERRE_TRICKS, "rapierre"],
      ["tricks", life.CARDWING_TRICKS, "cardwing"], ["love_days", life.PURRLOOP_DAYS, "purrloop*"],
      ["festival_dance", 1, "pawdini*"],
    ] as const).map(([kind, rule, form]) => [`${kind} as a child`, fmt(total(kind), 1), `${rule} (${form})`,
      share((g) => (g.diary[kind] ?? 0) >= rule)]),
  ]));
  out.push("");
  out.push(`Guardians the first pet got past: ${areas.join(", ")}`);
  out.push(`Per run (average): eggs brooded ${fmt(avg(runs.map((r) => r.pets)), 1)}, at Grandma's ${fmt(avg(runs.map((r) => r.grandmaVisits)), 1)}, `
    + `festivals ${fmt(avg(runs.map((r) => r.festivals)), 1)}, digs ${fmt(avg(runs.map((r) => r.digs)), 1)}, `
    + `casts at the pond ${fmt(avg(runs.map((r) => r.casts)), 1)}, friends and guests ${fmt(avg(runs.map((r) => r.friends.length)), 1)}`);
  out.push(`Days with a line at its ${home.MAX_EGGS} eggs in the bag: ${fmt(avg(runs.map((r) => r.storeFullDays)), 1)} on average, `
    + `${runs.filter((r) => r.storeFullDays > 0).length}/${runs.length} runs`);
  const duplicates = runs.map((r) => r.arrivals.length - new Set(r.arrivals.map((a) => a.line)).size);
  out.push(`Eggs of a line that had come before: ${fmt(avg(duplicates), 1)} per run`);
  out.push("");
  return out.join("\n");
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}

function main(): void {
  const args = new Map(process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value] as const;
  }));
  const days = Number(args.get("days") ?? 120);
  const seeds = Number(args.get("seeds") ?? 1);
  const houses = Number(args.get("houses") ?? PLACES);
  const months = (args.get("seasons") ?? "1,4,7,10").split(",").map(Number);
  const only = args.get("only")?.split(",");
  const owners = OWNERS.filter((o) => !only || only.includes(o.id));
  console.log(`# Collection check: ${days} days, ${houses} houses, start months ${months.map((m) => MONTHS[m]).join(", ")}, `
    + `${seeds} start(s) each`);
  console.log("Weather: a made-up year like Vienna's (rain, snow below 1 °C, summer thunderstorms). Bedtime 22:30–07:00.");
  console.log("The first house keeps its pet; a new egg of a line never had moves into another house once the adult there has had two days.");
  console.log("");
  for (const owner of owners) {
    const runs: Run[] = [];
    for (const month of months) {
      for (let seed = 0; seed < seeds; seed++) {
        const run = simulate(owner, month, seed, days, houses);
        runs.push(run);
        if (args.has("log")) {
          console.log(`${owner.id} ${MONTHS[month]} #${seed}: eggs ${run.arrivals.map((a) => `${a.line}@${a.day}(${a.source})`).join(" ")}`);
          console.log(`  grown ${run.grown.map((g) => `${g.species}@${g.day}${g.keeper ? "k" : ""}`).join(" ")}; friends ${run.friends.join(" ")}`);
        }
      }
    }
    console.log(report(owner, runs));
  }
}

main();
