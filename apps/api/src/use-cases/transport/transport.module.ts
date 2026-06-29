import { Module } from "@nestjs/common";
import { OrsRoutingAdapter } from "./openRouteService-routing.adapter";
import { OtpRoutingAdapter } from "./openTripPlanner-routing.adapter";

@Module({
    providers: [OrsRoutingAdapter, OtpRoutingAdapter],
    exports: [OrsRoutingAdapter, OtpRoutingAdapter],
})
export class TransportModule {}