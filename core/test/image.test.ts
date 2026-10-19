// The pixel buffer, its drawing functions, PNG files and the BDF font.
//
// The pictures expected here were drawn by Pillow, the library the scene was first written
// with: its shapes are the ones the scene was designed with.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { inflateSync } from "node:zlib";

import { Font } from "../src/font";
import { Image, lerp, type Color } from "../src/image";
import { decodePng, inflate } from "../src/png";
import { encodePng } from "../../pi/src/png";

const WHITE: Color = [255, 255, 255];

/** A black picture as rows of text, "X" for every pixel that was drawn on. */
function drawn(width: number, height: number, draw: (image: Image) => void): string[] {
  const image = Image.filled(width, height, [0, 0, 0]);
  draw(image);
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) =>
    (image.data[(y * width + x) * 4] ? "X" : ".")).join(""));
}

/** A picture whose pixels are numbered from 1, row by row (in the red channel). */
function numbered(width: number, height: number): Image {
  const image = new Image(width, height);
  for (let i = 0; i < width * height; i++) {
    image.data.set([i + 1, 0, 0, 255], i * 4);
  }
  return image;
}

function numbers(image: Image): number[][] {
  return Array.from({ length: image.height }, (_, y) =>
    Array.from({ length: image.width }, (_, x) => image.data[(y * image.width + x) * 4]));
}

function pixel(image: Image, x = 0, y = 0): number[] {
  return [...image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4)];
}

function one(...rgba: number[]): Image {
  return new Image(1, 1, Uint8Array.from(rgba));
}

test("lines, rectangles and points stay inside the picture", () => {
  assert.deepEqual(drawn(4, 3, (image) => {
    image.hline(-3, 1, 0, WHITE);
    image.hline(2, 9, 1, WHITE);
    image.hline(0, 3, 7, WHITE);
    image.point(-1, 2, WHITE);
    image.point(3, 2, WHITE);
  }), ["XX..", "..XX", "...X"]);
  assert.deepEqual(drawn(4, 3, (image) => image.rectangle(1, 1, 8, 8, WHITE)), ["....", ".XXX", ".XXX"]);
});

test("ellipses", () => {
  assert.deepEqual(drawn(9, 7, (image) => image.ellipse(1, 1, 7, 5, WHITE)),
    [".........", "...XXX...", ".XXXXXXX.", ".XXXXXXX.", ".XXXXXXX.", "...XXX...", "........."]);
  assert.deepEqual(drawn(6, 6, (image) => image.ellipse(0, 0, 4, 4, WHITE)), // the sun
    [".XXX..", "XXXXX.", "XXXXX.", "XXXXX.", ".XXX..", "......"]);
  assert.deepEqual(drawn(14, 16, (image) => image.ellipse(0, 0, 13, 14, WHITE)), // the crown of a tree
    [".....XXXX.....", "...XXXXXXXX...", "..XXXXXXXXXX..", ".XXXXXXXXXXXX.", ".XXXXXXXXXXXX.", "XXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXX", "XXXXXXXXXXXXXX", "XXXXXXXXXXXXXX", "XXXXXXXXXXXXXX", ".XXXXXXXXXXXX.", ".XXXXXXXXXXXX.",
      "..XXXXXXXXXX..", "...XXXXXXXX...", ".....XXXX.....", ".............."]);
});

test("polygons", () => {
  assert.deepEqual(drawn(13, 9, (image) => image.polygon([[1, 8], [6, 1], [11, 8]], WHITE)), // a peak
    [".............", "......X......", ".....XXX.....", ".....XXX.....", "....XXXXX....", "...XXXXXXX...",
      "..XXXXXXXXX..", "..XXXXXXXXX..", ".XXXXXXXXXXX."]);
  assert.deepEqual(drawn(10, 8, (image) => image.polygon([[1, 0], [8, 0], [4, 6]], WHITE)), // a stalactite
    [".XXXXXXXX.", "..XXXXXX..", "..XXXXXX..", "...XXXX...", "...XXX....", "....XX....", "....X.....", ".........."]);
});

test("pasting and laying over", () => {
  const sky = Image.filled(1, 1, [10, 45, 110]);
  sky.paste(one(200, 100, 50, 128), 0, 0);
  assert.deepEqual(pixel(sky), [105, 73, 80, 255]);
  sky.paste(one(1, 2, 3, 0), 0, 0); // transparent: what is there stays
  assert.deepEqual(pixel(sky), [105, 73, 80, 255]);

  const glass = one(10, 20, 30, 200);
  glass.alphaComposite(one(200, 100, 50, 128));
  assert.deepEqual(pixel(glass), [117, 65, 41, 228]);
  const nothing = one(10, 20, 30, 0);
  nothing.alphaComposite(one(200, 100, 50, 77));
  assert.deepEqual(pixel(nothing), [200, 100, 50, 77]);

  // over the edge: only what lands on the picture
  const small = numbered(2, 2);
  const target = new Image(3, 3);
  target.blit(small, 2, -1);
  target.blit(small, -1, 2);
  assert.deepEqual(numbers(target), [[0, 0, 3], [0, 0, 0], [2, 0, 0]]);
  assert.deepEqual(numbers(numbered(3, 3).crop(1, 1, 3, 3)), [[5, 6], [8, 9]]);
});

test("the box around a figure", () => {
  const image = new Image(6, 5);
  assert.equal(image.bbox(), null);
  image.point(2, 1, WHITE);
  image.point(4, 3, WHITE);
  assert.deepEqual(image.bbox(), [2, 1, 5, 4]);
  assert.deepEqual(image.filled(1), [2]);
  assert.equal(image.alpha(4, 3), 255);
});

test("scaling, mirroring and rotating without smoothing", () => {
  assert.deepEqual(numbers(numbered(5, 1).resized(3, 1)), [[1, 3, 5]]);
  assert.deepEqual(numbers(numbered(3, 2).resized(7, 3)),
    [[1, 1, 2, 2, 2, 3, 3], [4, 4, 5, 5, 5, 6, 6], [4, 4, 5, 5, 5, 6, 6]]);
  assert.deepEqual(numbers(numbered(3, 2).mirrored()), [[3, 2, 1], [6, 5, 4]]);
  assert.deepEqual(numbers(numbered(4, 4).rotated(90, [2, 2])),
    [[4, 8, 12, 16], [3, 7, 11, 15], [2, 6, 10, 14], [1, 5, 9, 13]]);
  assert.deepEqual(numbers(numbered(5, 5).rotated(30, [2.5, 2.5])),
    [[0, 3, 4, 10, 0], [2, 8, 9, 14, 15], [6, 12, 13, 19, 20], [11, 12, 18, 18, 24], [0, 16, 22, 23, 0]]);
  assert.deepEqual(numbers(numbered(5, 4).rotated(-120, [2.0, 1.5])),
    [[17, 12, 6, 1, 0], [13, 8, 7, 2, 0], [14, 9, 3, 0, 0], [10, 4, 4, 0, 0]]);
  assert.deepEqual(numbers(numbered(3, 2).rotated(180, [1.5, 1.0])), [[6, 5, 4], [3, 2, 1]]);
  assert.deepEqual(numbers(numbered(3, 2).rotated(360, [1.5, 1.0])), [[1, 2, 3], [4, 5, 6]]);
});

test("colors", () => {
  assert.deepEqual(lerp([0, 0, 10], [10, 45, 110], 0.25), [3, 11, 35]);
  assert.deepEqual(pixel(one(100, 201, 7, 9).mapped((value) => Math.trunc(value * 0.55))), [55, 110, 3, 9]);
});

test("PNG files: the sprite sheets", () => {
  const directory = "app/pet/assets";
  const files = readdirSync(directory).filter((name) => name.endsWith(".png"));
  assert.ok(files.length > 10);
  for (const name of files) {
    const file = readFileSync(`${directory}/${name}`);
    // unpacking, held against Node's own
    const packed: Buffer[] = [];
    for (let at = 8; at < file.length; at += file.readUInt32BE(at) + 12) {
      if (file.toString("latin1", at + 4, at + 8) === "IDAT") {
        packed.push(file.subarray(at + 8, at + 8 + file.readUInt32BE(at)));
      }
    }
    assert.deepEqual(Buffer.from(inflate(Buffer.concat(packed))), inflateSync(Buffer.concat(packed)), name);
    const image = decodePng(file);
    assert.deepEqual([image.width, image.height], [file.readUInt32BE(16), file.readUInt32BE(20)], name);
  }
  const body = decodePng(readFileSync(`${directory}/blob_body.png`));
  assert.deepEqual([body.width, body.height], [352, 32]);
  assert.deepEqual(pixel(body, 0, 0), [0, 0, 0, 0]);
  assert.equal(pixel(body, 16, 20)[3], 255);
});

test("PNG files: written and read again", () => {
  const image = new Image(7, 5);
  image.data.forEach((_, i) => {
    image.data[i] = (i * 37 + (i >> 3) * 11) % 256;
  });
  const back = decodePng(encodePng(image));
  assert.deepEqual([back.width, back.height], [7, 5]);
  assert.deepEqual(back.data, image.data);
  // without transparency it is written as RGB
  const opaque = Image.filled(3, 2, [1, 2, 3]);
  opaque.point(2, 1, [200, 100, 50]);
  assert.equal(encodePng(opaque)[25], 2);
  assert.deepEqual(decodePng(encodePng(opaque)).data, opaque.data);
  assert.throws(() => decodePng(new Uint8Array(20)), /Not a PNG/);
});

const FONT = `STARTFONT 2.1
FONT -Test-Fixed-Medium-R-Normal--6-60-75-75-C-40-ISO10646-1
SIZE 6 75 75
FONTBOUNDINGBOX 4 6 0 -1
STARTPROPERTIES 2
FONT_ASCENT 5
FONT_DESCENT 1
ENDPROPERTIES
CHARS 4
STARTCHAR one
ENCODING 49
SWIDTH 640 0
DWIDTH 4 0
BBX 4 6 0 -1
BITMAP
40
C0
40
40
E0
00
ENDCHAR
STARTCHAR colon
ENCODING 58
SWIDTH 640 0
DWIDTH 4 0
BBX 4 6 0 -1
BITMAP
00
40
00
00
40
00
ENDCHAR
STARTCHAR comma
ENCODING 44
SWIDTH 640 0
DWIDTH 3 0
BBX 2 3 0 -1
BITMAP
40
40
80
ENDCHAR
STARTCHAR snowman
ENCODING 9731
SWIDTH 640 0
DWIDTH 4 0
BBX 4 6 0 -1
BITMAP
F0
F0
F0
F0
F0
F0
ENDCHAR
ENDFONT
`;

test("BDF font", () => {
  const font = new Font(FONT);
  assert.equal(font.width("1:1"), 12);
  assert.equal(font.width("1,"), 7);
  assert.equal(font.width("1☃x1"), 8); // only Latin-1, and only what the font has
  assert.deepEqual(drawn(13, 7, (image) => font.draw(image, 1, 1, "1:1", WHITE)),
    [".............", "..X.......X..", ".XX...X..XX..", "..X.......X..", "..X.......X..", ".XXX..X..XXX.",
      "............."]);
  // a small character sits on the baseline, one row of it below
  assert.deepEqual(drawn(8, 6, (image) => font.draw(image, 0, 0, "1,", WHITE)),
    [".X......", "XX......", ".X......", ".X...X..", "XXX..X..", "....X..."]);
  assert.throws(() => new Font("not a font"), /BDF/);
});
