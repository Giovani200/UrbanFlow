import { Module } from "@nestjs/common";
import { CACHE_STORE } from "../../shared/cache/cache-store";
import { InMemoryCacheStore } from "../../shared/cache/in-memory-cache-store";
import { IdfmJourneysAdapter } from "./ile-de-france-adapters/idfm-journeys.adapter";
import { IdfmNearbyStopsAdapter } from "./ile-de-france-adapters/idfm-nearby-stops.adapter";
import { PrimDeparturesAdapter } from "./ile-de-france-adapters/prim-departures.adapter";
import { PrimHttpClient } from "./ile-de-france-adapters/prim-http-client";
import { PrimQuotas } from "./ile-de-france-adapters/prim-quotas";
import { OrsRoutingAdapter } from "./openRouteService-routing.adapter";
import { DEPARTURES_PROVIDER, NEARBY_STOPS_PROVIDER, TRANSIT_ROUTING_PROVIDER } from "./transit.providers";
import { TransportController } from "./transport.controller";
import { GetNearbyTransportUseCase } from "./use-cases/get-nearby-transport.use-case";

@Module({
    controllers: [TransportController],
    providers: [
        OrsRoutingAdapter,
        PrimHttpClient,
        PrimQuotas,
        { provide: CACHE_STORE, useFactory: () => new InMemoryCacheStore() },
        { provide: TRANSIT_ROUTING_PROVIDER, useClass: IdfmJourneysAdapter },
        { provide: NEARBY_STOPS_PROVIDER, useClass: IdfmNearbyStopsAdapter },
        { provide: DEPARTURES_PROVIDER, useClass: PrimDeparturesAdapter },
        GetNearbyTransportUseCase,
    ],
    exports: [OrsRoutingAdapter, TRANSIT_ROUTING_PROVIDER, DEPARTURES_PROVIDER],
})
export class TransportModule {}
