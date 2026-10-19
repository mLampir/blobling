// Sprite sheets, and what the scene does to a sprite: recolor, tint, outline.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Image } from "../src/image";
import { Sheet, faceAnchor, outline, recolor, swapColors, tint } from "../src/sprites";
import { readSheets } from "../../pi/src/assets";

const sheets = readSheets();

function one(r: number, g: number, b: number, a = 255): Image {
  return new Image(1, 1, Uint8Array.from([r, g, b, a]));
}

test("sheets: tags and frames", () => {
  const body = sheets["blob_body"];
  for (const tag of ["idle", "squash", "stretch", "flat", "sleep"]) {
    assert.ok(body.has(tag), tag);
  }
  assert.ok(!body.has("fly"));
  assert.throws(() => body.image("fly"), /fly/);
  assert.deepEqual([body.image("idle").width, body.image("idle").height], [32, 32]);
  // two frames of 0.7 seconds each, forever
  assert.deepEqual([0, 0.3, 0.6, 0.9, 1.3, 2.7].map((t) => body.frame("idle", t)[1]), [0, 0, 0, 1, 1, 1]);
  assert.equal(body.frame("idle", 0.9)[0], body.frame("idle", 2.3)[0]);
  assert.equal(body.frame("flat", 5.0)[1], 0); // a single pose

  const items = sheets["items"];
  assert.deepEqual([0, 0.1, 0.25, 0.5, 0.77, 1.9].map((t) => items.frame("egg_wobble", t)[1]), [0, 0, 1, 3, 1, 0]);
  const poop = items.image("poop");
  assert.deepEqual([poop.width, poop.height], [8, 6]);
  assert.deepEqual([...poop.data.subarray((3 * 8 + 3) * 4, (3 * 8 + 3) * 4 + 4)], [150, 90, 40, 255]);
});

test("sheets: both of Aseprite's formats, and the default duration", () => {
  const picture = new Image(4, 2);
  picture.point(2, 0, [9, 9, 9]);
  const frames = [{ frame: { x: 0, y: 0, w: 2, h: 2 } }, { frame: { x: 2, y: 0, w: 2, h: 2 }, duration: 300 }];
  const meta = { image: "x.png", frameTags: [{ name: "walk", from: 0, to: 1 }, { name: "stand", from: 1, to: 1 }] };
  for (const sheet of [new Sheet({ frames, meta }, picture), new Sheet({ frames: { a: frames[0], b: frames[1] }, meta }, picture)]) {
    assert.deepEqual([0.05, 0.15, 0.39, 0.45].map((t) => sheet.frame("walk", t)[1]), [0, 1, 1, 0]);
    assert.equal(sheet.image("stand").alpha(0, 0), 255);
    assert.equal(sheet.image("walk").alpha(0, 0), 0);
    assert.equal(sheet.faceTop, null);
  }
  assert.equal(new Sheet({ frames, meta: { ...meta, faceTop: 3, faceCenter: "bottom" } }, picture).faceTop, 3);
  assert.equal(new Sheet({ frames, meta: { ...meta, faceShift: -4 } }, picture).faceShift, -4);
});

test("where the face sits", () => {
  const anchors = (name: string) => ["idle", "squash", "stretch"].map((tag) =>
    faceAnchor(sheets[name].image(tag), sheets[name].faceTop, sheets[name].faceCenter, sheets[name].faceShift));
  assert.deepEqual(anchors("blob_body"), [[16.0, 16], [15.5, 18], [15.5, 15]]);
  assert.deepEqual(anchors("sneezle_body"), [[16.0, 13], [15.5, 15], [15.5, 11]]); // in the head, centered on the feet
  assert.deepEqual(anchors("blob_baby_body"), [[16.0, 25], [15.5, 27], [15.5, 24]]);
  assert.deepEqual(anchors("kitlet_body"), [[11.0, 17], [10.5, 19], [10.5, 15]]); // on its body, not the tail
  // a form that walks keeps its face over its feet while it lifts one of them
  for (const name of ["sneezle_body", "roamtail_body", "filchfox_body"]) {
    const sheet = sheets[name];
    const steps = [0, 0.25, 0.35, 0.6].map((t) => faceAnchor(sheet.frame("walk", t)[0], sheet.faceTop, sheet.faceCenter)[0]);
    assert.ok(Math.max(...steps) - Math.min(...steps) <= 1, `${name}: ${steps}`);
  }
  // the eyes of Filchfox sit in the holes of its mask (rows 11 and 12 of the grid, 6 rows below the canvas top)
  assert.deepEqual(anchors("filchfox_body")[0], [13.5, 17]);
  // the faces of the cloud adults sit on their heads, not in the middle of fleece, horns and rainbow
  assert.deepEqual(anchors("rumblefluff_body")[0], [16, 17]);
  assert.deepEqual(anchors("prismist_body")[0], [13.5, 17]);
});

test("recoloring", () => {
  const shifted = (color: [number, number, number], from: number, to: number, shift: number) =>
    [...recolor(one(...color), from, to, shift).data.subarray(0, 3)];
  assert.deepEqual(shifted([38, 198, 186], 100, 145, -64), [132, 198, 38]); // teal → toxic green
  assert.deepEqual(shifted([38, 198, 186], 100, 145, 71), [132, 38, 198]);
  assert.deepEqual(shifted([225, 60, 30], 0, 40, 140), [30, 140, 225]); // a flame turns blue
  assert.deepEqual(shifted([250, 130, 30], 0, 40, 8), [250, 170, 30]);
  assert.deepEqual(shifted([90, 60, 80], 0, 255, 100), [71, 90, 60]); // the hue wraps around
  assert.deepEqual(shifted([3, 2, 1], 0, 255, 0), [3, 2, 1]);
  // out of the range: it stays, give or take the way there and back
  assert.deepEqual(shifted([255, 235, 150], 100, 145, 71), [255, 234, 150]);
  assert.equal(recolor(one(38, 198, 186, 7), 100, 145, 71).alpha(0, 0), 7);
});

test("swapping colors, tinting and the outline", () => {
  const image = new Image(3, 1);
  image.point(0, 0, [1, 2, 3]);
  image.point(1, 0, [4, 5, 6]);
  image.data.set([1, 2, 3, 0], 8); // the same color, but transparent
  assert.deepEqual([...swapColors(image, [[[1, 2, 3], [9, 8, 7]]]).data], [9, 8, 7, 255, 4, 5, 6, 255, 1, 2, 3, 0]);

  assert.deepEqual([...tint(one(38, 198, 186), [185, 195, 90], 0.28).data], [79, 197, 159, 255]);
  assert.deepEqual([...tint(one(250, 3, 99, 40), [185, 195, 90], 0.28).data], [231, 56, 96, 40]);

  const dots = new Image(3, 2);
  dots.point(0, 0, [9, 9, 9]);
  dots.point(2, 1, [7, 7, 7]);
  const lined = outline(dots);
  const rows = Array.from({ length: lined.height }, (_, y) => Array.from({ length: lined.width }, (_, x) => {
    const [r, , , a] = lined.data.subarray((y * lined.width + x) * 4);
    return a ? (r ? "o" : "#") : ".";
  }).join(""));
  assert.deepEqual(rows, [".#...", "#o##.", ".##o#", "...#."]);
});
