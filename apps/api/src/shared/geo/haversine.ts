import type { Coordinates } from "@urbanflow/app-front-back-lib";

// Distance à vol d'oiseau entre deux points (formule de haversine), en mètres.
export function haversineMeters(from: Coordinates, to: Coordinates): number {
    const earthRadiusMeters = 6_371_000;
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
    const deltaLatitude = toRadians(to.latitude - from.latitude);
    const deltaLongitude = toRadians(to.longitude - from.longitude);
    const fromLatitude = toRadians(from.latitude);
    const toLatitude = toRadians(to.latitude);
    const a =
        Math.sin(deltaLatitude / 2) ** 2 +
        Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;
    return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}
