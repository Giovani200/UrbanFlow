import { Injectable } from "@nestjs/common";
import {
    aggregateCarbon,
    CarbonEvent,
    CarbonSummaryDtoIn,
    CarbonSummaryDtoInSchema,
    CarbonSummaryDtoOut,
    CarbonSummaryDtoOutSchema,
    TripMode,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class GetCarbonSummaryUseCase extends AbstractAuthenticatedUseCase<CarbonSummaryDtoIn, CarbonSummaryDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(CarbonSummaryDtoInSchema, CarbonSummaryDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: CarbonSummaryDtoIn,
    ): Promise<CarbonSummaryDtoOut> {
        const { userId } = authenticatedUser;
        const { period } = dataIn;

        const entries = await this.prisma.carbonEntry.findMany({
            where: { userId },
            select: {
                id: true,
                tripId: true,
                mode: true,
                distanceKm: true,
                carbonGrams: true,
                savedVsCar: true,
                createdAt: true,
            },
        });

        const events: CarbonEvent[] = entries.map((entry) => ({
            tripId: entry.tripId ?? entry.id,
            takenAt: entry.createdAt.toISOString(),
            mode: entry.mode as TripMode,
            distanceMeters: entry.distanceKm * 1000,
            carbonGrams: entry.carbonGrams,
            savedGrams: entry.savedVsCar,
        }));

        const goalKg =
            period === "month"
                ? (
                      await this.prisma.preferences.findUnique({
                          where: { userId },
                          select: { monthlyGoalKg: true },
                      })
                  )?.monthlyGoalKg ?? null
                : null;

        return aggregateCarbon(events, period, new Date(), goalKg);
    }
}
