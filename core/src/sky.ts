/**
 * Weather for the pet: making sense of WMO weather codes (from Open-Meteo).
 *
 * Codes: https://open-meteo.com/en/docs (WMO Weather interpretation codes). Thunderstorms count
 * as rain.
 */

/** A WMO code, or null without weather data. */
export type WeatherCode = number | null;
export type Precipitation = "rain" | "snow" | null;

export const DRIZZLE = [51, 53, 55, 56, 57];
export const RAIN = [61, 63, 65, 66, 67, 80, 81, 82];
export const SNOW = [71, 73, 75, 77, 85, 86];
export const THUNDER = [95, 96, 99];
export const FOG = [45, 48];

// Clouds per code: [large, small]
const CLOUDS = new Map<number, readonly [number, number]>([
  [1, [0, 1]], [2, [1, 1]], [3, [2, 1]],
  ...FOG.map((code) => [code, [1, 2]] as const),
  ...SNOW.map((code) => [code, [1, 1]] as const),
  ...[...DRIZZLE, ...RAIN, ...THUNDER].map((code) => [code, [2, 1]] as const),
]);

/** "rain", "snow" or null (also without weather data). */
export function precipitation(code: WeatherCode | undefined): Precipitation {
  if (code == null) {
    return null;
  }
  if (DRIZZLE.includes(code) || RAIN.includes(code) || THUNDER.includes(code)) {
    return "rain";
  }
  return SNOW.includes(code) ? "snow" : null;
}

export function isThunder(code: WeatherCode | undefined): boolean {
  return code != null && THUNDER.includes(code);
}

export function clouds(code: WeatherCode | undefined): readonly [number, number] {
  return (code != null && CLOUDS.get(code)) || [0, 0];
}

/** WMO code from the weather data ({temp: …, code: …}), or null. */
export function codeOf(weather: { code?: number | null } | null | undefined): WeatherCode {
  return weather?.code ?? null;
}

/** Temperature in °C from the weather data, or null. */
export function tempOf(weather: { temp?: number | null } | null | undefined): number | null {
  return weather?.temp ?? null;
}
