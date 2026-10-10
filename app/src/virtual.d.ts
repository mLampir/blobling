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
