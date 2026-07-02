import { Controller, Get, Query } from "@nestjs/common";
import { NearbyTransportDtoOut } from "@urbanflow/app-front-back-lib";
import { GetNearbyTransportUseCase } from "./use-cases/get-nearby-transport.use-case";

@Controller("transport")
export class TransportController {
    constructor(private readonly getNearbyTransportUseCase: GetNearbyTransportUseCase) {}

    @Get("nearby")
    async nearby(@Query() query: unknown): Promise<NearbyTransportDtoOut> {
        return this.getNearbyTransportUseCase.execute(query);
    }
}
