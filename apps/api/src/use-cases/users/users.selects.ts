import type { Prisma } from "@prisma/client";

/** Champs des préférences exposés au client : profil, mise à jour et export RGPD. */
export const STORED_PREFERENCES_SELECT = {
    weightCarbon: true,
    weightTime: true,
    weightCost: true,
    wheelchairAccess: true,
    avoidStairs: true,
    preferredModes: true,
    monthlyGoalKg: true,
    lastDepartureDistanceMeters: true,
    lastDepartureWindowMinutes: true,
} as const satisfies Prisma.PreferencesSelect;

export const FAVORITE_ADDRESS_SELECT = {
    id: true,
    label: true,
    address: true,
    latitude: true,
    longitude: true,
    isHome: true,
} as const satisfies Prisma.FavoriteAddressSelect;
