import type { LabeledCoordinates, RoutineFields, TripRoute } from "@urbanflow/app-front-back-lib";
import { formatParisClock } from "./format";
import { isTransitSegment } from "./trip-results";

/** Jours ISO : 1 = lundi, 7 = dimanche. */
export const ROUTINE_WEEKDAYS = [
  { id: 1, short: "lun", full: "lundi" },
  { id: 2, short: "mar", full: "mardi" },
  { id: 3, short: "mer", full: "mercredi" },
  { id: 4, short: "jeu", full: "jeudi" },
  { id: 5, short: "ven", full: "vendredi" },
  { id: 6, short: "sam", full: "samedi" },
  { id: 7, short: "dim", full: "dimanche" },
];

const SERVICE_DAY_END_HOUR = 4;
const DAYS_LOOKED_AHEAD = 8;
const parisLocalMinute = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function shiftDay(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

function isoWeekdayOf(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/**
 * La prochaine arrivée à venir parmi les jours choisis (« 2026-11-09T09:00 », heure de Paris), pour montrer les trajets
 * réels de ce jour-là. Une heure avant 04:00 appartient à la soirée du jour choisi : elle tombe le lendemain au calendrier.
 */
export function nextArrivalDateTime(weekdays: number[], arrivalTime: string, now: number): string {
  const nowLocal = parisLocalMinute.format(new Date(now)).replace(" ", "T");
  const today = nowLocal.slice(0, 10);
  const isNightArrival = Number(arrivalTime.slice(0, 2)) < SERVICE_DAY_END_HOUR;

  for (let offset = -1; offset <= DAYS_LOOKED_AHEAD; offset++) {
    const serviceDay = shiftDay(today, offset);
    const candidate = `${isNightArrival ? shiftDay(serviceDay, 1) : serviceDay}T${arrivalTime}`;
    if (weekdays.includes(isoWeekdayOf(serviceDay)) && candidate > nowLocal) {
      return candidate;
    }
  }
  return `${today}T${arrivalTime}`;
}

export interface RoutineFormValues {
  name: string;
  origin: LabeledCoordinates;
  destination: LabeledCoordinates;
  arrivalTime: string;
  weekdays: number[];
}

/**
 * Ce qu'on mémorise d'une routine à partir du trajet choisi. `null` si ce trajet ne pourra pas être retrouvé :
 * sans ligne, ou avec une ligne sans identifiant, puisque les noms « R » ou « A » existent aussi en bus.
 */
export function toRoutineFields(form: RoutineFormValues, route: TripRoute): RoutineFields | null {
  const transitSegments = route.segments.filter(isTransitSegment);
  const lineIds = transitSegments.flatMap((segment) => (segment.lineId ? [segment.lineId] : []));
  if (transitSegments.length === 0 || lineIds.length !== transitSegments.length || !route.departureTime) {
    return null;
  }
  return {
    name: form.name.trim(),
    origin: form.origin,
    destination: form.destination,
    arrivalTime: form.arrivalTime,
    usualDepartureTime: formatParisClock(route.departureTime),
    weekdays: [...form.weekdays].sort((first, second) => first - second),
    lineIds,
  };
}
