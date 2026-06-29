import { Module } from "@nestjs/common";
import { TransportModule } from "../transport/transport.module";
import { TripsController } from "./trips.controller";
import { TripPlanningUseCase } from "./use-cases/trip-planning.use-case";

@Module({
    imports: [TransportModule],
    controllers: [TripsController],
    providers: [TripPlanningUseCase],
})
export class TripsModule {}