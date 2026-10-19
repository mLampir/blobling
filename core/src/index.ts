/**
 * The core of the pet: game logic and the scene, which run anywhere, on the Pi and in the browser.
 *
 * It takes the time, the weather, the saved state and the sprite sheets as arguments and knows
 * nothing about files, networks or the panel.
 */

export * as balance from "./balance";
export * as battle from "./battle";
export * as care from "./care";
export * as habits from "./habits";
export * as home from "./home";
export * as idle from "./idle";
export * as life from "./life";
export * as model from "./model";
export * as scene from "./scene";
export * as sky from "./sky";
export * as sprites from "./sprites";
export * as sun from "./sun";
export * as trip from "./trip";
export * as wild from "./wild";
export { Font } from "./font";
export { DEFAULT_LANGUAGE, I18n, flatten, type Catalog } from "./i18n";
export { Image, lerp, type Box, type Color } from "./image";
export * from "./pet";
export { decodePng } from "./png";
export { Random } from "./random";
export { PetScene, type SceneAssets, type SceneOptions, type SceneView, type TripView, type Weather } from "./scene";
export { Sheet, type SheetData } from "./sprites";
export { STATS, fromDict, newState, toDict, type PetState, type Stat } from "./state";
