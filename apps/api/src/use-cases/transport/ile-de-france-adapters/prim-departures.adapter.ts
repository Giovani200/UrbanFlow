import { Inject, Injectable } from "@nestjs/common";
import { CACHE_STORE, type CacheStore } from "../../../shared/cache/cache-store";
import type { Departure, DeparturesProvider } from "../transit.providers";
import { mapStopMonitoring, SiriStopMonitoringResponseSchema } from "./prim-departures.mapper";
import { PrimHttpClient } from "./prim-http-client";
import { PrimQuotas } from "./prim-quotas";

const DEPARTURES_CACHE_TTL_MILLISECONDS = 60_000;

@Injectable()
export class PrimDeparturesAdapter implements DeparturesProvider {
    constructor(
        private readonly primHttpClient: PrimHttpClient,
        private readonly primQuotas: PrimQuotas,
        @Inject(CACHE_STORE) private readonly cacheStore: CacheStore,
    ) {}

    /** La réponse brute est mise en cache ; la traduction est refaite à chaque lecture pour garder une fraîcheur exacte. */
    async getNextDepartures(monitoringRef: string): Promise<Departure[]> {
        const response = await this.cacheStore.getOrLoad(`departures:${monitoringRef}`, DEPARTURES_CACHE_TTL_MILLISECONDS, () =>
            this.primHttpClient.getJson(
                `stop-monitoring?MonitoringRef=${encodeURIComponent(monitoringRef)}`,
                SiriStopMonitoringResponseSchema,
                this.primQuotas.stopMonitoring,
                "PRIM_DEPARTURES_FAILED",
            ),
        );
        return mapStopMonitoring(response, new Date());
    }
}
