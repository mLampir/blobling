/**
 * The balance check:  npm run balance
 *
 * Plays pets for a few weeks in fast-forward, each with an owner of a different kind, and prints
 * what came of it: the stats at every visit, how often the app would call, how long the pet was
 * in need, the stages, the adult forms, trips, scuffles, guardians and friends. Everything goes
 * through the real core (model.tick and model.applyAction, notify.nextReminder), so it shows the
 * game as it is, not a model of it.
 *
 *   npm run balance                          all owners, all lines, three starts each, 21 days
 *   npm run balance -- --days=14 --seeds=2   shorter
 *   npm run balance -- --only=workday        some owners (ids in PROFILES)
 *   npm run balance -- --lines=blob,fox      some lines (life.LINES)
 *   npm run balance -- --alone               the energy of a pet left alone from morning to evening, hour by hour
 *
 * The output names adult forms: it is meant for working on the values, not for the docs.
 */

import * as battle from "../core/src/battle";
import * as care from "../core/src/care";
import * as home from "../core/src/home";
import * as idle from "../core/src/idle";
import * as life from "../core/src/life";
import * as model from "../core/src/model";
import * as notify from "../core/src/notify";
import { DEFAULT_BEDTIME } from "../core/src/pet";
import { Random } from "../core/src/random";
import type { PetState, Trip } from "../core/src/state";
import * as trip from "../core/src/trip";
import * as wild from "../core/src/wild";

const BEDTIME = DEFAULT_BEDTIME;
const GAP = 150; // seconds between two things the owner does on a visit (petting counts every two minutes)
const ACTIVE_FROM = 35;
const FEED_BELOW = 70; // the owner gives a meal below this satiety (a meal is refused above 90) // the owner only plays, trains or practices with a pet that has at least this much energy
const NEEDS = ["satiety", "energy", "hygiene", "mood"] as const;
const SHOWN = ["energy", "satiety", "hygiene", "mood", "health"] as const;

// ---------- Owners ----------

/** What the owner does on a visit, besides feeding, cleaning and curing (which every visit does). */
interface Care {
  pets: number;
  /** Activities, in this order, each only with enough energy: play, trick, train. */
  plays: number;
  tricks: number;
  trainings: number;
  /** Chance of a trip on this visit, if it can go. */
  trip: number;
  /** Puts it to bed. */
  bed?: boolean;
}

interface Planned {
  at: number;
  label: string;
  care: Care;
}

interface Profile {
  id: string;
  title: string;
  /** The visits of one day: [hour, minute, label, care]. `day`: 0 = Sunday. */
  day(day: number, rng: Random): [number, number, string, Care][];
  /** Packs a snack and a ball for trips. */
  packs: boolean;
  /** Sets out the ember stone, plants seeds, unwraps gifts, collects eggs. */
  tidy: boolean;
  /** Pets the egg to warm it. */
  warms: number;
}

const QUICK: Care = { pets: 2, plays: 0, tricks: 0, trainings: 0, trip: 0 };
const BED: Care = { pets: 1, plays: 0, tricks: 0, trainings: 0, trip: 0, bed: true };

function workday(day: number, rng: Random, absentOn: number | null = null): [number, number, string, Care][] {
  if (day === absentOn) {
    return [];
  }
  if (day === 0 || day === 6) {
    return [
      [8, 30, "morning", { pets: 2, plays: 1, tricks: 1, trainings: 0, trip: 0 }],
      [12, 0, "midday", { pets: 2, plays: 1, tricks: 0, trainings: 1, trip: 1 }],
      [15, 30, "afternoon", { pets: 2, plays: 1, tricks: 1, trainings: 0, trip: 0 }],
      [18, 0, "evening", { pets: 2, plays: 1, tricks: 0, trainings: 1, trip: 0 }],
      [20, 0, "late", { pets: 2, plays: 0, tricks: 1, trainings: 0, trip: 0 }],
      [22, 0, "bed", BED],
    ];
  }
  const visits: [number, number, string, Care][] = [[7, 0, "morning", QUICK]];
  if (rng.random() < 0.3) {
    visits.push([12, 30, "lunch", QUICK]);
  }
  visits.push(
    [18, 0, "evening", { pets: 2, plays: 1, tricks: 1, trainings: 1, trip: 0.5 }],
    [20, 0, "late", { pets: 2, plays: 1, tricks: 1, trainings: 0, trip: 0 }],
    [22, 0, "bed", BED],
  );
  return visits;
}

export const PROFILES: Profile[] = [
  {
    id: "attentive",
    title: "Attentive: every two hours while awake, plays, trains, a trip a day",
    day: () => [
      [7, 15, "morning", { pets: 2, plays: 1, tricks: 1, trainings: 0, trip: 0 }],
      [9, 15, "9:15", { pets: 2, plays: 0, tricks: 1, trainings: 1, trip: 0 }],
      [11, 15, "11:15", { pets: 2, plays: 1, tricks: 0, trainings: 0, trip: 1 }],
      [13, 15, "13:15", { pets: 2, plays: 0, tricks: 1, trainings: 1, trip: 0 }],
      [15, 15, "15:15", { pets: 2, plays: 1, tricks: 0, trainings: 0, trip: 0.3 }],
      [17, 15, "17:15", { pets: 2, plays: 0, tricks: 1, trainings: 1, trip: 0 }],
      [19, 15, "19:15", { pets: 2, plays: 1, tricks: 0, trainings: 0, trip: 0 }],
      [21, 0, "21:00", { pets: 2, plays: 0, tricks: 1, trainings: 0, trip: 0 }],
      [22, 15, "bed", BED],
    ],
    packs: true,
    tidy: true,
    warms: 4,
  },
  {
    id: "workday",
    title: "Workday: 7:00, sometimes lunch, 18:00–22:00; weekends at home",
    day: (day, rng) => workday(day, rng),
    packs: true,
    tidy: true,
    warms: 2,
  },
  {
    id: "absent",
    title: "Workday, and every Saturday away all day",
    day: (day, rng) => workday(day, rng, 6),
    packs: true,
    tidy: true,
    warms: 2,
  },
  {
    id: "evenings",
    title: "Evenings only: 19:00–22:00",
    day: () => [
      [19, 0, "19:00", { pets: 2, plays: 1, tricks: 1, trainings: 1, trip: 0.5 }],
      [20, 30, "20:30", { pets: 2, plays: 1, tricks: 1, trainings: 0, trip: 0 }],
      [22, 0, "bed", BED],
    ],
    packs: false,
    tidy: true,
    warms: 1,
  },
  {
    id: "neglect",
    title: "Neglectful: once a day around 19:00, only what is needed",
    day: (_day, rng) => [[18 + rng.randint(0, 2), rng.randint(0, 59), "once", { pets: 0, plays: 0, tricks: 0, trainings: 0, trip: 0 }]],
    packs: false,
    tidy: false,
    warms: 0,
  },
];

// ---------- Measuring ----------

interface Arrival {
  stage: string;
  label: string;
  stats: Record<string, number>;
  asleep: boolean;
  sick: boolean;
  poops: number;
  weekday: boolean;
}

interface TripDone {
  area: string;
  minutes: number;
  stations: number;
  finds: number;
  battles: number;
  /** Opponents that a ball in the backpack distracted. */
  balls: number;
  guardian: string | null;
  guardianFought: boolean;
  guardianWon: boolean;
  wild: number;
  friend: boolean;
  turnedBack: string | null;
}

interface Run {
  profile: string;
  line: string;
  start: number;
  end: number;
  arrivals: Arrival[];
  /** Local day key -> notifications that would have come. */
  calls: Map<string, string[]>;
  /** Local day key -> weekday? and whether there was a visit that day. */
  days: Map<string, { weekday: boolean; visited: boolean }>;
  criticalMinutes: Record<string, number>; // per stage, awake at home with a critical need (or sick)
  stageMinutes: Record<string, number>;
  sickCount: Record<string, number>;
  naps: Record<string, number>;
  minHealth: Record<string, number>;
  stages: Record<string, number>; // stage -> when it began
  adult: string | null;
  diary: Record<string, number> | null;
  trips: TripDone[];
  guardianTries: Record<string, number>; // area -> fights until it got past
  guardianTrips: Record<string, number>; // area -> trips into the area until then
  guardianBeatenAt: Record<string, number>;
  emberstoneAt: number | null;
  friendAt: number | null;
  friendVisits: number;
  visitsCounted: number;
  nestAt: number | null;
  eggsCollected: number;
  skillsAtAdult: Record<string, number> | null;
  skillsAtEnd: Record<string, number>;
  tricksKnown: string[];
  rejected: Record<string, number>;
  shivering: number;
  mornings: number;
}

function dayKey(t: number): string {
  const d = new Date(t * 1000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function at(base: Date, day: number, hour: number, minute: number): number {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + day, hour, minute).getTime() / 1000;
}

class Sim {
  s: PetState;
  now: number;
  run: Run;
  private seenFriend = false;
  private lastTrip: Trip | null = null;
  private wasSick = false;
  private wasAsleep = false;

  constructor(line: string, start: number, profile: string, readonly temp: number | null) {
    this.s = model.newPet(start, "Sim", line);
    this.s.seen_at = start;
    this.now = start;
    this.run = {
      profile, line, start, end: start, arrivals: [], calls: new Map(), days: new Map(),
      criticalMinutes: {}, stageMinutes: {}, sickCount: {}, naps: {}, minHealth: {}, stages: { egg: start },
      adult: null, diary: null, trips: [], guardianTries: {}, guardianTrips: {}, guardianBeatenAt: {},
      emberstoneAt: null, friendAt: null, friendVisits: 0, visitsCounted: 0, nestAt: null, eggsCollected: 0,
      skillsAtAdult: null, skillsAtEnd: {}, tricksKnown: [], rejected: {}, shivering: 0, mornings: 0,
    };
  }

  /** Runs the simulation minute by minute up to t, the way model.advance does, and measures. */
  runTo(t: number): void {
    const s = this.s;
    const r = this.run;
    while (s.updated_at + model.TICK <= t) {
      s.updated_at += model.TICK;
      const stage = s.stage;
      const friendBefore = s.friend ? { ...s.friend } : null;
      this.lastTrip = s.trip;
      model.tick(s, s.updated_at, BEDTIME, null, this.temp, null);
      const now = s.updated_at;
      if (s.stage !== stage) {
        this.evolved(stage, now);
      }
      r.stageMinutes[s.stage] = (r.stageMinutes[s.stage] ?? 0) + 1;
      if (s.stage !== "egg") {
        const awakeHome = !s.asleep && !s.trip;
        if (awakeHome && (s.sick || NEEDS.some((k) => s.stats[k] < model.CRITICAL))) {
          r.criticalMinutes[s.stage] = (r.criticalMinutes[s.stage] ?? 0) + 1;
        }
        if (s.sick && !this.wasSick) {
          r.sickCount[s.stage] = (r.sickCount[s.stage] ?? 0) + 1;
        }
        if (s.asleep && !this.wasAsleep && !model.isBedtime(now, BEDTIME)
            && model.minutesUntilBed(now, BEDTIME) > model.TIRED_BEFORE_BED) {
          r.naps[s.stage] = (r.naps[s.stage] ?? 0) + 1;
        }
        r.minHealth[s.stage] = Math.min(r.minHealth[s.stage] ?? 100, s.stats.health);
      }
      this.wasSick = s.sick;
      this.wasAsleep = s.asleep;
      if (this.lastTrip && !s.trip) {
        this.tripDone(this.lastTrip, now);
      }
      if (s.friend && !this.seenFriend) {
        this.seenFriend = true;
        r.friendAt ??= now;
      }
      if (friendBefore && friendBefore.until !== undefined && (!s.friend || s.friend.until === undefined)) {
        r.friendVisits += 1;
        if (!s.friend || s.friend.visits > friendBefore.visits) {
          r.visitsCounted += 1;
        }
      }
      if (s.nest && r.nestAt === null) {
        r.nestAt = now;
      }
    }
    this.now = Math.max(this.now, t);
  }

  private evolved(from: string, now: number): void {
    const r = this.run;
    r.stages[this.s.stage] = now;
    if (from === "child") {
      r.adult = this.s.species;
      r.diary = { ...this.s.diary };
      r.skillsAtAdult = { ...this.s.skills };
    }
  }

  private tripDone(done: Trip, now: number): void {
    const log = done.log ?? [];
    const guardian = done.guardian;
    const fought = guardian !== null && log.some((stop) => stop.kind === "battle" && stop.foe === guardian);
    const won = fought && this.s.guardians.includes(done.area);
    const r = this.run;
    r.trips.push({
      area: done.area, minutes: Math.round((now - done.start) / 60), stations: done.next, finds: done.found.length,
      battles: log.filter((stop) => stop.kind === "battle" && stop.foe !== guardian).length,
      balls: log.filter((stop) => stop.kind === "ball").length,
      guardian, guardianFought: fought, guardianWon: won,
      wild: log.filter((stop) => stop.kind === "wild").length,
      friend: log.some((stop) => stop.kind === "wild" && stop.outcome === "friend"),
      turnedBack: log.find((stop) => stop.kind === "tired" || stop.kind === "beaten")?.kind ?? null,
    });
    if (guardian !== null && r.guardianBeatenAt[done.area] === undefined) {
      r.guardianTrips[done.area] = (r.guardianTrips[done.area] ?? 0) + 1;
      if (fought) {
        r.guardianTries[done.area] = (r.guardianTries[done.area] ?? 0) + 1;
      }
      if (won) {
        r.guardianBeatenAt[done.area] = now;
      }
    }
    if (done.found.includes("emberstone") && r.emberstoneAt === null) {
      r.emberstoneAt = now;
    }
  }

  /** One action of the owner, then a short pause. Returns whether it was accepted. */
  act(action: string, options: model.ActionOptions = {}): boolean {
    this.runTo(this.now);
    const stage = this.s.stage;
    const result = model.applyAction(this.s, action, this.now, BEDTIME, { by: "owner", temp: this.temp, ...options });
    if (this.s.stage !== stage) {
      this.evolved(stage, this.now);
    }
    if (!result.accepted) {
      const key = `${action}:${result.reason}`;
      this.run.rejected[key] = (this.run.rejected[key] ?? 0) + 1;
    }
    this.now += GAP;
    return result.accepted;
  }

  wait(seconds: number): void {
    this.now += seconds;
    this.runTo(this.now);
  }
}

// ---------- A visit ----------

function visit(sim: Sim, profile: Profile, plan: Planned, rng: Random, weekday: boolean): void {
  sim.now = Math.max(sim.now, plan.at);
  sim.runTo(sim.now);
  const s = sim.s;
  const c = plan.care;
  sim.run.arrivals.push({
    stage: s.stage, label: plan.label, stats: { ...s.stats }, asleep: s.asleep, sick: s.sick, poops: s.poops, weekday,
  });
  if (s.stage === "egg") {
    for (let i = 0; i < profile.warms; i++) {
      sim.act("pet");
    }
    if (life.isDue(s, sim.now)) {
      sim.act("evolve");
    }
    return;
  }
  if (plan.label === "morning" || profile.id === "evenings" && plan.label === "19:00") {
    sim.run.mornings += 1;
    if (home.cold(s, sim.now)) {
      sim.run.shivering += 1;
    }
  }
  if (life.isDue(s, sim.now) && !s.asleep && !s.trip) {
    sim.act("evolve");
  }
  if (s.trip) {
    return; // still away: the owner looks again next time
  }
  if (s.backpack.length && !s.asleep) {
    sim.act("unpack");
  }
  if (profile.tidy && !s.asleep) {
    if (s.gift) {
      sim.act("unwrap");
    }
    if (s.nest) {
      sim.act("collect");
      sim.run.eggsCollected += 1;
    }
    if (s.items.emberstone && !s.deco.includes("emberstone")) {
      sim.act("deco", { item: "emberstone" });
    }
    const seed = Object.keys(home.PLANTS).find((kind) => s.items[`seed_${kind}`]);
    if (!s.plant && seed) {
      sim.act("plant", { item: seed });
    }
  }
  if (s.sick) {
    sim.act("medicine");
  }
  if (s.poops || s.stats.hygiene < 70) {
    sim.act("clean");
  }
  for (let i = 0; i < 2 && !s.asleep && s.stats.satiety < FEED_BELOW; i++) {
    sim.act("feed", { item: "meal" });
  }
  if (home.cold(s, sim.now)) {
    sim.act("pet"); // rubbed warm
  }
  for (let i = 0; i < c.pets; i++) {
    sim.act("pet");
  }
  if (s.asleep && !c.bed) {
    return; // a nap: the owner leaves it be
  }
  if (c.trip > 0 && s.stage !== "baby" && rng.random() < c.trip) {
    // a trip first, while it is fit for one; the games wait until it is back
    const area = [...trip.AREAS].reverse().find((name) => trip.unlocked(s, name))!;
    if (s.stats.satiety < 70) {
      sim.act("feed", { item: "meal" });
    }
    if (sim.act("trip", { item: area, value: profile.packs ? ["snack", "ball"] : [] })) {
      return;
    }
  }
  for (let i = 0; i < c.plays && s.stats.energy >= ACTIVE_FROM; i++) {
    sim.act("play");
  }
  for (let i = 0; i < c.tricks && s.stats.energy >= ACTIVE_FROM; i++) {
    const trick = Object.keys(care.TRICKS).find((name) => !care.knows(s, name));
    if (trick && model.restLeft(s, ["trick"], sim.now) > 0) {
      sim.wait(model.restLeft(s, ["trick"], sim.now));
    }
    sim.act("trick", { item: trick ?? rng.choice(care.learned(s)) });
  }
  for (let i = 0; i < c.trainings && s.stats.energy >= ACTIVE_FROM; i++) {
    train(sim, rng);
  }
  if (c.bed && !s.asleep && !s.trip) {
    sim.act("sleep");
  }
}

/** One exercise, the way a person does it: not perfect. */
function train(sim: Sim, rng: Random): void {
  const s = sim.s;
  const skill = battle.SKILLS[(s.counters.trainings ?? 0) % battle.SKILLS.length];
  const rest = model.restLeft(s, battle.SKILLS.map((name) => `train_${name}`), sim.now);
  if (rest > 0) {
    sim.wait(rest);
  }
  if (skill === "strength") {
    sim.act("train", { item: "strength", value: Number(rng.uniform(0.55, 0.95).toFixed(2)) });
    return;
  }
  sim.runTo(sim.now);
  if (!sim.act("train", { item: skill })) {
    return;
  }
  const training = s.training;
  if (!training) {
    return;
  }
  if (skill === "speed") {
    sim.now = training.at + training.delay! + rng.uniform(0.45, 0.9);
    sim.act("train", { item: "tap" });
  } else {
    const steps = [...training.sequence!];
    if (rng.random() < 0.35) {
      steps[rng.randint(0, steps.length - 1)] = "left" === steps[0] ? "right" : "left";
    }
    sim.now = training.at + steps.length * battle.SHOW_STEP + 5;
    sim.act("train", { item: "answer", value: steps });
  }
}

// ---------- One run ----------

function simulate(profile: Profile, line: string, seed: number, days: number, temp: number | null = null): Run {
  // Starts on different weekdays, at the owner's first visit
  const base = new Date(2026, 9, 5 + seed * 3); // a Monday, then Thursday, Sunday, …
  const rng = new Random(`balance:${profile.id}:${line}:${seed}`);
  const plans: Planned[] = [];
  for (let day = 0; day < days; day++) {
    const weekday = new Date(base.getFullYear(), base.getMonth(), base.getDate() + day).getDay();
    for (const [hour, minute, label, c] of profile.day(weekday, rng)) {
      const jitter = profile.id === "neglect" ? 0 : rng.randint(-15, 15) * 60;
      plans.push({ at: at(base, day, hour, minute) + jitter, label, care: c });
    }
  }
  // the first day begins with the egg at the first visit
  const start = plans[0].at - 60;
  const sim = new Sim(line, start, profile.id, temp);
  const end = at(base, days, 0, 0);
  for (let day = 0; day < days; day++) {
    const t = at(base, day, 12, 0);
    sim.run.days.set(dayKey(t), { weekday: ![0, 6].includes(new Date(t * 1000).getDay()), visited: false });
  }
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const weekday = ![0, 6].includes(new Date(plan.at * 1000).getDay());
    visit(sim, profile, plan, rng, weekday);
    sim.run.days.get(dayKey(plan.at))!.visited = true;
    // the app goes into the background: when would it call before the next visit?
    sim.runTo(sim.now);
    const next = i + 1 < plans.length ? plans[i + 1].at : end;
    const reminder = notify.nextReminder(sim.s, sim.now, BEDTIME);
    if (reminder && reminder.at < next) {
      const key = dayKey(reminder.at);
      sim.run.calls.set(key, [...(sim.run.calls.get(key) ?? []), reminder.need]);
    }
  }
  sim.runTo(end);
  const r = sim.run;
  r.end = end;
  r.skillsAtEnd = { ...sim.s.skills };
  r.tricksKnown = care.learned(sim.s);
  return r;
}

// ---------- The report ----------

function fmt(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined || Number.isNaN(value) ? "–" : value.toFixed(digits);
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}

function table(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells: string[]) => cells.map((cell, i) => (i === 0 ? cell.padEnd(widths[i]) : cell.padStart(widths[i]))).join("  ");
  return [line(header), widths.map((w) => "-".repeat(w)).join("  "), ...rows.map(line)].join("\n");
}

function days(seconds: number): number {
  return seconds / 86400;
}

function reportProfile(profile: Profile, runs: Run[]): string {
  const out: string[] = [`## ${profile.id}: ${profile.title}`, ""];
  // Stats on arrival, per stage and visit
  const groups = new Map<string, Arrival[]>();
  for (const run of runs) {
    for (const a of run.arrivals) {
      if (a.stage === "egg") {
        continue;
      }
      const key = `${a.stage}|${a.label}${profile.id === "workday" || profile.id === "absent" ? (a.weekday ? " (wd)" : " (we)") : ""}`;
      groups.set(key, [...(groups.get(key) ?? []), a]);
    }
  }
  const rows: string[][] = [];
  for (const stage of ["baby", "child", "adult"]) {
    for (const [key, list] of groups) {
      if (!key.startsWith(`${stage}|`)) {
        continue;
      }
      const cells = [stage, key.split("|")[1], String(list.length)];
      for (const stat of SHOWN) {
        const values = list.map((a) => a.stats[stat]);
        cells.push(`${fmt(Math.min(...values))}/${fmt(avg(values))}`);
      }
      cells.push(fmt(100 * list.filter((a) => a.asleep).length / list.length), fmt(100 * list.filter((a) => a.sick).length / list.length));
      rows.push(cells);
    }
  }
  out.push("Stats on arrival (min/avg):", table(["stage", "visit", "n", ...SHOWN, "asleep%", "sick%"], rows), "");

  // Calls, need, sickness
  const callRows: string[][] = [];
  for (const kind of ["weekday", "weekend", "all"]) {
    const counts: number[] = [];
    const needs: Record<string, number> = {};
    for (const run of runs) {
      for (const [key, info] of run.days) {
        if (kind !== "all" && info.weekday !== (kind === "weekday")) {
          continue;
        }
        const calls = run.calls.get(key) ?? [];
        counts.push(calls.length);
        for (const need of calls) {
          needs[need] = (needs[need] ?? 0) + 1;
        }
      }
    }
    if (!counts.length) {
      continue;
    }
    callRows.push([kind, String(counts.length), fmt(avg(counts), 2), fmt(100 * counts.filter((n) => n >= 2).length / counts.length),
      String(Math.max(...counts)), Object.entries(needs).map(([need, n]) => `${need} ${n}`).join(", ") || "–"]);
  }
  out.push("Notifications (nextReminder after every visit, if due before the next one):",
    table(["days", "n", "per day", ">=2 %", "max", "for"], callRows), "");

  const stageRows: string[][] = [];
  for (const stage of ["baby", "child", "adult"]) {
    const minutes = runs.map((run) => run.stageMinutes[stage] ?? 0);
    if (!minutes.some(Boolean)) {
      continue;
    }
    const perDay = runs.map((run) => (run.criticalMinutes[stage] ?? 0) / 60 / Math.max(1, (run.stageMinutes[stage] ?? 0) / 1440));
    stageRows.push([stage, fmt(avg(perDay), 1), fmt(avg(runs.map((run) => run.sickCount[stage] ?? 0)), 1),
      fmt(Math.min(...runs.map((run) => run.minHealth[stage] ?? 100))),
      fmt(avg(runs.map((run) => (run.naps[stage] ?? 0) / Math.max(1, (run.stageMinutes[stage] ?? 0) / 1440))), 2)]);
  }
  out.push("Need and sickness per stage:",
    table(["stage", "h critical/day", "sick (times)", "min health", "naps/day"], stageRows), "");

  // Stages and adult forms per line
  const lineRows: string[][] = [];
  for (const line of Object.keys(life.LINES)) {
    const mine = runs.filter((run) => run.line === line);
    if (!mine.length) {
      continue;
    }
    const egg = mine.map((run) => (run.stages.baby ?? NaN) - run.start);
    const baby = mine.map((run) => (run.stages.child ?? NaN) - (run.stages.baby ?? NaN));
    const child = mine.map((run) => (run.stages.adult ?? NaN) - (run.stages.child ?? NaN));
    const forms: Record<string, number> = {};
    for (const run of mine) {
      forms[run.adult ?? "(none)"] = (forms[run.adult ?? "(none)"] ?? 0) + 1;
    }
    const diaries = mine.map((run) => run.diary).filter((d): d is Record<string, number> => d !== null);
    const perDay = (k: string) => fmt(avg(diaries.map((d) => (d[k] ?? 0) / Math.max(1, d.minutes / 1440))), 1);
    lineRows.push([line, `${fmt(avg(egg) / 60)} min`, `${fmt(days(avg(baby)), 1)} d`, `${fmt(days(avg(child)), 1)} d`,
      Object.entries(forms).map(([form, n]) => `${form} ${n}`).join(", "),
      fmt(100 * avg(diaries.map((d) => d.good_minutes / Math.max(1, d.minutes)))), perDay("love"), perDay("plays"), perDay("trips")]);
  }
  out.push("Stages and adult forms (diary of the child: care %, per day: love, plays, trips):",
    table(["line", "egg", "baby", "child", "adult forms", "care%", "love", "plays", "trips"], lineRows), "");

  // Trips
  const trips = runs.flatMap((run) => run.trips);
  if (trips.length) {
    const areaRows: string[][] = [];
    for (const area of trip.AREAS) {
      const list = trips.filter((t) => t.area === area);
      if (!list.length) {
        continue;
      }
      const stations = list.reduce((a, t) => a + t.stations, 0);
      areaRows.push([area, String(list.length), fmt(avg(list.map((t) => t.minutes))), fmt(avg(list.map((t) => t.stations)), 1),
        fmt(avg(list.map((t) => t.finds)), 2), fmt(list.reduce((a, t) => a + t.battles + t.balls, 0) / Math.max(1, stations), 2),
        fmt(100 * list.reduce((a, t) => a + t.balls, 0) / Math.max(1, list.reduce((a, t) => a + t.battles + t.balls, 0))),
        fmt(100 * list.filter((t) => t.turnedBack === "tired").length / list.length),
        fmt(100 * list.filter((t) => t.turnedBack === "beaten").length / list.length)]);
    }
    out.push("Trips (all runs):", table(["area", "trips", "minutes", "stations", "finds", "opponents/station", "ball %", "tired %", "beaten %"], areaRows), "");
    const guardianRows: string[][] = [];
    for (const area of trip.AREAS) {
      const beaten = runs.filter((run) => run.guardianBeatenAt[area] !== undefined);
      const tried = runs.filter((run) => run.guardianTries[area] !== undefined || run.guardianTrips[area] !== undefined);
      if (!tried.length) {
        continue;
      }
      guardianRows.push([`${area} (${battle.GUARDIANS[area]})`, `${beaten.length}/${tried.length}`,
        fmt(avg(beaten.map((run) => run.guardianTries[area] ?? 0)), 1),
        fmt(avg(beaten.map((run) => run.guardianTrips[area] ?? 0)), 1),
        fmt(avg(tried.filter((run) => run.guardianBeatenAt[area] === undefined).map((run) => run.guardianTries[area] ?? 0)), 1),
        fmt(avg(beaten.map((run) => days(run.guardianBeatenAt[area] - run.start))), 1)]);
    }
    out.push("Guardians: got past / tried, fights and trips there until then, fights so far where still waiting, day it fell:",
      table(["guardian", "past", "fights", "trips", "fights (not yet)", "day"], guardianRows), "");
  }

  // Friends, ember stone, training
  const adults = runs.filter((run) => run.stages.adult !== undefined);
  if (adults.length) {
    const withFriend = adults.filter((run) => run.friendAt !== null);
    const withNest = adults.filter((run) => run.nestAt !== null);
    out.push(`Friends: ${withFriend.length}/${adults.length} adults made one, after ${fmt(avg(withFriend.map((run) => days(run.friendAt! - run.stages.adult))), 1)} days as an adult; `
      + `visits ${fmt(avg(withFriend.map((run) => run.friendVisits)), 1)} (counted ${fmt(avg(withFriend.map((run) => run.visitsCounted)), 1)}); `
      + `nest in ${withNest.length}, ${fmt(avg(withNest.map((run) => days(run.nestAt! - run.friendAt!))), 1)} days after the friendship; `
      + `wild pets met per trip ${fmt(avg(adults.map((run) =>
        run.trips.reduce((a, t) => a + t.wild, 0) / Math.max(1, run.trips.length))), 2)} (wild pets live in ${Object.keys(wild.WILD).join(", ")})`);
  }
  const ember = runs.filter((run) => run.emberstoneAt !== null);
  out.push(`Ember stone found in ${ember.length}/${runs.length} runs, on day ${fmt(avg(ember.map((run) => days(run.emberstoneAt! - run.start))), 1)}`);
  const skills = (pick: (run: Run) => Record<string, number> | null) => battle.SKILLS.map((skill) =>
    `${skill} ${fmt(avg(runs.map(pick).filter((x): x is Record<string, number> => x !== null).map((x) => x[skill])))}`).join(", ");
  out.push(`Skills when grown up: ${skills((run) => run.skillsAtAdult)}; at the end: ${skills((run) => run.skillsAtEnd)}`);
  out.push(`Tricks known at the end: ${fmt(avg(runs.map((run) => run.tricksKnown.length)), 1)} (${[...new Set(runs.flatMap((run) => run.tricksKnown))].join(", ") || "none"})`);
  const rejected: Record<string, number> = {};
  for (const run of runs) {
    for (const [key, n] of Object.entries(run.rejected)) {
      rejected[key] = (rejected[key] ?? 0) + n;
    }
  }
  out.push(`Refused actions: ${Object.entries(rejected).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}`);
  out.push("");
  return out.join("\n");
}

/** A pet that wakes at 7:00 and is left alone until the evening: its energy hour by hour. */
function alone(): string {
  const out = ["## Alone from 7:00: energy hour by hour (no visit after 7:05)", ""];
  const rows: string[][] = [];
  for (const stage of ["baby", "child", "adult"] as const) {
    for (const seed of [0, 1, 2]) {
      const base = new Date(2026, 9, 5 + seed);
      const sim = new Sim("blob", at(base, 0, 6, 0), "alone", null);
      // grown up at once with the evolve button, rested and asleep; it wakes at 7:00 and is fed and cleaned
      while (sim.s.stage !== stage) {
        sim.s.egg_warmth = 1e9;
        sim.act("evolve");
      }
      Object.assign(sim.s.stats, { satiety: 90, mood: 90, energy: 100, hygiene: 100, health: 100 });
      model.fallAsleep(sim.s, at(base, -1, 22, 30));
      sim.runTo(at(base, 0, 7, 5));
      sim.now = at(base, 0, 7, 5);
      sim.act("feed", { item: "meal" });
      sim.act("clean");
      const cells = [`${stage} #${seed + 1}`];
      let pastimes = 0;
      const counted = sim.s.events.length;
      for (let hour = 8; hour <= 22; hour += 1) {
        sim.runTo(at(base, 0, hour, 0));
        if (hour % 2 === 0) {
          cells.push(fmt(sim.s.stats.energy) + (sim.s.asleep ? "z" : ""));
        }
        if (hour === 18) {
          pastimes = sim.s.events.slice(counted).filter((e) => e.action === "solo").length;
        }
      }
      cells.push(String(pastimes));
      rows.push(cells);
    }
  }
  out.push(table(["pet", "8:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "pastimes 7–18"], rows));
  out.push("", `Rates: awake ${model.RATES.energy[0]}/h (baby ×${life.DECAY_FACTORS.baby.energy}), `
    + `pastime every ${idle.EVERY[0] / 60}–${idle.EVERY[1] / 60} min for ${idle.BALL_ENERGY} (ball) or ${idle.PRACTICE_ENERGY} (practice) while energy ≥ ${idle.ENERGY}, `
    + `extra −5/h in the ${model.TIRED_BEFORE_BED} min before bed; asleep +${model.RATES.energy[1]}/h. z = asleep.`, "");
  return out.join("\n");
}

function main(): void {
  const args = new Map(process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "1"] as const;
  }));
  const numDays = Number(args.get("days") ?? 21);
  const seeds = Number(args.get("seeds") ?? 3);
  const only = args.get("only")?.split(",");
  const lines = args.get("lines")?.split(",") ?? Object.keys(life.LINES);
  console.log(`# Balance check: ${numDays} days, ${seeds} starts per owner and line, lines: ${lines.join(", ")}`);
  console.log(`Bedtime ${BEDTIME.join("–")}, no weather. Times are local (Europe/Berlin).\n`);
  console.log(alone());
  if (args.has("alone")) {
    return;
  }
  for (const profile of PROFILES.filter((p) => !only || only.includes(p.id))) {
    const runs: Run[] = [];
    for (const line of lines) {
      for (let seed = 0; seed < seeds; seed++) {
        runs.push(simulate(profile, line, seed, numDays));
      }
    }
    console.log(reportProfile(profile, runs));
  }
  if (!only || only.includes("workday")) {
    const cold = Array.from({ length: seeds }, (_, seed) => simulate(PROFILES[1], "blob", seed, numDays, 0));
    const mornings = cold.reduce((a, run) => a + run.mornings, 0);
    const shivering = cold.reduce((a, run) => a + run.shivering, 0);
    console.log(`## Cold (workday owner, 0 °C all the time)\n\nShivering at the morning visit: ${shivering}/${mornings} mornings`
      + ` (it shivers ${home.COLD_SECONDS / 60} min after waking below ${home.COLD_BELOW} °C).\n`);
  }
}

main();
