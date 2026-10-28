import { Inject, Injectable } from "@nestjs/common";
import type { Coordinates, PlannedTime } from "@urbanflow/app-front-back-lib";
import { CACHE_STORE, type CacheStore } from "../../../shared/cache/cache-store";
import { toNavitiaDateTime } from "../../../shared/time/paris-time";
import type { TransitItinerary, TransitRoutingProvider } from "../transit.providers";
import { mapJourney, NavitiaJourneysResponseSchema } from "./idfm-journeys.mapper";
import { PrimHttpClient } from "./prim-http-client";
import { PrimQuotas } from "./prim-quotas";

const ITINERARY_COUNT = "5";
const ITINERARY_CACHE_TTL_MILLISECONDS = 60_000;
const CACHE_GRID_STEPS_PER_DEGREE = 2000;
const NAVITIA_NO_SOLUTION_STATUS = 404;

function roundForCache(coordinates: Coordinates): string {
    const latitude = Math.round(coordinates.latitude * CACHE_GRID_STEPS_PER_DEGREE) / CACHE_GRID_STEPS_PER_DEGREE;
    const longitude = Math.round(coordinates.longitude * CACHE_GRID_STEPS_PER_DEGREE) / CACHE_GRID_STEPS_PER_DEGREE;
    return `${latitude},${longitude}`;
}

function currentMinute(): string {
    return new Date().toISOString().slice(0, 16);
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
        const parameters = new URLSearchParams({
            from: `${origin.longitude};${origin.latitude}`,
            to: `${destination.longitude};${destination.latitude}`,
            count: ITINERARY_COUNT,
            data_freshness: "realtime",
            disable_disruption: "true",
            wheelchair: String(wheelchairAccess),
        });
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

        const response = await this.cacheStore.getOrLoad(cacheKey, ITINERARY_CACHE_TTL_MILLISECONDS, () =>
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
