import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CalculateCarbonDtoOut, CarbonSummaryDtoOut } from "@urbanflow/app-front-back-lib";
import { CalculateCarbonUseCase } from "./use-cases/calculate-carbon.use-case";
import { GetCarbonSummaryUseCase } from "./use-cases/get-carbon-summary.use-case";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import type { AuthenticatedUser } from "../../shared/auth/jwt.strategy";

@Controller("carbon")
export class CarbonController {
    constructor(
        private readonly calculateCarbonUseCase: CalculateCarbonUseCase,
        private readonly getCarbonSummaryUseCase: GetCarbonSummaryUseCase,
    ) {}

    @Post("calculate")
    async calculate(@Body() body: unknown): Promise<CalculateCarbonDtoOut> {
        return this.calculateCarbonUseCase.execute(body);
    }

    @Get("summary")
    @UseGuards(JwtAuthGuard)
    async summary(
        @CurrentUser() user: AuthenticatedUser,
        @Query("period") period: unknown,
    ): Promise<CarbonSummaryDtoOut> {
        return this.getCarbonSummaryUseCase.execute({ period, userId: user.userId });
    }
}