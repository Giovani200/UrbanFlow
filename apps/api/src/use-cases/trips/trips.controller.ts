import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ListTripsDtoOut, RecordTripDtoOut, TripPlanningDtoOut } from "@urbanflow/app-front-back-lib";
import { TripPlanningUseCase } from "./use-cases/trip-planning.use-case";
import { RecordTripUseCase } from "./use-cases/record-trip.use-case";
import { ListTripsUseCase } from "./use-cases/list-trips.use-case";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import type { AuthenticatedUser } from "../../shared/auth/jwt.strategy";

@Controller("trips")
export class TripsController {
    constructor(
        private readonly tripPlanningUseCase: TripPlanningUseCase,
        private readonly recordTripUseCase: RecordTripUseCase,
        private readonly listTripsUseCase: ListTripsUseCase,
    ) {}

    @Post("plan")
    async plan(@Body() body: unknown): Promise<TripPlanningDtoOut> {
        return this.tripPlanningUseCase.execute(body);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    async record(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown): Promise<RecordTripDtoOut> {
        return this.recordTripUseCase.execute(user, body);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async list(@CurrentUser() user: AuthenticatedUser, @Query() query: unknown): Promise<ListTripsDtoOut> {
        return this.listTripsUseCase.execute(user, query);
    }
}