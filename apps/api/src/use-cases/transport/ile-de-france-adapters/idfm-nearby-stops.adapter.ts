import { Inject, Injectable } from "@nestjs/common";
import type { Coordinates, TransitStop } from "@urbanflow/app-front-back-lib";
import { CACHE_STORE, type CacheStore } from "../../../shared/cache/cache-store";
import type { NearbyStopsProvider } from "../transit.providers";
import {
    mapNearbyStop,
    NavitiaLinesResponseSchema,
    NavitiaPlacesNearbyResponseSchema,
    type NavitiaLine,
} from "./idfm-nearby-stops.mapper";
import { PrimHttpClient } from "./prim-http-client";
import { PrimQuotas } from "./prim-quotas";

const MAX_STOPS = 10;
const NEARBY_CACHE_TTL_MILLISECONDS = 24 * 60 * 60 * 1000;
const STOP_LINES_CACHE_TTL_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
const CACHE_GRID_STEPS_PER_DEGREE = 1000;

function roundForCache(coordinates: Coordinates): string {
    const latitude = Math.round(coordinates.latitude * CACHE_GRID_STEPS_PER_DEGREE) / CACHE_GRID_STEPS_PER_DEGREE;
    const longitude = Math.round(coordinates.longitude * CACHE_GRID_STEPS_PER_DEGREE) / CACHE_GRID_STEPS_PER_DEGREE;
    return `${latitude},${longitude}`;
}

@Injectable()
export class IdfmNearbyStopsAdapter implements NearbyStopsProvider {
    constructor(
        private readonly primHttpClient: PrimHttpClient,
        private readonly primQuotas: PrimQuotas,
        @Inject(CACHE_STORE) private readonly cacheStore: CacheStore,
    ) {}

    async getNearbyStops(origin: Coordinates, radiusMeters: number): Promise<TransitStop[]> {
        const cacheKey = `nearby:${roundForCache(origin)}:${radiusMeters}`;
        return this.cacheStore.getOrLoad(cacheKey, NEARBY_CACHE_TTL_MILLISECONDS, () =>
            this.loadNearbyStops(origin, radiusMeters),
        );
    }

    private async loadNearbyStops(origin: Coordinates, radiusMeters: number): Promise<TransitStop[]> {
        const response = await this.primHttpClient.getJson(
            `v2/navitia/coord/${origin.longitude};${origin.latitude}/places_nearby?type[]=stop_area&distance=${radiusMeters}&count=${MAX_STOPS}`,
            NavitiaPlacesNearbyResponseSchema,
            this.primQuotas.navitia,
            "IDFM_NEARBY_FAILED",
        );
        const places = response.places_nearby ?? [];

        const linesByPlace = await Promise.allSettled(places.map((place) => this.linesOf(place.stop_area.id)));

        return places.flatMap((place, index) => {
            const lines = linesByPlace[index];
            const stop = lines.status === "fulfilled" ? mapNearbyStop(place, lines.value) : null;
            return stop ? [stop] : [];
        });
    }

    private linesOf(stopAreaId: string): Promise<NavitiaLine[]> {
        return this.cacheStore.getOrLoad(`stop-area-lines:${stopAreaId}`, STOP_LINES_CACHE_TTL_MILLISECONDS, async () => {
            const response = await this.primHttpClient.getJson(
                `v2/navitia/stop_areas/${encodeURIComponent(stopAreaId)}/lines?depth=0`,
                NavitiaLinesResponseSchema,
                this.primQuotas.navitia,
                "IDFM_STOP_LINES_FAILED",
            );
            return response.lines;
        });
    }
}
