// The life cycle: egg, baby, child, and what decides the adult.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import * as food from "../src/food";
import * as home from "../src/home";
import * as life from "../src/life";
import * as model from "../src/model";
import { type PetState } from "../src/state";
import { BEDTIME, act, at, near } from "./helpers";

let start: number;
let pet: PetState;

beforeEach(() => {
  start = at("2026-10-12 08:00");
  pet = model.newPet(start);
});

test("egg only takes warmth", () => {
  assert.equal(pet.stage, "egg");
  assert.deepEqual(act(pet, "feed", start, { item: "meal" }), [false, "egg"]);
  assert.deepEqual(act(pet, "evolve", start), [false, "not_ready"]);
  const stats = { ...pet.stats };
  model.advance(pet, start + 1800, BEDTIME);
  assert.deepEqual(pet.stats, stats); // nothing decays inside the egg
  for (let i = 0; i < 2; i++) { // warming it twice = 30 min sooner
    assert.equal(act(pet, "pet", start + 1800 + i)[0], true);
  }
  assert.equal(model.availableActions(pet, start + 1800).evolve, true);
});

test("hatch by hand", () => {
  const hatch = start + 3600;
  assert.equal(act(pet, "evolve", hatch)[0], true);
  assert.deepEqual([pet.stage, pet.born_at], ["baby", hatch]);
  assert.equal(model.activityOf(pet, hatch + 1), "hatch");
  assert.equal(pet.activity_item, "egg:blob");
  assert.equal(pet.events.at(-1)!.item, "baby:blob");
});

test("hatches by itself after a day", () => {
  model.advance(pet, start + 3600 + 23 * 3600, BEDTIME);
  assert.equal(pet.stage, "egg");
  model.advance(pet, start + 3600 + 24 * 3600 + 60, BEDTIME);
  assert.equal(pet.stage, "baby");
  assert.equal(pet.events.at(-1)!.by, "system");
});

test("baby gets hungry faster", () => {
  model.advance(pet, start + 3600, BEDTIME); // like Pet.action: catch up to now first
  act(pet, "evolve", start + 3600);
  const before = pet.stats.satiety;
  model.advance(pet, start + 3600 + 2 * 3600, BEDTIME);
  near(before - pet.stats.satiety, 2 * 5 * 1.3, 0.1);
});

test("baby becomes child after three days", () => {
  act(pet, "evolve", start + 3600);
  pet.stage_since = start; // simpler numbers
  assert.deepEqual(act(pet, "evolve", start + 2 * 86400), [false, "not_ready"]);
  assert.equal(act(pet, "evolve", at("2026-10-15 09:00"))[0], true);
  assert.equal(pet.stage, "child");
  assert.equal(pet.diary.minutes, 0);
});

test("no evolution while asleep", () => {
  pet.stage = "child";
  pet.stage_since = start - 7 * 86400;
  pet.asleep = true;
  assert.deepEqual(act(pet, "evolve", start), [false, "asleep"]);
});

test("diary decides the adult", () => {
  const cases: [Record<string, number>, string][] = [
    [{ minutes: 10080, good_minutes: 4000 }, "angloop"],
    [{ minutes: 10080, good_minutes: 4000, love: 60, love_days: 7 }, "purrloop"], // petted every day: wins even without the rest
    [{ minutes: 10080, good_minutes: 9500, love: 60, love_days: 7, plays: 30 }, "purrloop"],
    [{ minutes: 10080, good_minutes: 9500, love: 80, love_days: 6, plays: 30 }, "gemperor"], // a day short
    [{ minutes: 10080, good_minutes: 9500, plays: 10 }, "gemperor"],
    [{ minutes: 10080, good_minutes: 7000, plays: 10 }, "angloop"],
  ];
  for (const [diary, species] of cases) {
    assert.equal(life.decideSpecies({ ...life.newDiary(), ...diary }), species);
  }
});

test("lure hints at the adult after a day", () => {
  assert.equal(life.hint(pet), null); // an egg
  pet.stage = "child";
  pet.diary = { ...life.newDiary(), minutes: 600, good_minutes: 600, plays: 5 };
  assert.equal(life.hint(pet), null);
  Object.assign(pet.diary, { minutes: 2880, good_minutes: 2800, plays: 8 });
  assert.equal(life.hint(pet), "gemperor");
  pet.diary.good_minutes = 2000;
  assert.equal(life.hint(pet), "angloop");
  pet.stage = "adult";
  assert.equal(life.hint(pet), null);
});

test("a rare egg grows up in its own line", () => {
  const ember = model.newPet(start, "", "ember");
  assert.deepEqual(["blob", "lumoth", "ember", "flarelet"].map(life.lineOf), ["blob", "blob", "ember", "ember"]);
  assert.equal(act(ember, "evolve", start + 3600)[0], true);
  assert.deepEqual([ember.stage, ember.species, ember.activity_item], ["baby", "ember", "egg:ember"]);
  ember.stage = "child";
  ember.stage_since = start;
  ember.diary = { ...life.newDiary(), minutes: 2880, good_minutes: 1000, plays: 2, love: 40 };
  assert.equal(life.hint(ember), "lanternling"); // the slime's rules don't count for it
  ember.diary.plays = 17;
  assert.equal(life.hint(ember), "lanternling"); // 2.5 a day for the seven days
  ember.diary.plays = 18;
  assert.equal(life.hint(ember), "flarelet");
  assert.equal(act(ember, "evolve", start + 7 * 86400)[0], true);
  assert.deepEqual([ember.stage, ember.species], ["adult", "flarelet"]);
  assert.equal(life.decayFactor(ember, "satiety"), 1.25);
  for (const species of life.SPECIES) {
    assert.ok(species in food.TASTES, species);
  }
});

test("a pebble that grows up at night grows up glowing", () => {
  const stone = model.newPet(start, "", "stone");
  assert.deepEqual(["stone", "glimmerock", "bouldergrin"].map(life.lineOf), ["stone", "stone", "stone"]);
  stone.stage = "child";
  stone.stage_since = start;
  stone.diary = { ...life.newDiary(), minutes: 2880, good_minutes: 2880, plays: 10, love: 40 };
  assert.equal(life.hint(stone), "bouldergrin"); // in daylight, however much it was petted
  assert.equal(life.hint(stone, { dark: true }), "glimmerock");
  const day = structuredClone(stone);
  assert.equal(act(day, "evolve", at("2026-10-19 13:00"))[0], true);
  assert.deepEqual([day.stage, day.species], ["adult", "bouldergrin"]);
  // after sunset, before bedtime (or woken at night): the crystals come out
  assert.equal(act(stone, "evolve", at("2026-10-19 21:00"))[0], true);
  assert.deepEqual([stone.stage, stone.species], ["adult", "glimmerock"]);
  assert.equal(life.bonusFactor(stone, "pet"), 1.5);
});

test("a fox cub that travels a lot grows up a wanderer", () => {
  const fox = model.newPet(start, "", "fox");
  assert.deepEqual(["fox", "roamtail", "filchfox"].map(life.lineOf), ["fox", "fox", "fox"]);
  fox.stage = "child";
  fox.stage_since = start;
  fox.diary = { ...life.newDiary(), minutes: 2880, good_minutes: 2880, plays: 10, love: 20, trips: 1 };
  assert.equal(life.hint(fox), "filchfox"); // well cared for, played with and petted, but hardly out
  fox.diary.trips = 7 * life.ROAMTAIL_TRIPS_PER_DAY;
  assert.equal(life.hint(fox), "roamtail");
  assert.equal(act(fox, "evolve", start + 7 * 86400)[0], true);
  assert.deepEqual([fox.stage, fox.species], ["adult", "roamtail"]);
  assert.equal(life.decayFactor(fox, "energy"), 0.85);
  assert.equal(life.decideSpecies({ ...life.newDiary(), minutes: 10080 }, "fox"), "filchfox");
});

test("a cloud lamb that grows up in the rain becomes a thundercloud", () => {
  const cloud = model.newPet(start, "", "cloud");
  assert.deepEqual(["cloud", "rumblefluff", "prismist"].map(life.lineOf), ["cloud", "cloud", "cloud"]);
  cloud.stage = "child";
  cloud.stage_since = start;
  cloud.diary = { ...life.newDiary(), minutes: 2880, good_minutes: 2880 };
  assert.equal(life.hint(cloud), "prismist"); // the sun is out
  assert.equal(life.hint(cloud, { raining: true }), "rumblefluff"); // it rains right now
  const sunny = structuredClone(cloud);
  assert.equal(act(sunny, "evolve", start + 7 * 86400)[0], true);
  assert.deepEqual([sunny.stage, sunny.species], ["adult", "prismist"]);
  assert.equal(model.applyAction(cloud, "evolve", start + 7 * 86400, BEDTIME, { weather: 63 }).accepted, true);
  assert.deepEqual([cloud.stage, cloud.species], ["adult", "rumblefluff"]);
  assert.equal(life.decayFactor(cloud, "mood"), 0.85);
  assert.equal(life.decideSpecies({ ...life.newDiary(), minutes: 10080 }, "cloud", { raining: true }), "rumblefluff");
});

test("a rule per day is a total for the child stage, and what it does while it waits counts too", () => {
  const goal = 7 * life.NEEDLENUB_LOVE_PER_DAY;
  // a day away: made up on the others
  assert.equal(life.decideSpecies({ ...life.newDiary(), minutes: 10080, love: goal }, "leaf"), "needlenub");
  // half the stage, half the goal: not yet
  assert.equal(life.decideSpecies({ ...life.newDiary(), minutes: 5040, love: goal / 2 }, "leaf"), "twiggle");
  // waiting to be asked doesn't raise the goal, and what it does meanwhile counts
  assert.equal(life.decideSpecies({ ...life.newDiary(), minutes: 10080, love: goal - 1 }, "leaf"), "twiggle");
  assert.equal(life.decideSpecies({ ...life.newDiary(), minutes: 10080 + 1440, love: goal }, "leaf"), "needlenub");
  // the ember stone shortens the stage, and the goal with it
  const leaf = model.newPet(start, "", "leaf");
  leaf.stage = "child";
  leaf.diary = { ...life.newDiary(), minutes: 8640, love: 5 * life.NEEDLENUB_LOVE_PER_DAY };
  assert.equal(life.hint(leaf), "twiggle");
  leaf.egg_warmth = 2 * 86400;
  assert.equal(life.hint(leaf), "needlenub");
});

test("the leaf, duck, hippo and beak lines grow up by what the child did most", () => {
  const week = { ...life.newDiary(), minutes: 10080, good_minutes: 10080 };
  const cases: [string, string, string, string][] = [
    ["leaf", "love", "needlenub", "twiggle"], ["duck", "battles", "drakwing", "quill"],
    ["hippo", "baths", "steamo", "lillypot"], ["beak", "tricks", "rapierre", "parcelbeak"],
  ];
  for (const [line, kind, often, otherwise] of cases) {
    assert.deepEqual(life.LINES[line].map(life.lineOf), [line, line, line]);
    assert.equal(life.decideSpecies({ ...week, [kind]: 7 * 6 }, line), often);
    assert.equal(life.decideSpecies({ ...week, [kind]: 2 }, line), otherwise);
  }
  // bathing and practicing a trick go into the child's diary
  const hippo = model.newPet(start, "", "hippo");
  Object.assign(hippo, { stage: "child", stage_since: start, diary: life.newDiary(), poops: 1 });
  assert.equal(act(hippo, "clean", start + 600)[0], true);
  assert.equal(hippo.diary.baths, 1);
  assert.equal(act(hippo, "trick", start + 700, { item: "bow" })[0], true);
  assert.equal(hippo.diary.tricks, 1);
});

test("a rare deed or moment makes the special form, and its rule goes first", () => {
  const week = { ...life.newDiary(), minutes: 10080, good_minutes: 10080, plays: 100, trips: 100, love: 100, battles: 100,
    baths: 100, tricks: 100 };
  const cases: [string, Record<string, number>, life.World, string][] = [
    ["ember", { food_glowberry: life.SALAMBER_GLOWBERRIES }, {}, "salamber"],
    ["stone", {}, { dark: true, fullMoon: true }, "lunarock"],
    ["fox", { trips_forest: life.FOXFIRE_FOREST_TRIPS }, {}, "foxfire"],
    ["cloud", {}, { snowing: true, raining: true }, "flurrbleat"],
    ["leaf", { plant_fruits: life.SAKURIN_PLANT_FRUITS }, {}, "sakurin"],
    ["duck", { rain_trips: life.BUBBLEHELM_RAIN_TRIPS }, {}, "bubblehelm"],
    ["hippo", { tucked: life.HIPPULA_TUCKED }, {}, "hippula"],
    ["beak", { guardians: life.ACEWING_GUARDIANS }, {}, "acewing"],
  ];
  for (const [line, deed, world, special] of cases) {
    assert.equal(life.LINES[line][2], special);
    assert.equal(life.decideSpecies({ ...week, ...deed }, line, world), special);
    // one short of it, or the moment not quite right: one of the other two
    const short = Object.fromEntries(Object.entries(deed).map(([kind, n]) => [kind, n - 1]));
    const almost = { ...world, fullMoon: false, snowing: false };
    assert.notEqual(life.decideSpecies({ ...week, ...short }, line, almost), special);
  }
  // under a full moon by day, the stone stays a stone
  assert.equal(life.decideSpecies(week, "stone", { fullMoon: true }), "bouldergrin");
});

test("the bear, penguin and bat lines grow up by what they ate, where they went and how they fight", () => {
  const week = { ...life.newDiary(), minutes: 10080, good_minutes: 10080 };
  // the bear: honey as a child makes a sleepy Snorbear, five bond hearts the star bear
  assert.equal(life.decideSpecies(week, "bear"), "hivebear");
  assert.equal(life.decideSpecies({ ...week, food_honeycomb: life.SNORBEAR_HONEYCOMBS - 1 }, "bear"), "hivebear");
  assert.equal(life.decideSpecies({ ...week, food_honeycomb: life.SNORBEAR_HONEYCOMBS }, "bear"), "snorbear");
  assert.equal(life.decideSpecies({ ...week, food_honeycomb: 9 }, "bear", { bond: life.URSASTRA_BOND }), "ursastra");
  assert.equal(life.decideSpecies(week, "bear", { bond: life.URSASTRA_BOND - 1 }), "hivebear");
  // the penguin: the spin learned makes a Glidepin, the last hour before sunrise the aurora
  assert.equal(life.decideSpecies(week, "penguin"), "tuxwaddle");
  assert.equal(life.decideSpecies(week, "penguin", { spin: true }), "glidepin");
  const sunrise = 7 * 60;
  assert.equal(life.decideSpecies(week, "penguin", { minute: sunrise - 30, sunrise }), "aurorapin");
  assert.equal(life.decideSpecies(week, "penguin", { minute: sunrise - life.AURORAPIN_BEFORE_SUNRISE, sunrise }), "aurorapin");
  assert.equal(life.decideSpecies(week, "penguin", { minute: sunrise - life.AURORAPIN_BEFORE_SUNRISE - 1, sunrise }), "tuxwaddle");
  assert.equal(life.decideSpecies(week, "penguin", { minute: sunrise, sunrise }), "tuxwaddle"); // the sun is up
  // the bat: speed as its highest battle stat makes a Batbeat, a full-moon night Lunaflap
  assert.equal(life.decideSpecies(week, "bat"), "umbrabat");
  assert.equal(life.decideSpecies(week, "bat", { strongest: "speed" }), "batbeat");
  assert.equal(life.decideSpecies(week, "bat", { strongest: "attack" }), "umbrabat");
  assert.equal(life.decideSpecies(week, "bat", { strongest: "speed", dark: true, fullMoon: true }), "lunaflap");
  assert.equal(life.decideSpecies(week, "bat", { fullMoon: true }), "umbrabat"); // a full moon by day
  for (const line of ["bear", "penguin", "bat"]) {
    assert.ok(life.LINES[line].every((adult) => food.TASTES[adult]?.length === 2), line);
  }
});

test("the owl, chameleon, scarab and kite lines grow up by the sky, games, the clock and the weather", () => {
  const week = { ...life.newDiary(), minutes: 10080, good_minutes: 10080 };
  // the owl: a clear night sky makes a Stargazer, clean scuffles the Ninjowl
  assert.equal(life.decideSpecies(week, "owl"), "owlbert");
  assert.equal(life.decideSpecies(week, "owl", { dark: true, clear: true }), "stargazer");
  assert.equal(life.decideSpecies(week, "owl", { dark: true, clear: false }), "owlbert"); // clouds
  assert.equal(life.decideSpecies(week, "owl", { dark: false, clear: true }), "owlbert"); // by day
  assert.equal(life.decideSpecies({ ...week, clean_battles: life.NINJOWL_CLEAN_BATTLES - 1 }, "owl"), "owlbert");
  assert.equal(life.decideSpecies({ ...week, clean_battles: life.NINJOWL_CLEAN_BATTLES }, "owl",
    { dark: true, clear: true }), "ninjowl");
  // the chameleon: hide and seek makes a Hidewell, a friend the Mirrorleon
  assert.equal(life.decideSpecies(week, "chameleon"), "palettino");
  assert.equal(life.decideSpecies({ ...week, games: life.HIDEWELL_GAMES - 1 }, "chameleon"), "palettino");
  assert.equal(life.decideSpecies({ ...week, games: life.HIDEWELL_GAMES }, "chameleon"), "hidewell");
  assert.equal(life.decideSpecies({ ...week, games: life.HIDEWELL_GAMES }, "chameleon", { friend: true }), "hidewell"); // a guest from the garden
  assert.equal(life.decideSpecies({ ...week, games: life.HIDEWELL_GAMES }, "chameleon", { friend: true, wildFriend: true }), "mirrorleon");
  // the scarab: just after a full hour makes a Clockbeetle, the heat the Pharabug
  assert.equal(life.decideSpecies(week, "scarab", { minute: 14 * 60 + 30 }), "solroll");
  assert.equal(life.decideSpecies(week, "scarab", { minute: 14 * 60 }), "clockbeetle");
  assert.equal(life.decideSpecies(week, "scarab", { minute: 14 * 60 + life.CLOCKBEETLE_MINUTES - 1 }), "clockbeetle");
  assert.equal(life.decideSpecies(week, "scarab", { minute: 14 * 60 + life.CLOCKBEETLE_MINUTES }), "solroll");
  assert.equal(life.decideSpecies(week, "scarab"), "solroll"); // no clock
  assert.equal(life.decideSpecies(week, "scarab", { temp: life.PHARABUG_HEAT }), "pharabug");
  assert.equal(life.decideSpecies(week, "scarab", { temp: life.PHARABUG_HEAT - 1 }), "solroll");
  assert.equal(life.decideSpecies(week, "scarab", { temp: null }), "solroll"); // no weather data
  // the kite: the dance makes a Lionkite, a thunderstorm the Stormkite
  assert.equal(life.decideSpecies(week, "kite"), "origrane");
  assert.equal(life.decideSpecies(week, "kite", { dance: true }), "lionkite");
  assert.equal(life.decideSpecies(week, "kite", { dance: true, storm: true }), "stormkite");
  for (const line of ["owl", "chameleon", "scarab", "kite"]) {
    assert.ok(life.LINES[line].every((adult) => food.TASTES[adult]?.length === 2), line);
    assert.ok(food.TASTES[line], line);
  }
});

test("the world says whether the sky is clear, and the pet whether it knows the dance and has a friend", () => {
  const pet = model.newPet(start, "", "kite");
  assert.equal(model.worldAt(start, 0, null, null, pet).clear, true);
  assert.equal(model.worldAt(start, 1, null, null, pet).clear, true);
  assert.equal(model.worldAt(start, 3, null, null, pet).clear, false);
  assert.equal(model.worldAt(start, null, null, null, pet).clear, false);
  assert.equal(model.worldAt(start, null, null, null, pet).dance, false);
  assert.equal(model.worldAt(start, null, null, null, pet).friend, false);
  pet.friends.push({ species: "mothmuff", visits: 0, next: start, guest: true });
  assert.equal(model.worldAt(start, null, null, null, pet).friend, true);
});

test("the octopus and gargoyle lines grow up by tricks, smarts, the rain and the noon bell", () => {
  const week = { ...life.newDiary(), minutes: 10080, good_minutes: 10080 };
  // the octopus: tricks make an Octavio, smarts the Abyssink
  assert.equal(life.decideSpecies(week, "octopus"), "inkasso");
  assert.equal(life.decideSpecies(week, "octopus", { tricks: life.OCTAVIO_TRICKS - 1 }), "inkasso");
  assert.equal(life.decideSpecies(week, "octopus", { tricks: life.OCTAVIO_TRICKS }), "octavio");
  assert.equal(life.decideSpecies(week, "octopus", { smarts: life.ABYSSINK_SMARTS - 1 }), "inkasso");
  assert.equal(life.decideSpecies(week, "octopus", { tricks: life.OCTAVIO_TRICKS, smarts: life.ABYSSINK_SMARTS }),
    "abyssink");
  // the gargoyle: rain makes a Fountaingle, the noon hour the Bellfry
  assert.equal(life.decideSpecies(week, "gargoyle"), "gargard");
  assert.equal(life.decideSpecies(week, "gargoyle", { raining: true }), "fountaingle");
  assert.equal(life.decideSpecies(week, "gargoyle", { minute: life.BELLFRY_HOUR * 60 - 1 }), "gargard");
  assert.equal(life.decideSpecies(week, "gargoyle", { minute: life.BELLFRY_HOUR * 60, raining: true }), "bellfry");
  assert.equal(life.decideSpecies(week, "gargoyle", { minute: life.BELLFRY_HOUR * 60 + 59 }), "bellfry");
  assert.equal(life.decideSpecies(week, "gargoyle", { minute: life.BELLFRY_HOUR * 60 + 60 }), "gargard");
  for (const line of ["octopus", "gargoyle"]) {
    assert.ok(life.LINES[line].every((adult) => food.TASTES[adult]?.length === 2), line);
    assert.ok(food.TASTES[line], line);
  }
});

test("the magpie line grows up by its tricks and the trick festival", () => {
  const week = { ...life.newDiary(), minutes: 10080, good_minutes: 10080 };
  assert.equal(life.decideSpecies(week, "magpie"), "glintrick");
  assert.equal(life.decideSpecies({ ...week, tricks: life.CARDWING_TRICKS - 1 }, "magpie"), "glintrick");
  assert.equal(life.decideSpecies({ ...week, tricks: life.CARDWING_TRICKS }, "magpie"), "cardwing");
  assert.equal(life.decideSpecies({ ...week, festival_wins: 1 }, "magpie"), "illusionna");
  assert.ok(life.LINES.magpie.every((adult) => food.TASTES[adult]?.length === 2));
  // a first place counts for the child only
  const pet = model.newPet(start, "", "magpie");
  pet.stage = "child";
  life.record(pet, "festival_wins");
  assert.equal(pet.diary.festival_wins, 1);
  pet.stage = "adult";
  life.record(pet, "festival_wins");
  assert.equal(pet.diary.festival_wins, 1);
});

test("the world says how many tricks the pet knows and how smart it is", () => {
  const pet = model.newPet(start, "", "octopus");
  assert.equal(model.worldAt(start, null, null, null, pet).tricks, 0);
  assert.equal(model.worldAt(start, null, null, null, pet).smarts, 0);
  for (const trick of ["bow", "spin", "dance"]) {
    pet.tricks[trick] = 1000;
  }
  pet.skills.smarts = 70;
  assert.equal(model.worldAt(start, null, null, null, pet).tricks, 3);
  assert.equal(model.worldAt(start, null, null, null, pet).smarts, 70);
});

test("the snow globe makes it snow for the cloud line", () => {
  const cloud = model.newPet(start, "", "cloud");
  assert.equal(model.worldAt(start, null, null, null, cloud).snowing, false);
  cloud.items.snowglobe = 1;
  cloud.deco.push("snowglobe");
  assert.equal(model.worldAt(start, null, null, null, cloud).snowing, true);
  assert.deepEqual(home.effects("snowglobe"), ["snow"]);
});

test("a fruit and its seed tell what the fruit fills", () => {
  assert.deepEqual(home.effects("fruit_berry"), ["satiety"]);
  assert.deepEqual(home.effects("seed_herb"), ["health", "cure"]);
});

test("child keeps a diary and grows up", () => {
  pet.stage = "child";
  pet.stage_since = start;
  for (let day = 0; day < 7; day++) {
    const t = start + day * 86400;
    for (const hour of [0, 4, 10]) {
      act(pet, "play", t + hour * 3600 + 60);
      act(pet, "feed", t + hour * 3600 + 120, { item: "meal" });
      act(pet, "clean", t + hour * 3600 + 180);
    }
    model.advance(pet, t + 86400 - 60, BEDTIME);
  }
  assert.ok(pet.diary.minutes > 10000);
  assert.equal(pet.diary.plays, 21);
  assert.equal(act(pet, "evolve", start + 7 * 86400 + 600)[0], true);
  assert.deepEqual([pet.stage, pet.species], ["adult", "angloop"]); // played with, but hungry at night
  assert.equal(life.dueAt(pet), null);
  assert.deepEqual(act(pet, "evolve", start + 8 * 86400), [false, "not_ready"]);
});

test("every form is in the album once, and a pet has been the ones on its way", () => {
  assert.equal(new Set(life.FORMS).size, life.FORMS.length);
  assert.equal(life.FORMS.length, Object.values(life.LINES).reduce((n, adults) => n + 3 + adults.length, 0));
  assert.deepEqual(life.formsOf("egg", "blob"), ["egg:blob"]);
  assert.deepEqual(life.formsOf("child", "stone"), ["egg:stone", "baby:stone", "child:stone"]);
  assert.deepEqual(life.formsOf("adult", "flarelet"), ["egg:ember", "baby:ember", "child:ember", "adult:flarelet"]);
  assert.deepEqual(life.formsOf("ghost", "blob"), []);
});

test("the diary and the world have what later rules may look at", () => {
  pet.stage = "child";
  pet.stage_since = start;
  pet.stats.health = 50;
  model.advance(pet, start + 600, BEDTIME);
  assert.ok(pet.diary.weak_minutes >= 9); // minutes with its health low
  assert.equal(act(pet, "sleep", at("2026-10-12 23:10"))[0], true);
  assert.equal(pet.diary.tucked, 1); // tucked in at bedtime

  const vienna = [48.21, 16.37] as const;
  const night = model.worldAt(at("2026-10-26 01:30"), 95, vienna, 12);
  assert.deepEqual([night.raining, night.storm, night.snowing, night.dark, night.fullMoon, night.temp, night.minute],
    [true, true, false, true, true, 12, 90]);
  assert.ok(night.sunrise! > 5 * 60 && night.sunset! < 18 * 60);
  const day = model.worldAt(at("2026-10-18 12:00"), 71, vienna);
  assert.deepEqual([day.raining, day.snowing, day.dark, day.fullMoon, day.temp], [false, true, false, false, null]);
});

test("a grown child waits to be asked, and grows into the form picked", () => {
  pet.species = "leaf";
  pet.stage = "child";
  pet.stage_since = start - 9 * 86400; // due for two days
  pet.diary = { ...life.newDiary(), minutes: 10080, good_minutes: 10080 };
  // awake and at home all day: still a child (a baby would have grown up)
  const now = start + 8 * 3600;
  model.advance(pet, now, BEDTIME);
  assert.equal(pet.stage, "child");
  // nothing done for the second form yet: only the base can be picked
  assert.deepEqual(act(pet, "evolve", now, { item: "needlenub" }), [false, "form_not_ready"]);
  assert.deepEqual(act(pet, "evolve", now, { item: "sakurin" }), [false, "form_not_ready"]);
  // once the home has had it, it can be picked whatever this child did
  assert.equal(act(structuredClone(pet), "evolve", now, { item: "needlenub", had: ["adult:needlenub"] })[0], true);
  pet.diary.love = 7 * life.NEEDLENUB_LOVE_PER_DAY;
  const second = structuredClone(pet);
  assert.equal(act(second, "evolve", now, { item: "needlenub" })[0], true);
  assert.equal(second.species, "needlenub");
  // and the base is always there, whatever it did
  assert.equal(act(pet, "evolve", now, { item: "twiggle" })[0], true);
  assert.deepEqual([pet.stage, pet.species], ["adult", "twiggle"]);
});

test("the choice gives away only what the home has found out", () => {
  const child = model.newPet(start, "", "stone");
  child.stage = "child";
  child.diary = { ...life.newDiary(), minutes: 10080, good_minutes: 10080 };
  const pick = (world: life.World, had: string[] = []) =>
    life.choices(child, world, had).map((c) => [c.form, c.ready, c.hint?.icon ?? null]);
  // the first child of a line: the base, and a "?" for the others
  assert.deepEqual(pick({}), [["bouldergrin", true, null], [null, false, null], [null, false, null]]);
  // the second form shows once its rule holds (at night)
  assert.deepEqual(pick({ dark: true }), [["bouldergrin", true, null], ["glimmerock", true, null], [null, false, null]]);
  // once the home has had an adult of the line, the "?" shows the rule's picture
  assert.deepEqual(pick({}, ["adult:bouldergrin"]), [["bouldergrin", true, null], [null, false, "hint_moon"], [null, false, null]]);
  // the secret form only ever when its moment is there, and never with a hint
  assert.deepEqual(pick({ dark: true, fullMoon: true }, ["adult:bouldergrin", "adult:glimmerock"]),
    [["bouldergrin", true, null], ["glimmerock", true, null], ["lunarock", true, null]]);
  assert.deepEqual(pick({}, ["adult:bouldergrin", "adult:glimmerock", "adult:lunarock"]),
    [["bouldergrin", true, null], ["glimmerock", true, null], ["lunarock", false, null]]);
  // a count shows how far the child is
  const leaf = model.newPet(start, "", "leaf");
  leaf.stage = "child";
  leaf.diary = { ...life.newDiary(), minutes: 10080, love: 12 };
  assert.deepEqual(life.choices(leaf, {}, ["adult:twiggle"])[1].hint, { icon: "hint_heart", has: 12, needs: 35 });
  // its lure shows the second form once it holds, never the secret one
  child.stage_since = start;
  assert.equal(life.hint(child, { dark: true, fullMoon: true }), "glimmerock");
});

test("rules for the secret forms that are feats: days of petting, the dance at the festival", () => {
  const cat = model.newPet(start, "", "blob");
  cat.stage = "child";
  cat.diary = life.newDiary();
  for (let day = 0; day < 3; day++) {
    for (let i = 0; i < life.PURRLOOP_LOVE_PER_DAY + 2; i++) {
      life.recordLove(cat);
    }
    cat.diary.minutes += 1440;
  }
  assert.deepEqual([cat.diary.love, cat.diary.love_days], [30, 3]);
  // a known trick, shown, counts too, but not more often than SHOWN_COUNTS_EVERY
  const beak = model.newPet(start, "", "beak");
  beak.stage = "child";
  beak.tricks.bow = 99;
  act(beak, "trick", start, { item: "bow" });
  act(beak, "trick", start + 60, { item: "bow" });
  act(beak, "trick", start + model.SHOWN_COUNTS_EVERY, { item: "bow" });
  assert.equal(beak.diary.tricks, 2);
});

test("a decoration brings the moon, the storm or the heat for growing up", () => {
  for (const [item, key] of [["moonlantern", "fullMoon"], ["stormbottle", "storm"]] as const) {
    const p = model.newPet(start);
    assert.equal(model.worldAt(at("2026-10-14 12:00"), null, null, null, p)[key], false);
    p.items[item] = 1;
    home.toggleDeco(p, item);
    assert.equal(model.worldAt(at("2026-10-14 12:00"), null, null, null, p)[key], true);
  }
  const p = model.newPet(start);
  p.items.sunstone = 1;
  home.toggleDeco(p, "sunstone");
  assert.ok(model.worldAt(start, null, null, 5, p).temp! >= life.PHARABUG_HEAT);
});
