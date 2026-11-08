import type { ConnectionVerdict } from "@urbanflow/app-front-back-lib";
import type { Departure } from "../transport/transit.providers";

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const HOLDS_FROM_SECONDS = 3 * SECONDS_PER_MINUTE;
const PASSAGE_TOLERANCE_MILLISECONDS = 60 * MILLISECONDS_PER_SECOND;
const FREQUENT_MAX_GAP_SECONDS = 7 * SECONDS_PER_MINUTE;
const FREQUENT_DEPARTURES_COUNT = 4;

export interface ConnectionSide {
    time: string;
    isFresh: boolean;
}

export interface ConnectionTimes {
    arrival: ConnectionSide;
    departure: ConnectionSide;
    walkSeconds: number;
}

/** Temps restant une fois arrivé et une fois la marche faite. Négatif si le suivant part avant. */
export function marginSeconds(arrivalIso: string, departureIso: string, walkSeconds: number): number {
    return (Date.parse(departureIso) - Date.parse(arrivalIso)) / MILLISECONDS_PER_SECOND - walkSeconds;
}

/**
 * Verdict d'une correspondance, arrondi au désavantage du voyageur : on ne promet jamais une marge qu'il n'a pas.
 * « Ne tient pas » exige au moins une donnée fraîche : sur les seuls horaires prévus, l'app ne peut rien affirmer.
 */
export function judgeConnection({ arrival, departure, walkSeconds }: ConnectionTimes): ConnectionVerdict {
    const margin = marginSeconds(arrival.time, departure.time, walkSeconds);
    const basis = arrival.isFresh || departure.isFresh ? "realtime" : "scheduled";

    if (margin < 0) {
        return basis === "realtime"
            ? { kind: "missed", missingMinutes: Math.ceil(-margin / SECONDS_PER_MINUTE), basis }
            : { kind: "tight", marginMinutes: 0, basis };
    }
    const marginMinutes = Math.floor(margin / SECONDS_PER_MINUTE);
    return { kind: margin >= HOLDS_FROM_SECONDS ? "holds" : "tight", marginMinutes, basis };
}

/** Le passage de cette ligne dont l'heure prévue est la plus proche, à 60 s près : deux trains peuvent se suivre à 2 s. */
function closestPassage(
    departures: Departure[],
    lineId: string,
    scheduledIso: string,
    scheduledTimeOf: (departure: Departure) => string,
): Departure | null {
    const scheduled = Date.parse(scheduledIso);
    let closest: Departure | null = null;
    let closestGap = PASSAGE_TOLERANCE_MILLISECONDS;

    for (const departure of departures) {
        const gap = Math.abs(Date.parse(scheduledTimeOf(departure)) - scheduled);
        if (departure.lineRef === lineId && gap <= closestGap) {
            closest = departure;
            closestGap = gap;
        }
    }
    return closest;
}

export function findDeparturePassage(departures: Departure[], lineId: string, scheduledIso: string): Departure | null {
    return closestPassage(departures, lineId, scheduledIso, (departure) => departure.scheduledTime);
}

/** Compare l'heure d'arrivée prévue : un train peut arriver à 20:14 et repartir à 20:15. */
export function findArrivalPassage(departures: Departure[], lineId: string, scheduledIso: string): Departure | null {
    return closestPassage(
        departures,
        lineId,
        scheduledIso,
        (departure) => departure.scheduledArrivalTime ?? departure.scheduledTime,
    );
}

/**
 * Écart typique en minutes quand le plus long écart entre 4 départs reste sous le seuil, sinon `null`.
 * Une ligne fréquente n'a pas de train à ne pas rater : le suivant arrive vite.
 */
export function frequentHeadwayMinutes(departureIsos: string[]): number | null {
    if (departureIsos.length < FREQUENT_DEPARTURES_COUNT) {
        return null;
    }
    const instants = departureIsos.slice(0, FREQUENT_DEPARTURES_COUNT).map((iso) => Date.parse(iso));
    const gaps = instants
        .slice(1)
        .map((instant, index) => (instant - instants[index]) / MILLISECONDS_PER_SECOND)
        .sort((first, second) => first - second);

    if (gaps[gaps.length - 1] > FREQUENT_MAX_GAP_SECONDS) {
        return null;
    }
    const medianGap = gaps[Math.floor(gaps.length / 2)];
    return Math.ceil(medianGap / SECONDS_PER_MINUTE);
}
