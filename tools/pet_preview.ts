// Preview of the pet scene on a PC, without a panel and without the app running.
//
//   npm run preview                       overview of all states → pet_preview.png
//   npm run preview -- --spoiler-free     one adult form and the first area only (for the docs)
//   npm run preview -- play --gif         one animation as a GIF → pet_play.gif
//   npm run preview -- --pets             one picture per form → docs/images/pets/
//   npm run preview -- --yard             the yard: every size and level, pets at it → pet_yard.png,
//                                         and a pet going over and back → pet_yard.gif
//   npm run preview -- --ground           the training ground, empty and with pets training → pet_ground.png
//   npm run preview -- --playground       the playground, empty and with two neighbours on it → pet_playground.png
//
// For the clock, the temperature and the names in the overview, point LED_MATRIX_BDF_DIR at the
// fonts folder of rpi-rgb-led-matrix (without it they are left out).

import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { Image } from "../core/src/image";
import { ACTIVITY_SECONDS } from "../core/src/model";
import { PetScene, type PlaygroundView, type SceneView, type TripView, type Weather, type YardView } from "../core/src/scene";
import { pan, panSeconds } from "../core/src/street";
import { AREAS } from "../core/src/trip";
import * as yards from "../core/src/yard";
import { readAssets } from "../pi/src/assets";
import { BDF_FONT_DIR } from "../pi/src/config";
import { encodePng } from "../pi/src/png";
import { encodeGif } from "./gif";

// `into`: how many seconds of the activity have passed at the first frame (0 = it starts there)
type Scene = [changes: Partial<SceneView>, now: Date, weather: Weather, into?: number];

const BASE: SceneView = {
  species: "blob", stage: "child", ready: false, asleep: false, sick: false, poops: 0, activity: "idle",
  mood: "normal", needs: [], activity_until: 0, activity_item: "",
};
// The special forms, the secret third adult of a line
const SPECIAL_FORMS = ["salamber", "lunarock", "foxfire", "flurrbleat", "sakurin", "bubblehelm", "hippula", "acewing",
  "jesterwing", "pawdini", "prismfly", "archibeaver", "castlecrab", "axodrake", "woolwhisk", "ursastra", "aurorapin", "lunaflap",
  "ninjowl", "mirrorleon", "pharabug", "stormkite", "abyssink", "bellfry", "illusionna"];
// The pictures for docs/pets.md: file name → [stage, species]
const PETS: Record<string, [string, string]> = {
  egg: ["egg", "blob"], baby: ["baby", "blob"], child: ["child", "blob"],
  ...Object.fromEntries(["sneezle", "flicker", "cyclopuff", "grumpcap", "lumoth", "gemperor", "angloop", "purrloop"].map((species) =>
    [species, ["adult", species]])),
  ember_egg: ["egg", "ember"], ember_baby: ["baby", "ember"], cindlet: ["child", "ember"],
  lanternling: ["adult", "lanternling"], flarelet: ["adult", "flarelet"],
  stone_egg: ["egg", "stone"], stone_baby: ["baby", "stone"], pebblet: ["child", "stone"],
  glimmerock: ["adult", "glimmerock"], bouldergrin: ["adult", "bouldergrin"],
  fox_egg: ["egg", "fox"], fox_baby: ["baby", "fox"], kitlet: ["child", "fox"],
  roamtail: ["adult", "roamtail"], filchfox: ["adult", "filchfox"],
  cloud_egg: ["egg", "cloud"], cloud_baby: ["baby", "cloud"], nimbit: ["child", "cloud"],
  rumblefluff: ["adult", "rumblefluff"], prismist: ["adult", "prismist"],
  leaf_egg: ["egg", "leaf"], leaf_baby: ["baby", "leaf"], sproutlet: ["child", "leaf"],
  twiggle: ["adult", "twiggle"], needlenub: ["adult", "needlenub"],
  duck_egg: ["egg", "duck"], duck_baby: ["baby", "duck"], paddlet: ["child", "duck"],
  quill: ["adult", "quill"], drakwing: ["adult", "drakwing"],
  hippo_egg: ["egg", "hippo"], hippo_baby: ["baby", "hippo"], soakling: ["child", "hippo"],
  lillypot: ["adult", "lillypot"], steamo: ["adult", "steamo"],
  beak_egg: ["egg", "beak"], beak_baby: ["baby", "beak"], crestling: ["child", "beak"],
  parcelbeak: ["adult", "parcelbeak"], rapierre: ["adult", "rapierre"],
  caterpillar_egg: ["egg", "caterpillar"], caterpillar_baby: ["baby", "caterpillar"], munchlet: ["child", "caterpillar"],
  mothmuff: ["adult", "mothmuff"], sunflutter: ["adult", "sunflutter"],
  dog_egg: ["egg", "dog"], dog_baby: ["baby", "dog"], pupplet: ["child", "dog"],
  digby: ["adult", "digby"], barrelbard: ["adult", "barrelbard"],
  dragonfly_egg: ["egg", "dragonfly"], dragonfly_baby: ["baby", "dragonfly"], nymphlet: ["child", "dragonfly"],
  rotorfly: ["adult", "rotorfly"], jewelwing: ["adult", "jewelwing"],
  beaver_egg: ["egg", "beaver"], beaver_baby: ["baby", "beaver"], gnawlet: ["child", "beaver"],
  dambert: ["adult", "dambert"], timberjack: ["adult", "timberjack"],
  crab_egg: ["egg", "crab"], crab_baby: ["baby", "crab"], shellbit: ["child", "crab"],
  teacrab: ["adult", "teacrab"], lightclaw: ["adult", "lightclaw"],
  axolotl_egg: ["egg", "axolotl"], axolotl_baby: ["baby", "axolotl"], axolittle: ["child", "axolotl"],
  mossolotl: ["adult", "mossolotl"], medilotl: ["adult", "medilotl"],
  mouse_egg: ["egg", "mouse"], mouse_baby: ["baby", "mouse"], squeaklet: ["child", "mouse"],
  sirthimble: ["adult", "sirthimble"], cogsqueak: ["adult", "cogsqueak"],
  bear_egg: ["egg", "bear"], bear_baby: ["baby", "bear"], cubble: ["child", "bear"],
  hivebear: ["adult", "hivebear"], snorbear: ["adult", "snorbear"],
  penguin_egg: ["egg", "penguin"], penguin_baby: ["baby", "penguin"], waddlet: ["child", "penguin"],
  tuxwaddle: ["adult", "tuxwaddle"], glidepin: ["adult", "glidepin"],
  bat_egg: ["egg", "bat"], bat_baby: ["baby", "bat"], flapling: ["child", "bat"],
  umbrabat: ["adult", "umbrabat"], batbeat: ["adult", "batbeat"],
  owl_egg: ["egg", "owl"], owl_baby: ["baby", "owl"], hootlet: ["child", "owl"],
  owlbert: ["adult", "owlbert"], stargazer: ["adult", "stargazer"],
  chameleon_egg: ["egg", "chameleon"], chameleon_baby: ["baby", "chameleon"], colorlet: ["child", "chameleon"],
  palettino: ["adult", "palettino"], hidewell: ["adult", "hidewell"],
  scarab_egg: ["egg", "scarab"], scarab_baby: ["baby", "scarab"], rollet: ["child", "scarab"],
  solroll: ["adult", "solroll"], clockbeetle: ["adult", "clockbeetle"],
  kite_egg: ["egg", "kite"], kite_baby: ["baby", "kite"], kitelet: ["child", "kite"],
  origrane: ["adult", "origrane"], lionkite: ["adult", "lionkite"],
  octopus_egg: ["egg", "octopus"], octopus_baby: ["baby", "octopus"], inklet: ["child", "octopus"],
  inkasso: ["adult", "inkasso"], octavio: ["adult", "octavio"],
  gargoyle_egg: ["egg", "gargoyle"], gargoyle_baby: ["baby", "gargoyle"], gargit: ["child", "gargoyle"],
  gargard: ["adult", "gargard"], fountaingle: ["adult", "fountaingle"],
  magpie_egg: ["egg", "magpie"], magpie_baby: ["baby", "magpie"], glintlet: ["child", "magpie"],
  glintrick: ["adult", "glintrick"], cardwing: ["adult", "cardwing"],
  ...Object.fromEntries(SPECIAL_FORMS.map((species) => [species, ["adult", species]])),
};
// The leaf, duck, hippo, beak, garden, water, Grandma's, adventure, festival, star, coast, ruins and magpie lines: per line its line, child and adults, for the scenes below
const NEW_LINES: [string, string, string, string][] = [
  ["leaf", "sproutlet", "twiggle", "needlenub"], ["duck", "paddlet", "quill", "drakwing"],
  ["hippo", "soakling", "lillypot", "steamo"], ["beak", "crestling", "parcelbeak", "rapierre"],
  ["caterpillar", "munchlet", "mothmuff", "sunflutter"], ["dog", "pupplet", "digby", "barrelbard"],
  ["dragonfly", "nymphlet", "rotorfly", "jewelwing"], ["beaver", "gnawlet", "dambert", "timberjack"],
  ["crab", "shellbit", "teacrab", "lightclaw"], ["axolotl", "axolittle", "mossolotl", "medilotl"],
  ["mouse", "squeaklet", "sirthimble", "cogsqueak"], ["bear", "cubble", "hivebear", "snorbear"],
  ["penguin", "waddlet", "tuxwaddle", "glidepin"], ["bat", "flapling", "umbrabat", "batbeat"],
  ["owl", "hootlet", "owlbert", "stargazer"], ["chameleon", "colorlet", "palettino", "hidewell"],
  ["scarab", "rollet", "solroll", "clockbeetle"], ["kite", "kitelet", "origrane", "lionkite"],
  ["octopus", "inklet", "inkasso", "octavio"], ["gargoyle", "gargit", "gargard", "fountaingle"],
  ["magpie", "glintlet", "glintrick", "cardwing"],
];
const NEW_SCENES = (["egg", "hatch", "baby", "child", "hint", "evolve"] as const).flatMap((what) =>
  NEW_LINES.map(([line]) => `${line}_${what}`)).concat(NEW_LINES.flatMap(([, , a, b]) =>
  [a, b].flatMap((adult) => ["", "_sad", "_sleep", "_trick", "_rain"].map((what) => `${adult}${what}`))),
["wild_forest_leaf", "wild_stream_hippo", "visit_beak", "visit_duck", "garden_peek"]);
// The adult forms with a trick of their own (OWN_TRICKS in core/src/care.ts) and that trick; each
// gets a scene with the trick ("<form>_own") and one with its special move in a scuffle ("<form>_special")
const OWN_TRICK_FORMS: Record<string, string> = {
  angloop: "bow", gemperor: "flip", purrloop: "bow", lanternling: "spin", flarelet: "flip", roamtail: "spin",
  filchfox: "spin", rumblefluff: "bow", prismist: "spin", twiggle: "spin", needlenub: "bow", quill: "dance",
  drakwing: "flip", lillypot: "bow", steamo: "dance", parcelbeak: "bow", rapierre: "spin", glimmerock: "spin",
  bouldergrin: "flip", salamber: "dance", lunarock: "bow", foxfire: "spin", flurrbleat: "dance", sakurin: "dance",
  bubblehelm: "flip", hippula: "bow", acewing: "flip", mothmuff: "spin", sunflutter: "dance", jesterwing: "flip",
  digby: "spin", barrelbard: "bow", pawdini: "dance", rotorfly: "spin", jewelwing: "bow", prismfly: "dance",
  dambert: "flip", timberjack: "spin", archibeaver: "bow",
  teacrab: "bow", // pours a cup of tea
  lightclaw: "spin", // its beam sweeps round
  castlecrab: "bow", // the drawbridge comes down
  mossolotl: "spin", // its gills unfurl
  medilotl: "dance", // hearts float up
  axodrake: "flip", // a loop with a trail of bubbles
  sirthimble: "bow", // the accolade with its needle lance
  cogsqueak: "spin", // winds itself up and whirrs round
  woolwhisk: "spin", // the golden thread unwinds round her
  hivebear: "bow", // lifts its honey pot like a hat
  snorbear: "spin", // rolls up in its mound and tumbles
  ursastra: "dance", // its stars wander into a picture
  tuxwaddle: "bow", // a waiter's bow
  glidepin: "spin", // a pirouette on its blades
  aurorapin: "dance", // aurora ribbons wave round it
  umbrabat: "flip", // hangs from its hook tail and swings
  batbeat: "dance", // nods to the bass, lights flash
  lunaflap: "spin", // opens its wings as a full moon
  owlbert: "bow", // closes its book and nods
  stargazer: "spin", // its head turns all the way round
  ninjowl: "flip", // gone in smoke, and it lands behind itself
  palettino: "spin", // its colors run round its body
  hidewell: "bow", // melts into the scene
  mirrorleon: "dance", // the rainbow runs over its mirrors (with a friend: see mirrorleon_friend_own)
  solroll: "flip", // a somersault over its ball
  clockbeetle: "dance", // its cog ticks round to the beat
  pharabug: "bow", // raises its sun
  origrane: "bow", // folds itself small and unfolds again
  lionkite: "dance", // a lion dance, pompoms flying
  stormkite: "flip", // torn up by the wind, it dives down
  inkasso: "spin", // paints a circle in the air round itself
  octavio: "dance", // juggles with all its arms
  abyssink: "flip", // gone in an ink cloud, and it appears on top of it
  gargard: "bow", // turns to stone and wakes again
  fountaingle: "flip", // a somersault with an arc of water
  bellfry: "spin", // swings itself like a bell and rings
  glintrick: "bow", // stars and cards burst out of its hat
  cardwing: "spin", // its cards fly round it and back
  illusionna: "flip", // gone behind its curtain, and back on the other side
};
const OWN_SCENES = Object.keys(OWN_TRICK_FORMS).flatMap((adult) => [`${adult}_own`, `${adult}_special`]);
// The spoiler-free overview shows one adult form only, the one docs/pets.md shows openly. It
// leaves out the scenes that are only there to show another form, another line or what the lure
// gives away, and plays the remaining scenes of an adult with that form. Of the trips it shows
// the first area only: the later areas, their opponents and their guardians are left out.
const SHOWN_ADULT = "angloop";
const SHOWN_AREA = AREAS[0];
const SPOILERS = ["keepsakes", "keepsakes_night", "magpie_stole", "magpie_chased", "magpie_back", "magpie_egg", "hint", "evolve", "cyclopuff", "angloop_hint", "sneezle", "flicker", "flicker_sad", "grumpcap", "lumoth", "ember_egg",
  "ember_hatch", "ember_baby", "cindlet", "cindlet_hint", "cindlet_sick", "ember_evolve", "lanternling",
  "lanternling_sleep", "lanternling_trick", "flarelet", "flarelet_hat", "egg_found", "wild_shrug", "visit_copy", "visit_bounce", "visit_night",
  "nest_ember", "stone_egg", "stone_baby", "pebblet", "pebblet_hint", "pebblet_hat", "pebblet_skip", "glimmerock",
  "glimmerock_night", "glimmerock_shine", "bouldergrin", "bouldergrin_sad", "bouldergrin_sleep", "bouldergrin_toss", "wild_stream", "visit_stone",
  "wild_forest", "visit_fox", "fox_egg", "fox_hatch", "fox_baby", "kitlet", "kitlet_hint", "kitlet_hat", "kitlet_sick",
  "fox_evolve", "roamtail", "roamtail_trip", "roamtail_sleep", "roamtail_rain", "filchfox", "filchfox_hat",
  "filchfox_sad", "filchfox_sleep", "filchfox_night", "owl_egg_roof",
  "wild_mountain", "visit_cloud", "cloud_egg", "cloud_hatch", "cloud_baby", "nimbit", "nimbit_hint", "nimbit_rain",
  "nimbit_hat", "cloud_evolve", "rumblefluff", "rumblefluff_rain", "rumblefluff_sleep", "rumblefluff_trick", "rumblefluff_storm", "prismist",
  "prismist_hat", "prismist_sad", "prismist_sleep", "prismist_trip", "prismist_rain",
  "gemperor", "gemperor_night", "gemperor_sad", "gemperor_hint",
  "angloop", "angloop_night", "angloop_hungry", "angloop_hint",
  "purrloop", "purrloop_happy", "purrloop_night", "purrloop_hint", ...NEW_SCENES, ...OWN_SCENES, "mirrorleon_friend_own",
  "mirrorleon_friend_special",
  ...SPECIAL_FORMS.flatMap((adult) => [adult, `${adult}_night`]), "lunarock_new_moon", "snowglobe"];
const PETS_DIR = "docs/images/pets";
const DAY = new Date(2026, 9, 12, 13, 0);
const GEAR = ["barbell", "cones", "coach_board"]; // all the equipment of the training ground
const NIGHT = new Date(2026, 9, 12, 23, 30);
const DUSK = new Date(2026, 9, 12, 18, 10);
// the tide at the coast follows the clock (trip.tide): high water in the morning, low in the afternoon
const HIGH_TIDE = new Date(2026, 9, 12, 10, 0);
const LOW_TIDE = new Date(2026, 9, 12, 16, 0);
const RAIN = { temp: 12.4, code: 63 }; // WMO weather codes, as Open-Meteo sends them
const STORM = { temp: 16.0, code: 95 };

/** A trip on which nothing has happened yet, with whatever is given changed. */
function trip(area: string, changes: Partial<TripView> = {}): TripView {
  return { area, returning: false, event: null, item: null, event_age: 0, ...changes };
}

const SCENES: Record<string, Scene> = {
  idle: [{}, DAY, { temp: 18, code: 0 }],
  happy: [{ mood: "happy", activity: "happy" }, DAY, null],
  eat: [{ activity: "eat" }, DAY, null],
  throw_meal: [{ activity: "throw_meal", activity_item: "meal@0.90" }, DAY, null],
  throw_snack: [{ activity: "throw_snack", activity_item: "fruit_cherry@0.05" }, DAY, null],
  // food from a trip, given by hand like a snack
  snack_found: [{ activity: "snack", activity_item: "honeycomb" }, DAY, null],
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
  hot: [{ hot: true }, DAY, { temp: 31, code: 0 }],
  emberstone: [{ deco: ["emberstone"] }, NIGHT, { temp: -4, code: 0 }],
  waiting: [{ waiting: true }, DAY, null],
  waiting_rain: [{ waiting: true, stage: "adult", species: "cyclopuff" }, DUSK, RAIN],
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
    hat: "cap", deco: ["snailshell"], stage: "adult", species: "angloop",
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
  // fishing at the pond: waiting with the bobber on the water, the bite, the catch; and on a trip
  fishing: [{ activity: "fish_wait", activity_item: "6.00", deco: ["pond"] }, DAY, null, 2],
  fishing_bite: [{ activity: "fish_wait", activity_item: "1.00", deco: ["pond"] }, DAY, null, 1.2],
  fishing_catch: [{ activity: "fish_catch", activity_item: "mussel", deco: ["pond"] }, DAY, null],
  trip_fish: [{ trip: trip("stream", { event: "fish", item: "seagrass", event_age: 1 }) }, DAY, null],
  grandma: [{ grandma: true, deco: ["windmill"], plant: { kind: "berry", stage: "grown", ripe: false },
    trace: { kind: "tower", spot: 0.7, look: 0 } }, DAY, null],
  grandma_home: [{ activity: "grandma_home", mood: "happy", hat: "daisy" }, DAY, null, 0.5],
  // back from a visit with Grandma's things in its backpack, and unpacking them
  grandma_visit: [{ activity: "grandma_home", backpack: true, mood: "happy" }, DAY, null, 0.5],
  grandma_unpack: [{ activity: "unpack", activity_item: "stripes,cake", mood: "happy" }, DAY, null],
  // at the training ground (ground.ts), with the equipment found for it
  train_strength: [{ activity: "train_strength", activity_item: "0.80", ground: GEAR }, DAY, null],
  train_ready: [{ activity: "train_ready", activity_item: "2.00", ground: [] }, DAY, null],
  train_speed: [{ activity: "train_speed", activity_item: "0.90", ground: GEAR }, DAY, null],
  train_show: [{ activity: "train_show", activity_item: "left,up,down,right", ground: GEAR }, DAY, null],
  train_smarts: [{ activity: "train_smarts", activity_item: "4/4", stage: "adult", species: "lumoth", ground: GEAR }, DAY, null],
  // an exercise took a stat up a level: it cheers at the end, with a star over it
  train_level: [{ activity: "train_speed", activity_item: "0.90", level_up: true, ground: GEAR }, DAY, null, 2],
  train_alone: [{ activity: "train_solo", activity_item: "smarts", ground: GEAR }, DAY, null, 2],
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
    stage: "adult", species: "angloop",
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
    stage: "adult", species: "angloop",
    trip: trip("stream", { event: "battle", foe: "puddlin", outcome: "draw", rounds: [["charge", "flip", "hit"]] }),
  }, DAY, RAIN],
  battle_duskwisp: [{
    stage: "adult", species: "angloop",
    trip: trip("mountain", { event: "battle", foe: "duskwisp", outcome: "draw", rounds: [["pounce", "bow", "dodge"]] }),
  }, DUSK, null],
  home_herb: [{
    hat: "edelweiss", deco: ["cairn", "snowman"], plant: { kind: "herb", stage: "grown", ripe: true },
  }, DAY, null],
  home_crystal: [{ hat: "batears", deco: ["crystal", "cattail"], stage: "adult", species: "angloop" }, NIGHT, null],
  home_boat: [{ hat: "lily", deco: ["boat", "crystal"] }, DAY, null],
  // keepsakes of the lines (core/src/keepsake.ts): moving by day, glowing at night
  keepsakes: [{ deco: ["windchime", "hippofountain"] }, DAY, null],
  keepsakes_night: [{ deco: ["jellylamp", "shelllamp"] }, NIGHT, null],
  // the troublemaker (core/src/magpie.ts): she flies off with the snowman, gets chased off, brings it back
  magpie_stole: [{ deco: ["pond"], magpie: { deed: "stole", age: 3.5, item: "snowman", spot: 0 } }, DAY, null],
  magpie_chased: [{ stage: "adult", species: "angloop", deco: ["snowman", "pond"], activity: "shoo",
    magpie: { deed: "chased", age: 6, item: "snowman", spot: 0 } }, DAY, null, 6],
  magpie_back: [{ deco: ["snowman", "pond"], magpie: { deed: "back", age: 4.5, item: "snowman", spot: 0 } }, DAY, null],
  magpie_egg: [{ stage: "adult", species: "angloop", nest: "magpie", deco: ["pond"] }, DAY, null],
  trip_stream: [{ trip: trip("stream") }, DAY, null],
  trip_cave: [{ trip: trip("cave", { event: "find", item: "crystal" }) }, DAY, RAIN],
  trip_food: [{ trip: trip("meadow", { event: "find", item: "honeycomb", event_age: 2 }) }, DAY, null],
  trip_mountain: [{ hat: "bobble", trip: trip("mountain") }, DAY, { temp: -4, code: 71 }],
  trip_coast: [{ hat: "sailor", trip: trip("coast") }, HIGH_TIDE, null],
  trip_coast_low: [{ trip: trip("coast", { event: "find", item: "mussel", event_age: 2 }) }, LOW_TIDE, null],
  trip_coast_fish: [{ trip: trip("coast", { event: "fish", item: "seagrass", event_age: 1 }) }, LOW_TIDE, null],
  trip_coast_bottle: [{ trip: trip("coast", { event: "find", item: "bottle", event_age: 2 }) }, HIGH_TIDE, RAIN],
  trip_ruins: [{ hat: "knight", trip: trip("ruins") }, DAY, null],
  trip_ruins_dusk: [{ trip: trip("ruins", { event: "find", item: "bread", event_age: 2 }) }, DUSK, null],
  trip_ruins_night: [{ trip: trip("ruins", { event: "find", item: "banner", event_age: 2 }) }, NIGHT, null],
  battle_jellybrella: [{
    trip: trip("coast", { event: "battle", event_age: 1.2, foe: "jellybrella", outcome: "draw",
      rounds: [["curl", "spin", "hit"], ["curl", "spin", "hit"]] }),
  }, HIGH_TIDE, RAIN],
  battle_drapeghost: [{
    trip: trip("ruins", { event: "battle", event_age: 1.2, foe: "drapeghost", outcome: "draw",
      rounds: [["pounce", "bow", "hit"], ["pounce", "bow", "hit"]] }),
  }, DUSK, null],
  // the opponents of the later areas, each in the middle of its favorite move
  ...Object.fromEntries(([
    ["ribbop", "stream", "pounce", "bow"], ["sidleclaw", "stream", "charge", "flip"],
    ["echoflit", "cave", "pounce", "bow"], ["glintbug", "cave", "curl", "spin"],
    ["tumblesnow", "mountain", "curl", "spin"], ["craghorn", "mountain", "charge", "flip"],
    ["snatchgull", "coast", "pounce", "bow"], ["starcurl", "coast", "curl", "spin"],
    ["ratwatch", "ruins", "charge", "flip"], ["ivycurl", "ruins", "curl", "spin"],
    ["barkguard", "coast", "charge", "flip"], ["rustknight", "ruins", "curl", "spin"],
  ]).map(([foe, area, move, trick]): [string, Scene] => [`battle_${foe}`, [{
    trip: trip(area, {
      event: "battle", event_age: 1.2, foe, outcome: "draw", rounds: [[move, trick, "hit"], [move, trick, "hit"]],
    }),
  }, DAY, null]])),
  // the guardians, as they come in
  ...Object.fromEntries(([
    ["crowcomb", "meadow"], ["mosswart", "forest"], ["ripplesprite", "stream"], ["gloompeep", "cave"],
    ["frostfluff", "mountain"], ["barkguard", "coast"], ["rustknight", "ruins"],
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
  // after practicing a trick: it needs a break, sits down and puffs
  resting: [{ resting: true }, DAY, null],
  // hide and seek: behind the house (it peeks over the roof now and then), found in the grass, and with a friend
  hide: [{
    activity: "game_wait", game: true, house: 2, plant: { kind: "cherry", stage: "grown", ripe: false },
    deco: ["flag", "windmill"], hide: { spots: ["house"], found: [], peek: 3, over: false },
  }, DAY, null],
  hide_found: [{
    activity: "game_turn", activity_item: "grass:pet", hide: { spots: ["grass"], found: ["grass"], peek: 3, over: true },
  }, DAY, null],
  hide_guest: [{
    stage: "adult", species: "angloop", activity: "game_turn", activity_item: "deco0:guest", game: true, house: 1,
    deco: ["flag"], visitor: { species: "angloop", age: 60, left: 300 },
    hide: { spots: ["right", "deco0"], found: ["deco0"], peek: 3, over: false },
  }, DAY, null],
  // a wild pet: meeting it on a trip, its visits at home, and the nest with the egg
  wild_meet: [{
    stage: "adult", species: "angloop",
    trip: trip("meadow", {
      event: "wild", event_age: 1.0, wild: "cyclopuff", outcome: "friend",
      rounds: [["spin", true], ["flip", false], ["bow", true]],
    }),
  }, DAY, null],
  // from the backpack: a present it likes, then a game of ball
  wild_present: [{
    stage: "adult", species: "angloop",
    trip: trip("meadow", {
      event: "wild", event_age: 0.5, wild: "sneezle", outcome: "friend",
      rounds: [["gift:fruit_herb", true], ["ball", true], ["bow", true]],
    }),
  }, DAY, null],
  wild_friend: [{
    stage: "adult", species: "angloop", hat: "daisy",
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
    stage: "adult", species: "angloop", mood: "happy", deco: ["flag", "windmill"],
    visitor: { species: "angloop", age: 60, left: 300 },
  }, DAY, null],
  // while the friend is there, the two play: catch, copying a trick, hopping in step
  visit_play: [{
    stage: "adult", species: "angloop", mood: "happy", visitor: { species: "angloop", age: 22, left: 500 },
  }, new Date(2026, 9, 12, 13, 0, 17), null],
  visit_copy: [{
    stage: "adult", species: "flicker", mood: "happy", tricks: ["flip"], visitor: { species: "sneezle", age: 22, left: 500 },
  }, new Date(2026, 9, 12, 13, 0, 0), null],
  visit_bounce: [{
    stage: "adult", species: "bouldergrin", visitor: { species: "cyclopuff", age: 22, left: 500 },
  }, new Date(2026, 9, 12, 13, 0, 7), null],
  visit_night: [{ stage: "adult", species: "flicker", visitor: { species: "lumoth", age: 1.5, left: 500 } }, NIGHT,
    null],
  // the pet at the back (companion.ts): out to play, showing a trick, and asleep side by side at night
  second: [{
    stage: "child", species: "blob", mood: "happy",
    visitor: { species: "angloop", stage: "adult", age: 47, left: 800, tricks: ["bow"] },
  }, DAY, null],
  second_night: [{
    stage: "adult", species: "angloop", asleep: true,
    visitor: { species: "blob", stage: "child", age: 60, left: 3600, asleep: true },
  }, NIGHT, null],
  nest: [{
    stage: "adult", species: "angloop", nest: "blob", deco: ["flag"],
    plant: { kind: "berry", stage: "grown", ripe: false },
  }, DAY, null],
  nest_ember: [{ stage: "adult", species: "flarelet", nest: "ember" }, NIGHT, null],
  collect: [{ stage: "adult", species: "angloop", activity: "collect", activity_item: "egg_blob" }, DAY, null],
  // a friend's gift lies there until it is unwrapped
  gift: [{
    stage: "adult", species: "angloop", gift: true, deco: ["flag", "windmill"],
    plant: { kind: "berry", stage: "grown", ripe: false },
  }, DAY, null],
  gift_nest: [{ stage: "adult", species: "angloop", gift: true, nest: "blob", deco: ["lantern"] }, NIGHT, null],
  unwrap: [{ stage: "adult", species: "angloop", activity: "unwrap", activity_item: "fruit_cherry" }, DAY, null],
  // something it found at home by itself: it shows it, then it lies there until it is picked up
  discover: [{ activity: "discover", activity_item: "fruit_berry", found: "fruit_berry" }, DAY, null],
  found: [{ found: "fruit_cherry", deco: ["flag", "windmill"], plant: { kind: "berry", stage: "grown", ripe: false } },
    DAY, null],
  found_gift: [{ stage: "adult", species: "angloop", found: "seed_berry", gift: true, nest: "blob" }, NIGHT, null],
  // what it left behind while nobody was there, until somebody does something with it
  trace_ball: [{ trace: { kind: "ball", spot: 0.9, look: 0 }, deco: ["flag"] }, DAY, null],
  trace_tower: [{ trace: { kind: "tower", spot: 0.2, look: 0 }, plant: { kind: "berry", stage: "young", ripe: false } },
    DAY, null],
  trace_drawing: [{ trace: { kind: "drawing", spot: 0.5, look: 1 }, stage: "adult", species: "angloop" }, DAY, null],
  trace_snowman: [{ trace: { kind: "snowman", spot: 0.1, look: 0 } }, DAY, { temp: -2, code: 73 }],
  trace_night: [{ trace: { kind: "drawing", spot: 0.3, look: 0 } }, NIGHT, null],
  // the house in its three steps, the way into it and out of it, and a look inside
  house_hut: [{ house: 1, deco: ["windmill", "flag"], plant: { kind: "berry", stage: "grown", ripe: true },
    found: "fruit_cherry" }, DAY, null],
  house_cabin: [{ house: 2, deco: ["flag"], hat: "daisy", trace: { kind: "tower", spot: 0.5, look: 0 } }, DAY, null],
  house_house: [{ house: 3, deco: ["windmill", "flag"], plant: { kind: "cherry", stage: "grown", ripe: true } }, DAY,
    null],
  house_lit: [{
    house: 3, asleep: true, activity: "go_in", deco: ["lantern", "glowshroom"],
    plant: { kind: "cherry", stage: "grown", ripe: true },
  }, NIGHT, null, 2.6],
  house_go_in: [{ house: 3, asleep: true, activity: "go_in", deco: ["lantern"] }, NIGHT, null, 1.5],
  house_bed: [{ house: 3, asleep: true, activity: "go_in", house_deco: ["crystal", "snailshell"] }, NIGHT, null, 4.4],
  house_sleep: [{ house: 3, asleep: true, house_deco: ["crystal", "snailshell", "lantern"] }, NIGHT, null],
  house_nap: [{ house: 2, asleep: true, house_deco: ["boat", "cattail"] }, DAY, RAIN],
  hut_sleep: [{ house: 1, asleep: true, house_deco: ["glowshroom"] }, NIGHT, null],
  house_come_out: [{ house: 3, activity: "come_out", deco: ["flag"] }, DAY, null, 2.6],
  house_look_in: [{ house: 2, look_in: true, house_deco: ["crystal", "lantern"], deco: ["flag"] }, DAY, null],
  build: [{ activity: "build", activity_item: "tower", trace: { kind: "tower", spot: 0.4, look: 0 } }, DAY, null],
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
    stage: "adult", species: "angloop",
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
  // the fox line, from a friend met in the forest on
  wild_forest: [{
    stage: "adult", species: "angloop",
    trip: trip("forest", {
      event: "wild", event_age: 4.0, wild: "filchfox", outcome: "friend", rounds: [["bow", true], ["spin", true]],
    }),
  }, DAY, null],
  visit_fox: [{ stage: "adult", species: "glimmerock", visitor: { species: "roamtail", age: 60, left: 500 } }, DAY,
    null],
  fox_egg: [{ stage: "egg", species: "fox", ready: true }, DAY, null],
  fox_hatch: [{ stage: "baby", species: "fox", activity: "hatch", activity_item: "egg:fox" }, DAY, null],
  fox_baby: [{ stage: "baby", species: "fox", mood: "happy" }, DAY, null],
  kitlet: [{ species: "fox" }, DAY, null],
  kitlet_hint: [{ species: "fox", hint: "roamtail", mood: "happy" }, DAY, null],
  kitlet_hat: [{ species: "fox", hint: "filchfox", hat: "leaf", mood: "sad" }, DUSK, null],
  kitlet_sick: [{ species: "fox", mood: "sick", sick: true, needs: ["health"] }, DAY, null],
  fox_evolve: [{ stage: "adult", species: "roamtail", activity: "evolve", activity_item: "child:fox" }, DAY, null],
  roamtail: [{ stage: "adult", species: "roamtail", mood: "happy" }, DAY, null],
  roamtail_trip: [{ stage: "adult", species: "roamtail", hat: "cap", trip: trip("forest") }, DAY, null],
  roamtail_sleep: [{ stage: "adult", species: "roamtail", asleep: true }, NIGHT, null],
  roamtail_rain: [{ stage: "adult", species: "roamtail", mood: "hungry", needs: ["satiety"] }, DUSK, RAIN],
  filchfox: [{ stage: "adult", species: "filchfox" }, DAY, null],
  filchfox_hat: [{ stage: "adult", species: "filchfox", hat: "bobble", mood: "happy" }, DAY, null],
  filchfox_sad: [{ stage: "adult", species: "filchfox", mood: "sad", trip: trip("meadow") }, DAY, null],
  filchfox_sleep: [{ stage: "adult", species: "filchfox", asleep: true }, NIGHT, null],
  filchfox_night: [{ stage: "adult", species: "filchfox", activity: "trick", activity_item: "bow:ok" }, NIGHT, null],
  // the cloud line, from a friend met on the mountain on
  wild_mountain: [{
    stage: "adult", species: "bouldergrin",
    trip: trip("mountain", {
      event: "wild", event_age: 4.0, wild: "rumblefluff", outcome: "friend", rounds: [["bow", true], ["spin", true]],
    }),
  }, DAY, RAIN],
  visit_cloud: [{ stage: "adult", species: "roamtail", visitor: { species: "prismist", age: 60, left: 500 } }, DAY,
    null],
  cloud_egg: [{ stage: "egg", species: "cloud", ready: true }, DAY, null],
  cloud_hatch: [{ stage: "baby", species: "cloud", activity: "hatch", activity_item: "egg:cloud" }, DAY, null],
  cloud_baby: [{ stage: "baby", species: "cloud", mood: "happy" }, DAY, null],
  nimbit: [{ species: "cloud" }, DAY, null],
  nimbit_hint: [{ species: "cloud", hint: "prismist", mood: "happy" }, DAY, null],
  nimbit_rain: [{ species: "cloud", hint: "rumblefluff" }, DUSK, RAIN],
  nimbit_hat: [{ species: "cloud", hat: "leaf", mood: "sad" }, DAY, null],
  cloud_evolve: [{ stage: "adult", species: "rumblefluff", activity: "evolve", activity_item: "child:cloud" }, DAY,
    RAIN],
  rumblefluff: [{ stage: "adult", species: "rumblefluff" }, DAY, null],
  rumblefluff_rain: [{ stage: "adult", species: "rumblefluff", mood: "happy" }, DUSK, RAIN],
  rumblefluff_sleep: [{ stage: "adult", species: "rumblefluff", asleep: true }, NIGHT, null],
  rumblefluff_trick: [{ stage: "adult", species: "rumblefluff", activity: "trick", activity_item: "flip:ok" }, DAY,
    null],
  rumblefluff_storm: [{ stage: "adult", species: "rumblefluff" }, DUSK, STORM], // its horns flash now and then
  prismist: [{ stage: "adult", species: "prismist", mood: "happy" }, DAY, null],
  prismist_rain: [{ stage: "adult", species: "prismist" }, DAY, RAIN], // the rainbow fades
  prismist_hat: [{ stage: "adult", species: "prismist", hat: "bobble" }, DAY, null],
  prismist_sad: [{ stage: "adult", species: "prismist", mood: "sad", needs: ["satiety"] }, DUSK, null],
  prismist_sleep: [{ stage: "adult", species: "prismist", asleep: true }, NIGHT, null],
  prismist_trip: [{ stage: "adult", species: "prismist", hat: "cap", trip: trip("mountain") }, DAY, null],
  // the leaf, duck, hippo and beak lines
  ...Object.fromEntries(NEW_LINES.flatMap(([line, , often, special]) => [
    [`${line}_egg`, [{ stage: "egg", species: line, ready: true }, DAY, null]],
    [`${line}_hatch`, [{ stage: "baby", species: line, activity: "hatch", activity_item: `egg:${line}` }, DAY, null]],
    [`${line}_baby`, [{ stage: "baby", species: line, mood: "happy" }, DAY, null]],
    [`${line}_child`, [{ species: line }, DAY, null]],
    [`${line}_hint`, [{ species: line, hint: special, mood: "happy" }, DAY, null]],
    [`${line}_evolve`, [{ stage: "adult", species: often, activity: "evolve", activity_item: `child:${line}` }, DAY,
      null]],
  ])),
  ...Object.fromEntries(NEW_LINES.flatMap(([, , a, b]) => [a, b].flatMap((adult) => [
    [adult, [{ stage: "adult", species: adult, mood: "happy" }, DAY, null]],
    [`${adult}_sad`, [{ stage: "adult", species: adult, mood: "sad", needs: ["satiety"] }, DUSK, null]],
    [`${adult}_sleep`, [{ stage: "adult", species: adult, asleep: true }, NIGHT, null]],
    [`${adult}_trick`, [{ stage: "adult", species: adult, activity: "trick", activity_item: "flip:ok" }, DAY, null]],
    [`${adult}_rain`, [{ stage: "adult", species: adult }, DAY, RAIN]],
  ]))),
  wild_forest_leaf: [{
    stage: "adult", species: "roamtail",
    trip: trip("forest", { event: "wild", event_age: 4.0, wild: "twiggle", outcome: "friend", rounds: [["bow", true]] }),
  }, DAY, null],
  wild_stream_hippo: [{
    stage: "adult", species: "twiggle",
    trip: trip("stream", { event: "wild", event_age: 4.0, wild: "steamo", outcome: "friend", rounds: [["bow", true]] }),
  }, DAY, null],
  visit_beak: [{ stage: "adult", species: "needlenub", visitor: { species: "rapierre", age: 60, left: 500 } }, DAY, null],
  garden_peek: [{ stage: "child", species: "blob", peeking: "rotorfly" }, DAY, null],
  visit_duck: [{ stage: "adult", species: "parcelbeak", visitor: { species: "drakwing", age: 60, left: 500 } }, DAY,
    null],
  ...Object.fromEntries(Object.entries(OWN_TRICK_FORMS).flatMap(([adult, trick]) => [
    [`${adult}_own`, [{ stage: "adult", species: adult, activity: "trick", activity_item: `${trick}:ok` }, DAY, null]],
    [`${adult}_special`, [{
      stage: "adult", species: adult,
      trip: trip("stream", { event: "battle", foe: "puddlin", outcome: "win", rounds: [["charge", "flip", "special"]] }),
    }, DAY, null]],
  ])),
  ...Object.fromEntries(SPECIAL_FORMS.flatMap((adult) => [
    [adult, [{ stage: "adult", species: adult }, DAY, null]],
    [`${adult}_night`, [{ stage: "adult", species: adult }, NIGHT, null]],
  ])),
  // Mirrorleon with a friend: it dances its friend's dance in its friend's colors, and makes its special move
  mirrorleon_friend_own: [{ stage: "adult", species: "mirrorleon", friend: "sakurin", activity: "trick",
    activity_item: "dance:ok" }, DAY, null],
  mirrorleon_friend_special: [{
    stage: "adult", species: "mirrorleon", friend: "sakurin",
    trip: trip("stream", { event: "battle", foe: "puddlin", outcome: "win", rounds: [["charge", "flip", "special"]] }),
  }, DAY, null],
  lunarock_new_moon: [{ stage: "adult", species: "lunarock" }, new Date(2026, 9, 10, 23, 30), null],
  snowglobe: [{ stage: "adult", species: "rumblefluff", deco: ["snowglobe"] }, DAY, null],
  // shooting stars (core/src/stars.ts): the star, the wish, the owl on the roof (or the fence), what is left
  shooting_star: [{ activity: "wish", star: 1.6 }, NIGHT, null, -0.5],
  star_wish: [{ activity: "wish" }, NIGHT, null, 4],
  owl_roof: [{ owl: true, house: 2 }, NIGHT, null],
  owl_fence: [{ owl: true }, NIGHT, null],
  star_shard: [{ fallen: "star_shard", deco: ["star_shard"] }, DAY, null],
  owl_egg_roof: [{ fallen: "egg_owl", house: 2 }, DAY, null],
  // the trick festival (core/src/festival.ts): its poster, a trick on stage with the score held up, the prize
  festival_poster: [{ poster: true }, DAY, null],
  festival_show: [{
    trip: trip("festival", { event: "festival", event_age: 4.2, outcome: "2", item: "ribbon_blue",
      jury: ["sneezle", "flicker", "cyclopuff"], rounds: [["spin", true, 2], ["flip", true, 5], ["bow", false, 0]] }),
  }, DAY, null],
  festival_prize: [{
    trip: trip("festival", { event: "festival", event_age: 11.5, outcome: "2", item: "ribbon_blue",
      jury: ["sneezle", "flicker", "cyclopuff"], rounds: [["spin", true, 2], ["flip", true, 5], ["bow", false, 0]] }),
  }, DAY, null],
  // digging (core/src/digging.ts): the red cross, digging, and what it found
  dig_cross: [{ cross: true, hat: "helmet" }, DAY, null],
  dig: [{ activity: "dig", activity_item: "8:seed_berry,fossil" }, DAY, null, 4],
  dig_found: [{ activity: "dig", activity_item: "8:fossil", deco: ["fossil", "ribbon_red"] }, DAY, null, 9.5],
};

const assets = readAssets(BDF_FONT_DIR);

/** Whether a scene gives away something the spoiler-free overview keeps to itself. */
function spoils(name: string): boolean {
  const area = SCENES[name][0].trip?.area ?? SHOWN_AREA;
  return SPOILERS.includes(name) || area !== SHOWN_AREA;
}

/** Frames of a scene; the activity starts with the first frame and runs as long as it does on the Pi. */
function frames(name: string, count: number, step = 0.1, spoilerFree = false): Image[] {
  const [changes, now, weather, into = 0] = SCENES[name];
  const view = { ...BASE, ...changes };
  if (spoilerFree && view.stage === "adult") {
    view.species = SHOWN_ADULT;
  }
  view.activity_until = now.getTime() / 1000 + (ACTIVITY_SECONDS[view.activity] ?? 4) - into;
  const scene = new PetScene(64, 64, assets, { t: 0.0 });
  const images: Image[] = [];
  for (let i = 0; i < count; i++) {
    if (view.trip) { // what happened on the trip gets older, the way it does on the Pi
      view.trip = { ...view.trip, event_age: changes.trip!.event_age + i * step };
    }
    if (view.magpie) { // and so does the magpie's
      view.magpie = { ...view.magpie, age: changes.magpie!.age + i * step };
    }
    if (view.visitor) { // the friend's visit goes on as well
      const { age, left } = changes.visitor!;
      view.visitor = { ...view.visitor, age: age + i * step, left: left - i * step };
    }
    images.push(scene.render(view, weather, new Date(now.getTime() + Math.round(i * step * 1000)), 1 + i * step)[0]);
  }
  return images;
}

/** The yard: [label, view] for each size and level, and with pets eating and bathing. */
function yardScenes(): [string, YardView][] {
  const levels = ["empty", "low", "half", "full"];
  const pet = (species: string, stage: string, item: string, e: number, slot: number) =>
    ({ species, stage, item, e, slot, mood: "happy" });
  return [
    ...yards.SIZES.flatMap((size, i) => levels.map((level): [string, YardView] =>
      [`${size} ${level}`, { size: i, trough: level, basin: level, pets: [] }])),
    ["small no basin", { size: 0, trough: "full", basin: null, pets: [] }],
    ["eating", { size: 1, trough: "half", basin: "full", pets: [pet("blob", "child", "eat", 12, 0)] }],
    ["two eat", { size: 2, trough: "full", basin: "half", pets: [pet("angloop", "adult", "eat", 12, 0), pet("blob", "baby", "eat", 14, 1)] }],
    ["bathing", { size: 1, trough: "low", basin: "half", pets: [pet("blob", "child", "bath", 12, 1)] }],
    ["eat, bath", { size: 0, trough: "half", basin: "low", pets: [pet("angloop", "adult", "eat,bath", 36, 0)] }],
    ["walks in", { size: 0, trough: "full", basin: "full", pets: [pet("blob", "child", "eat", 1.5, 0)] }],
    ["at night", { size: 2, trough: "half", basin: "full", pets: [pet("blob", "child", "bath", 12, 0)] }],
    ["rain", { size: 1, trough: "full", basin: "low", barrel: true, raining: true, pets: [] }],
    // the campfire in the evening: the two smallest in front of it, the others on the hill
    ["fire 2", { size: 2, trough: "half", basin: "full", barrel: true, fire: true,
      pets: [pet("blob", "child", "fire:2400", 60, 0), pet("fox", "baby", "fire:2400", 60, 1)] }],
    ["fire 3", { size: 2, trough: "half", basin: "full", barrel: true, fire: true,
      pets: [pet("blob", "child", "fire:2400", 60, 0), pet("twiggle", "adult", "fire:2400", 60, 1), pet("fox", "baby", "fire:2400", 60, 2)] }],
    ["fire 4 adults", { size: 2, trough: "half", basin: "full", barrel: true, fire: true,
      pets: [["angloop", 0], ["hivebear", 1], ["rumblefluff", 2], ["gemperor", 3]].map(([species, slot]) =>
        pet(species as string, "adult", "fire:2400", 60, slot as number)) }],
    ["to the fire", { size: 0, trough: "full", basin: null, fire: true,
      pets: [pet("blob", "child", "fire:2400", 2, 0), pet("angloop", "adult", "fire:2400", 3, 1), pet("fox", "baby", "fire:2400", 1, 2)] }],
  ];
}

/**
 * A pet goes over to the yard and back, the camera with it as on the Pi (pi/src/display.ts):
 * the garden while it walks off, a pan to the yard, the yard while it eats, a pan back.
 */
function yardTrip(step = 0.1): Image[] {
  const start = DAY.getTime() / 1000;
  const item = "eat";
  const view: SceneView = { ...BASE, activity: "yard", activity_item: item, activity_until: start + yards.seconds(item) };
  const garden = new PetScene(64, 64, assets, { t: 0.0 });
  const yardScene = new PetScene(64, 64, assets, { t: 0.0 });
  const images: Image[] = [];
  let shown = "garden", last: Image | null = null;
  let panning: { from: Image; steps: number; start: number } | null = null;
  for (let i = 0; i * step < yards.seconds(item) + 3; i++) {
    const seconds = start + i * step, t = 1 + i * step, now = new Date(seconds * 1000);
    const where = yards.phase(view.activity, view.activity_until, item, seconds);
    const [own] = garden.render(view, null, now, t);
    const there: YardView = { size: 1, trough: "full", basin: "half",
      pets: where?.where === "there" ? [{ species: "blob", stage: "child", item, e: where.e, slot: 0, mood: "happy" }] : [] };
    const [yardFrame] = yardScene.renderYard(there, null, now, t);
    const at = where?.where === "there" ? "yard" : "garden";
    let frame = at === "yard" ? yardFrame : own;
    if (at !== shown && last) {
      panning = { from: last, steps: at === "yard" ? 1 : -1, start: t };
    }
    shown = at;
    last = frame;
    if (panning) {
      const progress = (t - panning.start) / panSeconds(panning.steps);
      if (progress < 1) {
        frame = pan(panning.from, frame, progress, panning.steps);
      } else {
        panning = null;
      }
    }
    images.push(frame);
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
      yard: { type: "boolean", default: false }, // the yard's sizes and levels, and a pet going over
      ground: { type: "boolean", default: false }, // the training ground
      playground: { type: "boolean", default: false }, // the playground
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
  if (values.yard) {
    const shown = yardScenes();
    const cols = 4, rows = Math.ceil(shown.length / cols);
    const sheet = Image.filled(cols * (64 * s + 8), rows * (64 * s + 20), [30, 30, 36]);
    shown.forEach(([title, view], i) => {
      const scene = new PetScene(64, 64, assets, { t: 0.0 });
      const now = title === "at night" || view.fire ? NIGHT : DAY;
      const weather = view.raining ? { code: 63, temp: 12 } : null;
      let frame = scene.renderYard(view, weather, now, 1)[0];
      for (let k = 1; k <= 5; k++) { // a little later, the way it looks after a moment
        frame = scene.renderYard({ ...view, pets: view.pets.map((p) => ({ ...p, e: p.e + k * 0.1 })) }, weather,
          new Date(now.getTime() + k * 100), 1 + k * 0.1)[0];
      }
      const x = (i % cols) * (64 * s + 8), y = Math.floor(i / cols) * (64 * s + 20);
      sheet.paste(enlarged(frame), x + 4, y + 16);
      label(sheet, x + 4, y + 2, title);
    });
    writeFileSync("pet_yard.png", encodePng(sheet));
    writeFileSync("pet_yard.gif", encodeGif(yardTrip().map(enlarged), 0.1));
    console.log("pet_yard.png pet_yard.gif");
    return;
  }
  if (values.ground) {
    // empty, with and without the equipment; then the pets training there
    const empty: [string, string[], Date, Weather][] = [["no equipment", [], DAY, null], ["all equipment", GEAR, DAY, null],
      ["barbell", ["barbell"], DAY, null], ["at night", GEAR, NIGHT, null], ["rain", GEAR, DAY, { code: 63, temp: 12 }]];
    const training = Object.keys(SCENES).filter((scene) => scene.startsWith("train_"));
    const count = empty.length + training.length;
    const cols = 4, rows = Math.ceil(count / cols);
    const sheet = Image.filled(cols * (64 * s + 8), rows * (64 * s + 20), [30, 30, 36]);
    const at = (i: number) => [(i % cols) * (64 * s + 8) + 4, Math.floor(i / cols) * (64 * s + 20)];
    empty.forEach(([title, equipment, now, weather], i) => {
      const scene = new PetScene(64, 64, assets, { t: 0.0 });
      let frame = scene.renderGround({ equipment }, weather, now, 1)[0];
      for (let k = 1; k <= 5; k++) {
        frame = scene.renderGround({ equipment }, weather, new Date(now.getTime() + k * 100), 1 + k * 0.1)[0];
      }
      const [x, y] = at(i);
      sheet.paste(enlarged(frame), x, y + 16);
      label(sheet, x, y + 2, title);
    });
    training.forEach((scene, i) => {
      const [x, y] = at(empty.length + i);
      sheet.paste(enlarged(frames(scene, 25).at(-1)!), x, y + 16);
      label(sheet, x, y + 2, scene);
    });
    writeFileSync("pet_ground.png", encodePng(sheet));
    console.log("pet_ground.png");
    return;
  }
  if (values.playground) {
    const all = ["swing", "sandpit", "seesaw"];
    const empty: [string, PlaygroundView, Date][] = [["all", { pieces: all, castle: false }, DAY],
      ["swing only", { pieces: ["swing"], castle: false }, DAY], ["sandcastle", { pieces: ["sandpit", "seesaw"], castle: true }, DAY],
      ["at night", { pieces: all, castle: true }, NIGHT]];
    // the two on it: [title, seconds since they got there, the neighbour]
    const on: [string, number, string, string][] = [["swing", 20, "child", "fox"], ["swing, other", 260, "child", "fox"],
      ["to the sandpit", 60.4, "child", "fox"], ["sandpit", 100, "child", "fox"], ["seesaw", 140, "adult", "hivebear"],
      ["seesaw adult", 141, "baby", "blob"], ["own game", 200, "child", "fox"]];
    const count = empty.length + on.length;
    const cols = 4, rows = Math.ceil(count / cols);
    const sheet = Image.filled(cols * (64 * s + 8), rows * (64 * s + 20), [30, 30, 36]);
    const at = (i: number) => [(i % cols) * (64 * s + 8) + 4, Math.floor(i / cols) * (64 * s + 20)];
    empty.forEach(([title, place, now], i) => {
      const [x, y] = at(i);
      sheet.paste(enlarged(new PetScene(64, 64, assets, { t: 0.0 }).renderPlayground(place, null, now, 1)[0]), x, y + 16);
      label(sheet, x, y + 2, title);
    });
    on.forEach(([title, since, stage, species], i) => {
      const scene = new PetScene(64, 64, assets, { t: 0.0 });
      const start = DAY.getTime() / 1000;
      let frame: Image | null = null;
      for (let k = 0; k < 30; k++) { // ten per second, from three seconds before
        const age = since - 3 + k * 0.1 + 3;
        const view: SceneView = { ...BASE, playground: { pieces: all, castle: false },
          visitor: { species, stage, left: 900 - age, age, tricks: [] } };
        frame = scene.render(view, null, new Date((start + k * 0.1) * 1000), 1 + k * 0.1)[0];
      }
      const [x, y] = at(empty.length + i);
      sheet.paste(enlarged(frame!), x, y + 16);
      label(sheet, x, y + 2, title);
    });
    writeFileSync("pet_playground.png", encodePng(sheet));
    console.log("pet_playground.png");
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
