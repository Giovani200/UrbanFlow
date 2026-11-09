import { z as zod } from "zod";
import { DataFreshnessSchema, TransitStatusSchema } from "../trips/trip-planning.dto";
import { TransitStopModeSchema } from "./get-nearby-transport.dto";

const STOP_AREA_ID_PATTERN = /^stop_area:IDFM:[A-Za-z0-9:_-]+$/;

export const StopDeparturesDtoInSchema = zod.object({
    stopId: zod.string().regex(STOP_AREA_ID_PATTERN),
    latitude: zod.coerce.number().min(-90).max(90),
    longitude: zod.coerce.number().min(-180).max(180),
});
export type StopDeparturesDtoIn = zod.output<typeof StopDeparturesDtoInSchema>;

export const StopDepartureTimeSchema = zod.object({
    time: zod.string(),
    freshness: DataFreshnessSchema,
});
export type StopDepartureTime = zod.output<typeof StopDepartureTimeSchema>;

export const StopDepartureRowSchema = zod.object({
    lineId: zod.string(),
    lineCode: zod.string(),
    mode: TransitStopModeSchema,
    color: zod.string().optional(),
    textColor: zod.string().optional(),
    destination: zod.string(),
    times: zod.array(StopDepartureTimeSchema),
});
export type StopDepartureRow = zod.output<typeof StopDepartureRowSchema>;

/** `unavailable` : la source est en panne, ce qui n'est pas la même chose qu'une absence de passage (`no_result`). */
export const StopDeparturesDtoOutSchema = zod.object({
    status: TransitStatusSchema,
    rows: zod.array(StopDepartureRowSchema),
});
export type StopDeparturesDtoOut = zod.output<typeof StopDeparturesDtoOutSchema>;
