/**
 * Life cycle: egg → baby → child → adult.
 *
 * Every stage lasts a fixed time, less what warmth takes off it (petting the egg, and the ember
 * stone of home.ts); after that the evolution is "due". It is triggered by hand in the app ("Hatch" / "Evolve"), so that you are watching and get to see the animation. If nobody
 * does that for a day, an egg or a baby evolves by itself (but only while awake and not at
 * bedtime). A child waits: it grows up when the player picks its adult form.
 *
 * Which adult forms it may become (choices) goes by the care diary of the child stage, by what the
 * home has had before, and for some lines by the world the moment it grows up (rain, night, full
 * moon).
 *
 * There are several lines of pets. The egg decides which line a pet belongs to: the usual egg is
 * a slime, and a rare egg from a trip (home.EGGS) is something else. Until a pet has grown up,
 * its species is simply the name of its line.
 */

import * as keepsake from "./keepsake";
import type { PetState } from "./state";

export const STAGES = ["egg", "baby", "child", "adult"] as const;
export type Stage = (typeof STAGES)[number];
export const NEXT_STAGE: Partial<Record<Stage, Stage>> = { egg: "baby", baby: "child", child: "adult" };

// How long a stage lasts (seconds)
export const STAGE_SECONDS: Partial<Record<Stage, number>> = { egg: 3600, baby: 3 * 86400, child: 7 * 86400 };
export const EGG_WARMTH = 15 * 60; // petting warms the egg: it hatches this much sooner
export const AUTO_EVOLVE_AFTER = 24 * 3600; // an egg or a baby that is due and nobody taps: it evolves by itself (a child waits to be asked)

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
  // from the festival and the stars
  owl: ["owlbert", "stargazer", "ninjowl"],
  chameleon: ["palettino", "hidewell", "mirrorleon"],
  scarab: ["solroll", "clockbeetle", "pharabug"],
  kite: ["origrane", "lionkite", "stormkite"],
  // from the coast and the ruins
  octopus: ["inkasso", "octavio", "abyssink"],
  gargoyle: ["gargard", "fountaingle", "bellfry"],
  // the troublemaker's: the magpie leaves her egg once she has been chased off often enough (magpie.ts)
  magpie: ["glintrick", "cardwing", "illusionna"],
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
export const PURRLOOP_LOVE_PER_DAY = 8; // counted pettings in a day: on PURRLOOP_DAYS days of the child stage → purrloop
export const PURRLOOP_DAYS = 7;
export const GEMPEROR_CARE = 0.85; // well cared for this part of the time → gemperor, otherwise angloop
export const FLARELET_PLAYS_PER_DAY = 2.5; // the ember line: played with this often → flarelet, otherwise lanternling
export const ROAMTAIL_TRIPS_PER_DAY = 1; // the fox line: a trip a day makes a wanderer → roamtail, otherwise filchfox
// The cloud line is decided by the weather when it grows up: in the rain → rumblefluff, otherwise prismist
export const NEEDLENUB_LOVE_PER_DAY = 5; // the leaf line: a cactus that gets cuddled → needlenub, otherwise twiggle
export const DRAKWING_BATTLES_PER_DAY = 2; // the duck line: scuffles a day, won or not → drakwing, otherwise quill
export const STEAMO_BATHS_PER_DAY = 2; // the hippo line: bathed this often → steamo, otherwise lillypot
export const RAPIERRE_TRICKS = 10; // the beak line: tricks practiced or shown as a child → rapierre, otherwise parcelbeak
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
// The dog line: as a child it showed the dance (its own trick) at the trick festival, and it worked → pawdini
// The dragonfly line: it grows up while the sun shines after rain (SUN_AFTER_RAIN) → prismfly
export const SUN_AFTER_RAIN = 3 * 3600; // seconds since the rain stopped that still count
// The beaver line: the house is built to its last step when it grows up → archibeaver
// The crab line: it grows up after dark while a decoration that glows stands outside → lightclaw,
// otherwise teacrab
// The crab line: it grows up while the sandcastle from the coast stands outside → castlecrab
// The axolotl line: its health never below WEAK_HEALTH as a child → medilotl, otherwise mossolotl;
// it beat Gloompeep as a child → axodrake
// The mouse line: its satiety never below HUNGRY_SATIETY as a child → cogsqueak, otherwise
// sirthimble; it wears one of Grandma's knitted hats (grandma.HATS) when it grows up → woolwhisk
export const HUNGRY_SATIETY = 25;
export const SNORBEAR_HONEYCOMBS = 3; // the bear line: honeycombs eaten as a child → snorbear, otherwise hivebear
export const URSASTRA_BOND = 5; // the bear line: bond hearts when it grows up (all of them) → ursastra
// The penguin line: it has learned the spin (its pirouette) when it grows up → glidepin, otherwise tuxwaddle
export const AURORAPIN_BEFORE_SUNRISE = 60; // the penguin line: it grows up this many minutes before sunrise or less → aurorapin
// The bat line: speed its highest battle stat when it grows up → batbeat, otherwise umbrabat; it
// grows up under a full moon at night → lunaflap
// The owl line: it grows up after dark under a clear sky → stargazer, otherwise owlbert
export const NINJOWL_CLEAN_BATTLES = 3; // the owl line: scuffles as a child without being knocked over once → ninjowl
export const HIDEWELL_GAMES = 7; // the chameleon line: games of hide and seek as a child → hidewell, otherwise palettino
// The chameleon line: it has a friend from the wild when it grows up (a guest from the garden doesn't count) → mirrorleon
export const CLOCKBEETLE_MINUTES = 5; // the scarab line: it grows up within this many minutes after a full hour → clockbeetle, otherwise solroll
export const PHARABUG_HEAT = 27; // the scarab line: °C or more when it grows up → pharabug
// The kite line: it has learned the dance when it grows up → lionkite, otherwise origrane; a
// thunderstorm when it grows up → stormkite
export const OCTAVIO_TRICKS = 3; // the octopus line: tricks it knows when it grows up → octavio, otherwise inkasso
export const ABYSSINK_SMARTS = 60; // the octopus line: its smarts (battle.SKILLS) when it grows up → abyssink
// The gargoyle line: it rains when it grows up → fountaingle, otherwise gargard; it grows up in the
// noon hour (BELLFRY_HOUR) → bellfry
export const BELLFRY_HOUR = 12;
export const CARDWING_TRICKS = 15; // the magpie line: tricks practiced or shown as a child → cardwing, otherwise glintrick
// the magpie line: a first place at the trick festival as a child → illusionna
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
  owlbert: { mood: 0.85 }, // there is always another book
  stargazer: { energy: 0.85 }, // it sleeps the day away and watches the sky at night
  ninjowl: { satiety: 0.85 }, // a ninja lives on little
  palettino: { hygiene: 1.15 }, // paint everywhere
  hidewell: { energy: 0.85 }, // it keeps still for hours
  mirrorleon: { hygiene: 0.8 }, // a mirror wipes clean
  solroll: { energy: 1.15 }, // always pushing
  clockbeetle: { energy: 0.85 }, // wound up, it keeps going
  pharabug: { satiety: 0.85 }, // used to the desert
  origrane: { hygiene: 0.85 }, // crisp, clean paper
  lionkite: { energy: 1.15 }, // dancing through the festival
  stormkite: { mood: 1.15 }, // as changeable as the weather
  inkasso: { hygiene: 1.15 }, // ink and paint everywhere
  octavio: { energy: 1.15 }, // eight arms to keep busy
  abyssink: { energy: 0.85 }, // it drifts in the deep and saves its strength
  gargard: { satiety: 0.85 }, // a stone guard lives on little
  fountaingle: { hygiene: 0.8 }, // it is rinsed all the time
  bellfry: { mood: 0.85 }, // it sings to itself
  glintrick: { mood: 0.85 }, // pleased with every trick of its own
  cardwing: { energy: 1.15 }, // shuffling its cards all day
  illusionna: { hygiene: 0.85 }, // a speck of dust and it makes it vanish
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
  owlbert: { play: 1.25 }, // a quiz is a game too
  stargazer: { heart: 1.25 }, // it wishes on every star for you
  ninjowl: { sick: 0.6 }, // nothing catches a ninja
  palettino: { play: 1.25 }, // anything can be painted
  hidewell: { play: 1.5 }, // hide and seek!
  mirrorleon: { heart: 1.5 }, // it grew out of a friendship
  solroll: { pet: 1.25 }, // its sun keeps it warm and cosy
  clockbeetle: { sick: 0.6 }, // well oiled
  pharabug: { sick: 0.6 }, // the sun keeps it healthy
  origrane: { heart: 1.25 }, // a folded crane brings luck
  lionkite: { play: 1.5 }, // a festival every day
  stormkite: { sick: 0.6 }, // nothing gets through storm paper
  inkasso: { play: 1.25 }, // a game is something to paint
  octavio: { play: 1.5 }, // anything to juggle with
  abyssink: { pet: 1.25 }, // soft and cool as the deep sea
  gargard: { sick: 0.6 }, // made of stone
  fountaingle: { pet: 1.25 }, // a cool splash when you stroke it
  bellfry: { heart: 1.25 }, // a heart makes it ring
  glintrick: { play: 1.25 }, // a game is a show
  cardwing: { heart: 1.25 }, // the queen of hearts
  illusionna: { sick: 0.6 }, // it makes the sniffles disappear
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
  return (DECAY_FACTORS[key(state)]?.[stat] ?? 1.0) * keepsake.factor(state, stat);
}

export function bonusFactor(state: PetState, kind: string): number {
  return (BONUS_FACTORS[key(state)]?.[kind] ?? 1.0) * keepsake.factor(state, kind);
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

/** A counted petting in a child's diary, and the days of its child stage with PURRLOOP_LOVE_PER_DAY of them. */
export function recordLove(state: PetState): void {
  if (state.stage !== "child") {
    return;
  }
  const diary = state.diary;
  const day = Math.floor((diary.minutes ?? 0) / 1440);
  if (diary.love_day !== day) {
    diary.love_day = day;
    diary.love_today = 0;
  }
  diary.love = (diary.love ?? 0) + 1;
  diary.love_today += 1;
  if (diary.love_today === PURRLOOP_LOVE_PER_DAY) {
    record(state, "love_days");
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
  /** The sky is clear (or nearly) right now. */
  clear?: boolean;
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
  /** whether it knows the spin, */
  spin?: boolean;
  /** whether it knows the dance, */
  dance?: boolean;
  /** whether it has a friend (a wild pet or a guest from the garden), */
  friend?: boolean;
  /** whether one of its friends is from the wild (not a guest from the garden), */
  wildFriend?: boolean;
  /** how many tricks it knows, */
  tricks?: number;
  /** its smarts (battle.SKILLS), */
  smarts?: number;
  /** its highest battle stat, */
  strongest?: string;
  /** a decoration that glows stands outside (home.GLOWING_DECO), */
  glowOutside?: boolean;
  /** the sandcastle from the coast stands outside, */
  sandcastle?: boolean;
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

/** What a rule for an adult form looks at: the child's diary, the moment it grows up, and the days its child stage lasts. */
interface Check {
  diary: Record<string, number>;
  world: World;
  days: number;
}

/**
 * A rule for an adult form: whether it holds, the picture of its hint in the choice (a thing of
 * app/src/icons.ts, or "sheet:tag"), and for a count what the child has and needs.
 */
export interface Rule {
  icon: string;
  ok: (check: Check) => boolean;
  count?: (check: Check) => readonly [number, number];
}

/** A count over the whole child stage, also what is done after it is due. */
function total(kind: string, icon: string, need: (check: Check) => number): Rule {
  const has = (c: Check) => c.diary[kind] ?? 0;
  return { icon, ok: (c) => has(c) >= need(c), count: (c) => [Math.min(has(c), need(c)), need(c)] };
}
/** "So often per day": a total for the days the child stage lasts. */
const perDay = (n: number) => (c: Check) => Math.ceil(n * c.days - 1e-9);
const times = (n: number) => () => n;
/** Something about the moment it grows up, or what it has come to by then. */
const moment = (icon: string, ok: (world: World) => boolean): Rule => ({ icon, ok: (c) => ok(c.world) });
/** A value of the moment it grows up against a goal. */
function reaches(icon: string, value: (world: World) => number, need: number): Rule {
  return { icon, ok: (c) => value(c.world) >= need, count: (c) => [Math.min(value(c.world), need), need] };
}
/** The fruit it ate most, and enough of it (FAVORITE_FRUITS). */
function favorite(kind: string, icon: string): Rule {
  const eaten = (c: Check, k: string) => c.diary[`food_fruit_${k}`] ?? 0;
  return {
    icon,
    ok: (c) => eaten(c, kind) >= FAVORITE_FRUITS && PLANT_KINDS.every((k) => k === kind || eaten(c, k) < eaten(c, kind)),
    count: (c) => [Math.min(eaten(c, kind), FAVORITE_FRUITS), FAVORITE_FRUITS],
  };
}
/** Never below a mark the whole child stage (the diary counts the minutes it was). */
const never = (kind: string, icon: string): Rule => ({ icon, ok: (c) => (c.diary.minutes ?? 0) > 0 && !c.diary[kind] });
const PLANT_KINDS = ["berry", "sunflower", "cherry", "herb"];

/** Well cared for this part of the time (gemperor). */
const CARED: Rule = {
  icon: "meal",
  ok: (c) => care(c.diary) >= GEMPEROR_CARE,
  count: (c) => [Math.min(Math.round(care(c.diary) * 100), GEMPEROR_CARE * 100), GEMPEROR_CARE * 100],
};
function care(diary: Record<string, number>): number {
  return diary.minutes ? (diary.good_minutes ?? 0) / diary.minutes : 1.0;
}

// The second form of each line and what it takes. It can be had any time once the home has had
// it; the line's other usual form needs nothing.
export const SECOND: Record<string, readonly [string, Rule]> = {
  blob: ["gemperor", CARED],
  ember: ["flarelet", total("plays", "ball", perDay(FLARELET_PLAYS_PER_DAY))],
  stone: ["glimmerock", moment("hint_moon", (w) => !!w.dark)], // its crystals light up at night
  fox: ["roamtail", total("trips", "backpack", perDay(ROAMTAIL_TRIPS_PER_DAY))],
  cloud: ["rumblefluff", moment("items:cloud", (w) => !!w.raining)],
  leaf: ["needlenub", total("love", "hint_heart", perDay(NEEDLENUB_LOVE_PER_DAY))],
  duck: ["drakwing", total("battles", "hint_sword", perDay(DRAKWING_BATTLES_PER_DAY))],
  hippo: ["steamo", total("baths", "sponge", perDay(STEAMO_BATHS_PER_DAY))],
  beak: ["rapierre", total("tricks", "baton", times(RAPIERRE_TRICKS))],
  caterpillar: ["sunflutter", favorite("sunflower", "fruit_sunflower")],
  dog: ["barrelbard", reaches("hint_heart", (w) => w.bond ?? 0, BARRELBARD_BOND)],
  dragonfly: ["jewelwing", total("baths", "sponge", times(JEWELWING_BATHS))],
  beaver: ["timberjack", moment("strength", (w) => w.strongest === "strength")],
  crab: ["lightclaw", moment("trip:lantern_lit", (w) => !!(w.dark && w.glowOutside))],
  axolotl: ["medilotl", never("weak_minutes", "medicine")],
  mouse: ["cogsqueak", never("hungry_minutes", "meal")],
  bear: ["snorbear", total("food_honeycomb", "honeycomb", times(SNORBEAR_HONEYCOMBS))],
  penguin: ["glidepin", moment("baton", (w) => !!w.spin)],
  bat: ["batbeat", moment("speed", (w) => w.strongest === "speed")],
  owl: ["stargazer", moment("trip:star_shard_lit", (w) => !!(w.dark && w.clear))],
  chameleon: ["hidewell", total("games", "hide", times(HIDEWELL_GAMES))],
  scarab: ["clockbeetle", moment("trip:hourglass", (w) => w.minute !== undefined && w.minute % 60 < CLOCKBEETLE_MINUTES)],
  kite: ["lionkite", moment("baton", (w) => !!w.dance)],
  octopus: ["octavio", reaches("baton", (w) => w.tricks ?? 0, OCTAVIO_TRICKS)],
  gargoyle: ["fountaingle", moment("items:cloud", (w) => !!w.raining)],
  magpie: ["cardwing", total("tricks", "baton", times(CARDWING_TRICKS))],
};

// The secret form of each line (the last of LINES): a feat or a rare moment, every time anew.
// It has no picture in the choice; only stories found here and there point the way.
const done = (kind: string, need: number) => total(kind, "", times(need));
export const SECRET: Record<string, Rule> = {
  blob: done("love_days", PURRLOOP_DAYS),
  ember: done("food_glowberry", SALAMBER_GLOWBERRIES),
  stone: moment("", (w) => !!(w.fullMoon && w.dark)),
  fox: done("trips_forest", FOXFIRE_FOREST_TRIPS),
  cloud: moment("", (w) => !!w.snowing),
  leaf: done("plant_fruits", SAKURIN_PLANT_FRUITS),
  duck: done("rain_trips", BUBBLEHELM_RAIN_TRIPS),
  hippo: done("tucked", HIPPULA_TUCKED),
  beak: done("guardians", ACEWING_GUARDIANS),
  caterpillar: favorite("cherry", ""),
  dog: done("festival_dance", 1),
  dragonfly: moment("", (w) => !!(w.afterRain && !w.raining && !w.dark)),
  beaver: moment("", (w) => !!w.houseBuilt),
  crab: moment("", (w) => !!w.sandcastle),
  axolotl: done("won_gloompeep", 1),
  mouse: moment("", (w) => !!w.grandmaHat),
  bear: moment("", (w) => (w.bond ?? 0) >= URSASTRA_BOND),
  penguin: moment("", beforeSunrise),
  bat: moment("", (w) => !!(w.fullMoon && w.dark)),
  owl: done("clean_battles", NINJOWL_CLEAN_BATTLES),
  chameleon: moment("", (w) => !!w.wildFriend),
  scarab: moment("", (w) => (w.temp ?? -Infinity) >= PHARABUG_HEAT),
  kite: moment("", (w) => !!w.storm),
  octopus: moment("", (w) => (w.smarts ?? 0) >= ABYSSINK_SMARTS),
  gargoyle: moment("", (w) => w.minute !== undefined && Math.floor(w.minute / 60) === BELLFRY_HOUR),
  magpie: done("festival_wins", 1),
};

/** The line's usual form that needs nothing. */
export function baseForm(line: string): string {
  return LINES[line].find((form) => form !== SECOND[line][0] && form !== LINES[line][2])!;
}

/**
 * The adult form the care diary and the world lead to by themselves: the secret form if its rule
 * holds, else the second if its rule does, else the base. What a player picks (choices) goes
 * before this; it is what an older app gets that doesn't let the player choose.
 *
 * A rule "so often per day" is a total for the days the child stage lasts (`stageDays`); what the
 * child does after that, while the player waits with growing up, counts too.
 */
export function decideSpecies(diary: Record<string, number>, line = "blob", world: World = {},
    stageDays = STAGE_SECONDS.child! / 86400): string {
  const check = { diary, world, days: stageDays };
  if (SECRET[line].ok(check)) {
    return LINES[line][2];
  }
  return SECOND[line][1].ok(check) ? SECOND[line][0] : baseForm(line);
}

/** One adult form in the choice when a child grows up (choices). */
export interface Choice {
  /** The form; null while it is still a "?" (nothing is given away). */
  form: string | null;
  kind: "base" | "second" | "secret";
  /** It can be picked now. */
  ready: boolean;
  /** The hint: its picture, and for a count what the child has and needs. */
  hint: { icon: string; has?: number; needs?: number } | null;
}

/**
 * The three adult forms to choose from when a child grows up. `had`: the forms the home has had
 * (the album, "stage:species").
 *
 * - The base form can always be picked.
 * - The second form can be picked once its rule holds, or any time once the home has had it. Until
 *   then it is a "?"; once the home has had an adult of the line, the "?" shows the rule's picture.
 * - The secret form can be picked only while its rule holds, every time. Until the home has had it,
 *   it is a "?" without a hint as long as it can't be picked.
 */
export function choices(state: PetState, world: World, had: readonly string[]): Choice[] {
  const line = lineOf(state.species);
  const check = { diary: state.diary, world, days: childDays(state) };
  const ever = (form: string) => had.includes(`adult:${form}`);
  const [second, rule] = SECOND[line];
  const secondReady = rule.ok(check) || ever(second);
  const secret = LINES[line][2];
  const secretReady = SECRET[line].ok(check);
  const hint = (r: Rule) => {
    const count = r.count?.(check);
    return { icon: r.icon, ...count && { has: count[0], needs: count[1] } };
  };
  const lineHad = LINES[line].some(ever);
  return [
    { form: baseForm(line), kind: "base", ready: true, hint: null },
    {
      form: secondReady ? second : null, kind: "second", ready: secondReady,
      hint: !secondReady && lineHad ? hint(rule) : null,
    },
    { form: secretReady || ever(secret) ? secret : null, kind: "secret", ready: secretReady, hint: null },
  ];
}

/**
 * The adult form a child's lure shows it heading for right now (null in its first day and at
 * other stages): the second form once its rule holds, else the base. Never the secret one.
 * `world`: the weather and the time of day right now.
 */
export function hint(state: PetState, world: World = {}): string | null {
  if (state.stage !== "child" || (state.diary.minutes ?? 0) < HINT_AFTER) {
    return null;
  }
  const line = lineOf(state.species);
  const [second, rule] = SECOND[line];
  return rule.ok({ diary: state.diary, world, days: childDays(state) }) ? second : baseForm(line);
}

/**
 * Next stage. Returns the old form as "stage:species" (for the animation). `world`: the weather
 * and the time of day right now; `form`: the adult form picked (choices), else the one
 * decideSpecies leads to.
 */
export function evolve(state: PetState, now: number, world: World = {}, form: string | null = null): string {
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
    state.species = form ?? decideSpecies(state.diary, lineOf(state.species), world, childDays(state));
  }
  state.stage = next;
  state.stage_since = now;
  state.egg_warmth = 0.0;
  return old;
}
