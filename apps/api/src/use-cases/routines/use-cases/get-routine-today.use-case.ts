import { Inject, Injectable } from "@nestjs/common";
import {
    RoutineAlternative,
    RoutineConnection,
    RoutineSummary,
    RoutineTodayDtoOut,
    RoutineTodayDtoOutSchema,
    TransitStatus,
} from "@urbanflow/app-front-back-lib";
import { z as zod } from "zod";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { parisInstant, parisServiceDay, toParisLocalMinute } from "../../../shared/time/paris-time";
import { TRANSIT_ROUTING_PROVIDER, type TransitRoutingProvider } from "../../transport/transit.providers";
import { datedTransitItineraries, toTransitTripRoute, type DatedItinerary } from "../../trips/trip-route.mapper";
import { judgeConnection } from "../connection-verdict";
import { RoutineConnectionsService } from "../routine-connections.service";
import type { DayPlan } from "../routine-day-plan.schema";
import { RoutineDayPlanner } from "../routine-day-planner.service";
import { chooseActiveRoutine, isRoutineDay, isWithinWindow } from "../routine-window";

const MAX_ALTERNATIVES = 2;
/** Laisse le temps à un trajet en retard de se finir : l'heure exacte de fin est jugée après la lecture de SIRI. */
const WINDOW_LATE_TOLERANCE_MILLISECONDS = 60 * 60_000;

const PlannedTimesSchema = zod.object({ departureTime: zod.string(), arrivalTime: zod.string() });

const SILENCE: RoutineTodayDtoOut = {
    status: "none",
    routine: null,
    phase: null,
    route: null,
    connections: [],
    planB: null,
    planBStatus: null,
    alternatives: [],
    alternativesStatus: null,
    notices: [],
    realtimeStatus: null,
    planOrigin: null,
    arrivesLate: false,
};

interface StoredRoutine {
    id: string;
    name: string;
    destLabel: string;
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    arrivalTime: string;
    usualDepartureTime: string;
    weekdays: number[];
    lineIds: string[];
    dayPlan: { serviceDay: string; itinerary: unknown } | null;
}

function summaryOf(routine: StoredRoutine): RoutineSummary {
    return { id: routine.id, name: routine.name, destinationLabel: routine.destLabel, arrivalTime: routine.arrivalTime };
}

/** Les heures du trajet du jour déjà connu, pour classer les routines sans appel externe. */
function plannedTimesOf(routine: StoredRoutine, serviceDay: string) {
    if (routine.dayPlan?.serviceDay !== serviceDay) {
        return null;
    }
    const times = PlannedTimesSchema.safeParse(routine.dayPlan.itinerary);
    return times.success ? times.data : null;
}

function toCandidate(routine: StoredRoutine, serviceDay: string, now: Date) {
    const usualDeparture = parisInstant(serviceDay, routine.usualDepartureTime);
    const planned = plannedTimesOf(routine, serviceDay);
    const closesAt = planned
        ? new Date(Date.parse(planned.arrivalTime) + WINDOW_LATE_TOLERANCE_MILLISECONDS)
        : parisInstant(serviceDay, routine.arrivalTime);
    return {
        routine,
        departure: planned ? new Date(planned.departureTime) : usualDeparture,
        isOpen: isWithinWindow(usualDeparture, closesAt, now),
    };
}

function walkSecondsBeforeFirstTransit(itinerary: DatedItinerary): number {
    const firstTransitIndex = itinerary.legs.findIndex((leg) => leg.mode !== "walk");
    return itinerary.legs
        .slice(0, firstTransitIndex)
        .reduce((total, leg) => total + leg.durationSeconds, 0);
}

function alternativeVerdict(alternative: DatedItinerary, missed: RoutineConnection): RoutineAlternative["verdict"] {
    const firstTransit = alternative.legs.find((leg) => leg.mode !== "walk");
    return judgeConnection({
        arrival: { time: missed.arrivalTime, isFresh: true },
        departure: {
            time: firstTransit?.expectedDepartureTime ?? firstTransit?.scheduledDepartureTime ?? alternative.departureTime,
            isFresh: firstTransit?.dataFreshness === "realtime",
        },
        walkSeconds: walkSecondsBeforeFirstTransit(alternative),
    });
}

/**
 * La routine à montrer à l'ouverture, avec le verdict de ses correspondances et les solutions si l'une ne tient plus.
 * Silence par défaut : hors créneau, aucun appel externe. La panne d'une source dégrade la réponse sans la faire échouer.
 */
@Injectable()
export class GetRoutineTodayUseCase extends AbstractAuthenticatedUseCase<void, RoutineTodayDtoOut> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly routineDayPlanner: RoutineDayPlanner,
        private readonly routineConnections: RoutineConnectionsService,
        @Inject(TRANSIT_ROUTING_PROVIDER) private readonly transitRoutingProvider: TransitRoutingProvider,
    ) {
        super(zod.void(), RoutineTodayDtoOutSchema);
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser): Promise<RoutineTodayDtoOut> {
        const userId = authenticatedUser.userId;
        const now = new Date();
        const serviceDay = parisServiceDay(now);

        const routines: StoredRoutine[] = await this.prisma.routine.findMany({
            where: { userId },
            include: { dayPlan: true },
        });
        let candidates = routines
            .filter((routine) => isRoutineDay(routine.weekdays, serviceDay))
            .map((routine) => toCandidate(routine, serviceDay, now))
            .filter((candidate) => candidate.isOpen);
        if (candidates.length === 0) {
            return SILENCE;
        }

        const preferences = await this.prisma.preferences.findUnique({
            where: { userId },
            select: { wheelchairAccess: true },
        });
        const wheelchairAccess = preferences?.wheelchairAccess ?? false;

        let active = chooseActiveRoutine(candidates, now);
        while (active) {
            const today = await this.todayOf(active.routine, serviceDay, wheelchairAccess, now);
            if (today) {
                return today;
            }
            const finished = active;
            candidates = candidates.filter((candidate) => candidate !== finished);
            active = chooseActiveRoutine(candidates, now);
        }
        return SILENCE;
    }

    /** `null` si le trajet de cette routine est déjà terminé : la routine suivante peut alors s'afficher. */
    private async todayOf(
        routine: StoredRoutine,
        serviceDay: string,
        wheelchairAccess: boolean,
        now: Date,
    ): Promise<RoutineTodayDtoOut | null> {
        let plan: DayPlan;
        try {
            plan = await this.routineDayPlanner.planFor(routine, serviceDay, wheelchairAccess, now);
        } catch {
            return { ...SILENCE, status: "unavailable", routine: summaryOf(routine) };
        }

        const base = {
            ...SILENCE,
            routine: summaryOf(routine),
            notices: plan.notices,
            planOrigin: plan.planOrigin,
        };
        if (!plan.itinerary) {
            return { ...base, status: "disrupted", phase: "before_departure" };
        }

        const judged = await this.routineConnections.judge(plan.itinerary, now);
        const estimatedArrival = Date.parse(judged.itinerary.arrivalTime);
        if (now.getTime() > estimatedArrival) {
            return null;
        }

        const lost = judged.firstMissed
            ? await this.findAlternatives(routine, judged.itinerary, judged.firstMissed, wheelchairAccess)
            : { alternatives: [], status: null };

        return {
            ...base,
            status: judged.firstMissed ? "connection_lost" : plan.disrupted ? "disrupted" : "ok",
            phase: Date.parse(judged.itinerary.departureTime) <= now.getTime() ? "on_the_way" : "before_departure",
            route: toTransitTripRoute(judged.itinerary),
            connections: judged.connections,
            planB: plan.planB ? toTransitTripRoute(plan.planB) : null,
            planBStatus: plan.planBStatus,
            alternatives: lost.alternatives,
            alternativesStatus: lost.status,
            realtimeStatus: judged.realtimeStatus,
            arrivesLate: estimatedArrival > parisInstant(serviceDay, routine.arrivalTime).getTime(),
        };
    }

    /** Les solutions depuis l'arrêt de correspondance. Navitia compte lui-même la marche jusqu'au prochain départ. */
    private async findAlternatives(
        routine: StoredRoutine,
        itinerary: DatedItinerary,
        missed: RoutineConnection,
        wheelchairAccess: boolean,
    ): Promise<{ alternatives: RoutineAlternative[]; status: TransitStatus }> {
        const stopCoordinates = itinerary.legs[missed.fromSegmentIndex].geometry.coordinates.at(-1);
        if (!stopCoordinates) {
            return { alternatives: [], status: "unavailable" };
        }
        const [longitude, latitude] = stopCoordinates;

        try {
            const itineraries = await this.transitRoutingProvider.getItinerariesDepartingFrom(
                { latitude, longitude },
                { latitude: routine.destLat, longitude: routine.destLng },
                wheelchairAccess,
                toParisLocalMinute(new Date(missed.arrivalTime)),
            );
            const solutions = datedTransitItineraries(itineraries)
                .sort((first, second) => Date.parse(first.arrivalTime) - Date.parse(second.arrivalTime))
                .slice(0, MAX_ALTERNATIVES);
            await this.routineDayPlanner.saveAlternatives(routine.id, solutions);

            return {
                alternatives: solutions.map((solution) => ({
                    route: toTransitTripRoute(solution),
                    verdict: alternativeVerdict(solution, missed),
                })),
                status: solutions.length > 0 ? "ok" : "no_result",
            };
        } catch {
            return { alternatives: [], status: "unavailable" };
        }
    }
}
