import type { Coordinates } from "@urbanflow/app-front-back-lib";

/** Rectangle englobant l'Île-de-France, repris du journal de juin 2026 (bbox MapTiler `1.45,48.12,3.56,49.25`, élargie à 1,44). */
export const ILE_DE_FRANCE_BOUNDS = {
    minLongitude: 1.44,
    maxLongitude: 3.56,
    minLatitude: 48.12,
    maxLatitude: 49.25,
} as const;

export function isInIleDeFrance(coordinates: Coordinates): boolean {
    return (
        coordinates.longitude >= ILE_DE_FRANCE_BOUNDS.minLongitude &&
        coordinates.longitude <= ILE_DE_FRANCE_BOUNDS.maxLongitude &&
        coordinates.latitude >= ILE_DE_FRANCE_BOUNDS.minLatitude &&
        coordinates.latitude <= ILE_DE_FRANCE_BOUNDS.maxLatitude
    );
}
