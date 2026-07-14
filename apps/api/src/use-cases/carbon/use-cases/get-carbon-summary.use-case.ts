import { Injectable } from "@nestjs/common";
import { z as zod } from "zod";
import {
    aggregateCarbon,
    CarbonEvent,
    CarbonSummaryDtoInSchema,
    CarbonSummaryDtoOut,
    CarbonSummaryDtoOutSchema,
    TripMode,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";

// Commande back-only : période + userId injecté depuis le JWT.
const GetCarbonSummaryCommandSchema = CarbonSummaryDtoInSchema.extend({
    userId: zod.string(),
});
type GetCarbonSummaryCommand = zod.output<typeof GetCarbonSummaryCommandSchema>;

@Injectable()
export class GetCarbonSummaryUseCase extends AbstractUseCase<GetCarbonSummaryCommand, CarbonSummaryDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(GetCarbonSummaryCommandSchema, CarbonSummaryDtoOutSchema);
    }

    protected async executeUseCase(dataIn: GetCarbonSummaryCommand): Promise<CarbonSummaryDtoOut> {
        const { userId, period } = dataIn;

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

        // L'objectif est mensuel : on ne le renvoie que pour la période "month".
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