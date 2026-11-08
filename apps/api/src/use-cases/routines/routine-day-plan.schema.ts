import {
    DataFreshnessSchema,
    GeoJsonLineStringSchema,
    RoutineNoticeSchema,
    RoutinePlanOriginSchema,
    TransitStatusSchema,
    TransitStopPointSchema,
    TripModeSchema,
    type RoutineNotice,
    type RoutinePlanOrigin,
    type TransitStatus,
} from "@urbanflow/app-front-back-lib";
import { z as zod } from "zod";
import type { DatedItinerary } from "../trips/trip-route.mapper";

const StoredLegSchema = zod.object({
    mode: TripModeSchema,
    geometry: GeoJsonLineStringSchema,
    distanceMeters: zod.number(),
    durationSeconds: zod.number(),
    departureStopName: zod.string().optional(),
    arrivalStopName: zod.string().optional(),
    lineShortName: zod.string().optional(),
    lineId: zod.string().optional(),
    lineColor: zod.string().optional(),
    lineTextColor: zod.string().optional(),
    intermediateStops: zod.array(TransitStopPointSchema).optional(),
    dataFreshness: DataFreshnessSchema.optional(),
    scheduledDepartureTime: zod.string().optional(),
    expectedDepartureTime: zod.string().optional(),
    scheduledArrivalTime: zod.string().optional(),
    expectedArrivalTime: zod.string().optional(),
    departureStopPointRef: zod.string().optional(),
    arrivalStopPointRef: zod.string().optional(),
    departureStopPointId: zod.string().optional(),
    routeId: zod.string().optional(),
});

const StoredItinerarySchema = zod.object({
    legs: zod.array(StoredLegSchema),
    durationSeconds: zod.number(),
    departureTime: zod.string(),
    arrivalTime: zod.string(),
});

const StoredDayPlanSchema = zod.object({
    itinerary: StoredItinerarySchema,
    planB: StoredItinerarySchema.nullable(),
    planBStatus: TransitStatusSchema,
    alternatives: zod.array(StoredItinerarySchema).nullable(),
    planOrigin: RoutinePlanOriginSchema,
    disrupted: zod.boolean(),
    notices: zod.array(RoutineNoticeSchema).nullable(),
});

/** `itinerary` est `null` quand le trajet habituel ne circule pas et qu'aucun autre n'arrive à l'heure. */
export interface DayPlan {
    itinerary: DatedItinerary | null;
    planB: DatedItinerary | null;
    planBStatus: TransitStatus;
    alternatives: DatedItinerary[];
    planOrigin: RoutinePlanOrigin;
    disrupted: boolean;
    notices: RoutineNotice[];
}

/**
 * Relit un plan du jour stocké en JSON. `null` s'il n'a plus le format attendu : la base n'est pas plus digne de
 * confiance qu'une réponse externe, et ce format peut évoluer d'une version à l'autre.
 */
export function parseStoredDayPlan(stored: unknown): DayPlan | null {
    const parsed = StoredDayPlanSchema.safeParse(stored);
    if (!parsed.success) {
        return null;
    }
    return { ...parsed.data, alternatives: parsed.data.alternatives ?? [], notices: parsed.data.notices ?? [] };
}
