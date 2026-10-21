/**
 * Life cycle: egg → baby → child → adult.
 *
 * Every stage lasts a fixed time, less what warmth takes off it (petting the egg, and the ember
 * stone of home.ts); after that the evolution is "due". It is triggered by hand in the app ("Hatch" / "Evolve"), so that you are watching and get to see the animation. If nobody
 * does that for a day, the pet evolves by itself (but only while awake and not at bedtime).
 *
 * Which adult form it becomes is decided by the care diary of the child stage (decideSpecies), and
 * for the cloud and the stone line by the world the moment it grows up (rain, snow, night, full moon).
 *
 * There are several lines of pets. The egg decides which line a pet belongs to: the usual egg is
 * a slime, and a rare egg from a trip (home.EGGS) is something else. Until a pet has grown up,
 * its species is simply the name of its line.
 */

import type { PetState } from "./state";

export const STAGES = ["egg", "baby", "child", "adult"] as const;
export type Stage = (typeof STAGES)[number];
export const NEXT_STAGE: Partial<Record<Stage, Stage>> = { egg: "baby", baby: "child", child: "adult" };

// How long a stage lasts (seconds)
export const STAGE_SECONDS: Partial<Record<Stage, number>> = { egg: 3600, baby: 3 * 86400, child: 7 * 86400 };
export const EGG_WARMTH = 15 * 60; // petting warms the egg: it hatches this much sooner
export const AUTO_EVOLVE_AFTER = 24 * 3600; // due and nobody taps → it evolves by itself

// Line: its adult forms; the last one is the secret special form (docs/pets.md)
export const LINES: Record<string, readonly string[]> = {
  blob: ["angloop", "gemperor", "purrloop"],
  ember: ["lanternling", "flarelet", "salamber"],
  stone: ["glimmerock", "bouldergrin", "lunarock"],
  fox: ["roamtail", "filchfox", "foxfire"],
  cloud: ["prismist", "rumblefluff", "flurrbleat"],
  leaf: ["twiggle", "needlenub", "sakurin"],
  duck: ["quill", "drakwing", "bubblehelm"],
  hippo: ["lillypot", "steamo", "hippula"],
  beak: ["parcelbeak", "rapierre", "acewing"],
  // the garden's lines, whose eggs the guests bring (garden.ts)
  caterpillar: ["mothmuff", "sunflutter", "jesterwing"],
  dog: ["digby", "barrelbard", "pawdini"],
  dragonfly: ["rotorfly", "jewelwing", "prismfly"],
  beaver: ["dambert", "timberjack", "archibeaver"],
  // caught when fishing (fishing.ts)
  crab: ["teacrab", "lightclaw", "castlecrab"],
  axolotl: ["mossolotl", "medilotl", "axodrake"],
  // from Grandma's attic (grandma.ts)
  mouse: ["sirthimble", "cogsqueak", "woolwhisk"],
  // from the trips: the guardians of the forest and the mountain leave their eggs (trip.GUARDIAN_EGGS),
  // and the bat lives in the cave as a wild pet (wild.WILD)
  bear: ["hivebear", "snorbear", "ursastra"],
  penguin: ["tuxwaddle", "glidepin", "aurorapin"],
  bat: ["umbrabat", "batbeat", "lunaflap"],
};
/**
 * The language key for the name of a form: an adult's species, the child of its line (every line's
 * child has a name of its own, in `children` of the language files), or else the stage.
 */
export function formKey(stage: string, species: string): string {
  if (stage === "adult") {
    return `species.${species}`;
  }
  return stage === "child" ? `children.${species}` : `stages.${stage}`;
}
// The slime's first adult forms: the slime line was redrawn and they grow out of no egg any more,
// but they still live in the wild (wild.WILD). They may come back as lines of their own.
export const WILD_ONLY: readonly string[] = ["sneezle", "lumoth", "cyclopuff", "grumpcap", "flicker"];
export const SPECIES = [...Object.entries(LINES).flatMap(([line, adults]) => [line, ...adults]), ...WILD_ONLY];
// Every form there is, as "stage:species", in the album's order: per line its egg, baby, child
// and adult forms
export const FORMS = Object.entries(LINES).flatMap(([line, adults]) => [
  ...STAGES.slice(0, -1).map((stage) => `${stage}:${line}`), ...adults.map((adult) => `adult:${adult}`)]);

// Rules for the adult form (order = priority)
export const PURRLOOP_LOVE_PER_DAY = 8; // counted pettings per day → purrloop
export const GEMPEROR_CARE = 0.85; // well cared for this part of the time → gemperor, otherwise angloop
export const FLARELET_PLAYS_PER_DAY = 2.5; // the ember line: played with this often → flarelet, otherwise lanternling
export const ROAMTAIL_TRIPS_PER_DAY = 1; // the fox line: a trip a day makes a wanderer → roamtail, otherwise filchfox
// The cloud line is decided by the weather when it grows up: in the rain → rumblefluff, otherwise prismist
export const NEEDLENUB_LOVE_PER_DAY = 5; // the leaf line: a cactus that gets cuddled → needlenub, otherwise twiggle
export const DRAKWING_BATTLES_PER_DAY = 2; // the duck line: scuffles a day, won or not → drakwing, otherwise quill
export const STEAMO_BATHS_PER_DAY = 2; // the hippo line: bathed this often → steamo, otherwise lillypot
export const RAPIERRE_TRICKS_PER_DAY = 2; // the beak line: tricks practiced → rapierre, otherwise parcelbeak
export const FAVORITE_FRUITS = 4; // the caterpillar line: this many of one fruit, more than of any other → sunflutter (sunflower), otherwise mothmuff
export const BARRELBARD_BOND = 4; // the dog line: bond hearts when it grows up → barrelbard, otherwise digby
export const JEWELWING_BATHS = 14; // the dragonfly line: baths as a child → jewelwing, otherwise rotorfly
// The beaver line: strength its highest battle stat when it grows up → timberjack, otherwise dambert
// The special forms: a rare deed during the child stage (totals, not per day), or a rare moment
// when it grows up. Their rule goes first.
export const SALAMBER_GLOWBERRIES = 3; // the ember line: glowberries eaten as a child → salamber
// The stone line under a full moon at night → lunarock
export const FOXFIRE_FOREST_TRIPS = 4; // the fox line: trips to the mushroom forest → foxfire
// The cloud line in the snow (or with the snow globe set out at home) → flurrbleat
export const SAKURIN_PLANT_FRUITS = 6; // the leaf line: fruits it picked off its own plant → sakurin
export const BUBBLEHELM_RAIN_TRIPS = 3; // the duck line: trips with rain on the way → bubblehelm
export const HIPPULA_TUCKED = 6; // the hippo line: evenings tucked in by hand → hippula
export const ACEWING_GUARDIANS = 2; // the beak line: guardians it got past → acewing
// The caterpillar line: cherries the fruit it ate most (at least FAVORITE_FRUITS) → jesterwing
// The dog line: it knows all four tricks when it grows up → pawdini
// The dragonfly line: it grows up while the sun shines after rain (SUN_AFTER_RAIN) → prismfly
export const SUN_AFTER_RAIN = 3 * 3600; // seconds since the rain stopped that still count
// The beaver line: the house is built to its last step when it grows up → archibeaver
// The crab line: it grows up after dark while a decoration that glows stands outside → lightclaw,
// otherwise teacrab
export const CASTLECRAB_COAST_TRIPS = 3; // the crab line: trips to the coast → castlecrab
// The axolotl line: its health never below WEAK_HEALTH as a child → medilotl, otherwise mossolotl;
// it beat Gloompeep as a child → axodrake
// The mouse line: its satiety never below HUNGRY_SATIETY as a child → cogsqueak, otherwise
// sirthimble; it wears one of Grandma's knitted hats (grandma.HATS) when it grows up → woolwhisk
export const HUNGRY_SATIETY = 25;
export const SNORBEAR_HONEYCOMBS = 4; // the bear line: honeycombs eaten as a child → snorbear, otherwise hivebear
export const URSASTRA_BOND = 5; // the bear line: bond hearts when it grows up (all of them) → ursastra
export const GLIDEPIN_MOUNTAIN_TRIPS = 3; // the penguin line: trips to the mountain as a child → glidepin, otherwise tuxwaddle
export const AURORAPIN_BEFORE_SUNRISE = 60; // the penguin line: it grows up this many minutes before sunrise or less → aurorapin
// The bat line: speed its highest battle stat when it grows up → batbeat, otherwise umbrabat; it
// grows up under a full moon at night → lunaflap
export const MISSING_AFTER = 30; // days with pets before a line whose egg never came gets the quiet safety net (Pet.longMissing)
export const HINT_AFTER = 1440; // minutes in the diary before the child's lure shows where it is heading

// Character: factors on decay (awake) and on rewards. Small on purpose.
export const DECAY_FACTORS: Record<string, Record<string, number>> = {
  baby: { satiety: 1.3, energy: 1.2 }, // babies eat and sleep more
  flicker: { mood: 1.3 }, // wants to play all the time
  cyclopuff: { satiety: 1.15, energy: 0.9 }, // easy-going, loves food
  grumpcap: { satiety: 0.7, mood: 1.3 }, // needs little food, but lots of attention
  lumoth: { hygiene: 0.8 },
  angloop: { satiety: 1.15 }, // a big mouth, always hungry
  purrloop: { hygiene: 0.8 }, // a cat keeps itself clean
  lanternling: { mood: 0.8 }, // snug behind its glass
  flarelet: { satiety: 1.25, energy: 0.85 }, // burns through its food and hardly tires
  glimmerock: { hygiene: 0.7 }, // polished: dirt doesn't stick
  bouldergrin: { satiety: 1.2, mood: 0.8 }, // a heavy eater, and nothing wipes the grin off its face
  roamtail: { energy: 0.85 }, // used to long roads: it hardly tires
  filchfox: { satiety: 1.15 }, // always after something to eat
  rumblefluff: { mood: 0.85 }, // grumpy anyway: a bad day hardly makes it worse
  prismist: { hygiene: 0.8 }, // light as air: dirt doesn't weigh it down
  twiggle: { energy: 0.85 }, // an old tree is patient
  drakwing: { satiety: 1.15 }, // a fire needs feeding
  steamo: { hygiene: 0.7 }, // always fresh from the sauna
  lillypot: { energy: 0.85 }, // half asleep in the pond anyway
  rapierre: { energy: 1.2, satiety: 1.15 }, // a hummingbird burns through everything
  parcelbeak: { mood: 0.85 }, // a letter for everyone: it is always in a good mood
  salamber: { satiety: 1.15, hygiene: 0.8 }, // a fire needs feeding, and dirt burns off its crust
  lunarock: { energy: 0.8 }, // a stone giant hardly tires
  foxfire: { mood: 0.85 }, // a spirit: calm and content
  flurrbleat: { hygiene: 0.8 }, // the snow keeps its wool clean
  sakurin: { mood: 0.85 }, // in bloom: it is always a little festive
  bubblehelm: { hygiene: 0.8 }, // the helmet keeps the muck out
  hippula: { energy: 1.2, mood: 0.85 }, // up all night, but nothing ruffles a count
  acewing: { energy: 1.15 }, // all those stunts
  mothmuff: { energy: 0.85 }, // a moth naps the day away anyway
  sunflutter: { mood: 0.85 }, // sunny by nature
  jesterwing: { mood: 1.2, energy: 1.15 }, // always up to some fooling, and always wanting an audience
  digby: { hygiene: 1.2 }, // its nose is always in the soil
  barrelbard: { energy: 0.85 }, // a big, calm mountain of a dog
  pawdini: { energy: 1.15 }, // the show never stops
  rotorfly: { energy: 1.15 }, // all that hovering
  jewelwing: { hygiene: 0.8 }, // armour wipes clean
  prismfly: { satiety: 0.8 }, // it lives half on light
  dambert: { satiety: 1.15 }, // it gnaws all day
  timberjack: { satiety: 1.2 }, // a lumberjack's appetite
  archibeaver: { mood: 0.85 }, // content with its plans
  teacrab: { mood: 0.85 }, // there is always a cup of tea
  lightclaw: { energy: 1.15 }, // up all night, keeping the light
  castlecrab: { satiety: 1.15 }, // a whole castle to feed
  mossolotl: { energy: 0.8 }, // a stone on the lake floor hardly moves
  medilotl: { hygiene: 0.8 }, // a healer keeps clean
  axodrake: { energy: 1.15 }, // all that floating
  sirthimble: { mood: 0.85 }, // a knight doesn't lose heart
  cogsqueak: { energy: 0.85 }, // wound up, it keeps going
  woolwhisk: { hygiene: 1.15 }, // wool picks up everything
  hivebear: { satiety: 0.85 }, // it has honey of its own
  snorbear: { energy: 0.8 }, // half asleep all the time anyway
  ursastra: { mood: 0.85 }, // as calm as the night sky
  tuxwaddle: { hygiene: 0.8 }, // always neat in its tailcoat
  glidepin: { energy: 1.15 }, // always skating
  aurorapin: { hygiene: 0.85 }, // the frost keeps it clean
  umbrabat: { hygiene: 0.85 }, // the rain washes it
  batbeat: { energy: 1.2 }, // dancing all night
  lunaflap: { energy: 0.85 }, // it sleeps the day away and glides on moonlight
};
export const BONUS_FACTORS: Record<string, Record<string, number>> = {
  flicker: { play: 1.25 },
  grumpcap: { pet: 2.0 },
  lumoth: { heart: 1.5 },
  purrloop: { heart: 1.5 }, // loves being loved
  sneezle: { sick: 0.5 }, // gets sick less often
  gemperor: { sick: 0.5 }, // strong: gets sick less often
  lanternling: { sick: 0.6 },
  glimmerock: { pet: 1.5 }, // loves being polished
  filchfox: { play: 1.25 }, // up for any mischief
  prismist: { pet: 1.25 }, // fluffy, and it knows how nice that is
  needlenub: { pet: 1.5 }, // a cactus that wants to be petted: nothing makes it happier
  quill: { play: 1.25 }, // an old sailor loves a good game
  steamo: { sick: 0.5 }, // the sauna keeps it healthy
  salamber: { sick: 0.6 }, // nothing catches on a fire
  lunarock: { sick: 0.5 }, // a stone giant
  foxfire: { play: 1.25 }, // a fox spirit loves a game
  flurrbleat: { pet: 1.5 }, // the softest wool there is
  sakurin: { heart: 1.25 },
  bubblehelm: { play: 1.25 },
  hippula: { pet: 1.25 }, // a count likes to be admired
  acewing: { play: 1.25 }, // always up for a stunt
  mothmuff: { pet: 1.25 }, // all that fur
  digby: { play: 1.25 }, // fetch!
  barrelbard: { heart: 1.25 }, // a loyal dog
  pawdini: { play: 1.25 },
  jewelwing: { sick: 0.6 }, // armoured
  timberjack: { sick: 0.6 }, // tough as an old oak
  teacrab: { pet: 1.25 }, // warm to the touch
  medilotl: { sick: 0.5 }, // it heals itself first
  axodrake: { play: 1.25 },
  woolwhisk: { pet: 1.25 }, // soft as wool
  sirthimble: { sick: 0.6 }, // under its helmet
  hivebear: { pet: 1.25 }, // warm and humming
  snorbear: { pet: 1.5 }, // a sleepy bear loves a scratch behind the ears
  ursastra: { heart: 1.5 }, // it grew out of a strong bond
  tuxwaddle: { heart: 1.25 }, // a loyal butler
  glidepin: { play: 1.25 }, // always up for a race
  aurorapin: { sick: 0.6 }, // used to the polar cold
  umbrabat: { sick: 0.6 }, // it keeps the rain off itself
  batbeat: { play: 1.5 }, // anything to dance to
  lunaflap: { pet: 1.25 }, // its wings of moonlight are soft to stroke
};

/**
 * The care diary of a child. Besides these, it counts what a rule for an adult form may look at
 * one day (record): each food from the bag or off the plant (`food_<name>`), fruits it picked off
 * the plant itself (`plant_fruits`), trips to each area (`trips_<area>`) and trips with rain on the way
 * (`rain_trips`), scuffles in which it was never knocked over (`clean_battles`), the opponents it
 * beat (`won_<foe>`), guardians it got past for the first time (`guardians`), games of hide and seek played and won (`games`, `games_won`),
 * evenings it was tucked in by hand (`tucked`), minutes with its health below WEAK_HEALTH
 * (`weak_minutes`) and minutes with its satiety below HUNGRY_SATIETY (`hungry_minutes`).
 */
export function newDiary(): Record<string, number> {
  return { minutes: 0, good_minutes: 0, meals: 0, snacks: 0, plays: 0, love: 0, trips: 0, battles: 0, baths: 0, tricks: 0 };
}
export const WEAK_HEALTH = 80;

/** The line a species belongs to. */
export function lineOf(species: string): string {
  const found = Object.entries(LINES).find(([line, adults]) => species === line || adults.includes(species));
  return found ? found[0] : "blob";
}

function key(state: PetState): string {
  return state.stage === "adult" ? state.species : state.stage;
}

/** The forms a pet of this stage and species has been so far, as "stage:species" (see FORMS). */
export function formsOf(stage: string, species: string): string[] {
  const reached = STAGES.indexOf(stage as Stage);
  if (reached < 0) {
    return [];
  }
  const line = lineOf(species);
  return STAGES.slice(0, reached + 1).map((s) => `${s}:${s === "adult" ? species : line}`)
    .filter((form) => FORMS.includes(form));
}

export function decayFactor(state: PetState, stat: string): number {
  return DECAY_FACTORS[key(state)]?.[stat] ?? 1.0;
}

export function bonusFactor(state: PetState, kind: string): number {
  return BONUS_FACTORS[key(state)]?.[kind] ?? 1.0;
}

/** When the next stage is due (null = adult). */
export function dueAt(state: PetState): number | null {
  const seconds = STAGE_SECONDS[state.stage];
  if (seconds === undefined) {
    return null;
  }
  return state.stage_since + seconds - state.egg_warmth;
}

export function isDue(state: PetState, now: number): boolean {
  const due = dueAt(state);
  return due !== null && now >= due;
}

/** Diary of the child stage: one minute, well cared for or not. */
export function recordMinute(state: PetState, good: boolean): void {
  if (state.stage === "child") {
    state.diary.minutes += 1;
    state.diary.good_minutes += good ? 1 : 0;
    if (state.stats.health < WEAK_HEALTH) {
      record(state, "weak_minutes");
    }
    if (state.stats.satiety < HUNGRY_SATIETY) {
      record(state, "hungry_minutes");
    }
  }
}

export function record(state: PetState, kind: string, amount = 1): void {
  if (state.stage === "child") {
    state.diary[kind] = (state.diary[kind] ?? 0) + amount;
  }
}

/**
 * The world where the pet lives at the moment it grows up: some lines go by it instead of the care
 * diary (the cloud by the rain, the stone by the night). Everything in it is real: the weather,
 * the clock, the sun and the moon where the pet lives.
 */
export interface World {
  /** It rains (or storms) right now. */
  raining?: boolean;
  /** It snows right now. */
  snowing?: boolean;
  /** A thunderstorm right now. */
  storm?: boolean;
  /** The temperature in °C, or null without weather data. */
  temp?: number | null;
  /** The sun is down. */
  dark?: boolean;
  /** The time of day, in minutes after midnight (local time). */
  minute?: number;
  /** Sunrise and sunset today, in minutes after midnight (local time). */
  sunrise?: number;
  sunset?: number;
  /** The moon is full (sun.isFullMoon). */
  fullMoon?: boolean;
  /** It rained at home lately (SUN_AFTER_RAIN), and doesn't any more. */
  afterRain?: boolean;
  /** What the pet itself has come to when it grows up: its bond hearts (care.bondLevel), */
  bond?: number;
  /** whether it knows every trick, */
  allTricks?: boolean;
  /** its highest battle stat, */
  strongest?: string;
  /** a decoration that glows stands outside (home.GLOWING_DECO), */
  glowOutside?: boolean;
  /** whether it wears one of Grandma's knitted hats (grandma.HATS), */
  grandmaHat?: boolean;
  /** and whether its house is built to the last step (home.HOUSE_STEPS). */
  houseBuilt?: boolean;
}

/** Whether it is the last hour before sunrise (AURORAPIN_BEFORE_SUNRISE), by the clock and the sun where the pet lives. */
export function beforeSunrise(world: World): boolean {
  if (world.minute === undefined || world.sunrise === undefined) {
    return false;
  }
  const until = world.sunrise - world.minute;
  return until > 0 && until <= AURORAPIN_BEFORE_SUNRISE;
}

/** How many days the child stage of this pet lasts: less what the ember stone took off it. */
export function childDays(state: PetState): number {
  return Math.max(1.0, (STAGE_SECONDS.child! - state.egg_warmth) / 86400);
}

/**
 * The adult form the care diary and, for the cloud and the stone line, the world lead to.
 *
 * A rule "so often per day" is a total for the whole child stage (`stageDays`): a day away is made
 * up on the others, and while the evolution waits for a tap the goal doesn't grow any more. Until
 * then the rule asks for the share of the days so far, so that the hint shows whether the child is
 * on its way.
 */
export function decideSpecies(diary: Record<string, number>, line = "blob", world: World = {},
    stageDays = STAGE_SECONDS.child! / 86400): string {
  const minutes = diary.minutes ?? 0;
  const days = Math.min(Math.max(1.0, minutes / 1440), stageDays);
  const enough = (kind: string, perDay: number) => (diary[kind] ?? 0) >= perDay * days;
  const done = (kind: string, total: number) => (diary[kind] ?? 0) >= total;
  const fruits = ["berry", "sunflower", "cherry", "herb"].map((kind) => [kind, diary[`food_fruit_${kind}`] ?? 0] as const);
  const most = (kind: string) => { // the fruit it ate most, and enough of it
    const eaten = fruits.find(([k]) => k === kind)![1];
    return eaten >= FAVORITE_FRUITS && fruits.every(([k, n]) => k === kind || n < eaten);
  };
  const special = ({
    ember: done("food_glowberry", SALAMBER_GLOWBERRIES),
    stone: Boolean(world.fullMoon && world.dark),
    fox: done("trips_forest", FOXFIRE_FOREST_TRIPS),
    cloud: Boolean(world.snowing),
    leaf: done("plant_fruits", SAKURIN_PLANT_FRUITS),
    duck: done("rain_trips", BUBBLEHELM_RAIN_TRIPS),
    hippo: done("tucked", HIPPULA_TUCKED),
    beak: done("guardians", ACEWING_GUARDIANS),
    caterpillar: most("cherry"),
    dog: Boolean(world.allTricks),
    dragonfly: Boolean(world.afterRain && !world.raining && !world.dark),
    beaver: Boolean(world.houseBuilt),
    crab: done("trips_coast", CASTLECRAB_COAST_TRIPS),
    axolotl: done("won_gloompeep", 1),
    mouse: Boolean(world.grandmaHat),
    bear: (world.bond ?? 0) >= URSASTRA_BOND,
    penguin: beforeSunrise(world),
    bat: Boolean(world.fullMoon && world.dark),
  } as Record<string, boolean>)[line];
  if (special) {
    return LINES[line][2];
  }
  if (line === "ember") {
    return enough("plays", FLARELET_PLAYS_PER_DAY) ? "flarelet" : "lanternling";
  }
  if (line === "stone") {
    return world.dark ? "glimmerock" : "bouldergrin"; // its crystals light up at night
  }
  if (line === "fox") {
    return enough("trips", ROAMTAIL_TRIPS_PER_DAY) ? "roamtail" : "filchfox";
  }
  if (line === "cloud") {
    return world.raining ? "rumblefluff" : "prismist";
  }
  if (line === "leaf") {
    return enough("love", NEEDLENUB_LOVE_PER_DAY) ? "needlenub" : "twiggle";
  }
  if (line === "duck") {
    return enough("battles", DRAKWING_BATTLES_PER_DAY) ? "drakwing" : "quill";
  }
  if (line === "hippo") {
    return enough("baths", STEAMO_BATHS_PER_DAY) ? "steamo" : "lillypot";
  }
  if (line === "beak") {
    return enough("tricks", RAPIERRE_TRICKS_PER_DAY) ? "rapierre" : "parcelbeak";
  }
  if (line === "caterpillar") {
    return most("sunflower") ? "sunflutter" : "mothmuff";
  }
  if (line === "dog") {
    return (world.bond ?? 0) >= BARRELBARD_BOND ? "barrelbard" : "digby";
  }
  if (line === "dragonfly") {
    return done("baths", JEWELWING_BATHS) ? "jewelwing" : "rotorfly";
  }
  if (line === "beaver") {
    return world.strongest === "strength" ? "timberjack" : "dambert";
  }
  if (line === "crab") {
    return world.dark && world.glowOutside ? "lightclaw" : "teacrab";
  }
  if (line === "axolotl") {
    return minutes > 0 && !diary.weak_minutes ? "medilotl" : "mossolotl";
  }
  if (line === "mouse") {
    return minutes > 0 && !diary.hungry_minutes ? "cogsqueak" : "sirthimble";
  }
  if (line === "bear") {
    return done("food_honeycomb", SNORBEAR_HONEYCOMBS) ? "snorbear" : "hivebear";
  }
  if (line === "penguin") {
    return done("trips_mountain", GLIDEPIN_MOUNTAIN_TRIPS) ? "glidepin" : "tuxwaddle";
  }
  if (line === "bat") {
    return world.strongest === "speed" ? "batbeat" : "umbrabat";
  }
  const care = minutes ? (diary.good_minutes ?? 0) / minutes : 1.0;
  if (enough("love", PURRLOOP_LOVE_PER_DAY)) {
    return "purrloop";
  }
  return care >= GEMPEROR_CARE ? "gemperor" : "angloop";
}

/**
 * The adult form a child is heading for right now (null in its first day and at other stages).
 * `world`: the weather and the time of day right now (the cloud and the stone line).
 */
export function hint(state: PetState, world: World = {}): string | null {
  if (state.stage !== "child" || (state.diary.minutes ?? 0) < HINT_AFTER) {
    return null;
  }
  return decideSpecies(state.diary, lineOf(state.species), world, childDays(state));
}

/**
 * Next stage. Returns the old form as "stage:species" (for the animation). `world`: the weather
 * and the time of day right now (the cloud and the stone line).
 */
export function evolve(state: PetState, now: number, world: World = {}): string {
  const old = `${state.stage}:${state.species}`;
  const next = NEXT_STAGE[state.stage];
  if (next === undefined) {
    throw new Error(`${state.stage} is the last stage`);
  }
  if (next === "baby") {
    state.born_at = now; // age counts from hatching
  }
  if (next === "child") {
    state.diary = newDiary();
  }
  if (next === "adult") {
    state.species = decideSpecies(state.diary, lineOf(state.species), world, childDays(state));
  }
  state.stage = next;
  state.stage_since = now;
  state.egg_warmth = 0.0;
  return old;
}
