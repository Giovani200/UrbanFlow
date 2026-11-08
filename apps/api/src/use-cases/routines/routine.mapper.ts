import type { Prisma } from "@prisma/client";
import type { RoutineDtoOut, RoutineFields } from "@urbanflow/app-front-back-lib";

export const ROUTINE_SELECT = {
    id: true,
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
} satisfies Prisma.RoutineSelect;

type StoredRoutine = Prisma.RoutineGetPayload<{ select: typeof ROUTINE_SELECT }>;

export function toRoutineColumns(fields: RoutineFields) {
    return {
        name: fields.name,
        originLabel: fields.origin.label,
        originLat: fields.origin.latitude,
        originLng: fields.origin.longitude,
        destLabel: fields.destination.label,
        destLat: fields.destination.latitude,
        destLng: fields.destination.longitude,
        arrivalTime: fields.arrivalTime,
        usualDepartureTime: fields.usualDepartureTime,
        weekdays: fields.weekdays,
        lineIds: fields.lineIds,
    };
}

export function toRoutineDto(routine: StoredRoutine): RoutineDtoOut {
    return {
        id: routine.id,
        name: routine.name,
        origin: { label: routine.originLabel, latitude: routine.originLat, longitude: routine.originLng },
        destination: { label: routine.destLabel, latitude: routine.destLat, longitude: routine.destLng },
        arrivalTime: routine.arrivalTime,
        usualDepartureTime: routine.usualDepartureTime,
        weekdays: routine.weekdays,
        lineIds: routine.lineIds,
    };
}
