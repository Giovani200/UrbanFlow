import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z as zod } from "zod";
import {
    RecordTripDtoInSchema,
    RecordTripDtoOut,
    RecordTripDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";

// Commande back-only : itinéraire choisi + userId injecté depuis le JWT.
const RecordTripCommandSchema = RecordTripDtoInSchema.extend({
    userId: zod.string(),
});
type RecordTripCommand = zod.output<typeof RecordTripCommandSchema>;

@Injectable()
export class RecordTripUseCase extends AbstractUseCase<RecordTripCommand, RecordTripDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(RecordTripCommandSchema, RecordTripDtoOutSchema);
    }

    protected async executeUseCase(dataIn: RecordTripCommand): Promise<RecordTripDtoOut> {
        const { userId, origin, destination, route } = dataIn;
        const modes = [...new Set(route.segments.map((segment) => segment.mode))];

        // Un Trip + une CarbonEntry par segment-mode (répartition par mode réelle).
        const trip = await this.prisma.trip.create({
            data: {
                userId,
                originLat: origin.latitude,
                originLng: origin.longitude,
                originLabel: origin.label,
                destLat: destination.latitude,
                destLng: destination.longitude,
                destLabel: destination.label,
                durationSeconds: Math.round(route.totalDurationSeconds),
                distanceMeters: Math.round(route.totalDistanceMeters),
                carbonGrams: route.totalCarbonGrams,
                score: route.score,
                modes,
                steps: route.segments as unknown as Prisma.InputJsonValue,
                status: "COMPLETED",
                carbonEntries: {
                    create: route.segments.map((segment) => ({
                        userId,
                        mode: segment.mode,
                        distanceKm: segment.distanceMeters / 1000,
                        carbonGrams: segment.carbonGrams,
                        savedVsCar: segment.savedGrams,
                    })),
                },
            },
            select: { id: true },
        });

        return { tripId: trip.id };
    }
}