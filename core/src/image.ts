/**
 * A picture as a pixel buffer, and the few drawing functions the scene needs.
 *
 * The scene draws into its own buffer (RGBA, one byte per channel), so the panel and the app show
 * exactly the same picture: the Pi sends the buffer to the panel, the browser copies it to a
 * canvas.
 *
 * The ellipse and the polygon set the pixels that Pillow sets, the library the scene was first
 * written with: its shapes are the ones the scene was designed with.
 */

export type Color = readonly [number, number, number];
/** [left, top, right, bottom], the last two just outside. */
export type Box = [number, number, number, number];

export function lerp(a: Color, b: Color, t: number): Color {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

/** x / 255, rounded, for x up to 255 * 255. */
function div255(x: number): number {
  const tmp = x + 128;
  return ((tmp >> 8) + tmp) >> 8;
}

export class Image {
  /** Four bytes per pixel: red, green, blue, alpha. */
  readonly data: Uint8Array;

  /** A fully transparent picture, or one around the pixels given. */
  constructor(readonly width: number, readonly height: number, data?: Uint8Array) {
    this.data = data ?? new Uint8Array(width * height * 4);
  }

  /** A picture without transparency, in one color. */
  static filled(width: number, height: number, color: Color): Image {
    const image = new Image(width, height);
    for (let i = 0; i < image.data.length; i += 4) {
      image.data[i] = color[0];
      image.data[i + 1] = color[1];
      image.data[i + 2] = color[2];
      image.data[i + 3] = 255;
    }
    return image;
  }

  copy(): Image {
    return new Image(this.width, this.height, this.data.slice());
  }

  /** The part from (x0, y0) up to, but not including, (x1, y1). */
  crop(x0: number, y0: number, x1: number, y1: number): Image {
    const out = new Image(x1 - x0, y1 - y0);
    out.blit(this, -x0, -y0);
    return out;
  }

  alpha(x: number, y: number): number {
    return this.data[(y * this.width + x) * 4 + 3];
  }

  /** The columns of a row that are not transparent. */
  filled(y: number): number[] {
    const columns: number[] = [];
    for (let x = 0; x < this.width; x++) {
      if (this.alpha(x, y)) {
        columns.push(x);
      }
    }
    return columns;
  }

  /** The box around everything that is not transparent, or null if nothing is. */
  bbox(): Box | null {
    let box: Box | null = null;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.alpha(x, y)) {
          box ??= [x, y, x + 1, y + 1];
          box[0] = Math.min(box[0], x);
          box[2] = Math.max(box[2], x + 1);
          box[3] = y + 1;
        }
      }
    }
    return box;
  }

  // ---------- Drawing in one color (the pixels become opaque) ----------

  point(x: number, y: number, color: Color): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const i = (y * this.width + x) * 4;
      this.data[i] = color[0];
      this.data[i + 1] = color[1];
      this.data[i + 2] = color[2];
      this.data[i + 3] = 255;
    }
  }

  /** A horizontal line from x0 to x1, both included. */
  hline(x0: number, x1: number, y: number, color: Color): void {
    for (let x = Math.max(0, x0); x <= Math.min(this.width - 1, x1); x++) {
      this.point(x, y, color);
    }
  }

  /** A filled rectangle; the corners are included. */
  rectangle(x0: number, y0: number, x1: number, y1: number, color: Color): void {
    for (let y = y0; y <= y1; y++) {
      this.hline(x0, x1, y, color);
    }
  }

  /** A filled ellipse inside the box from (x0, y0) to (x1, y1), both included. */
  ellipse(x0: number, y0: number, x1: number, y1: number, color: Color): void {
    // walks a quarter of the outline on a grid of half pixels (Bresenham) and mirrors it
    const a = x1 - x0;
    const b = y1 - y0;
    if (a < 0 || b < 0) {
      return;
    }
    const a2 = a * a;
    const b2 = b * b;
    const delta = (x: number, y: number) => Math.abs(a2 * y * y + b2 * x * x - a2 * b2);
    let cx = a;
    let cy = b % 2;
    for (;;) {
      // the first point of a row is its widest
      for (const y of cy > 0 ? [cy, -cy] : [cy]) {
        this.hline(x0 + ((a - cx) >> 1), x0 + ((a + cx) >> 1), y0 + ((y + b) >> 1), color);
      }
      const row = cy;
      while (cy === row) {
        if (cx === a % 2 && cy === b) {
          return;
        }
        let nx = cx;
        let ny = cy + 2;
        let best = delta(nx, ny);
        if (cx > 1) {
          let other = delta(cx - 2, cy + 2);
          if (best > other) {
            nx = cx - 2;
            ny = cy + 2;
            best = other;
          }
          other = delta(cx - 2, cy);
          if (best > other) {
            nx = cx - 2;
            ny = cy;
          }
        }
        cx = nx;
        cy = ny;
      }
    }
  }

  /** A filled polygon through the points given, as [x, y] each. */
  polygon(points: readonly (readonly [number, number])[], color: Color): void {
    // row by row: where the edges cross the row, and a line between each pair of crossings
    const edges: { ymin: number; ymax: number; x0: number; y0: number; dx: number }[] = [];
    let ymin = this.height - 1;
    let ymax = 0;
    points.forEach(([x0, y0], i) => {
      const [x1, y1] = points[(i + 1) % points.length];
      ymin = Math.min(ymin, y0, y1);
      ymax = Math.max(ymax, y0, y1);
      if (y0 === y1) {
        this.hline(Math.min(x0, x1), Math.max(x0, x1), y0, color);
      } else {
        edges.push({ ymin: Math.min(y0, y1), ymax: Math.max(y0, y1), x0, y0, dx: (x1 - x0) / (y1 - y0) });
      }
    });
    ymin = Math.max(ymin, 0);
    ymax = Math.min(ymax, this.height);
    const at = (edge: (typeof edges)[number], y: number) => (y - edge.y0) * edge.dx + edge.x0;
    for (let y = ymin; y <= ymax; y++) {
      const xx: number[] = [];
      edges.forEach((current, i) => {
        if (y < current.ymin || y > current.ymax) {
          return;
        }
        xx.push(at(current, y));
        if (y === current.ymax && y < ymax) {
          // Needed to draw consistent polygons
          xx.push(xx.at(-1)!);
        } else if ((y === current.ymin || y === current.ymax) && current.dx !== 0) {
          // Connect discontiguous corners
          const last = xx.length - 1;
          for (const other of edges.slice(0, i)) {
            if ((y !== other.ymin && y !== other.ymax) || other.dx === 0) {
              continue;
            }
            if (cRound(xx[last]) !== cRound(at(other, y))) {
              continue;
            }
            // the two edges join to make a corner: look at the next row, or at the one before
            const next = y + (y === current.ymax ? -1 : 1);
            if (next < other.ymin || next > other.ymax) {
              continue;
            }
            const mine = at(current, next);
            const theirs = at(other, next);
            if (xx[last] > mine + 1 && xx[last] > theirs + 1) {
              xx[last] = cRound(Math.max(mine, theirs)) + 1;
            } else if (xx[last] < mine - 1 && xx[last] < theirs - 1) {
              xx[last] = cRound(Math.min(mine, theirs)) - 1;
            }
            break;
          }
        }
      });
      xx.sort((p, q) => p - q);
      for (let i = 1; i < xx.length; i += 2) {
        this.hline(roundUp(xx[i - 1]), roundDown(xx[i]), y, color);
      }
    }
  }

  // ---------- Putting pictures together ----------

  /** Copies a picture to (x, y), transparency and all. */
  blit(source: Image, x: number, y: number): void {
    this.each(source, x, y, (to, from) => {
      this.data.set(source.data.subarray(from, from + 4), to);
    });
  }

  /** Pastes a picture onto an opaque one at (x, y): where it is transparent, what is there stays. */
  paste(source: Image, x: number, y: number): void {
    const data = this.data;
    this.each(source, x, y, (to, from) => {
      const mask = source.data[from + 3];
      for (let c = 0; c < 3; c++) {
        data[to + c] = div255(data[to + c] * (255 - mask) + source.data[from + c] * mask);
      }
    });
  }

  /** Lays a picture over this one at (x, y), both with their transparency. */
  alphaComposite(source: Image, x = 0, y = 0): void {
    const data = this.data;
    this.each(source, x, y, (to, from) => {
      const alpha = source.data[from + 3];
      if (alpha === 0) {
        return;
      }
      // whole numbers with 7 bits more, and divisions that round
      const sum = alpha * 255 + data[to + 3] * (255 - alpha);
      const coef1 = Math.floor(alpha * 255 * 255 * 128 / sum);
      const coef2 = 255 * 128 - coef1;
      for (let c = 0; c < 3; c++) {
        const tmp = source.data[from + c] * coef1 + data[to + c] * coef2 + (0x80 << 7);
        data[to + c] = (((tmp >>> 8) + tmp) >>> 8) >>> 7;
      }
      data[to + 3] = div255(sum);
    });
  }

  /** Calls `pixel` with the positions in both buffers for every pixel of `source` that lands on this picture. */
  private each(source: Image, x: number, y: number, pixel: (to: number, from: number) => void): void {
    for (let sy = Math.max(0, -y); sy < Math.min(source.height, this.height - y); sy++) {
      for (let sx = Math.max(0, -x); sx < Math.min(source.width, this.width - x); sx++) {
        pixel(((y + sy) * this.width + x + sx) * 4, (sy * source.width + sx) * 4);
      }
    }
  }

  // ---------- Pictures made from this one ----------

  /** Every color channel put through a function (0–255 in, 0–255 out); transparency stays. */
  mapped(channel: (value: number) => number): Image {
    const table = Uint8Array.from({ length: 256 }, (_, value) => channel(value));
    const out = this.copy();
    for (let i = 0; i < out.data.length; i += 4) {
      out.data[i] = table[out.data[i]];
      out.data[i + 1] = table[out.data[i + 1]];
      out.data[i + 2] = table[out.data[i + 2]];
    }
    return out;
  }

  mirrored(): Image {
    const out = new Image(this.width, this.height);
    const pixels = new Uint32Array(this.data.buffer, this.data.byteOffset, this.width * this.height);
    const target = new Uint32Array(out.data.buffer);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        target[y * this.width + x] = pixels[y * this.width + this.width - 1 - x];
      }
    }
    return out;
  }

  /** Scaled to another size without smoothing (nearest neighbour). */
  resized(width: number, height: number): Image {
    const out = new Image(width, height);
    for (let y = 0; y < height; y++) {
      const yin = Math.floor((y + 0.5) * this.height / height);
      for (let x = 0; x < width; x++) {
        const xin = Math.floor((x + 0.5) * this.width / width);
        out.data.set(this.data.subarray((yin * this.width + xin) * 4, (yin * this.width + xin) * 4 + 4),
          (y * width + x) * 4);
      }
    }
    return out;
  }

  /** Rotated counter-clockwise by `angle` degrees around `center`, without smoothing; the size stays. */
  rotated(angle: number, center: readonly [number, number]): Image {
    const radians = -angle * (Math.PI / 180);
    // a quarter turn is exactly a quarter turn: no 6e-17 where a 0 belongs
    const exact = (value: number): number => Math.round(value * 1e12) / 1e12;
    const cos = exact(Math.cos(radians));
    const sin = exact(Math.sin(radians));
    const out = new Image(this.width, this.height);
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        // the middle of the pixel, turned back to the pixel of this picture that it shows
        const dx = x + 0.5 - center[0];
        const dy = y + 0.5 - center[1];
        const xin = Math.floor(center[0] + cos * dx + sin * dy);
        const yin = Math.floor(center[1] - sin * dx + cos * dy);
        if (xin >= 0 && xin < this.width && yin >= 0 && yin < this.height) {
          out.data.set(this.data.subarray((yin * this.width + xin) * 4, (yin * this.width + xin) * 4 + 4),
            (y * out.width + x) * 4);
        }
      }
    }
    return out;
  }
}

/** A tie goes away from zero. */
function cRound(x: number): number {
  return Math.sign(x) * Math.floor(Math.abs(x) + 0.5);
}

// The ends of a scan line in a polygon: 2.5 starts at 3 and ends at 2
function roundUp(x: number): number {
  const half = Math.floor(Math.abs(x) + 0.5);
  return x >= 0 ? half : -half;
}

function roundDown(x: number): number {
  const half = Math.ceil(Math.abs(x) - 0.5);
  return x >= 0 ? half : -half;
}
