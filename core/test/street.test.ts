// The street: the camera pans between the houses and the places after them.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Image } from "../src/image";
import { follow, pan } from "../src/street";

const SKY: [number, number, number] = [20, 40, 120];
const GRASS: [number, number, number] = [60, 140, 60];
const PET: [number, number, number] = [40, 200, 190];

/** A backdrop in one color, and the same with a pet (a 4 × 4 square) at x. */
function scene(color: [number, number, number], x: number): [Image, Image] {
  const backdrop = Image.filled(16, 8, color);
  const frame = backdrop.copy();
  frame.rectangle(x, 2, x + 3, 5, PET);
  return [backdrop, frame];
}

/** The columns in which the pet shows in a picture. */
function petColumns(img: Image): number[] {
  const columns = new Set<number>();
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (img.data[i] === PET[0] && img.data[i + 1] === PET[1] && img.data[i + 2] === PET[2]) {
        columns.add(x);
      }
    }
  }
  return [...columns].sort((a, b) => a - b);
}

test("following the pet, only the backgrounds pan: it never shows twice and walks from where it stood", () => {
  const [houseBack, house] = scene(GRASS, 2);
  const [groundBack, ground] = scene(SKY, 10);
  // a plain pan between two pictures of it standing in the middle: it shows twice on the way
  const [, middle] = scene(GRASS, 6);
  const [, there] = scene(SKY, 6);
  assert.deepEqual(petColumns(pan(middle, there, 0.5, 1)), [0, 1, 14, 15]);
  assert.equal(petColumns(house).length, 4);
  for (const progress of [0, 0.3, 0.5, 0.8, 1]) {
    assert.equal(petColumns(follow({ backdrop: houseBack, x: 2 }, ground, { backdrop: groundBack, x: 10 }, progress, 1)).length, 4);
  }
  assert.deepEqual(petColumns(follow({ backdrop: houseBack, x: 2 }, ground, { backdrop: groundBack, x: 10 }, 0, 1)), [2, 3, 4, 5]);
  assert.deepEqual(petColumns(follow({ backdrop: houseBack, x: 2 }, ground, { backdrop: groundBack, x: 10 }, 1, 1)), [10, 11, 12, 13]);
});
