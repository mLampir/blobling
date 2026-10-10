/**
 * Pixel fonts in the BDF format.
 *
 * The BDF fonts that ship with rpi-rgb-led-matrix are made for LED panels. The scene needs one
 * of them, `4x6`, for the clock and the temperature.
 */

import type { Color, Image } from "./image";

interface Glyph {
  /** How far the next character starts to the right. */
  advance: number;
  width: number;
  height: number;
  /** Where the lower left corner sits, seen from the character's origin on the baseline. */
  left: number;
  bottom: number;
  /** The rows from the top, each as a whole number with the leftmost pixel as its highest bit. */
  rows: number[];
  /** How many bits a row has (the width, filled up to whole bytes). */
  bits: number;
}

export class Font {
  private readonly glyphs = new Map<number, Glyph>();
  /** How far the baseline lies below the top of a line of text. */
  private readonly baseline: number;

  /** `text`: the content of a .bdf file. Only the characters up to 255 (Latin-1) are kept. */
  constructor(text: string) {
    let glyph: Glyph | null = null;
    let code = -1;
    let inBitmap = false;
    for (const line of text.split(/\r?\n/)) {
      const [word, ...values] = line.trim().split(/\s+/);
      if (word === "STARTCHAR") {
        glyph = { advance: 0, width: 0, height: 0, left: 0, bottom: 0, rows: [], bits: 0 };
        code = -1;
      } else if (!glyph) {
        continue;
      } else if (word === "ENCODING") {
        code = Number(values[0]);
      } else if (word === "DWIDTH") {
        glyph.advance = Number(values[0]);
      } else if (word === "BBX") {
        [glyph.width, glyph.height, glyph.left, glyph.bottom] = values.map(Number);
      } else if (word === "BITMAP") {
        inBitmap = true;
      } else if (word === "ENDCHAR") {
        if (code >= 0 && code < 256) {
          this.glyphs.set(code, glyph);
        }
        glyph = null;
        inBitmap = false;
      } else if (inBitmap && word) {
        glyph.rows.push(parseInt(word, 16));
        glyph.bits = word.length * 4;
      }
    }
    if (!this.glyphs.size) {
      throw new Error("Not a BDF font, or one without characters");
    }
    this.baseline = Math.max(0, ...[...this.glyphs.values()].map((g) => g.bottom + g.height));
  }

  /** How wide a text is, in pixels. */
  width(text: string): number {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      width += this.glyphs.get(text.charCodeAt(i))?.advance ?? 0;
    }
    return width;
  }

  /** Writes a text with the top left corner of its line at (x, y). Characters the font lacks are left out. */
  draw(image: Image, x: number, y: number, text: string, color: Color): void {
    for (let i = 0; i < text.length; i++) {
      const glyph = this.glyphs.get(text.charCodeAt(i));
      if (!glyph) {
        continue;
      }
      const top = y + this.baseline - glyph.bottom - glyph.height;
      glyph.rows.forEach((row, dy) => {
        for (let dx = 0; dx < glyph.width; dx++) {
          if (row & (1 << (glyph.bits - 1 - dx))) {
            image.point(x + glyph.left + dx, top + dy, color);
          }
        }
      });
      x += glyph.advance;
    }
  }
}
