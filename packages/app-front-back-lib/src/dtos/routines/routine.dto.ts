import { z as zod } from "zod";
import { LabeledCoordinatesSchema } from "../trips/record-trip.dto";

export const ROUTINE_RULES = {
    maxPerAccount: 5,
    nameMaxLength: 40,
};

const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const LINE_ID_PATTERN = /^[A-Za-z0-9]{1,20}$/;

const ClockTimeSchema = zod.string().regex(CLOCK_TIME_PATTERN);

/** Jours ISO : 1 = lundi, 7 = dimanche. */
const WeekdaysSchema = zod
    .array(zod.number().int().min(1).max(7))
    .min(1)
    .refine((weekdays) => new Set(weekdays).size === weekdays.length);

export const RoutineFieldsSchema = zod.object({
    name: zod.string().trim().min(1).max(ROUTINE_RULES.nameMaxLength),
    origin: LabeledCoordinatesSchema,
    destination: LabeledCoordinatesSchema,
    arrivalTime: ClockTimeSchema,
    usualDepartureTime: ClockTimeSchema,
    weekdays: WeekdaysSchema,
    /** Lignes du trajet choisi, dans l'ordre (`C01731`). */
    lineIds: zod.array(zod.string().regex(LINE_ID_PATTERN)).min(1),
});
export type RoutineFields = zod.output<typeof RoutineFieldsSchema>;

export const CreateRoutineDtoInSchema = RoutineFieldsSchema;
export type CreateRoutineDtoIn = zod.output<typeof CreateRoutineDtoInSchema>;

export const UpdateRoutineDtoInSchema = RoutineFieldsSchema.extend({
    id: zod.string().min(1),
});
export type UpdateRoutineDtoIn = zod.output<typeof UpdateRoutineDtoInSchema>;

export const DeleteRoutineDtoInSchema = zod.object({
    id: zod.string().min(1),
});
export type DeleteRoutineDtoIn = zod.output<typeof DeleteRoutineDtoInSchema>;

export const RoutineDtoOutSchema = RoutineFieldsSchema.extend({
    id: zod.string(),
});
export type RoutineDtoOut = zod.output<typeof RoutineDtoOutSchema>;

export const ListRoutinesDtoOutSchema = zod.object({
    routines: zod.array(RoutineDtoOutSchema),
});
export type ListRoutinesDtoOut = zod.output<typeof ListRoutinesDtoOutSchema>;
