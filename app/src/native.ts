/**
 * What only the app from the stores can do (Capacitor). In a browser the same calls take the
 * browser's way.
 */

import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

/** Whether the page runs inside the app from the stores. */
export const native = Capacitor.isNativePlatform();

/**
 * Where the phone is, as [latitude, longitude]. Throws if it can't tell (or may not).
 *
 * In the app through Capacitor's Geolocation, not the WebView's navigator.geolocation: on iOS the
 * WebView would ask a second time on its own ("localhost would like to use your location"), and
 * on Android it would also ask for the precise location. Approximate is enough for the weather.
 */
export async function locate(): Promise<[number, number]> {
  const { coords } = await Geolocation.getCurrentPosition(
    { enableHighAccuracy: false, timeout: 15_000, maximumAge: 3600_000 });
  return [coords.latitude, coords.longitude];
}
