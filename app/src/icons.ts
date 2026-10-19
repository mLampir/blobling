/** Pictures for the page, drawn by the core: the pet in a given form, and the things the player hands it. */

import { Image } from "../../core/src/image";
import { PetScene } from "../../core/src/scene";
import { sceneAssets } from "./assets";
import { imageData } from "./canvas";

const urls = new Map<string, string>();
let scene: PetScene | null = null;

export function iconUrl(stage: string, species: string): string {
  const key = `${stage}|${species}`;
  let url = urls.get(key);
  if (!url) {
    scene ??= new PetScene(64, 64, sceneAssets());
    url = dataUrl(scene.icon(40, stage, species)); // its own size: the page scales it up without blurring
    urls.set(key, url);
  }
  return url;
}

// What a thing in the tray looks like: a picture from a sprite sheet ("sheet:tag"), or several
// stacked from the top down (a meal is the food on top of the bowl)
const THINGS: Record<string, string[]> = {
  meal: ["items:food_full", "items:bowl"],
  bag: ["items:bag"],
  ball: ["items:ball"],
  medicine: ["items:medicine"],
  sponge: ["items:sponge"],
  baton: ["items:baton"],
  backpack: ["trip:backpack"],
  seed: ["trip:seed"],
  // fruits of the plant's kinds, kept in the bag
  fruit_berry: ["trip:fruit_berry"],
  fruit_sunflower: ["trip:fruit_sunflower"],
  fruit_cherry: ["trip:fruit_cherry"],
  fruit_herb: ["trip:fruit_herb"],
  // food from trips
  honeycomb: ["trip:honeycomb"],
  hazelnut: ["trip:hazelnut"],
  watercress: ["trip:watercress"],
  glowberry: ["trip:glowberry"],
  pinenut: ["trip:pinenut"],
};

/** A thing the player hands the pet (food, the ball, the sponge, the baton, …) as a picture, or "" if there is none. */
export function thingUrl(id: string): string {
  const key = `thing|${id}`;
  let url = urls.get(key);
  if (url === undefined) {
    const parts = (THINGS[id] ?? []).map((part) => {
      const [sheet, tag] = part.split(":");
      return sceneAssets().sheets[sheet].image(tag);
    });
    url = parts.length ? dataUrl(stack(parts)) : "";
    urls.set(key, url);
  }
  return url;
}

/** Pictures on top of each other, centered, on a square with a pixel of room around them. */
function stack(parts: Image[]): Image {
  const width = Math.max(...parts.map((part) => part.width));
  const height = parts.reduce((sum, part) => sum + part.height, 0);
  const size = Math.max(width, height) + 2;
  const out = new Image(size, size);
  let y = Math.floor((size - height) / 2);
  for (const part of parts) {
    out.alphaComposite(part, Math.floor((size - part.width) / 2), y);
    y += part.height;
  }
  return out;
}

function dataUrl(image: Image): string {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d")!.putImageData(imageData(image), 0, 0);
  return canvas.toDataURL();
}
