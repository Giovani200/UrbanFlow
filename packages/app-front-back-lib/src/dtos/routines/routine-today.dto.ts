import { z as zod } from "zod";
import { CoordinatesSchema, TransitStatusSchema, TripRouteSchema } from "../trips/trip-planning.dto";

const VerdictBasisSchema = zod.enum(["realtime", "scheduled"]);

/**
 * Verdict d'une correspondance. `basis` dit si la marge repose sur du temps réel ou sur les seuls horaires prévus.
 * `missed` exige du temps réel : sur des horaires prévus, l'app annonce une marge prévue, jamais une perte.
 */
export const ConnectionVerdictSchema = zod.discriminatedUnion("kind", [
    zod.object({ kind: zod.literal("holds"), marginMinutes: zod.number().int().min(0), basis: VerdictBasisSchema }),
    zod.object({ kind: zod.literal("tight"), marginMinutes: zod.number().int().min(0), basis: VerdictBasisSchema }),
    zod.object({ kind: zod.literal("missed"), missingMinutes: zod.number().int().min(1), basis: zod.literal("realtime") }),
    zod.object({ kind: zod.literal("frequent"), headwayMinutes: zod.number().int().min(1) }),
    zod.object({ kind: zod.literal("unknown") }),
]);
export type ConnectionVerdict = zod.output<typeof ConnectionVerdictSchema>;

export const RoutineConnectionSchema = zod.object({
    fromSegmentIndex: zod.number().int().min(0),
    toSegmentIndex: zod.number().int().min(0),
    stopName: zod.string(),
    arrivalTime: zod.string(),
    departureTime: zod.string(),
    verdict: ConnectionVerdictSchema,
});
export type RoutineConnection = zod.output<typeof RoutineConnectionSchema>;

export const RoutineNoticeSchema = zod.object({
    lineShortName: zod.string(),
    text: zod.string(),
});
export type RoutineNotice = zod.output<typeof RoutineNoticeSchema>;

export const RoutineAlternativeSchema = zod.object({
    route: TripRouteSchema,
    verdict: ConnectionVerdictSchema,
});
export type RoutineAlternative = zod.output<typeof RoutineAlternativeSchema>;

export const RoutineSummarySchema = zod.object({
    id: zod.string(),
    name: zod.string(),
    destinationLabel: zod.string(),
    arrivalTime: zod.string(),
});
export type RoutineSummary = zod.output<typeof RoutineSummarySchema>;

/** `none` impose le silence : aucune routine dans son créneau, ou trajet terminé. */
export const RoutineTodayStatusSchema = zod.enum(["none", "ok", "connection_lost", "disrupted", "unavailable"]);
export type RoutineTodayStatus = zod.output<typeof RoutineTodayStatusSchema>;

export const RoutinePhaseSchema = zod.enum(["before_departure", "on_the_way"]);
export type RoutinePhase = zod.output<typeof RoutinePhaseSchema>;

export const RoutinePlanOriginSchema = zod.enum(["usual", "alternative", "replanned"]);
export type RoutinePlanOrigin = zod.output<typeof RoutinePlanOriginSchema>;

export const RoutineTodayDtoOutSchema = zod.object({
    status: RoutineTodayStatusSchema,
    routine: RoutineSummarySchema.nullable(),
    phase: RoutinePhaseSchema.nullable(),
    route: TripRouteSchema.nullable(),
    connections: zod.array(RoutineConnectionSchema),
    planB: TripRouteSchema.nullable(),
    planBStatus: TransitStatusSchema.nullable(),
    alternatives: zod.array(RoutineAlternativeSchema),
    alternativesStatus: TransitStatusSchema.nullable(),
    notices: zod.array(RoutineNoticeSchema),
    /** `unavailable` : les marges restent sur les horaires prévus, et l'écran le dit. */
    realtimeStatus: TransitStatusSchema.nullable(),
    planOrigin: RoutinePlanOriginSchema.nullable(),
    arrivesLate: zod.boolean(),
});
export type RoutineTodayDtoOut = zod.output<typeof RoutineTodayDtoOutSchema>;

export const NotTakenDtoInSchema = zod.object({
    routineId: zod.string().min(1),
    position: CoordinatesSchema.optional(),
});
export type NotTakenDtoIn = zod.output<typeof NotTakenDtoInSchema>;

export const ChooseAlternativeDtoInSchema = zod.object({
    routineId: zod.string().min(1),
    alternativeIndex: zod.union([zod.literal(0), zod.literal(1)]),
});
export type ChooseAlternativeDtoIn = zod.output<typeof ChooseAlternativeDtoInSchema>;

export const RoutineActionDtoOutSchema = zod.object({
    routineId: zod.string(),
});
export type RoutineActionDtoOut = zod.output<typeof RoutineActionDtoOutSchema>;
