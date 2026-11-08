import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
    NotTakenDtoIn,
    NotTakenDtoInSchema,
    RoutineActionDtoOut,
    RoutineActionDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { parisServiceDay, toParisLocalMinute } from "../../../shared/time/paris-time";
import { TRANSIT_ROUTING_PROVIDER, type TransitRoutingProvider } from "../../transport/transit.providers";
import { findPlanB } from "../../trips/plan-b";
import { datedTransitItineraries, earliestArrival } from "../../trips/trip-route.mapper";
import { RoutineDayPlanner } from "../routine-day-planner.service";

/**
 * Corrige l'horloge : la personne n'a pas pris le trajet prévu. On recalcule depuis sa position, ou depuis le point de
 * départ de la routine si elle n'est pas connue. Le nouveau trajet remplace celui du jour, pas la routine.
 */
@Injectable()
export class MarkNotTakenUseCase extends AbstractAuthenticatedUseCase<NotTakenDtoIn, RoutineActionDtoOut> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly routineDayPlanner: RoutineDayPlanner,
        @Inject(TRANSIT_ROUTING_PROVIDER) private readonly transitRoutingProvider: TransitRoutingProvider,
    ) {
        super(NotTakenDtoInSchema, RoutineActionDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: NotTakenDtoIn,
    ): Promise<RoutineActionDtoOut> {
        const userId = authenticatedUser.userId;
        const routine = await this.prisma.routine.findFirst({ where: { id: dataIn.routineId, userId } });
        if (!routine) {
            throw new NotFoundException("ROUTINE_NOT_FOUND");
        }
        const preferences = await this.prisma.preferences.findUnique({
            where: { userId },
            select: { wheelchairAccess: true },
        });
        const wheelchairAccess = preferences?.wheelchairAccess ?? false;

        const now = new Date();
        const origin = dataIn.position ?? { latitude: routine.originLat, longitude: routine.originLng };
        const destination = { latitude: routine.destLat, longitude: routine.destLng };

        const itineraries = await this.transitRoutingProvider.getItinerariesDepartingFrom(
            origin,
            destination,
            wheelchairAccess,
            toParisLocalMinute(now),
        );
        const itinerary = earliestArrival(datedTransitItineraries(itineraries));
        if (!itinerary) {
            throw new ConflictException("NO_ITINERARY_AVAILABLE");
        }

        const planB = await findPlanB(this.transitRoutingProvider, origin, destination, wheelchairAccess, itinerary);
        await this.routineDayPlanner.adoptItinerary(routine.id, parisServiceDay(now), itinerary, "replanned", planB);
        return { routineId: routine.id };
    }
}
