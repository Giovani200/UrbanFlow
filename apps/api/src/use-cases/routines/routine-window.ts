import { isoWeekdayOfDay, parisInstant, parisServiceDay, shiftDay } from "../../shared/time/paris-time";

const WINDOW_OPENS_BEFORE_DEPARTURE_MILLISECONDS = 60 * 60_000;
const DAYS_IN_A_WEEK = 7;

export function isRoutineDay(weekdays: number[], serviceDay: string): boolean {
    return weekdays.includes(isoWeekdayOfDay(serviceDay));
}

/** Le bloc s'affiche de 1 h avant le départ habituel jusqu'à `closesAt`, sans condition de position. */
export function isWithinWindow(usualDeparture: Date, closesAt: Date, now: Date): boolean {
    const opensAt = usualDeparture.getTime() - WINDOW_OPENS_BEFORE_DEPARTURE_MILLISECONDS;
    return now.getTime() >= opensAt && now.getTime() <= closesAt.getTime();
}

/**
 * La prochaine routine à venir : celle dont le créneau s'ouvre le plus tôt après `now`. Une routine déjà dans son
 * créneau n'est pas « à venir », y compris masquée par « Pas aujourd'hui » : on annonce alors la suivante.
 */
export function nextRoutineOccurrence<Routine extends { weekdays: number[]; usualDepartureTime: string }>(
    routines: Routine[],
    now: Date,
): { routine: Routine; departure: Date } | null {
    const today = parisServiceDay(now);
    const occurrences = routines.flatMap((routine) => {
        for (let offset = 0; offset <= DAYS_IN_A_WEEK; offset++) {
            const serviceDay = shiftDay(today, offset);
            const departure = parisInstant(serviceDay, routine.usualDepartureTime);
            const opensAt = departure.getTime() - WINDOW_OPENS_BEFORE_DEPARTURE_MILLISECONDS;
            if (isRoutineDay(routine.weekdays, serviceDay) && opensAt > now.getTime()) {
                return [{ routine, departure }];
            }
        }
        return [];
    });
    return occurrences.reduce<(typeof occurrences)[number] | null>(
        (earliest, occurrence) =>
            !earliest || occurrence.departure.getTime() < earliest.departure.getTime() ? occurrence : earliest,
        null,
    );
}

/**
 * La routine à montrer quand plusieurs sont dans leur créneau : celle déjà commencée d'abord, car le voyageur est
 * en route, puis le départ le plus proche.
 */
export function chooseActiveRoutine<Candidate extends { departure: Date }>(candidates: Candidate[], now: Date): Candidate | null {
    const instantOf = (candidate: Candidate) => candidate.departure.getTime();
    const begun = candidates.filter((candidate) => instantOf(candidate) <= now.getTime());
    const upcoming = candidates.filter((candidate) => instantOf(candidate) > now.getTime());

    const latestBegun = begun.reduce<Candidate | null>(
        (latest, candidate) => (!latest || instantOf(candidate) > instantOf(latest) ? candidate : latest),
        null,
    );
    if (latestBegun) {
        return latestBegun;
    }
    return upcoming.reduce<Candidate | null>(
        (nearest, candidate) => (!nearest || instantOf(candidate) < instantOf(nearest) ? candidate : nearest),
        null,
    );
}
