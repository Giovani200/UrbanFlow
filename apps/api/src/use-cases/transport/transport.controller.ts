import { Controller, Get, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { NearbyTransportDtoOut } from "@urbanflow/app-front-back-lib";
import { GetNearbyTransportUseCase } from "./use-cases/get-nearby-transport.use-case";

@Controller("transport")
export class TransportController {
    constructor(private readonly getNearbyTransportUseCase: GetNearbyTransportUseCase) {}

    @Get("nearby")
    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    async nearby(@Query() query: unknown): Promise<NearbyTransportDtoOut> {
        return this.getNearbyTransportUseCase.execute(query);
    }
}
