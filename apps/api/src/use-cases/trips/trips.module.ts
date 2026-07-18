import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TransportModule } from "../transport/transport.module";
import { TripsController } from "./trips.controller";
import { TripPlanningUseCase } from "./use-cases/trip-planning.use-case";
import { RecordTripUseCase } from "./use-cases/record-trip.use-case";
import { ListTripsUseCase } from "./use-cases/list-trips.use-case";

@Module({
    imports: [TransportModule, PassportModule],
    controllers: [TripsController],
    providers: [TripPlanningUseCase, RecordTripUseCase, ListTripsUseCase],
})
export class TripsModule {}