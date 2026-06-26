import { Module } from "@nestjs/common";
import { TransportController } from "./transport.controller";
import { PlanRouteUseCase } from "./plan-route.use-case";

@Module({
    controllers: [TransportController],
    providers: [PlanRouteUseCase],
})
export class TransportModule {}
