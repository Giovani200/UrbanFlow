import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
    CreateShareDtoIn,
    CreateShareDtoInSchema,
    CreateShareDtoOut,
    CreateShareDtoOutSchema,
    type TripRoute,
} from "@urbanflow/app-front-back-lib";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { parisServiceDay } from "../../../shared/time/paris-time";
import { RoutineDayPlanner } from "../../routines/routine-day-planner.service";
import type { DatedItinerary } from "../../trips/trip-route.mapper";
import { endedShareData, findActiveShare, purgeEndedShares } from "../share-records";
import { generateShareToken, hashShareToken } from "../share-token";

interface SharedTrip {
    itinerary: DatedItinerary;
    destinationLabel: string;
    routineId: string | null;
}

function toDatedItinerary(route: TripRoute): DatedItinerary | null {
    if (!route.departureTime || !route.arrivalTime) {
        return null;
    }
    return {
        legs: route.segments.map(({ carbonGrams: _carbonGrams, savedGrams: _savedGrams, ...leg }) => leg),
        durationSeconds: route.totalDurationSeconds,
        departureTime: route.departureTime,
        arrivalTime: route.arrivalTime,
    };
}

@Injectable()
export class CreateShareUseCase extends AbstractAuthenticatedUseCase<CreateShareDtoIn, CreateShareDtoOut> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly routineDayPlanner: RoutineDayPlanner,
    ) {
        super(CreateShareDtoInSchema, CreateShareDtoOutSchema);
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser, dataIn: CreateShareDtoIn): Promise<CreateShareDtoOut> {
        const { userId } = authenticatedUser;
        const now = new Date();

        const account = await this.prisma.user.findUnique({ where: { id: userId }, select: { shareConsentAt: true } });
        if (!account?.shareConsentAt) {
            throw new ForbiddenException("SHARE_CONSENT_REQUIRED");
        }

        const trip = await this.sharedTripOf(userId, dataIn.source, now);
        const token = generateShareToken();

        await purgeEndedShares(this.prisma, now);
        const previous = await findActiveShare(this.prisma, userId, now);
        await this.prisma.$transaction([
            ...(previous ? [this.prisma.share.update({ where: { id: previous.id }, data: endedShareData("STOPPED", now) })] : []),
            this.prisma.share.create({
                data: {
                    userId,
                    tokenHash: hashShareToken(token),
                    routineId: trip.routineId,
                    itinerary: trip.itinerary as unknown as Prisma.InputJsonValue,
                    destinationLabel: trip.destinationLabel,
                    estimatedArrivalAt: new Date(trip.itinerary.arrivalTime),
                },
            }),
        ]);

        return { token };
    }

    private async sharedTripOf(userId: string, source: CreateShareDtoIn["source"], now: Date): Promise<SharedTrip> {
        if (source.kind === "itinerary") {
            const itinerary = toDatedItinerary(source.itinerary);
            if (!itinerary) {
                throw new BadRequestException("ITINERARY_WITHOUT_TIMES");
            }
            return { itinerary, destinationLabel: source.destinationLabel, routineId: null };
        }

        const routine = await this.prisma.routine.findFirst({ where: { id: source.routineId, userId } });
        if (!routine) {
            throw new NotFoundException("ROUTINE_NOT_FOUND");
        }
        const preferences = await this.prisma.preferences.findUnique({ where: { userId }, select: { wheelchairAccess: true } });

        let itinerary: DatedItinerary | null;
        try {
            const plan = await this.routineDayPlanner.planFor(routine, parisServiceDay(now), preferences?.wheelchairAccess ?? false, now);
            itinerary = plan.itinerary;
        } catch {
            throw new ServiceUnavailableException("ROUTINE_PLAN_UNAVAILABLE");
        }
        if (!itinerary) {
            throw new NotFoundException("ROUTINE_NOT_RUNNING");
        }
        return { itinerary, destinationLabel: routine.destLabel, routineId: routine.id };
    }
}
