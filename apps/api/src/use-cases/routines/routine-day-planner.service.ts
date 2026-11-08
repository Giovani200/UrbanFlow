import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Coordinates, RoutinePlanOrigin } from "@urbanflow/app-front-back-lib";
import { PrismaService } from "../../shared/database/prisma.service";
import { parisInstant, toParisLocalMinute } from "../../shared/time/paris-time";
import { TRANSIT_ROUTING_PROVIDER, type TransitRoutingProvider } from "../transport/transit.providers";
import { findPlanB } from "../trips/plan-b";
import type { DatedItinerary } from "../trips/trip-route.mapper";
import { parseStoredDayPlan, type DayPlan } from "./routine-day-plan.schema";
import { applicableNotices, isFarEarlier, latestArrivingBefore, usesExactlyLines } from "./routine-itinerary";

const REFRESH_AFTER_MILLISECONDS = 15 * 60_000;

export interface RoutineForPlanning {
    id: string;
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    arrivalTime: string;
    usualDepartureTime: string;
    lineIds: string[];
}

function originOf(routine: RoutineForPlanning): Coordinates {
    return { latitude: routine.originLat, longitude: routine.originLng };
}

function destinationOf(routine: RoutineForPlanning): Coordinates {
    return { latitude: routine.destLat, longitude: routine.destLng };
}

function toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
}

function toNullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
    return value === null ? Prisma.DbNull : toJson(value);
}

/** Un trajet est figé dès l'heure de départ passée, ou s'il a été choisi à la place du trajet habituel. */
function isFrozen(plan: DayPlan, now: Date): boolean {
    const hasDeparted = plan.itinerary !== null && Date.parse(plan.itinerary.departureTime) <= now.getTime();
    return hasDeparted || plan.planOrigin !== "usual";
}

/**
 * Le trajet du jour d'une routine, gardé en base : l'app considère qu'à l'heure de départ on a pris ce trajet précis,
 * donc un redémarrage ou un nouveau calcul ne doit pas la faire changer de bus.
 */
@Injectable()
export class RoutineDayPlanner {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(TRANSIT_ROUTING_PROVIDER) private readonly transitRoutingProvider: TransitRoutingProvider,
    ) {}

    /** Lève une erreur si le calcul échoue sans plan connu, ou si le plan d'un trajet déjà commencé est illisible. */
    async planFor(
        routine: RoutineForPlanning,
        serviceDay: string,
        wheelchairAccess: boolean,
        now: Date,
    ): Promise<DayPlan> {
        const stored = await this.prisma.routineDayPlan.findUnique({ where: { routineId: routine.id } });
        const isStoredToday = stored?.serviceDay === serviceDay;
        const knownPlan = isStoredToday ? parseStoredDayPlan(stored) : null;

        if (!stored || !knownPlan) {
            const hasDeparted = parisInstant(serviceDay, routine.usualDepartureTime).getTime() <= now.getTime();
            if (isStoredToday && hasDeparted) {
                throw new ServiceUnavailableException("ROUTINE_PLAN_UNREADABLE");
            }
            return this.computeAndSave(routine, serviceDay, wheelchairAccess);
        }

        const isRecent = now.getTime() - stored.updatedAt.getTime() < REFRESH_AFTER_MILLISECONDS;
        if (isFrozen(knownPlan, now) || isRecent) {
            return knownPlan;
        }
        try {
            return await this.computeAndSave(routine, serviceDay, wheelchairAccess);
        } catch {
            return knownPlan;
        }
    }

    /** Remplace le trajet du jour par un trajet choisi : il devient figé, et la routine elle-même ne change pas. */
    async adoptItinerary(
        routineId: string,
        serviceDay: string,
        itinerary: DatedItinerary,
        planOrigin: Exclude<RoutinePlanOrigin, "usual">,
        planB: { status: DayPlan["planBStatus"]; itinerary: DatedItinerary | null },
    ): Promise<void> {
        await this.save(routineId, {
            serviceDay,
            itinerary,
            planB: planB.itinerary,
            planBStatus: planB.status,
            alternatives: [],
            planOrigin,
            disrupted: false,
            notices: [],
        });
    }

    async saveAlternatives(routineId: string, alternatives: DatedItinerary[]): Promise<void> {
        await this.prisma.routineDayPlan.update({
            where: { routineId },
            data: { alternatives: toJson(alternatives) },
        });
    }

    private async computeAndSave(
        routine: RoutineForPlanning,
        serviceDay: string,
        wheelchairAccess: boolean,
    ): Promise<DayPlan> {
        const { itinerary, disrupted, notices } = await this.chooseItinerary(routine, serviceDay, wheelchairAccess);
        if (!itinerary) {
            return { itinerary: null, planB: null, planBStatus: "no_result", alternatives: [], planOrigin: "usual", disrupted, notices };
        }

        const planB = await findPlanB(
            this.transitRoutingProvider,
            originOf(routine),
            destinationOf(routine),
            wheelchairAccess,
            itinerary,
        );
        const plan: DayPlan = {
            itinerary,
            planB: planB.itinerary,
            planBStatus: planB.status,
            alternatives: [],
            planOrigin: "usual",
            disrupted,
            notices,
        };
        await this.save(routine.id, { ...plan, itinerary, serviceDay });
        return plan;
    }

    private async chooseItinerary(
        routine: RoutineForPlanning,
        serviceDay: string,
        wheelchairAccess: boolean,
    ): Promise<Pick<DayPlan, "itinerary" | "disrupted" | "notices">> {
        const origin = originOf(routine);
        const destination = destinationOf(routine);
        const arrivalLimit = parisInstant(serviceDay, routine.arrivalTime);
        const arrivalLimitLocal = toParisLocalMinute(arrivalLimit);

        const onLines = await this.transitRoutingProvider.getItinerariesOnLines(
            origin,
            destination,
            wheelchairAccess,
            arrivalLimitLocal,
            routine.lineIds,
        );
        const usualItinerary = latestArrivingBefore(
            onLines.filter((itinerary) => usesExactlyLines(itinerary, routine.lineIds)),
            arrivalLimit,
        );
        const usualDeparture = parisInstant(serviceDay, routine.usualDepartureTime);
        if (usualItinerary && !isFarEarlier(usualItinerary, usualDeparture)) {
            return { itinerary: usualItinerary, disrupted: false, notices: [] };
        }

        const { itineraries, notices } = await this.transitRoutingProvider.getItinerariesWithNotices(
            origin,
            destination,
            wheelchairAccess,
            arrivalLimitLocal,
        );
        return {
            itinerary: latestArrivingBefore(itineraries, arrivalLimit),
            disrupted: true,
            notices: applicableNotices(notices, routine.lineIds, arrivalLimit.toISOString()),
        };
    }

    private async save(
        routineId: string,
        plan: Omit<DayPlan, "itinerary"> & { itinerary: DatedItinerary; serviceDay: string },
    ): Promise<void> {
        const data = {
            serviceDay: plan.serviceDay,
            itinerary: toJson(plan.itinerary),
            planB: toNullableJson(plan.planB),
            planBStatus: plan.planBStatus,
            alternatives: toJson(plan.alternatives),
            planOrigin: plan.planOrigin,
            disrupted: plan.disrupted,
            notices: toJson(plan.notices),
        };
        await this.prisma.routineDayPlan.upsert({
            where: { routineId },
            create: { routineId, ...data },
            update: data,
        });
    }
}
