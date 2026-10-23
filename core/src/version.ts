/**
 * Versions of the releases (v1.2.0), shared by the Pi's updater (pi/src/update.ts) and the app,
 * which offers a display update only up to its own version.
 */

/** A version like v1.2.0 or v1.2.0-beta.1: its numbers, and the pre-release part (none for a final release). */
function parse(version: string): { core: number[]; pre: string[] } | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version);
  return match ? { core: match.slice(1, 4).map(Number), pre: match[4]?.split(".") ?? [] } : null;
}

/**
 * Is `latest` newer than `current`? Versions compare as in semver: v1.2.0-beta.1 comes before
 * v1.2.0, which comes before v1.2.1. A Pi on a pre-release is so never offered an older release.
 * A version that can't be read is newer whenever it is different.
 */
export function newer(latest: string, current: string): boolean {
  const a = parse(latest);
  const b = parse(current);
  if (!a || !b) {
    return latest !== current;
  }
  for (let i = 0; i < 3; i++) {
    if (a.core[i] !== b.core[i]) {
      return a.core[i] > b.core[i];
    }
  }
  if (!a.pre.length || !b.pre.length) {
    return !a.pre.length && b.pre.length > 0; // the final release comes after its betas
  }
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const [x, y] = [a.pre[i], b.pre[i]];
    if (x === undefined || y === undefined) {
      return y === undefined; // more parts come later: beta.1.1 after beta.1
    }
    if (x !== y) {
      const [xNumber, yNumber] = [/^\d+$/.test(x), /^\d+$/.test(y)];
      if (xNumber && yNumber) {
        return Number(x) > Number(y);
      }
      return xNumber === yNumber ? x > y : yNumber; // a word comes after a number
    }
  }
  return false;
}
