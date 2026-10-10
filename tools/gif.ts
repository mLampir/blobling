// Writes pictures as an animated GIF, for the preview (tools/pet_preview.ts).

import type { Image } from "../core/src/image";

/** The colors of a picture as numbers (0xRRGGBB), with the lowest `drop` bits of every channel cut off. */
function colorsOf(image: Image, drop: number): Uint32Array {
  const mask = (0xff << drop) & 0xff;
  const colors = new Uint32Array(image.width * image.height);
  for (let i = 0; i < colors.length; i++) {
    colors[i] = ((image.data[i * 4] & mask) << 16) | ((image.data[i * 4 + 1] & mask) << 8) | (image.data[i * 4 + 2] & mask);
  }
  return colors;
}

/** The pixels as LZW codes, in the blocks of at most 255 bytes that GIF wants. */
function packed(pixels: Uint8Array, minCodeSize: number): number[] {
  const out: number[] = [];
  let block: number[] = [];
  let buffer = 0;
  let buffered = 0;
  let codeSize = minCodeSize + 1;
  const emit = (code: number): void => {
    buffer |= code << buffered;
    buffered += codeSize;
    while (buffered >= 8) {
      block.push(buffer & 0xff);
      buffer >>>= 8;
      buffered -= 8;
      if (block.length === 255) {
        out.push(255, ...block);
        block = [];
      }
    }
  };
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let next = end + 1;
  let table = new Map<number, number>();
  emit(clear);
  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const key = (prefix << 8) | pixels[i];
    const known = table.get(key);
    if (known !== undefined) {
      prefix = known;
      continue;
    }
    emit(prefix);
    if (next === 4096) { // the table is full: start again
      emit(clear);
      next = end + 1;
      codeSize = minCodeSize + 1;
      table = new Map();
    } else {
      if (next >= 1 << codeSize) {
        codeSize++;
      }
      table.set(key, next++);
    }
    prefix = pixels[i];
  }
  emit(prefix);
  emit(end);
  if (buffered) {
    block.push(buffer & 0xff);
  }
  if (block.length) {
    out.push(block.length, ...block);
  }
  out.push(0);
  return out;
}

/** An animation that loops forever; `delay`: seconds per frame. Every frame gets its own table of colors. */
export function encodeGif(frames: readonly Image[], delay: number): Uint8Array {
  const { width, height } = frames[0];
  const short = (value: number) => [value & 0xff, value >> 8];
  const out: number[] = [
    ...Buffer.from("GIF89a", "latin1"), ...short(width), ...short(height), 0x70, 0, 0,
    0x21, 0xff, 11, ...Buffer.from("NETSCAPE2.0", "latin1"), 3, 1, 0, 0, 0, // loop forever
  ];
  for (const frame of frames) {
    // a GIF has 256 colors per frame at most: if there are more, similar ones are thrown together
    let colors: Uint32Array;
    let palette: number[];
    for (let drop = 0; ; drop++) {
      colors = colorsOf(frame, drop);
      palette = [...new Set(colors)];
      if (palette.length <= 256) {
        break;
      }
    }
    const index = new Map(palette.map((color, i) => [color, i]));
    const bits = Math.max(1, Math.ceil(Math.log2(palette.length)));
    out.push(0x21, 0xf9, 4, 0, ...short(Math.round(delay * 100)), 0, 0);
    out.push(0x2c, 0, 0, 0, 0, ...short(width), ...short(height), 0x80 | (bits - 1));
    for (let i = 0; i < 1 << bits; i++) {
      const color = palette[i] ?? 0;
      out.push(color >> 16, (color >> 8) & 0xff, color & 0xff);
    }
    const minCodeSize = Math.max(2, bits);
    out.push(minCodeSize, ...packed(Uint8Array.from(colors, (color) => index.get(color)!), minCodeSize));
  }
  out.push(0x3b);
  return Uint8Array.from(out);
}
