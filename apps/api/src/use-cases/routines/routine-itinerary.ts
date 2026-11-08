import type { RoutineNotice } from "@urbanflow/app-front-back-lib";
import type { LineNotice, TransitItinerary } from "../transport/transit.providers";
import { datedTransitItineraries, latestDeparture, type DatedItinerary } from "../trips/trip-route.mapper";

const FAR_EARLIER_THRESHOLD_MILLISECONDS = 30 * 60_000;
const MAX_NOTICES = 2;

/**
 * Le trajet emprunte exactement les lignes mémorisées, dans l'ordre. Navitia renvoie aussi des trajets qui en sautent
 * une, par exemple en remplaçant le bus par 17 min de marche : ce ne serait plus le trajet habituel.
 */
export function usesExactlyLines(itinerary: TransitItinerary, lineIds: string[]): boolean {
    const usedLineIds = itinerary.legs.filter((leg) => leg.mode !== "walk").map((leg) => leg.lineId);
    return usedLineIds.length === lineIds.length && usedLineIds.every((lineId, index) => lineId === lineIds[index]);
}

/** Le trajet qui part le plus tard en arrivant à l'heure : c'est le « Partir à » de la routine. */
export function latestArrivingBefore(itineraries: TransitItinerary[], arrivalLimit: Date): DatedItinerary | null {
    const onTime = datedTransitItineraries(itineraries).filter(
        (itinerary) => Date.parse(itinerary.arrivalTime) <= arrivalLimit.getTime(),
    );
    return latestDeparture(onTime);
}

/**
 * Un départ bien plus tôt que d'habitude signale une perturbation : si une ligne est coupée à cette heure, le calcul
 * remonte jusqu'au dernier passage avant la coupure au lieu de répondre qu'il n'y a pas de trajet.
 */
export function isFarEarlier(itinerary: DatedItinerary, usualDeparture: Date): boolean {
    return usualDeparture.getTime() - Date.parse(itinerary.departureTime) > FAR_EARLIER_THRESHOLD_MILLISECONDS;
}

/** Les messages des lignes mémorisées dont une période couvre l'heure du trajet. La période fait foi, pas le statut. */
export function applicableNotices(notices: LineNotice[], lineIds: string[], atIso: string): RoutineNotice[] {
    const at = Date.parse(atIso);
    const seen = new Set<string>();
    const applicable: RoutineNotice[] = [];

    for (const notice of notices) {
        const key = `${notice.lineId}:${notice.text}`;
        const isCovering = notice.periods.some(({ begin, end }) => Date.parse(begin) <= at && at <= Date.parse(end));
        if (lineIds.includes(notice.lineId) && isCovering && !seen.has(key)) {
            seen.add(key);
            applicable.push({ lineShortName: notice.lineShortName, text: notice.text });
        }
    }
    return applicable.slice(0, MAX_NOTICES);
}
