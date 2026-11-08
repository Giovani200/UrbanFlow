import { isoWeekdayOfDay } from "../../shared/time/paris-time";

const WINDOW_OPENS_BEFORE_DEPARTURE_MILLISECONDS = 60 * 60_000;

export function isRoutineDay(weekdays: number[], serviceDay: string): boolean {
    return weekdays.includes(isoWeekdayOfDay(serviceDay));
}

/** Le bloc s'affiche de 1 h avant le départ habituel jusqu'à `closesAt`, sans condition de position. */
export function isWithinWindow(usualDeparture: Date, closesAt: Date, now: Date): boolean {
    const opensAt = usualDeparture.getTime() - WINDOW_OPENS_BEFORE_DEPARTURE_MILLISECONDS;
    return now.getTime() >= opensAt && now.getTime() <= closesAt.getTime();
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
