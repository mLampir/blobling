/**
 * Reads PNG files, as far as the sprite sheets need it: 8 bits per channel, RGB or RGBA, not
 * interlaced.
 *
 * The core decodes the sheets itself, so the Pi and the browser get the very same pixels (a
 * canvas may change colors that sit next to transparency).
 */

import { Image } from "./image";

// ---------- Inflate (RFC 1951) ----------

/** A Huffman code: how many codes there are of each length, and the symbols in the order of their codes. */
interface Code {
  counts: Uint16Array;
  symbols: Uint16Array;
}

function codeOf(lengths: ArrayLike<number>): Code {
  const counts = new Uint16Array(16);
  for (let i = 0; i < lengths.length; i++) {
    counts[lengths[i]]++;
  }
  counts[0] = 0;
  const offsets = new Uint16Array(16);
  for (let length = 1; length < 15; length++) {
    offsets[length + 1] = offsets[length] + counts[length];
  }
  const symbols = new Uint16Array(lengths.length);
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    if (lengths[symbol]) {
      symbols[offsets[lengths[symbol]]++] = symbol;
    }
  }
  return { counts, symbols };
}

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131,
  163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DISTANCE_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537,
  2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DISTANCE_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13,
  13];
// the order in which a block lists the lengths of its code for code lengths
const LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/** Unpacks a zlib stream (RFC 1950); the checksum at its end is not looked at. */
export function inflate(packed: Uint8Array): Uint8Array {
  let position = 2; // behind the zlib header
  let buffer = 0;
  let buffered = 0;
  let out = new Uint8Array(packed.length * 4);
  let length = 0;

  const bits = (count: number): number => {
    while (buffered < count) {
      if (position >= packed.length) {
        throw new Error("The compressed data ends too early");
      }
      buffer |= packed[position++] << buffered;
      buffered += 8;
    }
    const value = buffer & ((1 << count) - 1);
    buffer >>>= count;
    buffered -= count;
    return value;
  };
  const symbol = (code: Code): number => {
    let value = 0;
    let first = 0;
    let index = 0;
    for (let size = 1; size < 16; size++) {
      value |= bits(1);
      const count = code.counts[size];
      if (value - count < first) {
        return code.symbols[index + (value - first)];
      }
      index += count;
      first = (first + count) << 1;
      value <<= 1;
    }
    throw new Error("The compressed data is damaged");
  };
  const room = (more: number): void => {
    if (length + more > out.length) {
      const larger = new Uint8Array(Math.max(out.length * 2, length + more));
      larger.set(out.subarray(0, length));
      out = larger;
    }
  };

  let last = false;
  while (!last) {
    last = bits(1) === 1;
    const kind = bits(2);
    if (kind === 0) {
      // stored as it is
      buffer = buffered = 0;
      const size = packed[position] | (packed[position + 1] << 8);
      position += 4;
      room(size);
      out.set(packed.subarray(position, position + size), length);
      length += size;
      position += size;
      continue;
    }
    let literals: Code;
    let distances: Code;
    if (kind === 1) {
      const lengths = new Uint8Array(288);
      lengths.fill(8, 0, 144).fill(9, 144, 256).fill(7, 256, 280).fill(8, 280);
      literals = codeOf(lengths);
      distances = codeOf(new Uint8Array(30).fill(5));
    } else if (kind === 2) {
      const literalCount = bits(5) + 257;
      const distanceCount = bits(5) + 1;
      const orderCount = bits(4) + 4;
      const orderLengths = new Uint8Array(19);
      for (let i = 0; i < orderCount; i++) {
        orderLengths[LENGTH_ORDER[i]] = bits(3);
      }
      const order = codeOf(orderLengths);
      const lengths = new Uint8Array(literalCount + distanceCount);
      for (let i = 0; i < lengths.length;) {
        const value = symbol(order);
        if (value < 16) {
          lengths[i++] = value;
          continue;
        }
        const [repeated, times] = value === 16 ? [lengths[i - 1], 3 + bits(2)]
          : value === 17 ? [0, 3 + bits(3)] : [0, 11 + bits(7)];
        lengths.fill(repeated, i, i + times);
        i += times;
      }
      literals = codeOf(lengths.subarray(0, literalCount));
      distances = codeOf(lengths.subarray(literalCount));
    } else {
      throw new Error("The compressed data is damaged");
    }
    for (;;) {
      const value = symbol(literals);
      if (value === 256) {
        break;
      }
      if (value < 256) {
        room(1);
        out[length++] = value;
        continue;
      }
      const size = LENGTH_BASE[value - 257] + bits(LENGTH_EXTRA[value - 257]);
      const far = symbol(distances);
      const distance = DISTANCE_BASE[far] + bits(DISTANCE_EXTRA[far]);
      if (distance > length) {
        throw new Error("The compressed data is damaged");
      }
      room(size);
      for (let i = 0; i < size; i++, length++) {
        out[length] = out[length - distance];
      }
    }
  }
  return out.subarray(0, length);
}

// ---------- PNG ----------

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export function decodePng(file: Uint8Array): Image {
  if (SIGNATURE.some((byte, i) => file[i] !== byte)) {
    throw new Error("Not a PNG file");
  }
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  let width = 0;
  let height = 0;
  let channels = 0;
  const packed: Uint8Array[] = [];
  for (let at = 8; at < file.length;) {
    const size = view.getUint32(at);
    const type = String.fromCharCode(...file.subarray(at + 4, at + 8));
    const body = file.subarray(at + 8, at + 8 + size);
    if (type === "IHDR") {
      width = view.getUint32(at + 8);
      height = view.getUint32(at + 12);
      const [depth, color, , , interlace] = body.subarray(8);
      channels = color === 6 ? 4 : color === 2 ? 3 : 0;
      if (depth !== 8 || !channels || interlace) {
        throw new Error("Only PNG files with 8 bits per channel, RGB or RGBA, not interlaced, can be read");
      }
    } else if (type === "IDAT") {
      packed.push(body);
    }
    at += size + 12;
  }
  const all = new Uint8Array(packed.reduce((sum, part) => sum + part.length, 0));
  packed.reduce((at, part) => (all.set(part, at), at + part.length), 0);
  const lines = inflate(all);

  // every line starts with the filter that was applied to it; take the filters back in place
  const stride = width * channels;
  const image = new Image(width, height);
  let before: Uint8Array = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = lines[y * (stride + 1)];
    const line = lines.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? line[i - channels] : 0;
      const up = before[i];
      const upLeft = i >= channels ? before[i - channels] : 0;
      let predicted = 0;
      if (filter === 1) {
        predicted = left;
      } else if (filter === 2) {
        predicted = up;
      } else if (filter === 3) {
        predicted = (left + up) >> 1;
      } else if (filter === 4) {
        const p = left + up - upLeft;
        const [pa, pb, pc] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - upLeft)];
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      line[i] += predicted;
    }
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 4; c++) {
        image.data[(y * width + x) * 4 + c] = c < channels ? line[x * channels + c] : 255;
      }
    }
    before = line;
  }
  return image;
}
