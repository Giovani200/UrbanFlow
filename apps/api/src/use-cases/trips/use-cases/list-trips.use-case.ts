import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
    ListTripsDtoIn,
    ListTripsDtoInSchema,
    ListTripsDtoOut,
    ListTripsDtoOutSchema,
    TripMode,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

function periodStart(period: ListTripsDtoIn["period"]): Date | undefined {
    if (period === "all") return undefined;
    const start = new Date();
    if (period === "week") {
        start.setDate(start.getDate() - 7);
    } else {
        start.setMonth(start.getMonth() - 1);
    }
    return start;
}

@Injectable()
export class ListTripsUseCase extends AbstractAuthenticatedUseCase<ListTripsDtoIn, ListTripsDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(ListTripsDtoInSchema, ListTripsDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: ListTripsDtoIn,
    ): Promise<ListTripsDtoOut> {
        const start = periodStart(dataIn.period);
        const createdAtFilter = start ? { createdAt: { gte: start } } : {};
        const tripWhere: Prisma.TripWhereInput = { userId: authenticatedUser.userId, ...createdAtFilter };
        const carbonWhere: Prisma.CarbonEntryWhereInput = { userId: authenticatedUser.userId, ...createdAtFilter };

        const [total, trips, durationAggregate, savedAggregate] = await Promise.all([
            this.prisma.trip.count({ where: tripWhere }),
            this.prisma.trip.findMany({
                where: tripWhere,
                orderBy: { createdAt: "desc" },
                skip: (dataIn.page - 1) * dataIn.pageSize,
                take: dataIn.pageSize,
                select: {
                    id: true,
                    createdAt: true,
                    originLabel: true,
                    destLabel: true,
                    modes: true,
                    durationSeconds: true,
                    distanceMeters: true,
                    carbonGrams: true,
                    carbonEntries: { select: { savedVsCar: true } },
                },
            }),
            this.prisma.trip.aggregate({ where: tripWhere, _sum: { durationSeconds: true } }),
            this.prisma.carbonEntry.aggregate({ where: carbonWhere, _sum: { savedVsCar: true } }),
        ]);

        const items = trips.map((trip) => ({
            id: trip.id,
            takenAt: trip.createdAt.toISOString(),
            originLabel: trip.originLabel,
            destinationLabel: trip.destLabel,
            modes: trip.modes as TripMode[],
            durationSeconds: trip.durationSeconds,
            distanceMeters: trip.distanceMeters,
            carbonGrams: trip.carbonGrams,
            savedGrams: trip.carbonEntries.reduce((sum, entry) => sum + entry.savedVsCar, 0),
        }));

        return {
            items,
            total,
            page: dataIn.page,
            pageSize: dataIn.pageSize,
            totalSavedGrams: savedAggregate._sum.savedVsCar ?? 0,
            totalDurationSeconds: durationAggregate._sum.durationSeconds ?? 0,
        };
    }
}