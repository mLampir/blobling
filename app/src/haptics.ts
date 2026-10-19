/**
 * A short buzz when the pet answers. The page names what happened, not how it feels:
 *
 * - `touch`: a light tick, for a hand on the pet (a tap, a stroke) and a step of an exercise
 * - `done`: the pet did what it was asked (fed, a throw landed, a trick tried, a game over)
 * - `no`: the pet would not (a refusal)
 * - `joy`: something new (a trick learned, a big step in training, a game won)
 * - `evolve`: the press that makes it grow
 *
 * In the app from the stores this goes through Capacitor's Haptics (the iPhone has no
 * navigator.vibrate); in a browser through navigator.vibrate where there is one. The phone's own
 * setting for vibration and system haptics applies either way.
 */

import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

import { native } from "./native";

export type Feel = "touch" | "done" | "no" | "joy" | "evolve";

/** In a browser: how long it vibrates, in ms, or a pattern of on and off. */
export const PATTERNS: Record<Feel, number | number[]> = {
  touch: 10,
  done: 20,
  no: [30, 70, 30],
  joy: [40, 60, 40, 60, 120],
  evolve: [40, 60, 120],
};

/** A touch closer than this to the last buzz is left out, so stroking stays a purr and not a rattle. */
export const TOUCH_GAP_MS = 120;

/** Decides whether a buzz is played; `play` does it. Kept apart from the phone for the tests. */
export class Buzzer {
  private last = -Infinity;

  constructor(private readonly play: (feel: Feel) => void, private readonly now: () => number = Date.now) {}

  buzz(feel: Feel): void {
    const at = this.now();
    if (feel === "touch" && at - this.last < TOUCH_GAP_MS) return;
    this.last = at;
    try {
      this.play(feel);
    } catch {
      // a phone that can't buzz just doesn't
    }
  }
}

function playNative(feel: Feel): void {
  const done = feel === "touch" ? Haptics.impact({ style: ImpactStyle.Light })
    : feel === "done" ? Haptics.impact({ style: ImpactStyle.Medium })
    : feel === "evolve" ? Haptics.impact({ style: ImpactStyle.Heavy })
    : Haptics.notification({ type: feel === "no" ? NotificationType.Warning : NotificationType.Success });
  done.catch(() => {});
}

function playWeb(feel: Feel): void {
  navigator.vibrate?.(PATTERNS[feel]);
}

const buzzer = new Buzzer(native ? playNative : playWeb);

/** A short buzz for what just happened. */
export function haptic(feel: Feel): void {
  buzzer.buzz(feel);
}
