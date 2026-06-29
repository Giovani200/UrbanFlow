import { Body, Controller, Post } from "@nestjs/common";
import { TripPlanningDtoOut } from "@urbanflow/app-front-back-lib";
import { TripPlanningUseCase } from "./use-cases/trip-planning.use-case";

@Controller("trips")
export class TripsController {
    constructor(private readonly tripPlanningUseCase: TripPlanningUseCase) {}

    @Post("plan")
    async plan(@Body() body: unknown): Promise<TripPlanningDtoOut> {
        return this.tripPlanningUseCase.execute(body);
    }
}