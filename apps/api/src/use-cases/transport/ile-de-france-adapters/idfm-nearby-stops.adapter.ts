import { Inject, Injectable } from "@nestjs/common";
import type { Coordinates, TransitLine } from "@urbanflow/app-front-back-lib";
import { CACHE_STORE, type CacheStore } from "../../../shared/cache/cache-store";
import type { NearbyStop, NearbyStopsProvider, StopQuay } from "../transit.providers";
import {
    mapNearbyStop,
    mapStopLines,
    mapStopQuays,
    NavitiaLinesResponseSchema,
    NavitiaPlacesNearbyResponseSchema,
    NavitiaRoutesResponseSchema,
    NavitiaStopPointsResponseSchema,
    type NavitiaLine,
} from "./idfm-nearby-stops.mapper";
import { PrimHttpClient } from "./prim-http-client";
import { PrimQuotas } from "./prim-quotas";

const MAX_STOPS = 10;
const MAX_QUAYS_LISTED = 100;
const MAX_ROUTES_LISTED = 200;
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

    async getNearbyStops(origin: Coordinates, radiusMeters: number): Promise<NearbyStop[]> {
        const cacheKey = `nearby:${roundForCache(origin)}:${radiusMeters}`;
        return this.cacheStore.getOrLoad(cacheKey, NEARBY_CACHE_TTL_MILLISECONDS, () =>
            this.loadNearbyStops(origin, radiusMeters),
        );
    }

    private async loadNearbyStops(origin: Coordinates, radiusMeters: number): Promise<NearbyStop[]> {
        const response = await this.primHttpClient.getJson(
            `v2/navitia/coord/${origin.longitude};${origin.latitude}/places_nearby?type[]=stop_area&distance=${radiusMeters}&count=${MAX_STOPS}`,
            NavitiaPlacesNearbyResponseSchema,
            this.primQuotas.navitia,
            "IDFM_NEARBY_FAILED",
        );
        const places = response.places_nearby ?? [];

        const [linesByPlace, routesByPlace] = await Promise.all([
            Promise.allSettled(places.map((place) => this.linesOf(place.stop_area.id))),
            Promise.allSettled(places.map((place) => this.routeIdsOf(place.stop_area.id))),
        ]);

        return places.flatMap((place, index) => {
            const lines = linesByPlace[index];
            const routes = routesByPlace[index];
            const stop = lines.status === "fulfilled" ? mapNearbyStop(place, lines.value) : null;
            return stop ? [{ ...stop, routeIds: routes.status === "fulfilled" ? routes.value : [] }] : [];
        });
    }

    private routeIdsOf(stopAreaId: string): Promise<string[]> {
        return this.cacheStore.getOrLoad(`stop-area-routes:${stopAreaId}`, STOP_LINES_CACHE_TTL_MILLISECONDS, async () => {
            const response = await this.primHttpClient.getJson(
                `v2/navitia/stop_areas/${encodeURIComponent(stopAreaId)}/routes?depth=0&count=${MAX_ROUTES_LISTED}`,
                NavitiaRoutesResponseSchema,
                this.primQuotas.navitia,
                "IDFM_STOP_ROUTES_FAILED",
            );
            return (response.routes ?? []).map((route) => route.id);
        });
    }

    async getStopLines(stopAreaId: string): Promise<TransitLine[]> {
        return mapStopLines(await this.linesOf(stopAreaId));
    }

    /** La liste des quais change rarement : elle est gardée 7 jours, comme les lignes de l'arrêt. */
    getStopQuays(stopAreaId: string): Promise<StopQuay[]> {
        return this.cacheStore.getOrLoad(`stop-area-quays:${stopAreaId}`, STOP_LINES_CACHE_TTL_MILLISECONDS, async () => {
            const response = await this.primHttpClient.getJson(
                `v2/navitia/stop_areas/${encodeURIComponent(stopAreaId)}/stop_points?count=${MAX_QUAYS_LISTED}&depth=0`,
                NavitiaStopPointsResponseSchema,
                this.primQuotas.navitia,
                "IDFM_STOP_QUAYS_FAILED",
            );
            return mapStopQuays(response);
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
