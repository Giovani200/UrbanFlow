import { Inject, Injectable } from "@nestjs/common";
import type { Coordinates, PlannedTime } from "@urbanflow/app-front-back-lib";
import { CACHE_STORE, type CacheStore } from "../../../shared/cache/cache-store";
import { toNavitiaDateTime } from "../../../shared/time/paris-time";
import type { TransitItinerary, TransitRoutingProvider } from "../transit.providers";
import { mapJourney, NavitiaJourneysResponseSchema } from "./idfm-journeys.mapper";
import { PrimHttpClient } from "./prim-http-client";
import { PrimQuotas } from "./prim-quotas";

const ITINERARY_COUNT = "5";
const LATE_ITINERARY_COUNT = "3";
const ITINERARY_CACHE_TTL_MILLISECONDS = 60_000;
const LATE_ITINERARY_CACHE_TTL_MILLISECONDS = 120_000;
const CACHE_GRID_STEPS_PER_DEGREE = 2000;
const NAVITIA_NO_SOLUTION_STATUS = 404;
/** Sans ce plafond explicite, Navitia ne trouve pas un trajet qui arrive plusieurs heures avant l'heure limite. */
const MAX_JOURNEY_DURATION_SECONDS = "86400";

function roundForCache(coordinates: Coordinates): string {
    const latitude = Math.round(coordinates.latitude * CACHE_GRID_STEPS_PER_DEGREE) / CACHE_GRID_STEPS_PER_DEGREE;
    const longitude = Math.round(coordinates.longitude * CACHE_GRID_STEPS_PER_DEGREE) / CACHE_GRID_STEPS_PER_DEGREE;
    return `${latitude},${longitude}`;
}

function currentMinute(): string {
    return new Date().toISOString().slice(0, 16);
}

function baseParameters(
    origin: Coordinates,
    destination: Coordinates,
    wheelchairAccess: boolean,
    count: string,
): URLSearchParams {
    return new URLSearchParams({
        from: `${origin.longitude};${origin.latitude}`,
        to: `${destination.longitude};${destination.latitude}`,
        count,
        data_freshness: "realtime",
        disable_disruption: "true",
        wheelchair: String(wheelchairAccess),
    });
}

@Injectable()
export class IdfmJourneysAdapter implements TransitRoutingProvider {
    constructor(
        private readonly primHttpClient: PrimHttpClient,
        private readonly primQuotas: PrimQuotas,
        @Inject(CACHE_STORE) private readonly cacheStore: CacheStore,
    ) {}

    async getItineraries(
        origin: Coordinates,
        destination: Coordinates,
        wheelchairAccess: boolean,
        plannedTime?: PlannedTime,
    ): Promise<TransitItinerary[]> {
        const parameters = baseParameters(origin, destination, wheelchairAccess, ITINERARY_COUNT);
        if (plannedTime) {
            parameters.set("datetime", toNavitiaDateTime(plannedTime.dateTime));
            parameters.set("datetime_represents", plannedTime.mode === "arrival" ? "arrival" : "departure");
        }

        const cacheKey = [
            "journeys",
            roundForCache(origin),
            roundForCache(destination),
            wheelchairAccess,
            plannedTime?.mode ?? "now",
            plannedTime?.dateTime ?? currentMinute(),
        ].join(":");

        return this.fetchItineraries(parameters, cacheKey, ITINERARY_CACHE_TTL_MILLISECONDS);
    }

    async getItinerariesArrivingBefore(
        origin: Coordinates,
        destination: Coordinates,
        wheelchairAccess: boolean,
        arrivalLimit: string,
        excludedLineIds: string[],
    ): Promise<TransitItinerary[]> {
        const parameters = baseParameters(origin, destination, wheelchairAccess, LATE_ITINERARY_COUNT);
        parameters.set("datetime", toNavitiaDateTime(arrivalLimit));
        parameters.set("datetime_represents", "arrival");
        parameters.set("max_duration", MAX_JOURNEY_DURATION_SECONDS);
        for (const lineId of excludedLineIds) {
            parameters.append("forbidden_uris[]", `line:IDFM:${lineId}`);
        }

        const cacheKey = ["journeys-before", roundForCache(origin), roundForCache(destination), wheelchairAccess, arrivalLimit].join(":");
        return this.fetchItineraries(parameters, cacheKey, LATE_ITINERARY_CACHE_TTL_MILLISECONDS);
    }

    async getItinerariesDepartingFrom(
        origin: Coordinates,
        destination: Coordinates,
        wheelchairAccess: boolean,
        departureFrom: string,
    ): Promise<TransitItinerary[]> {
        const parameters = baseParameters(origin, destination, wheelchairAccess, LATE_ITINERARY_COUNT);
        parameters.set("datetime", toNavitiaDateTime(departureFrom));
        parameters.set("datetime_represents", "departure");

        const cacheKey = ["journeys-from", roundForCache(origin), roundForCache(destination), wheelchairAccess, departureFrom].join(":");
        return this.fetchItineraries(parameters, cacheKey, LATE_ITINERARY_CACHE_TTL_MILLISECONDS);
    }

    private async fetchItineraries(
        parameters: URLSearchParams,
        cacheKey: string,
        ttlMilliseconds: number,
    ): Promise<TransitItinerary[]> {
        const response = await this.cacheStore.getOrLoad(cacheKey, ttlMilliseconds, () =>
            this.primHttpClient.getJson(
                `v2/navitia/journeys?${parameters.toString()}`,
                NavitiaJourneysResponseSchema,
                this.primQuotas.navitia,
                "IDFM_JOURNEYS_FAILED",
                [NAVITIA_NO_SOLUTION_STATUS],
            ),
        );

        return (response.journeys ?? [])
            .map(mapJourney)
            .filter((itinerary): itinerary is TransitItinerary => itinerary !== null);
    }
}
