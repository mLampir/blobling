/**
 * Seeded random numbers: the same seed always gives the same numbers.
 *
 * Everything random in the game is seeded with a time, so that catching up after a break gives
 * the same result as running non-stop: what happened at a station of a trip is worked out again
 * from its time.
 */

const TWO_32 = 4294967296;

export class Random {
  // the state of the generator (sfc32)
  private a: number;
  private b: number;
  private c: number;
  private d = 1;

  /** `seed`: a number or a text; seeds that differ in one digit give unrelated numbers. */
  constructor(seed: number | string) {
    // the seed is hashed (xmur3) into the three words the generator starts from
    const text = String(seed);
    let h = 1779033703 ^ text.length;
    for (let i = 0; i < text.length; i++) {
      h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    const word = (): number => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
    this.a = word();
    this.b = word();
    this.c = word();
    for (let i = 0; i < 12; i++) {
      this.next();
    }
  }

  /** A whole number from 0 up to, but not including, 2^32. */
  private next(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) + t | 0;
    return t >>> 0;
  }

  /** A number from 0 up to, but not including, 1. */
  random(): number {
    return this.next() / TWO_32;
  }

  uniform(low: number, high: number): number {
    return low + (high - low) * this.random();
  }

  /** A whole number from low to high, both included. */
  randint(low: number, high: number): number {
    return low + Math.floor(this.random() * (high - low + 1));
  }

  choice<T>(options: readonly T[]): T {
    return options[Math.floor(this.random() * options.length)];
  }

  /** One of the options, each as likely as its weight says. */
  weighted<T>(options: readonly T[], weights: readonly number[]): T {
    let x = this.random() * weights.reduce((sum, weight) => sum + weight, 0);
    for (let i = 0; i < options.length - 1; i++) {
      x -= weights[i];
      if (x < 0) {
        return options[i];
      }
    }
    return options[options.length - 1];
  }
}
