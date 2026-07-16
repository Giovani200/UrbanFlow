import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
    RecordTripDtoIn,
    RecordTripDtoInSchema,
    RecordTripDtoOut,
    RecordTripDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class RecordTripUseCase extends AbstractAuthenticatedUseCase<RecordTripDtoIn, RecordTripDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(RecordTripDtoInSchema, RecordTripDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: RecordTripDtoIn,
    ): Promise<RecordTripDtoOut> {
        const { userId } = authenticatedUser;
        const { origin, destination, route } = dataIn;
        const modes = [...new Set(route.segments.map((segment) => segment.mode))];

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
