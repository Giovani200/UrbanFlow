import type { TripMode, TripRoute, TripSegment } from "@urbanflow/app-front-back-lib";
import { CARBON_FACTORS } from "../../shared/constants";
import type { TransitItinerary } from "../transport/transit.providers";

export function segmentCarbonGrams(mode: TripMode, distanceMeters: number): number {
    return (distanceMeters / 1000) * CARBON_FACTORS[mode];
}

/** CO₂ évité par rapport au même segment parcouru en voiture solo. */
export function savedVersusCarGrams(carbonGrams: number, distanceMeters: number): number {
    const carReferenceGrams = (distanceMeters / 1000) * CARBON_FACTORS.car;
    return Math.max(0, carReferenceGrams - carbonGrams);
}

/** Itinéraire de transport en commun vers le contrat client, carbone compris. Le score reste à 0 (non classé). */
export function toTransitTripRoute(itinerary: TransitItinerary): TripRoute {
    const segments: TripSegment[] = itinerary.legs.map((leg) => {
        const carbonGrams = segmentCarbonGrams(leg.mode, leg.distanceMeters);
        return {
            mode: leg.mode,
            geometry: leg.geometry,
            durationSeconds: leg.durationSeconds,
            distanceMeters: leg.distanceMeters,
            carbonGrams,
            savedGrams: savedVersusCarGrams(carbonGrams, leg.distanceMeters),
            departureStopName: leg.departureStopName,
            arrivalStopName: leg.arrivalStopName,
            lineShortName: leg.lineShortName,
            lineId: leg.lineId,
            lineColor: leg.lineColor,
            lineTextColor: leg.lineTextColor,
            intermediateStops: leg.intermediateStops,
            dataFreshness: leg.dataFreshness,
            scheduledDepartureTime: leg.scheduledDepartureTime,
            expectedDepartureTime: leg.expectedDepartureTime,
            scheduledArrivalTime: leg.scheduledArrivalTime,
            expectedArrivalTime: leg.expectedArrivalTime,
            platform: leg.platform,
            departureStopPointRef: leg.departureStopPointRef,
            arrivalStopPointRef: leg.arrivalStopPointRef,
        };
    });

    return {
        segments,
        totalDurationSeconds: itinerary.durationSeconds,
        totalDistanceMeters: segments.reduce((total, segment) => total + segment.distanceMeters, 0),
        totalCarbonGrams: segments.reduce((total, segment) => total + segment.carbonGrams, 0),
        totalSavedGrams: segments.reduce((total, segment) => total + segment.savedGrams, 0),
        score: 0,
        departureTime: itinerary.departureTime,
        arrivalTime: itinerary.arrivalTime,
    };
}

export function hasTransitLeg(itinerary: TransitItinerary): boolean {
    return itinerary.legs.some((leg) => leg.mode !== "walk");
}

export type DatedItinerary = TransitItinerary & { departureTime: string; arrivalTime: string };

export function datedTransitItineraries(itineraries: TransitItinerary[]): DatedItinerary[] {
    return itineraries.filter(
        (itinerary): itinerary is DatedItinerary =>
            hasTransitLeg(itinerary) && itinerary.departureTime !== undefined && itinerary.arrivalTime !== undefined,
    );
}

export function latestDeparture(itineraries: DatedItinerary[]): DatedItinerary | null {
    return itineraries.reduce<DatedItinerary | null>(
        (latest, itinerary) =>
            !latest || Date.parse(itinerary.departureTime) > Date.parse(latest.departureTime) ? itinerary : latest,
        null,
    );
}

export function earliestArrival(itineraries: DatedItinerary[]): DatedItinerary | null {
    return itineraries.reduce<DatedItinerary | null>(
        (earliest, itinerary) =>
            !earliest || Date.parse(itinerary.arrivalTime) < Date.parse(earliest.arrivalTime) ? itinerary : earliest,
        null,
    );
}
