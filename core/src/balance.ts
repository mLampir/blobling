/**
 * Balance profiles: where the pet lives changes how it is looked at.
 *
 * On the panel the pet is in sight all day; in the app it is seen only when the app is opened.
 * Values that need to differ for that live here, as factors on the values of the game, instead of
 * in forked code. The panel is the reference: all its factors are 1.
 */

export const PROFILE_NAMES = ["panel", "app"] as const;
export type ProfileName = (typeof PROFILE_NAMES)[number];

export interface Profile {
  /** Factor on how fast the needs (satiety, energy, hygiene, mood) drop. */
  decay: number;
  /** Factor on how long a trip takes (the way between the stations and the way home). */
  trip: number;
}

export const PROFILES: Record<ProfileName, Readonly<Profile>> = {
  panel: { decay: 1.0, trip: 1.0 },
  // Starting values to try out (issue #41): the needs last a third longer between two looks.
  app: { decay: 0.75, trip: 1.0 },
};

export const DEFAULT_PROFILE: ProfileName = "panel";

/** The profile of that name; an unknown name gives the panel's. */
export function profile(name: string | null | undefined): Readonly<Profile> {
  return PROFILES[name as ProfileName] ?? PROFILES[DEFAULT_PROFILE];
}
