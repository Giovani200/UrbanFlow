import { Module } from "@nestjs/common";
import { OrsRoutingAdapter } from "./openRouteService-routing.adapter";
import { OtpRoutingAdapter } from "./grenoble-adapters/openTripPlanner-routing.adapter";
import { MetromobiliteStopsAdapter } from "./grenoble-adapters/metromobilite-stops.adapter";
import { VoiGbfsAdapter } from "./grenoble-adapters/voi-gbfs.adapter";
import { TransportController } from "./transport.controller";
import { GetNearbyTransportUseCase } from "./use-cases/get-nearby-transport.use-case";

@Module({
    controllers: [TransportController],
    providers: [
        OrsRoutingAdapter,
        OtpRoutingAdapter,
        MetromobiliteStopsAdapter,
        VoiGbfsAdapter,
        GetNearbyTransportUseCase,
    ],
    exports: [OrsRoutingAdapter, OtpRoutingAdapter],
})
export class TransportModule {}
