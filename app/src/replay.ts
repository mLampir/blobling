/**
 * A scuffle (or a show at the trick festival) watched again: the scene of the core draws it once more from what was kept of it
 * (state.replays), the way the panel showed it on the trip. It runs in the page, so it plays on
 * the phone whether the pet lives there or on a Pi.
 */

import { PetScene, type SceneView, type TripView } from "../../core/src/scene";
import type { Location } from "../../core/src/sun";
import { sceneAssets } from "./assets";
import { imageData } from "./canvas";

const SIZE = 64;

/** A scuffle as the page gets it (Pet.describe: replays). */
export interface Replay {
  at: number;
  area: string;
  foe: string;
  rounds: unknown[][];
  outcome: string;
  item: string | null;
  species: string;
  stage: string;
  hat: string;
  weather: number | null;
  /** "festival": a show at the trick festival, with the wild pets of its jury. */
  kind?: string;
  jury?: string[];
}

function tripView(replay: Replay, age: number): TripView {
  return {
    area: replay.area, returning: false, event: replay.kind === "festival" ? "festival" : "battle", item: replay.item,
    event_age: age, foe: replay.foe, rounds: replay.rounds, outcome: replay.outcome, jury: replay.jury ?? null,
  };
}

function sceneView(replay: Replay, age: number): SceneView {
  return {
    species: replay.species, stage: replay.stage, asleep: false, sick: false, poops: 0, activity: "idle",
    mood: "normal", needs: [], activity_until: 0, activity_item: "", hat: replay.hat || null,
    trip: tripView(replay, age),
  };
}

/**
 * Plays the scuffles on `canvas`, one after the other. `onChange(i, over)` is told when the i-th
 * begins, and again once its rounds are over and it shows how it ended; `onEnd` when the last one
 * is over. Returns a function that stops it.
 */
export function playReplays(canvas: HTMLCanvasElement, replays: readonly Replay[], location: Location,
    onChange: (index: number, over: boolean) => void, onEnd: () => void): () => void {
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d")!;
  let index = -1;
  let scene: PetScene;
  let started = 0;
  let over = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const begin = (): boolean => {
    index += 1;
    if (index >= replays.length) {
      onEnd();
      return false;
    }
    scene = new PetScene(SIZE, SIZE, sceneAssets(), { location });
    started = performance.now() / 1000;
    over = false;
    onChange(index, over);
    return true;
  };

  const frame = (): void => {
    let age = performance.now() / 1000 - started;
    if (age >= PetScene.battleSeconds(tripView(replays[index], age))) {
      if (!begin()) {
        return; // the last picture stays
      }
      age = 0;
    }
    const replay = replays[index];
    if (!over && age >= PetScene.roundsOver(tripView(replay, age))) {
      over = true;
      onChange(index, over);
    }
    let delay = 1;
    try {
      // the sky and the weather of the moment it happened
      const [image, next] = scene.render(sceneView(replay, age), { code: replay.weather },
        new Date((replay.at + age) * 1000));
      context.putImageData(imageData(image), 0, 0);
      delay = next;
    } catch (error) {
      console.error("Playing the scuffle back failed", error);
    }
    timer = setTimeout(frame, delay * 1000);
  };

  if (begin()) {
    frame();
  }
  return () => clearTimeout(timer);
}
