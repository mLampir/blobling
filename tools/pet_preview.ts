// Preview of the pet scene on a PC, without a panel and without the app running.
//
//   npm run preview                       overview of all states → pet_preview.png
//   npm run preview -- --spoiler-free     one adult form and the first area only (for the docs)
//   npm run preview -- play --gif         one animation as a GIF → pet_play.gif
//   npm run preview -- --pets             one picture per form → docs/images/pets/
//
// For the clock, the temperature and the names in the overview, point LED_MATRIX_BDF_DIR at the
// fonts folder of rpi-rgb-led-matrix (without it they are left out).

import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { Image } from "../core/src/image";
import { ACTIVITY_SECONDS } from "../core/src/model";
import { PetScene, type SceneView, type TripView, type Weather } from "../core/src/scene";
import { AREAS } from "../core/src/trip";
import { readAssets } from "../pi/src/assets";
import { BDF_FONT_DIR } from "../pi/src/config";
import { encodePng } from "../pi/src/png";
import { encodeGif } from "./gif";

type Scene = [changes: Partial<SceneView>, now: Date, weather: Weather];

const BASE: SceneView = {
  species: "blob", stage: "child", ready: false, asleep: false, sick: false, poops: 0, activity: "idle",
  mood: "normal", needs: [], activity_until: 0, activity_item: "",
};
// The pictures for docs/pets.md: file name → [stage, species]
const PETS: Record<string, [string, string]> = {
  egg: ["egg", "blob"], baby: ["baby", "blob"], child: ["child", "blob"],
  ...Object.fromEntries(["sneezle", "flicker", "cyclopuff", "grumpcap", "lumoth", "gemperor", "angloop", "purrloop"].map((species) =>
    [species, ["adult", species]])),
  ember_egg: ["egg", "ember"], ember_baby: ["baby", "ember"], cindlet: ["child", "ember"],
  lanternling: ["adult", "lanternling"], flarelet: ["adult", "flarelet"],
  stone_egg: ["egg", "stone"], stone_baby: ["baby", "stone"], pebblet: ["child", "stone"],
  glimmerock: ["adult", "glimmerock"], bouldergrin: ["adult", "bouldergrin"],
};
// The spoiler-free overview shows one adult form only, the one docs/pets.md shows openly. It
// leaves out the scenes that are only there to show another form, another line or what the lure
// gives away, and plays the remaining scenes of an adult with that form. Of the trips it shows
// the first area only: the later areas, their opponents and their guardians are left out.
const SHOWN_ADULT = "cyclopuff";
const SHOWN_AREA = AREAS[0];
const SPOILERS = ["hint", "evolve", "sneezle", "flicker", "flicker_sad", "grumpcap", "lumoth", "ember_egg",
  "ember_hatch", "ember_baby", "cindlet", "cindlet_hint", "cindlet_sick", "ember_evolve", "lanternling",
  "lanternling_sleep", "lanternling_trick", "flarelet", "flarelet_hat", "egg_found", "wild_shrug", "visit_night",
  "nest_ember", "stone_egg", "stone_baby", "pebblet", "pebblet_hint", "pebblet_hat", "pebblet_skip", "glimmerock",
  "glimmerock_night", "glimmerock_shine", "bouldergrin", "bouldergrin_sad", "bouldergrin_sleep", "bouldergrin_toss", "wild_stream", "visit_stone",
  "gemperor", "gemperor_night", "gemperor_sad", "gemperor_hint",
  "angloop", "angloop_night", "angloop_hungry", "angloop_hint",
  "purrloop", "purrloop_happy", "purrloop_night", "purrloop_hint"];
const PETS_DIR = "docs/images/pets";
const DAY = new Date(2026, 9, 12, 13, 0);
const NIGHT = new Date(2026, 9, 12, 23, 30);
const DUSK = new Date(2026, 9, 12, 18, 10);
const RAIN = { temp: 12.4, code: 63 }; // WMO weather codes, as Open-Meteo sends them

/** A trip on which nothing has happened yet, with whatever is given changed. */
function trip(area: string, changes: Partial<TripView> = {}): TripView {
  return { area, returning: false, event: null, item: null, event_age: 0, ...changes };
}

const SCENES: Record<string, Scene> = {
  idle: [{}, DAY, { temp: 18, code: 0 }],
  happy: [{ mood: "happy", activity: "happy" }, DAY, null],
  eat: [{ activity: "eat" }, DAY, null],
  throw_meal: [{ activity: "throw_meal", activity_item: "meal@0.90" }, DAY, null],
  throw_snack: [{ activity: "throw_snack", activity_item: "icecream@0.05" }, DAY, null],
  throw_play: [{ activity: "throw_play", activity_item: "ball@0.80" }, DAY, null],
  throw_medicine: [{ activity: "throw_medicine", activity_item: "medicine@0.50", sick: true, mood: "sick" }, DAY,
    null],
  play: [{ activity: "play", mood: "happy" }, DAY, null],
  no: [{ activity: "no" }, DAY, null],
  trick_bow: [{ activity: "trick", activity_item: "bow:ok" }, DAY, null],
  trick_spin: [{ activity: "trick", activity_item: "spin:ok" }, DAY, null],
  trick_dance: [{ activity: "trick", activity_item: "dance:fail" }, DAY, null],
  trick_flip: [{ activity: "trick", activity_item: "flip:learned", stage: "adult", species: "sneezle" }, DAY, null],
  clean: [{ activity: "clean", poops: 0 }, DAY, null],
  hungry: [{ mood: "hungry", needs: ["satiety"] }, DUSK, RAIN],
  dirty: [{ mood: "dirty", poops: 3, needs: ["hygiene"] }, DAY, null],
  sick: [{ mood: "sick", sick: true, needs: ["health", "satiety"] }, DAY, null],
  sleep: [{ asleep: true }, NIGHT, null],
  snow: [{ mood: "tired", needs: ["energy"] }, DAY, { temp: -2, code: 73 }],
  cloudy: [{ mood: "happy" }, DAY, { temp: 15, code: 2 }],
  cold: [{ cold: true }, DAY, { temp: -4, code: 1 }],
  emberstone: [{ deco: ["emberstone"] }, NIGHT, { temp: -4, code: 0 }],
  wake_up: [{ activity: "wake_up" }, new Date(2026, 9, 12, 7, 0), null],
  heart: [{ activity: "catch_heart", mood: "happy" }, DAY, null],
  egg: [{ stage: "egg", ready: true }, DAY, null],
  hatch: [{ stage: "baby", activity: "hatch", activity_item: "egg:blob" }, DAY, null],
  baby: [{ stage: "baby", mood: "happy" }, DAY, null],
  evolve: [{ stage: "adult", species: "sneezle", activity: "evolve", activity_item: "child:blob" }, DAY, null],
  hint: [{ hint: "flicker", hat: "cap", mood: "happy" }, DAY, null],
  sneezle: [{ stage: "adult", species: "sneezle", mood: "happy" }, DAY, null],
  flicker: [{ stage: "adult", species: "flicker" }, DAY, null],
  flicker_sad: [{ stage: "adult", species: "flicker", mood: "sad", hat: "daisy" }, DAY, null],
  cyclopuff: [{ stage: "adult", species: "cyclopuff" }, DAY, null],
  grumpcap: [{ stage: "adult", species: "grumpcap", mood: "sad" }, DAY, null],
  lumoth: [{ stage: "adult", species: "lumoth", mood: "happy" }, NIGHT, null],
  home: [{ hat: "daisy", deco: ["windmill", "flag"], plant: { kind: "berry", stage: "grown", ripe: true } }, DAY,
    null],
  home_night: [{
    hat: "bobble", deco: ["lantern", "glowshroom"], stage: "adult", species: "sneezle",
    plant: { kind: "sunflower", stage: "grown", ripe: true },
  }, NIGHT, null],
  home_young: [{
    hat: "cap", deco: ["snailshell"], stage: "adult", species: "cyclopuff",
    plant: { kind: "cherry", stage: "young", ripe: false },
  }, DAY, null],
  plant: [{
    activity: "plant", activity_item: "cherry", hat: "leaf", plant: { kind: "cherry", stage: "sprout", ripe: false },
  }, DAY, null],
  pick: [{ activity: "pick", activity_item: "cherry", plant: { kind: "cherry", stage: "grown", ripe: false } }, DAY,
    null],
  trip_start: [{ activity: "trip_start", activity_item: "meadow", trip: trip("meadow") }, DAY, null],
  trip_meadow: [{ hat: "leaf", mood: "happy", trip: trip("meadow") }, DAY, null],
  trip_forest: [{
    stage: "adult", species: "flicker", trip: trip("forest", { event: "find", item: "glowshroom", event_age: 2 }),
  }, DAY, RAIN],
  trip_back: [{
    stage: "adult", species: "grumpcap", mood: "tired",
    trip: trip("forest", { returning: true, event: "tired", event_age: 99 }),
  }, DUSK, null],
  trip_home: [{ activity: "trip_home", backpack: true, mood: "happy" }, DAY, null],
  unpack: [{ activity: "unpack", activity_item: "seed_berry,cap", mood: "happy" }, DAY, null],
  train_strength: [{ activity: "train_strength", activity_item: "0.80" }, DAY, null],
  train_ready: [{ activity: "train_ready", activity_item: "2.00" }, DAY, null],
  train_speed: [{ activity: "train_speed", activity_item: "0.90" }, DAY, null],
  train_show: [{ activity: "train_show", activity_item: "left,up,down,right" }, DAY, null],
  train_smarts: [{ activity: "train_smarts", activity_item: "4/4", stage: "adult", species: "lumoth" }, DAY, null],
  battle_meadow: [{
    trip: trip("meadow", {
      event: "battle", item: "daisy", foe: "bumblebop", outcome: "win",
      rounds: [["pounce", "bow", "hit"], ["charge", "spin", "ouch"], ["pounce", "bow", "strong"]],
    }),
  }, DAY, null],
  battle_diggle: [{
    hat: "leaf",
    trip: trip("meadow", {
      event: "battle", foe: "diggle", outcome: "draw", rounds: [["charge", "flip", "hit"], ["curl", "bow", "dodge"]],
    }),
  }, DAY, null],
  battle_forest: [{
    stage: "adult", species: "sneezle",
    trip: trip("forest", {
      event: "battle", foe: "prickleroll", outcome: "win", rounds: [["curl", "spin", "hit"], ["curl", "spin", "special"]],
    }),
  }, DUSK, null],
  battle_drizzleshell: [{
    stage: "adult", species: "cyclopuff",
    trip: trip("forest", {
      returning: true, event: "battle", foe: "drizzleshell", outcome: "lose",
      rounds: [["charge", "bow", "ouch"], ["charge", "flip", "hold"], ["curl", "flip", "ouch"], ["charge", "bow", "ouch"]],
    }),
  }, DAY, RAIN],
  battle_ball: [{ trip: trip("meadow", { event: "ball", foe: "diggle" }) }, DAY, null],
  battle_carrotnose: [{
    trip: trip("meadow", { event: "battle", foe: "carrotnose", outcome: "draw", rounds: [["curl", "spin", "hit"]] }),
  }, DAY, { temp: -2, code: 73 }],
  battle_puddlin: [{
    stage: "adult", species: "cyclopuff",
    trip: trip("stream", { event: "battle", foe: "puddlin", outcome: "draw", rounds: [["charge", "flip", "hit"]] }),
  }, DAY, RAIN],
  battle_duskwisp: [{
    stage: "adult", species: "cyclopuff",
    trip: trip("mountain", { event: "battle", foe: "duskwisp", outcome: "draw", rounds: [["pounce", "bow", "dodge"]] }),
  }, DUSK, null],
  home_herb: [{
    hat: "edelweiss", deco: ["cairn", "snowman"], plant: { kind: "herb", stage: "grown", ripe: true },
  }, DAY, null],
  home_crystal: [{ hat: "batears", deco: ["crystal", "cattail"], stage: "adult", species: "cyclopuff" }, NIGHT, null],
  home_boat: [{ hat: "lily", deco: ["boat", "crystal"] }, DAY, null],
  trip_stream: [{ trip: trip("stream") }, DAY, null],
  trip_cave: [{ trip: trip("cave", { event: "find", item: "crystal" }) }, DAY, RAIN],
  trip_mountain: [{ hat: "bobble", trip: trip("mountain") }, DAY, { temp: -4, code: 71 }],
  // the opponents of the later areas, each in the middle of its favorite move
  ...Object.fromEntries(([
    ["ribbop", "stream", "pounce", "bow"], ["sidleclaw", "stream", "charge", "flip"],
    ["echoflit", "cave", "pounce", "bow"], ["glintbug", "cave", "curl", "spin"],
    ["tumblesnow", "mountain", "curl", "spin"], ["craghorn", "mountain", "charge", "flip"],
  ]).map(([foe, area, move, trick]): [string, Scene] => [`battle_${foe}`, [{
    trip: trip(area, {
      event: "battle", event_age: 1.2, foe, outcome: "draw", rounds: [[move, trick, "hit"], [move, trick, "hit"]],
    }),
  }, DAY, null]])),
  // the guardians, as they come in
  ...Object.fromEntries(([
    ["crowcomb", "meadow"], ["mosswart", "forest"], ["ripplesprite", "stream"], ["gloompeep", "cave"],
    ["frostfluff", "mountain"],
  ]).map(([foe, area]): [string, Scene] => [`guardian_${foe}`, [{
    trip: trip(area, {
      returning: true, event: "battle", foe, outcome: "draw",
      rounds: [["pounce", "bow", "hit"], ["charge", "spin", "ouch"]],
    }),
  }, DAY, null]])),
  guardian_beaten: [{
    trip: trip("cave", {
      returning: true, event: "battle", item: "seed_herb", event_age: 3.2, foe: "gloompeep", outcome: "win",
      rounds: [["pounce", "bow", "strong"]],
    }),
  }, DAY, null],
  // a wild pet: meeting it on a trip, its visits at home, and the nest with the egg
  wild_meet: [{
    stage: "adult", species: "cyclopuff",
    trip: trip("meadow", {
      event: "wild", event_age: 1.0, wild: "cyclopuff", outcome: "friend",
      rounds: [["spin", true], ["flip", false], ["bow", true]],
    }),
  }, DAY, null],
  wild_friend: [{
    stage: "adult", species: "cyclopuff", hat: "daisy",
    trip: trip("meadow", {
      event: "wild", event_age: 9.0, wild: "cyclopuff", outcome: "friend", rounds: [["spin", true], ["bow", true]],
    }),
  }, DAY, null],
  wild_shrug: [{
    stage: "adult", species: "sneezle",
    trip: trip("meadow", {
      event: "wild", event_age: 4.0, wild: "grumpcap", outcome: "shrug", rounds: [["dance", false], ["bow", false]],
    }),
  }, DAY, RAIN],
  visit: [{
    stage: "adult", species: "cyclopuff", mood: "happy", deco: ["flag", "windmill"],
    visitor: { species: "cyclopuff", age: 60, left: 300 },
  }, DAY, null],
  visit_night: [{ stage: "adult", species: "flicker", visitor: { species: "lumoth", age: 1.5, left: 500 } }, NIGHT,
    null],
  nest: [{
    stage: "adult", species: "cyclopuff", nest: "blob", deco: ["flag"],
    plant: { kind: "berry", stage: "grown", ripe: false },
  }, DAY, null],
  nest_ember: [{ stage: "adult", species: "flarelet", nest: "ember" }, NIGHT, null],
  collect: [{ stage: "adult", species: "cyclopuff", activity: "collect", activity_item: "egg_blob" }, DAY, null],
  // a friend's gift lies there until it is unwrapped
  gift: [{
    stage: "adult", species: "cyclopuff", gift: true, deco: ["flag", "windmill"],
    plant: { kind: "berry", stage: "grown", ripe: false },
  }, DAY, null],
  gift_nest: [{ stage: "adult", species: "cyclopuff", gift: true, nest: "blob", deco: ["lantern"] }, NIGHT, null],
  unwrap: [{ stage: "adult", species: "cyclopuff", activity: "unwrap", activity_item: "fruit_cherry" }, DAY, null],
  // the ember line, from the rare egg on
  egg_found: [{
    trip: trip("cave", {
      returning: true, event: "battle", item: "egg_ember", event_age: 3.2, foe: "gloompeep", outcome: "win",
      rounds: [["pounce", "bow", "strong"]],
    }),
  }, DAY, null],
  ember_egg: [{ stage: "egg", species: "ember", ready: true }, DAY, null],
  ember_hatch: [{ stage: "baby", species: "ember", activity: "hatch", activity_item: "egg:ember" }, DAY, null],
  ember_baby: [{ stage: "baby", species: "ember", mood: "happy" }, DAY, null],
  cindlet: [{ species: "ember" }, DAY, null],
  cindlet_hint: [{ species: "ember", hint: "lanternling", hat: "leaf", mood: "happy" }, NIGHT, null],
  cindlet_sick: [{ species: "ember", mood: "sick", sick: true, needs: ["health"] }, DAY, null],
  ember_evolve: [{ stage: "adult", species: "flarelet", activity: "evolve", activity_item: "child:ember" }, DAY,
    null],
  lanternling: [{ stage: "adult", species: "lanternling", mood: "happy" }, DUSK, RAIN],
  lanternling_sleep: [{ stage: "adult", species: "lanternling", asleep: true }, NIGHT, null],
  lanternling_trick: [{ stage: "adult", species: "lanternling", activity: "play", mood: "happy" }, DAY, null],
  flarelet: [{ stage: "adult", species: "flarelet" }, DAY, null],
  flarelet_hat: [{ stage: "adult", species: "flarelet", hat: "bobble", mood: "sad" }, NIGHT, null],
  // the stone line, from a friend met at the stream on
  wild_stream: [{
    stage: "adult", species: "cyclopuff",
    trip: trip("stream", {
      event: "wild", event_age: 4.0, wild: "bouldergrin", outcome: "friend", rounds: [["bow", true], ["spin", true]],
    }),
  }, DAY, null],
  visit_stone: [{ stage: "adult", species: "sneezle", visitor: { species: "glimmerock", age: 1.5, left: 500 } },
    NIGHT, null],
  stone_egg: [{ stage: "egg", species: "stone", ready: true }, DAY, null],
  stone_baby: [{ stage: "baby", species: "stone", mood: "happy" }, DAY, null],
  pebblet: [{ species: "stone" }, DAY, null],
  pebblet_hint: [{ species: "stone", hint: "glimmerock", mood: "happy" }, DAY, null],
  pebblet_hat: [{ species: "stone", hint: "bouldergrin", hat: "cap", mood: "sad" }, DUSK, null],
  pebblet_skip: [{ species: "stone", activity: "trick", activity_item: "flip:ok" }, DAY, null],
  glimmerock: [{ stage: "adult", species: "glimmerock", mood: "happy" }, DAY, null],
  gemperor: [{ stage: "adult", species: "gemperor" }, DAY, null],
  gemperor_night: [{ stage: "adult", species: "gemperor", hat: "cap" }, NIGHT, null],
  gemperor_sad: [{ stage: "adult", species: "gemperor", mood: "sad" }, DAY, null],
  gemperor_hint: [{ hint: "gemperor", mood: "happy" }, DAY, null],
  angloop: [{ stage: "adult", species: "angloop", mood: "happy" }, DAY, null],
  angloop_night: [{ stage: "adult", species: "angloop" }, NIGHT, null],
  angloop_hungry: [{ stage: "adult", species: "angloop", mood: "hungry", needs: ["satiety"] }, DAY, null],
  angloop_hint: [{ hint: "angloop" }, DAY, null],
  purrloop: [{ stage: "adult", species: "purrloop" }, DAY, null],
  purrloop_happy: [{ stage: "adult", species: "purrloop", mood: "happy", hat: "daisy" }, DAY, null],
  purrloop_night: [{ stage: "adult", species: "purrloop" }, NIGHT, null],
  purrloop_hint: [{ hint: "purrloop" }, DAY, null],
  glimmerock_night: [{ stage: "adult", species: "glimmerock", hat: "edelweiss" }, NIGHT, null],
  glimmerock_shine: [{ stage: "adult", species: "glimmerock", activity: "trick", activity_item: "spin:ok" }, DAY, null],
  bouldergrin: [{ stage: "adult", species: "bouldergrin", mood: "happy" }, DAY, null],
  bouldergrin_sad: [{ stage: "adult", species: "bouldergrin", mood: "sad", hat: "bobble" }, DAY, RAIN],
  bouldergrin_sleep: [{ stage: "adult", species: "bouldergrin", asleep: true }, NIGHT, null],
  bouldergrin_toss: [{ stage: "adult", species: "bouldergrin", activity: "trick", activity_item: "flip:ok" }, DAY, null],
};

const assets = readAssets(BDF_FONT_DIR);

/** Whether a scene gives away something the spoiler-free overview keeps to itself. */
function spoils(name: string): boolean {
  const area = SCENES[name][0].trip?.area ?? SHOWN_AREA;
  return SPOILERS.includes(name) || area !== SHOWN_AREA;
}

/** Frames of a scene; the activity starts with the first frame and runs as long as it does on the Pi. */
function frames(name: string, count: number, step = 0.1, spoilerFree = false): Image[] {
  const [changes, now, weather] = SCENES[name];
  const view = { ...BASE, ...changes };
  if (spoilerFree && view.stage === "adult") {
    view.species = SHOWN_ADULT;
  }
  view.activity_until = now.getTime() / 1000 + (ACTIVITY_SECONDS[view.activity] ?? 4);
  const scene = new PetScene(64, 64, assets, { t: 0.0 });
  const images: Image[] = [];
  for (let i = 0; i < count; i++) {
    if (view.trip) { // what happened on the trip gets older, the way it does on the Pi
      view.trip = { ...view.trip, event_age: changes.trip!.event_age + i * step };
    }
    images.push(scene.render(view, weather, new Date(now.getTime() + Math.round(i * step * 1000)), 1 + i * step)[0]);
  }
  return images;
}

/** A text in the panel font, twice its size, with its top left corner at (x, y). */
function label(image: Image, x: number, y: number, text: string): void {
  const font = assets.font;
  if (font) {
    const small = new Image(font.width(text), 6);
    font.draw(small, 0, 0, text, [220, 220, 220]);
    image.paste(small.resized(small.width * 2, small.height * 2), x, y);
  }
}

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      gif: { type: "boolean", default: false },
      pets: { type: "boolean", default: false }, // write the pictures for docs/pets.md
      "spoiler-free": { type: "boolean", default: false }, // overview with one adult form and the first area only
      scale: { type: "string", default: "4" },
      frames: { type: "string", default: "50" }, // length of the GIF (10 frames per second)
    },
  });
  const [name] = positionals;
  if (name !== undefined && !(name in SCENES)) {
    console.error(`There is no scene "${name}". The scenes: ${Object.keys(SCENES).sort().join(", ")}`);
    process.exit(2);
  }
  if (!assets.font) {
    console.warn("No panel font: point LED_MATRIX_BDF_DIR at the fonts folder of rpi-rgb-led-matrix "
      + "for the clock, the temperature and the names.");
  }
  const s = Number(values.scale);
  const enlarged = (image: Image) => image.resized(64 * s, 64 * s);

  if (values.pets) {
    mkdirSync(PETS_DIR, { recursive: true });
    const scene = new PetScene(64, 64, assets);
    for (const [file, [stage, species]] of Object.entries(PETS)) {
      writeFileSync(`${PETS_DIR}/${file}.png`, encodePng(scene.icon(160, stage, species)));
    }
    console.log(PETS_DIR);
    return;
  }
  let out: string;
  if (name && values.gif) {
    out = `pet_${name}.gif`;
    writeFileSync(out, encodeGif(frames(name, Number(values.frames)).map(enlarged), 0.1));
  } else {
    const names = name ? [name] : Object.keys(SCENES).filter((scene) => !(values["spoiler-free"] && spoils(scene)));
    const cols = Math.min(4, names.length);
    const rows = Math.ceil(names.length / cols);
    const sheet = Image.filled(cols * (64 * s + 8), rows * (64 * s + 20), [30, 30, 36]);
    names.forEach((scene, i) => {
      const x = (i % cols) * (64 * s + 8);
      const y = Math.floor(i / cols) * (64 * s + 20);
      sheet.paste(enlarged(frames(scene, 25, 0.1, values["spoiler-free"]).at(-1)!), x + 4, y + 16);
      label(sheet, x + 4, y + 2, scene);
    });
    out = "pet_preview.png";
    writeFileSync(out, encodePng(sheet));
  }
  console.log(out);
}

main();
