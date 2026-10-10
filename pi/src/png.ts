/** Writes a picture as a PNG file (RGB, or RGBA when it has transparency). */

import { deflateSync } from "node:zlib";

import type { Image } from "../../core/src/image";

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array): Buffer {
  const out = Buffer.alloc(body.length + 12);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, "latin1");
  out.set(body, 8);
  out.writeUInt32BE(crc32(out.subarray(4, body.length + 8)), body.length + 8);
  return out;
}

export function encodePng(image: Image): Buffer {
  const { width, height, data } = image;
  let opaque = true;
  for (let i = 3; i < data.length && opaque; i += 4) {
    opaque = data[i] === 255;
  }
  const channels = opaque ? 3 : 4;
  // every line starts with its filter: none
  const lines = Buffer.alloc(height * (width * channels + 1));
  let at = 0;
  for (let y = 0; y < height; y++) {
    at++;
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < channels; c++) {
        lines[at++] = data[(y * width + x) * 4 + c];
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, opaque ? 2 : 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header), chunk("IDAT", deflateSync(lines, { level: 9 })), chunk("IEND", new Uint8Array(0)),
  ]);
}
