import { Module } from "@nestjs/common";
import { OrsRoutingAdapter } from "./openRouteService-routing.adapter";

@Module({
    providers: [OrsRoutingAdapter],
    exports: [OrsRoutingAdapter],
})
export class TransportModule {}