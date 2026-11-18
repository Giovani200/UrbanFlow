import type { ShareEndReason } from "@prisma/client";
import type { ShareState } from "@urbanflow/app-front-back-lib";

const MILLISECONDS_PER_MINUTE = 60_000;
const ARRIVAL_UNCONFIRMED_AFTER_MINUTES = 10;
const EXPIRES_AFTER_ARRIVAL_MINUTES = 60;
const FINAL_STATE_RETENTION_MINUTES = 12 * 60;

const STATE_BY_END_REASON: Record<ShareEndReason, ShareState> = {
    ARRIVED: "arrived",
    STOPPED: "stopped",
    EXPIRED: "expired",
};

function minutesAfter(instant: Date, minutes: number): Date {
    return new Date(instant.getTime() + minutes * MILLISECONDS_PER_MINUTE);
}

/** Heure à laquelle un partage jamais confirmé expire. */
export function expirationTime(estimatedArrivalAt: Date): Date {
    return minutesAfter(estimatedArrivalAt, EXPIRES_AFTER_ARRIVAL_MINUTES);
}

/**
 * État d'un partage à l'instant `now`. Un partage terminé garde son état final.
 * `estimatedArrivalAt` doit être l'estimation la plus récente : un train en retard repousse « arrivée non confirmée ».
 */
export function shareStateAt({
    endReason,
    estimatedArrivalAt,
    now,
}: {
    endReason: ShareEndReason | null;
    estimatedArrivalAt: Date | null;
    now: Date;
}): ShareState {
    if (endReason) {
        return STATE_BY_END_REASON[endReason];
    }
    if (!estimatedArrivalAt) {
        return "in_progress";
    }
    if (now >= expirationTime(estimatedArrivalAt)) {
        return "expired";
    }
    if (now >= minutesAfter(estimatedArrivalAt, ARRIVAL_UNCONFIRMED_AFTER_MINUTES)) {
        return "arrival_unconfirmed";
    }
    return "in_progress";
}

/**
 * Un partage se supprime 12 h après sa fin : `endedBefore` vise une fin enregistrée, `estimatedArrivalBefore` un
 * partage expiré dont la fin n'a jamais été enregistrée.
 */
export function purgeThresholds(now: Date): { endedBefore: Date; estimatedArrivalBefore: Date } {
    const endedBefore = minutesAfter(now, -FINAL_STATE_RETENTION_MINUTES);
    return { endedBefore, estimatedArrivalBefore: minutesAfter(endedBefore, -EXPIRES_AFTER_ARRIVAL_MINUTES) };
}

export function isPurgeable({
    endedAt,
    estimatedArrivalAt,
    now,
}: {
    endedAt: Date | null;
    estimatedArrivalAt: Date | null;
    now: Date;
}): boolean {
    const { endedBefore, estimatedArrivalBefore } = purgeThresholds(now);
    if (endedAt) {
        return endedAt <= endedBefore;
    }
    return estimatedArrivalAt !== null && estimatedArrivalAt <= estimatedArrivalBefore;
}
