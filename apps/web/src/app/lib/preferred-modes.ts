import type { UpdatePreferencesDtoIn } from "@urbanflow/app-front-back-lib";

export type PreferredMode = NonNullable<UpdatePreferencesDtoIn["preferredModes"]>[number];

/** Modes proposés dans le profil, dans l'ordre d'affichage. La trottinette (Grenoble) n'en fait plus partie. */
export const PREFERRED_MODES: readonly PreferredMode[] = ["metro", "rer", "train", "tram", "bus", "bike", "walk"];

export const DEFAULT_PREFERRED_MODES: PreferredMode[] = ["metro", "rer", "bus"];

/** Garde les modes encore proposés, dans l'ordre reçu et sans doublon : un mode hérité disparaît au prochain enregistrement. */
export function keepKnownModes(modes: readonly string[]): PreferredMode[] {
  return [...new Set(modes)].filter(isPreferredMode);
}

function isPreferredMode(mode: string): mode is PreferredMode {
  return (PREFERRED_MODES as readonly string[]).includes(mode);
}
