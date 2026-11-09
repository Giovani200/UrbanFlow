import { Controller, Get, Param, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { NearbyTransportDtoOut, StopDeparturesDtoOut } from "@urbanflow/app-front-back-lib";
import { GetNearbyTransportUseCase } from "./use-cases/get-nearby-transport.use-case";
import { GetStopDeparturesUseCase } from "./use-cases/get-stop-departures.use-case";

@Controller("transport")
export class TransportController {
    constructor(
        private readonly getNearbyTransportUseCase: GetNearbyTransportUseCase,
        private readonly getStopDeparturesUseCase: GetStopDeparturesUseCase,
    ) {}

    @Get("nearby")
    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    async nearby(@Query() query: unknown): Promise<NearbyTransportDtoOut> {
        return this.getNearbyTransportUseCase.execute(query);
    }

    @Get("stops/:id/departures")
    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    async stopDepartures(@Param("id") id: string, @Query() query: object): Promise<StopDeparturesDtoOut> {
        return this.getStopDeparturesUseCase.execute({ ...query, stopId: id });
    }
}
