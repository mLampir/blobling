/**
 * What only the app from the stores can do (Capacitor). In a browser the same calls take the
 * browser's way.
 */

import { Capacitor } from "@capacitor/core";

/** Whether the page runs inside the app from the stores. */
export const native = Capacitor.isNativePlatform();

/** Where the phone is, as [latitude, longitude]. Throws if it can't tell (or may not). */
export function locate(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("no geolocation"));
      return;
    }
    // coarse is enough for the weather, and quicker
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.latitude, coords.longitude]),
      (error) => reject(new Error(error.message)),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 3600_000 },
    );
  });
}
