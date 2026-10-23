/** Pictures for the page, drawn by the core: the pet in a given form, and the things the player hands it. */

import { Image } from "../../core/src/image";
import { APP_BACKGROUND, PetScene } from "../../core/src/scene";
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

const OUTLINE = [128, 132, 150]; // a form only seen: its outline in one color

/** The pet in a given form on nothing (no background of the app around it): for the street. */
export function cutoutUrl(stage: string, species: string): string {
  const key = `cutout|${stage}|${species}`;
  let url = urls.get(key);
  if (!url) {
    scene ??= new PetScene(64, 64, sceneAssets());
    const data = imageData(scene.icon(40, stage, species));
    const [r, g, b] = APP_BACKGROUND;
    for (let i = 0; i < data.data.length; i += 4) {
      if (data.data[i] === r && data.data[i + 1] === g && data.data[i + 2] === b) {
        data.data[i + 3] = 0;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = data.width;
    canvas.height = data.height;
    canvas.getContext("2d")!.putImageData(data, 0, 0);
    url = canvas.toDataURL();
    urls.set(key, url);
  }
  return url;
}

/** The outline of the pet in a given form, in one color on nothing: a form the album has only seen. */
export function outlineUrl(stage: string, species: string): string {
  const key = `outline|${stage}|${species}`;
  let url = urls.get(key);
  if (!url) {
    scene ??= new PetScene(64, 64, sceneAssets());
    const data = imageData(scene.icon(40, stage, species));
    const [r, g, b] = APP_BACKGROUND;
    for (let i = 0; i < data.data.length; i += 4) {
      const background = data.data[i] === r && data.data[i + 1] === g && data.data[i + 2] === b;
      data.data.set(background ? [0, 0, 0, 0] : [...OUTLINE, 255], i);
    }
    const canvas = document.createElement("canvas");
    canvas.width = data.width;
    canvas.height = data.height;
    canvas.getContext("2d")!.putImageData(data, 0, 0);
    url = canvas.toDataURL();
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
  whistle: ["items:whistle"],
  hide: ["items:hide"],
  rod: ["items:rod"],
  // the hints in the choice of an adult form (core/src/life.ts SECOND)
  hint_heart: ["items:hint_heart"],
  hint_moon: ["items:hint_moon"],
  hint_sword: ["items:hint_sword"],
  // the training: what each exercise is about
  strength: ["items:stone"],
  speed: ["items:skill_speed"],
  smarts: ["items:skill_smarts"],
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
  bread: ["trip:bread"],
  // food from fishing
  mussel: ["trip:mussel"],
  seagrass: ["trip:seagrass"],
  // baked by Grandma
  cake: ["trip:cake"],
  // the yard at the end of the street
  yard: ["trip:trough_0_full"],
  // the playground and the training ground
  playground: ["trip:swing"],
  ground: ["trip:ground_cone"],
};

/** A thing the player hands the pet (food, the ball, the sponge, the baton, …) as a picture, or "" if there is none. */
export function thingUrl(id: string): string {
  const key = `thing|${id}`;
  let url = urls.get(key);
  if (url === undefined) {
    const parts = (THINGS[id] ?? (id.includes(":") ? [id] : [])).map((part) => { // or one picture, "sheet:tag"
      const [sheet, tag] = part.split(":");
      return sceneAssets().sheets[sheet].image(tag);
    });
    url = parts.length ? dataUrl(stack(parts)) : "";
    urls.set(key, url);
  }
  return url;
}

/**
 * Something to discover on a trip (an egg, a hat, a decoration) or an area's guardian ("foe_<id>"),
 * in its colors once found, otherwise as its outline: there is something, but not what.
 */
export function discoveryUrl(id: string, found: boolean): string {
  const key = `discovery|${id}|${found}`;
  let url = urls.get(key);
  if (url === undefined) {
    const trip = sceneAssets().sheets.trip;
    const tag = trip.has(`hat_${id}`) ? `hat_${id}` : id;
    url = trip.has(tag) ? dataUrl(stack([trip.image(tag)]), !found) : "";
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

/** `outline`: every pixel that isn't clear in one color. */
function dataUrl(image: Image, outline = false): string {
  const data = imageData(image);
  if (outline) {
    for (let i = 0; i < data.data.length; i += 4) {
      if (data.data[i + 3]) data.data.set([...OUTLINE, 255], i);
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d")!.putImageData(data, 0, 0);
  return canvas.toDataURL();
}
