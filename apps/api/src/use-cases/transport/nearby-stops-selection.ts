interface StopWithDirections {
    id: string;
    distanceMeters: number;
    routeIds: string[];
}

/**
 * Les arrêts à lister autour de soi : du plus proche au plus loin, on garde ceux qui desservent au moins une ligne et un
 * sens pas encore couverts. C'est le sens qui compte, pas la ligne : 5 arrêts sur 29 du 3601 n'en desservent qu'un seul.
 * Un arrêt aux directions inconnues est gardé, pour ne pas cacher un transport à cause d'une panne.
 */
export function stopsServingNewDirections(stops: StopWithDirections[]): string[] {
    const coveredRouteIds = new Set<string>();
    const listedStopIds: string[] = [];

    for (const stop of [...stops].sort((first, second) => first.distanceMeters - second.distanceMeters)) {
        const servesNewDirection = stop.routeIds.length === 0 || stop.routeIds.some((routeId) => !coveredRouteIds.has(routeId));
        if (servesNewDirection) {
            listedStopIds.push(stop.id);
            stop.routeIds.forEach((routeId) => coveredRouteIds.add(routeId));
        }
    }
    return listedStopIds;
}
