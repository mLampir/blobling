/**
 * The street: the pets at home live in houses side by side (Pet.pets is their order). Switching
 * between them moves the camera along the street instead of cutting: the picture of one house
 * slides out and the next one slides in. The Pi does it on the panel (pi/src/display.ts), the app
 * on the phone with the same timing.
 *
 * After the last house come the places all of them share: the yard (yard.ts, with two pets or
 * more) and the training ground (ground.ts). The camera goes there and back the same way, as if
 * they were more houses.
 */

import { Image } from "./image";

export const PAN_SECONDS = 0.8; // to the house next door
export const PAN_PER_HOUSE = 0.25; // and this much longer for every house it passes on the way
export const YARD = "yard"; // where the camera is when it shows the yard, in place of a pet's id
export const GROUND = "ground"; // and the training ground
export const PLACES = [YARD, GROUND]; // the places after the last house, in their order along the street

/**
 * Where along the street `id` is: the place of its house in `ids`, or one of the places after the
 * last one (PLACES); `yard`: whether the yard is there (with two pets or more).
 */
export function place(ids: readonly string[], id: string, yard = ids.length >= 2): number {
  if (id === YARD) {
    return ids.length;
  }
  return id === GROUND ? ids.length + (yard ? 1 : 0) : ids.indexOf(id);
}

/** How long the camera takes for `steps` houses along the street (negative: back along it). */
export function panSeconds(steps: number): number {
  return PAN_SECONDS + PAN_PER_HOUSE * Math.max(0, Math.abs(steps) - 1);
}

/** How far the pan has come at `progress` (0–1 of its time): slow at the start and the end. */
export function eased(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return p * p * (3 - 2 * p);
}

/**
 * The picture while the camera moves from `from` to `to`, `progress` (0–1) of the way; `steps`
 * says the direction: further along the street (positive), the new house comes in from the right.
 */
export function pan(from: Image, to: Image, progress: number, steps: number): Image {
  const width = from.width;
  const shift = Math.round(eased(progress) * width);
  const direction = steps < 0 ? -1 : 1;
  const img = Image.filled(width, from.height, [0, 0, 0]);
  img.blit(from, -direction * shift, 0);
  img.blit(to, direction * (width - shift), 0);
  return img;
}
