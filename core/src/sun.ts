/** Sunrise and sunset (NOAA approximation, accurate to a few minutes), and the phase of the moon. */

// Without a location in the configuration: a mid latitude, longitude from the time zone (see sunTimes)
export const FALLBACK_LATITUDE = 45.0;
export const DUSK_MINUTES = 45; // dusk is this long before and after sunset

/** [latitude, longitude] in degrees, or null if it isn't known. */
export type Location = readonly [number, number] | null;

/** A valid [latitude, longitude], or null if the values are not one. */
export function checkLocation(latitude: unknown, longitude: unknown): [number, number] | null {
  const valid = (value: unknown, limit: number): value is number =>
    typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
  return valid(latitude, 90) && valid(longitude, 180) ? [latitude, longitude] : null;
}

/** Minutes by which local time is ahead of UTC at noon of that day. */
function utcOffset(year: number, month: number, day: number): number {
  return -new Date(year, month, day, 12).getTimezoneOffset();
}

/**
 * Sunrise and sunset as minutes after midnight (local time) on the day of `date`.
 * `location`: [latitude, longitude] in degrees. Without one it is an estimate: a mid latitude
 * and the longitude that fits the time zone (noon at 12:00 standard time).
 */
export function sunTimes(date: Date, location: Location = null): [number, number] {
  const year = date.getFullYear();
  const [lat, lon] = location ?? [FALLBACK_LATITUDE, utcOffset(year, 0, 1) / 4];
  const dayOfYear = Math.round((Date.UTC(year, date.getMonth(), date.getDate()) - Date.UTC(year, 0, 1)) / 86400000);
  const g = (2 * Math.PI / 365) * dayOfYear;
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = (0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g));
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const phi = radians(lat);
  const cosHa = Math.cos(radians(90.833)) / (Math.cos(phi) * Math.cos(decl)) - Math.tan(phi) * Math.tan(decl);
  const ha = Math.acos(Math.min(1.0, Math.max(-1.0, cosHa))) * 180 / Math.PI;
  const offset = utcOffset(year, date.getMonth(), date.getDate());
  const sunrise = 720 - 4 * (lon + ha) - eqtime + offset;
  const sunset = 720 - 4 * (lon - ha) - eqtime + offset;
  return [sunrise, sunset];
}

/** Is it dusk at the time t (Unix seconds)? */
export function isDusk(t: number, location: Location = null): boolean {
  const date = new Date(t * 1000);
  const minute = date.getHours() * 60 + date.getMinutes();
  return Math.abs(minute - sunTimes(date, location)[1]) <= DUSK_MINUTES;
}

// The moon: a mean synodic month from a known new moon (6 January 2000, 18:14 UTC). Off by up to
// half a day against the real one, which is plenty for a pet.
export const SYNODIC_DAYS = 29.530588853;
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) / 1000;
export const FULL_MOON_DAYS = 1.5; // this long before and after the full moon, it counts as full

/** The phase of the moon at the time t (Unix seconds): 0 = new moon, 0.5 = full moon, back to 1. */
export function moonPhase(t: number): number {
  const days = (t - NEW_MOON) / 86400;
  return ((days / SYNODIC_DAYS) % 1 + 1) % 1;
}

/** Is it full moon at the time t (Unix seconds), give or take FULL_MOON_DAYS? */
export function isFullMoon(t: number): boolean {
  return Math.abs(moonPhase(t) - 0.5) * SYNODIC_DAYS <= FULL_MOON_DAYS;
}

/** Is the sun down at the time t (Unix seconds), between sunset and sunrise? */
export function isDark(t: number, location: Location = null): boolean {
  const date = new Date(t * 1000);
  const minute = date.getHours() * 60 + date.getMinutes();
  const [sunrise, sunset] = sunTimes(date, location);
  return minute < sunrise || minute >= sunset;
}
