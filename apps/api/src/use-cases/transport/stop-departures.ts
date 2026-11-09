import type { StopDepartureRow, TransitLine } from "@urbanflow/app-front-back-lib";
import type { Departure } from "./transit.providers";

const MAX_ROWS = 4;
const MAX_TIMES_PER_ROW = 2;

function byExpectedTime(first: Departure, second: Departure): number {
    return Date.parse(first.expectedTime) - Date.parse(second.expectedTime);
}

/**
 * Les prochains passages d'un arrêt, une ligne par ligne et destination, les plus proches d'abord. Une ligne absente
 * du référentiel de l'arrêt est écartée : sans elle, on n'aurait ni son code ni sa couleur officielle à afficher.
 */
export function groupStopDepartures(departures: Departure[], lines: TransitLine[], now: Date): StopDepartureRow[] {
    const rowsByKey = new Map<string, StopDepartureRow>();
    const upcoming = departures
        .filter((departure) => Date.parse(departure.expectedTime) > now.getTime())
        .sort(byExpectedTime);

    for (const departure of upcoming) {
        const line = lines.find((candidate) => candidate.lineId === departure.lineRef);
        if (!line) {
            continue;
        }
        const key = `${departure.lineRef}:${departure.destinationName}`;
        const row = rowsByKey.get(key) ?? {
            lineId: departure.lineRef,
            lineCode: line.code,
            mode: line.mode,
            color: line.color,
            textColor: line.textColor,
            destination: departure.destinationName,
            times: [],
        };
        if (row.times.length < MAX_TIMES_PER_ROW) {
            row.times.push({ time: departure.expectedTime, freshness: departure.dataFreshness });
        }
        rowsByKey.set(key, row);
    }
    return [...rowsByKey.values()].slice(0, MAX_ROWS);
}
