import type { Coordinates, TransitStatus } from "@urbanflow/app-front-back-lib";
import { toParisLocalMinute } from "../../shared/time/paris-time";
import type { TransitRoutingProvider } from "../transport/transit.providers";
import { datedTransitItineraries, earliestArrival, type DatedItinerary } from "./trip-route.mapper";

const MILLISECONDS_PER_MINUTE = 60_000;

export interface PlanB {
    status: TransitStatus;
    itinerary: DatedItinerary | null;
}

/**
 * Ce qui reste si on rate ce départ : le trajet qui arrive le plus tôt parmi ceux qui partent après lui.
 * Une panne est rendue comme un statut, pour qu'elle ne fasse pas tomber le trajet principal.
 */
export async function findPlanB(
    transitRoutingProvider: TransitRoutingProvider,
    origin: Coordinates,
    destination: Coordinates,
    wheelchairAccess: boolean,
    missedDeparture: DatedItinerary,
): Promise<PlanB> {
    const missedDepartureTime = Date.parse(missedDeparture.departureTime);
    const departureFrom = toParisLocalMinute(new Date(missedDepartureTime + MILLISECONDS_PER_MINUTE));
    try {
        const itineraries = await transitRoutingProvider.getItinerariesDepartingFrom(
            origin,
            destination,
            wheelchairAccess,
            departureFrom,
        );
        const laterItineraries = datedTransitItineraries(itineraries).filter(
            (itinerary) => Date.parse(itinerary.departureTime) > missedDepartureTime,
        );
        const itinerary = earliestArrival(laterItineraries);
        return { status: itinerary ? "ok" : "no_result", itinerary };
    } catch {
        return { status: "unavailable", itinerary: null };
    }
}
