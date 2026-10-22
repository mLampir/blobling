/**
 * What the pet tells when somebody comes back after a while: each day becomes a few sentences in
 * its own voice ("It rained in the morning, and I sat under my umbrella. Then I ate a berry."),
 * put together from pieces in the language files (`page.story.*`). When it has been at Grandma's
 * (model.GRANDMA_AFTER), she writes a postcard about it.
 *
 * Which things are told, and since when, is decided by idle.welcome; this only puts them into
 * words. Which variant a sentence takes is seeded from the time, so it reads the same every time.
 */

import * as idle from "./idle";
import * as life from "./life";
import { Random } from "./random";
import { NO_UMBRELLA } from "./scene";
import type { PetEvent, PetState } from "./state";

export const SENTENCES = 3; // a day is told in at most this many sentences
export const DAYS = 3; // only the last few days are told
// What Grandma did with the pet ("page.story.grandma.<key>")
export const GRANDMA = ["bake", "knit", "garden", "tea"];
// Sentences told differently when the same thing happened more than once in a day ("<key>_more")
const MORE = ["solo_ball"];
// What it can leave behind when it plays by itself (idle.play), each told in its own sentence
const BUILT: readonly string[] = [...idle.BUILDS, "snowman"];

type Translate = (key: string, values?: Record<string, unknown>) => string;

/** One paragraph of the story: a day in the pet's words, or Grandma's postcard. */
export interface Page {
  postcard: boolean;
  text: string;
}

/** One sentence to tell: when it happened, which text, and how much it matters (the higher, the more). */
interface Piece {
  at: number;
  key: string;
  values: Record<string, string>;
  weight: number;
  count: number;
}

/**
 * The story since somebody was last there, or null if there is nothing to tell (see
 * idle.welcome). `t` gives the texts in the chosen language.
 */
export function tell(state: PetState, now: number, t: Translate): { since: number; pages: Page[] } | null {
  if (state.grandma) {
    return null; // it tells once it has been fetched from Grandma's, together with her postcard
  }
  const welcome = idle.welcome(state, now);
  if (!welcome) {
    return null;
  }
  const since = state.seen_at;
  const told = state.events.filter((event) => idle.worthTelling(event, since));
  const pages: [number, Page][] = [];
  const days = new Map<string, Piece[]>();
  for (const event of told) {
    if (event.action === "away") {
      pages.push([event.at, { postcard: true, text: postcard(state, event, t) }]);
      continue;
    }
    const found = piece(event, t);
    if (found) {
      add(days, found);
    }
  }
  if (state.stage !== "egg") { // an egg doesn't see the weather
    for (const seen of state.weather_seen) {
      if (seen.at > since && seen.at <= now) {
        add(days, weather(state, seen.at, seen.kind, t));
      }
    }
  }
  const dayPages = [...days.values()].map((pieces): [number, Page] => {
    // the ones that matter most, told in the order they happened; the weather opens the day
    const chosen = [...pieces].sort((a, b) => b.weight - a.weight || a.at - b.at).slice(0, SENTENCES)
      .sort((a, b) => Number(isWeather(b)) - Number(isWeather(a)) || a.at - b.at);
    const text = chosen.map((p) => t(`page.story.${p.key}${p.count > 1 && MORE.includes(p.key) ? "_more" : ""}`, p.values));
    return [Math.min(...pieces.map((p) => p.at)), { postcard: false, text: text.join(" ") }];
  }).slice(-DAYS);
  pages.push(...dayPages);
  if (pages.length === 0) {
    return null;
  }
  return { since: welcome.since, pages: pages.sort((a, b) => a[0] - b[0]).map(([, page]) => page) };
}

/** Local day of the time t, as a key. */
function day(t: number): string {
  const date = new Date(t * 1000);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Add a sentence to its day; the same sentence twice in a day is told once (and counted). */
function add(days: Map<string, Piece[]>, p: Piece): void {
  const key = day(p.at);
  const pieces = days.get(key) ?? [];
  const values = JSON.stringify(p.values);
  const same = pieces.find((other) => other.key === p.key && JSON.stringify(other.values) === values);
  if (same) {
    same.count += 1;
  } else if (!(isWeather(p) && pieces.some(isWeather))) { // only the first weather of a day is told
    pieces.push(p);
  }
  days.set(key, pieces);
}

function isWeather(p: Piece): boolean {
  return p.key.startsWith("weather.");
}

/** A sentence about rain or snow at the time `at`. */
function weather(state: PetState, at: number, kind: "rain" | "snow", t: Translate): Piece {
  const part = idle.partOfDay(at);
  // at night it slept through it; some forms don't need an umbrella
  const key = part === "night" ? `${kind}_night`
    : kind === "rain" && NO_UMBRELLA.includes(state.species) ? "rain_bare" : kind;
  return { at, key: `weather.${key}`, values: { when: t(`page.story.when.${part}`) }, weight: 10, count: 1 };
}

/** The sentence for one thing from the history, or null if it isn't part of the story. */
function piece(event: PetEvent, t: Translate): Piece | null {
  const item = event.item ?? "";
  const [name, outcome] = item.split(":");
  const at = event.at;
  const make = (key: string, weight: number, values: Record<string, string> = {}): Piece =>
    ({ at, key, values, weight, count: 1 });
  switch (event.action) {
    case "solo":
      if (item === "ball") {
        return make("solo_ball", 1);
      }
      // what it built or drew while it played (idle.BUILDS, and the snowman in the snow)
      return BUILT.includes(item) ? make(`solo_${item}`, 3) : make("solo_trick", 2, { trick: t(`tricks.${item}`) });
    case "fruit":
      return make(`fruit.${item}`, 2);
    case "visit":
      return make("visit", 5, { pet: t(`species.${item}`) });
    case "peek": // a guest from the garden (garden.ts)
      return make("peek", 6, { pet: t(`species.${item}`) });
    case "guest":
      return make("guest", 7, { pet: t(`species.${item}`) });
    case "gift":
      return make("gift", 6, { pet: t(`species.${item}`) });
    case "found":
      // something small it found at home: a fruit or a seed
      return make("found", 3, { thing: item.startsWith("fruit_") ? t(`fruits.${item.slice(6)}`) : t(`items.${item}`) });
    case "nest": // a friend brought its egg (wild.ts)
      return make("nest", 8);
    case "laid": // its own egg (brood.ts)
      return make("laid", 8);
    case "magpie_stole": // the troublemaker (magpie.ts)
    case "magpie_chased":
    case "magpie_back":
      return make(event.action, event.action === "magpie_back" ? 5 : 7, { item: t(`items.${item}`) });
    case "magpie_egg":
      return make("magpie_egg", 9);
    case "wild":
      return make(`wild_${outcome}`, 6, { pet: t(`species.${name}`) });
    case "battle":
      return make(`battle_${outcome}`, 4, { foe: t(`foes.${name}`) });
    case "guardian":
      return make("guardian", 8, { foe: t(`foes.${item}`) });
    case "unlock":
      return make("unlock", 8, { area: t(`areas.${item}.name`) });
    case "house":
      return make(`house.${item}`, 8);
    case "find":
      return make("find", 4, { item: t(`items.${item}`) });
    case "trip":
      return ["home", "tired", "beaten", "snack"].includes(item) ? make(`trip_${item}`, item === "snack" ? 3 : 5) : null;
    case "evolve": {
      const stage = name === "baby" ? "hatched" : name;
      return ["hatched", "child", "adult"].includes(stage)
        ? make(`evolve.${stage}`, 9, { species: t(life.formKey(name, outcome)) }) : null;
    }
    default:
      return null;
  }
}

/** Grandma's postcard: how long the pet stayed with her, and what they did together. */
function postcard(state: PetState, event: PetEvent, t: Translate): string {
  const days = Math.max(1, Number(event.item) || 1);
  const did = new Random(`${Math.trunc(event.at)}:postcard`).choice(GRANDMA);
  const values = { name: state.name, n: days };
  return t(`page.story.postcard.${days === 1 ? "one" : "other"}`,
    { ...values, did: t(`page.story.grandma.${did}`, values) });
}
