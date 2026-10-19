// The scene: what a frame shows.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Font } from "../src/font";
import type { Image } from "../src/image";
import * as life from "../src/life";
import { ACTIVITY_SECONDS } from "../src/model";
import { Random } from "../src/random";
import {
  AFTER_RAIN, APP_BACKGROUND, FPS, GROUND, PetScene, SLEEP_FPS, STATUS_HEIGHT, skyColors, trickAnimation, type SceneView,
  type Weather,
} from "../src/scene";
import { readSheets } from "../../pi/src/assets";
import { Disk } from "./helpers";

const sheets = readSheets();
const DAY = new Date(2026, 9, 12, 13, 0);
const NIGHT = new Date(2026, 9, 12, 23, 30);
const BASE: SceneView = {
  species: "blob", stage: "child", asleep: false, sick: false, poops: 0, activity: "idle", mood: "normal", needs: [],
  activity_until: 0, activity_item: "",
};

// A font that draws every digit and the minus as a block, the colon and the degree sign as a gap
const BLOCKS = new Font(["STARTFONT 2.1", ...[..."0123456789-:°"].flatMap((character) => [
  `STARTCHAR c${character.charCodeAt(0)}`, `ENCODING ${character.charCodeAt(0)}`, "DWIDTH 4 0", "BBX 4 6 0 -1",
  "BITMAP", ...Array.from({ length: 5 }, () => (":°".includes(character) ? "00" : "E0")), "00", "ENDCHAR"]),
"ENDFONT"].join("\n"));

function scene(seed = 1, font: Font | null = null): PetScene {
  return new PetScene(64, 64, { sheets, font }, { rng: new Random(seed), t: 0.0 });
}

/** The frames of a scene, ten per second, with an activity that starts at the first one. */
function frames(changes: Partial<SceneView>, count: number, now = DAY, weather: Weather = null, seed = 1): Image[] {
  const view = { ...BASE, ...changes };
  view.activity_until = now.getTime() / 1000 + (ACTIVITY_SECONDS[view.activity] ?? 4);
  const stage = scene(seed);
  return Array.from({ length: count }, (_, i) => {
    const shown = view.trip ? { ...view, trip: { ...view.trip, event_age: view.trip.event_age + i * 0.1 } } : view;
    return stage.render(shown, weather, new Date(now.getTime() + i * 100), 1 + i * 0.1)[0];
  });
}

function color(image: Image, x: number, y: number): number[] {
  return [...image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 3)];
}

/** How many pixels of a part of the picture differ between two frames. */
function differing(a: Image, b: Image, top = 0, bottom = a.height): number {
  let count = 0;
  for (let i = top * a.width; i < bottom * a.width; i++) {
    count += [0, 1, 2].some((c) => a.data[i * 4 + c] !== b.data[i * 4 + c]) ? 1 : 0;
  }
  return count;
}

test("a frame fills the panel, and the same chance draws the same pictures", () => {
  const first = frames({}, 30);
  for (const image of first) {
    assert.deepEqual([image.width, image.height], [64, 64]);
    assert.ok(image.data.every((value, i) => i % 4 !== 3 || value === 255)); // nothing transparent is left
  }
  assert.deepEqual(first.map((image) => [...image.data]), frames({}, 30).map((image) => [...image.data]));
  assert.ok(first.some((image, i) => i > 0 && differing(image, first[0]) > 0)); // it moves
  // sky at the top, grass under the pet's feet, soil below
  assert.deepEqual(color(first[0], 0, STATUS_HEIGHT + 1), [13, 50, 115]);
  assert.deepEqual(color(first[0], 0, GROUND + 1), [40, 140, 50]);
  assert.deepEqual(color(first[0], 0, 63), [70, 40, 15]);
});

test("it shivers, and the ember stone glows at night", () => {
  const frost = { temp: -4, code: 0 };
  const usual = frames({}, 40, DAY, frost);
  const cold = frames({ cold: true }, 40, DAY, frost);
  assert.ok(cold.some((image, i) => differing(image, usual[i]) > 0));
  const [day] = frames({ deco: ["emberstone"] }, 1);
  const [night] = frames({ deco: ["emberstone"] }, 1, NIGHT);
  assert.deepEqual(color(day, 58, GROUND), [95, 95, 110]); // a gray stone
  assert.deepEqual(color(night, 58, GROUND), [165, 30, 45]);
  frames({ deco: ["emberstone"] }, 300, NIGHT); // sooner or later it snuggles up to it
});

test("day and night, and the weather", () => {
  const [day] = frames({}, 1);
  const [night] = frames({}, 1, NIGHT);
  assert.ok(color(night, 0, 20)[2] < color(day, 0, 20)[2]);
  assert.ok(color(night, 0, GROUND + 1)[1] < color(day, 0, GROUND + 1)[1]); // the ground is darker too
  const rainy = frames({}, 2, DAY, { temp: 12.4, code: 63 });
  assert.ok(differing(rainy[0], day, STATUS_HEIGHT, GROUND - 32) > 20); // clouds and drops in the sky
  assert.ok(differing(rainy[0], rainy[1], STATUS_HEIGHT, GROUND - 32) > 5); // and they fall
  // inside the cave there is neither
  const trip = { area: "cave", returning: false, event: null, item: null, event_age: 0 };
  assert.equal(differing(frames({ trip }, 1, DAY, { temp: 12.4, code: 63 })[0], frames({ trip }, 1)[0]), 0);
});

test("how fast the scene wants to be drawn", () => {
  const view = { ...BASE };
  assert.equal(scene().render(view, null, DAY, 1)[1], 1 / FPS);
  assert.equal(scene().render({ ...view, asleep: true }, null, NIGHT, 1)[1], 1 / SLEEP_FPS);
  assert.equal(scene().render({ ...view, asleep: true, activity: "turn_over" }, null, NIGHT, 1)[1], 1 / FPS);
});

test("the status line: clock, temperature and what the pet needs", () => {
  const draw = (changes: Partial<SceneView>, weather: Weather, font: Font | null) =>
    scene(1, font).render({ ...BASE, ...changes }, weather, DAY, 1)[0];
  const plain = draw({}, null, null);
  const clock = draw({}, null, BLOCKS);
  // 13:00 → blocks for the digits at 1–3, 5–7, 13–15 and 17–19, in rows 0–4
  const lit = (image: Image) => Array.from({ length: 64 }, (_, x) =>
    (color(image, x, 2).join() === color(plain, x, 2).join() ? "." : "X")).join("");
  assert.equal(lit(clock).slice(0, 24), ".XXX.XXX.....XXX.XXX....");
  assert.equal(differing(clock, plain, STATUS_HEIGHT), 0);
  // -2.5° is written as -2°, and it ends at the right edge: "-", "2" and the degree sign
  const cold = draw({}, { temp: -2.5, code: 0 }, BLOCKS);
  assert.equal(lit(cold).slice(48), "...XXX.XXX......");
  // needs: an icon each, at most two, to the left of the temperature
  const needy = draw({ needs: ["satiety", "health", "energy"] }, null, null);
  assert.ok(differing(needy, plain, 0, STATUS_HEIGHT) > 20);
  assert.equal(differing(needy, plain, STATUS_HEIGHT), 0);
  assert.equal(differing(needy, draw({ needs: ["satiety", "health"] }, null, null)), 0);
});

test("every form of the pet can be drawn, in every state", () => {
  const forms = [...Object.keys(life.LINES).flatMap((line) => life.STAGES.map((stage) => [stage, line])),
    ...Object.values(life.LINES).flat().map((name) => ["adult", name])];
  assert.equal(forms.length, 5 * 4 + 16);
  const moods = ["normal", "happy", "sad", "hungry", "dirty", "sick", "tired"];
  for (const [stage, species] of forms) {
    for (const mood of moods) {
      frames({ stage, species, mood, sick: mood === "sick", hat: "bobble", hint: "flicker", weight_status: "heavy",
        deco: ["lantern", "boat"], plant: { kind: "herb", stage: "grown", ripe: true }, nest: "ember",
        visitor: { species: "glimmerock", age: 60, left: 60 } }, 3, mood === "tired" ? NIGHT : DAY);
    }
  }
});

test("about its usual time, every form waits at the nearer edge, looking out", () => {
  const forms = [...Object.keys(life.LINES).flatMap((line) => ["baby", "child"].map((stage) => [stage, line])),
    ...Object.values(life.LINES).flat().map((name) => ["adult", name])];
  for (const [stage, species] of forms) {
    for (const [start, edge] of [[4, 2], [26, 30]]) {
      const view = { ...BASE, stage, species, waiting: true };
      const waiter = scene();
      waiter.x = waiter.targetX = start;
      const images = Array.from({ length: 40 }, (_, i) => waiter.render(view, null, DAY, 1 + i * 0.1)[0]);
      assert.equal(waiter.x, edge, `${stage} ${species}`);
      assert.equal(waiter.facing, edge < 16 ? -1 : 1);
      assert.ok(differing(images[30], images[35]) > 0, `${stage} ${species} goes on tiptoe`);
    }
  }
});

test("some forms do a trick in their own way", () => {
  assert.equal(trickAnimation("adult", "sneezle", "flip"), "flutter");
  assert.equal(trickAnimation("adult", "sneezle", "spin"), "spin");
  assert.equal(trickAnimation("adult", "lumoth", "spin"), "circle");
  assert.equal(trickAnimation("adult", "glimmerock", "spin"), "shine");
  assert.equal(trickAnimation("child", "stone", "flip"), "skip");
  assert.equal(trickAnimation("child", "stone", "spin"), "spin");
  assert.equal(trickAnimation("adult", "bouldergrin", "flip"), "toss");
  assert.equal(trickAnimation("adult", "cyclopuff", "flip"), "flip");
  assert.equal(trickAnimation("child", "blob", "flip"), "flip");
  const flutter = frames({ stage: "adult", species: "sneezle", activity: "trick", activity_item: "flip:ok" }, 30);
  assert.ok(flutter.some((image) => differing(image, flutter[0]) > 20)); // it is up and away
  const skip = frames({ species: "stone", activity: "trick", activity_item: "flip:ok" }, 30);
  assert.ok(skip.some((image) => differing(image, skip[0]) > 20)); // it is off and away
  const shine = frames({ stage: "adult", species: "glimmerock", activity: "trick", activity_item: "spin:ok" }, 30);
  assert.ok(shine.some((image) => differing(image, shine[0]) > 20)); // it turns, and its crystals flash
  const toss = frames({ stage: "adult", species: "bouldergrin", activity: "trick", activity_item: "flip:ok" }, 30);
  assert.ok(toss.some((image) => differing(image, toss[0]) > 20)); // up goes the top stone
});

test("every activity can be drawn from its start to its end", () => {
  const items: Record<string, string> = {
    throw_meal: "meal@0.90", throw_snack: "cookie@0.05", throw_play: "ball@0.50", throw_medicine: "medicine@0.50",
    snack: "icecream", trick: "flip:learned", game_turn: "left:hit", hatch: "egg:blob", evolve: "child:blob",
    plant: "cherry", pick: "cherry", trip_start: "meadow", unpack: "seed_berry,cap,egg_ember", collect: "egg_blob",
    train_strength: "0.80", train_ready: "2.00", train_speed: "0.90", train_show: "left,up,down,right",
    train_smarts: "4/4",
  };
  for (const [activity, seconds] of Object.entries(ACTIVITY_SECONDS)) {
    const changes: Partial<SceneView> = { activity, activity_item: items[activity] ?? "", stage: "adult", species: "flicker" };
    if (activity === "pick") {
      changes.plant = { kind: "cherry", stage: "grown", ripe: false };
    }
    assert.equal(frames(changes, Math.ceil(seconds * 10) + 10).length > 0, true, activity);
  }
});

test("what it left behind lies in the scene, and what it builds grows while it builds it", () => {
  const empty = frames({}, 1)[0];
  for (const kind of ["ball", "tower", "drawing", "snowman"]) {
    for (const look of [0, 1]) {
      const [left] = frames({ trace: { kind, spot: 0, look } }, 1);
      assert.ok(differing(empty, left, GROUND - 12) > 0, `${kind} ${look}`);
    }
  }
  // a drawing is scratched into the ground, below the grass, where the pet never covers it
  const [drawn] = frames({ trace: { kind: "drawing", spot: 0.5, look: 1 } }, 1);
  assert.ok(differing(empty, drawn, GROUND + 2) > 0);
  assert.equal(differing(empty, drawn, 0, GROUND + 2), 0);

  const building = frames({ activity: "build", activity_item: "tower", trace: { kind: "tower", spot: 0.3, look: 0 } },
    ACTIVITY_SECONDS.build * 10);
  const grown = (image: Image) => differing(empty, image, GROUND - 8, GROUND + 1);
  assert.ok(grown(building[25]) < grown(building[80]), `${grown(building[25])} ${grown(building[80])}`);
});

test("a trip: the landscape of every area, a scuffle, a wild pet and the ball", () => {
  const trip = { area: "meadow", returning: false, event: null, item: null, event_age: 0 };
  for (const area of ["meadow", "forest", "stream", "cave", "mountain"]) {
    for (const returning of [false, true]) {
      const run = frames({ trip: { ...trip, area, returning } }, 60, returning ? NIGHT : DAY, { temp: 1, code: 71 });
      assert.ok(differing(run[0], run.at(-1)!, GROUND - 30, 64) > 0, area); // it scrolls past
    }
  }
  const rounds = [["pounce", "bow", "hit"], ["curl", "spin", "special"], ["charge", "flip", "ouch"],
    ["charge", "dance", "dodge"], ["curl", "bow", "hold"], ["pounce", "flip", "strong"]];
  for (const [foe, area] of [["bumblebop", "meadow"], ["glintbug", "cave"], ["gloompeep", "cave"], ["frostfluff", "mountain"]]) {
    for (const outcome of ["win", "lose", "draw"]) {
      frames({ stage: "adult", species: "sneezle",
        trip: { ...trip, area, event: "battle", foe, rounds, outcome, item: outcome === "win" ? "egg_ember" : null } }, 250);
    }
  }
  for (const outcome of ["friend", "shrug"]) {
    frames({ trip: { ...trip, event: "wild", wild: "grumpcap", outcome, rounds: [["spin", true], ["flip", false]] } }, 150);
  }
  frames({ trip: { ...trip, event: "ball", foe: "diggle" } }, 80);
  for (const event of ["find", "rest", "tired"]) {
    frames({ trip: { ...trip, event, item: event === "find" ? "glowshroom" : null } }, 100, DAY, { temp: 9, code: 61 });
  }
});

test("what the game logic hands over can be drawn as it is", () => {
  const pet = new Disk().pet();
  const stage = scene();
  let now = DAY.getTime() / 1000;
  for (const action of [null, "pet", "pet", "feed", "play", "clean", "sleep", "wake"]) {
    if (action) {
      try {
        pet.action(action, { now });
      } catch {
        // not possible right now (an egg can't be fed): the scene draws what there is
      }
    }
    for (let i = 0; i < 50; i++, now += 0.1) {
      stage.render(pet.view(now), { temp: 12, code: 2 }, new Date(now * 1000), now);
    }
  }
});

test("Flicker and Lumoth hop, Cyclopuff and Sneezle walk, Grumpcap walks and hops now and then", () => {
  // A guest halfway in from the right (left edge at 48): its lowest row is where its feet are. Only
  // the columns right of the pet count, and only what differs from the same frames without the guest.
  const lowest = (species: string) => {
    const alone = frames({}, 25);
    return frames({ visitor: { species, age: 1.5, left: 300 } }, 25).map((image, i) => {
      let row = -1;
      for (let y = 0; y < GROUND; y++) {
        for (let x = 50; x < 64; x++) {
          const at = (y * 64 + x) * 4;
          row = [0, 1, 2].some((c) => image.data[at + c] !== alone[i].data[at + c]) ? y : row;
        }
      }
      return row;
    });
  };
  const lifted = (species: string) => lowest(species).filter((row) => row < GROUND - 1).length;
  assert.ok(lifted("flicker") >= 8);
  assert.ok(lifted("lumoth") >= 8);
  assert.equal(lifted("cyclopuff"), 0);
  assert.equal(lifted("sneezle"), 0);
  assert.ok(lifted("grumpcap") > 0 && lifted("grumpcap") < 8); // one hop in 2.5 seconds
});

test("the cloud adults follow the weather", () => {
  // Rumblefluff's horns flash now and then in a thunderstorm, and only then
  assert.equal(skyColors("rumblefluff", "storm", 0.05)?.[0], "flash");
  assert.equal(skyColors("rumblefluff", "storm", 1.0), null);
  assert.equal(skyColors("rumblefluff", "rain", 0.05), null);
  // Prismist's rainbow fades in the rain, and runs along its arch when the sun comes out after it
  assert.equal(skyColors("prismist", "rain", 0)?.[0], "faded");
  assert.notEqual(skyColors("prismist", "after_rain", 0)?.[0], skyColors("prismist", "after_rain", 0.2)?.[0]);
  assert.equal(skyColors("prismist", null, 0), null);
  assert.equal(skyColors("angloop", "storm", 0.05), null);

  const pixels = (image: Image, rgb: number[]) =>
    Array.from({ length: image.width * image.height }, (_, i) => i).filter((i) =>
      rgb.every((c, k) => image.data[i * 4 + k] === c)).length;
  const storm = frames({ stage: "adult", species: "rumblefluff" }, 60, DAY, { temp: 14, code: 95 });
  assert.ok(storm.some((image) => pixels(image, [255, 255, 235]) > 0)); // the flash on its horns
  const red = [240, 80, 90]; // the outer band of the rainbow
  assert.ok(pixels(frames({ stage: "adult", species: "prismist" }, 1)[0], red) > 0);
  assert.equal(pixels(frames({ stage: "adult", species: "prismist" }, 1, DAY, { temp: 12, code: 63 })[0], red), 0);
  // after the rain, for a while
  const stage = scene();
  const view = { ...BASE, stage: "adult", species: "prismist" };
  stage.render(view, { temp: 12, code: 63 }, DAY, 1);
  const runs = [1.1, 1.3, 1.5].map((t) => pixels(stage.render(view, null, DAY, t)[0], red));
  assert.ok(new Set(runs).size > 1, `${runs}`);
  const later = 2 + AFTER_RAIN;
  assert.equal(new Set([later, later + 0.2, later + 0.4].map((t) =>
    pixels(stage.render(view, null, DAY, t)[0], red))).size, 1);
});

test("the app icon", () => {
  const stage = scene();
  const icon = stage.icon(160);
  assert.deepEqual([icon.width, icon.height], [160, 160]);
  assert.deepEqual(color(icon, 0, 0), [...APP_BACKGROUND]);
  assert.deepEqual(color(icon, 159, 159), [...APP_BACKGROUND]);
  assert.notDeepEqual(color(icon, 80, 100), [...APP_BACKGROUND]); // the pet sits in the middle
  // enlarged without smoothing: 40 pixels become 160, so every pixel is a block of four by four
  assert.equal(differing(icon, icon.resized(40, 40).resized(160, 160)), 0);
  // maskable: more margin around the same pet
  const maskable = stage.icon(512, "adult", "cyclopuff", true);
  assert.deepEqual([maskable.width, maskable.height], [512, 512]);
  assert.deepEqual(color(maskable, 60, 60), [...APP_BACKGROUND]);
  assert.ok(differing(stage.icon(160, "egg", "ember"), stage.icon(160, "egg", "blob")) > 0);
  assert.ok(differing(stage.icon(160, "egg", "stone"), stage.icon(160, "egg", "blob")) > 0);
  assert.ok(differing(stage.icon(160, "egg", "fox"), stage.icon(160, "egg", "stone")) > 0);
  assert.ok(differing(stage.icon(160, "egg", "cloud"), stage.icon(160, "egg", "blob")) > 0);
  assert.throws(() => new PetScene(64, 64, { sheets: {}, font: null }).icon(160), /items|blob_body/);
});

test("where the pet stands, for the app to know where a finger touches it", () => {
  for (const stage of ["egg", "baby", "child", "adult"] as const) {
    const s = scene();
    s.render({ ...BASE, stage, species: stage === "adult" ? "cyclopuff" : "blob" }, null, DAY, 1);
    const [x, y, w, h] = s.petArea();
    assert.ok(x >= 0 && x + w <= 64, `${stage}: ${x} ${w}`);
    assert.ok(y >= 0 && y < GROUND && y + h === GROUND + 1, `${stage}: ${y} ${h}`);
    assert.ok(w >= 8 && h >= 4, `${stage}: ${w}×${h}`);
  }
});
