import type { Image } from "../../core/src/image";

/** A picture of the core as something a canvas can show. */
export function imageData(image: Image): ImageData {
  return new ImageData(new Uint8ClampedArray(image.data.buffer as ArrayBuffer, image.data.byteOffset, image.data.length),
    image.width, image.height);
}
