import { Injectable, NotFoundException } from "@nestjs/common";
import { z as zod } from "zod";
import { ExportUserDataDtoOut, ExportUserDataDtoOutSchema } from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";
import { STORED_PREFERENCES_SELECT } from "../users.selects";

@Injectable()
export class ExportUserDataUseCase extends AbstractAuthenticatedUseCase<void, ExportUserDataDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(zod.void(), ExportUserDataDtoOutSchema);
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser): Promise<ExportUserDataDtoOut> {
        const user = await this.prisma.user.findUnique({
            where: { id: authenticatedUser.userId },
            select: {
                email: true,
                name: true,
                preferences: {
                    select: STORED_PREFERENCES_SELECT,
                },
                favoriteAddresses: {
                    select: { label: true, address: true, latitude: true, longitude: true, isHome: true, createdAt: true },
                    orderBy: { createdAt: "asc" },
                },
                trips: {
                    select: {
                        originLabel: true,
                        destLabel: true,
                        modes: true,
                        durationSeconds: true,
                        distanceMeters: true,
                        carbonGrams: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: "desc" },
                },
                carbonEntries: {
                    select: { mode: true, distanceKm: true, carbonGrams: true, savedVsCar: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                },
                routines: {
                    select: {
                        name: true,
                        originLabel: true,
                        originLat: true,
                        originLng: true,
                        destLabel: true,
                        destLat: true,
                        destLng: true,
                        arrivalTime: true,
                        usualDepartureTime: true,
                        weekdays: true,
                        lineIds: true,
                        createdAt: true,
                        dayPlan: {
                            select: { serviceDay: true, planOrigin: true, itinerary: true, updatedAt: true },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!user) {
            throw new NotFoundException("USER_NOT_FOUND");
        }

        return {
            exportedAt: new Date().toISOString(),
            account: { email: user.email, name: user.name },
            preferences: user.preferences ?? null,
            favoriteAddresses: user.favoriteAddresses.map((address) => ({
                label: address.label,
                address: address.address,
                latitude: address.latitude,
                longitude: address.longitude,
                isHome: address.isHome,
                createdAt: address.createdAt.toISOString(),
            })),
            trips: user.trips.map((trip) => ({
                originLabel: trip.originLabel,
                destinationLabel: trip.destLabel,
                modes: trip.modes,
                durationSeconds: trip.durationSeconds,
                distanceMeters: trip.distanceMeters,
                carbonGrams: trip.carbonGrams,
                createdAt: trip.createdAt.toISOString(),
            })),
            carbonEntries: user.carbonEntries.map((entry) => ({
                mode: entry.mode,
                distanceKm: entry.distanceKm,
                carbonGrams: entry.carbonGrams,
                savedVsCar: entry.savedVsCar,
                createdAt: entry.createdAt.toISOString(),
            })),
            routines: user.routines.map((routine) => ({
                name: routine.name,
                origin: { label: routine.originLabel, latitude: routine.originLat, longitude: routine.originLng },
                destination: { label: routine.destLabel, latitude: routine.destLat, longitude: routine.destLng },
                arrivalTime: routine.arrivalTime,
                usualDepartureTime: routine.usualDepartureTime,
                weekdays: routine.weekdays,
                lineIds: routine.lineIds,
                createdAt: routine.createdAt.toISOString(),
                dayPlan: routine.dayPlan && {
                    serviceDay: routine.dayPlan.serviceDay,
                    planOrigin: routine.dayPlan.planOrigin,
                    itinerary: routine.dayPlan.itinerary,
                    updatedAt: routine.dayPlan.updatedAt.toISOString(),
                },
            })),
        };
    }
}