// What the build hands the app from the repo's files (tools/build.mjs, appFiles).

declare module "blobling:locales" {
  /** Every language file of app/locales/: code -> content. */
  const locales: Record<string, object>;
  export default locales;
}

declare module "blobling:sheets" {
  /** Every sprite sheet of app/pet/assets/ by its name: the JSON and the picture as base64. */
  const sheets: Record<string, { data: import("../../core/src/sprites").SheetData; png: string }>;
  export default sheets;
}

declare module "blobling:sounds" {
  /** Every sound of app/pet/sounds/ by its name: the WAV file as base64. */
  const sounds: Record<string, string>;
  export default sounds;
}

/** The app's version ("1.2.0") in a build for the stores, "" otherwise (tools/build.mjs). */
declare const __APP_VERSION__: string;
