import type { DataFreshness, LastDepartureStatus, TripRoute } from "@urbanflow/app-front-back-lib";
import { formatDuration } from "./format";
import { isTransitSegment } from "./trip-results";

const DISMISSED_SERVICE_DAY_KEY = "urbanflow_last_departure_dismissed";
const SERVICE_DAY_END_HOUR = 4;
const MILLISECONDS_PER_HOUR = 3_600_000;
const parisDate = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

const SHOWN_STATUSES = new Set<LastDepartureStatus>(["ok", "no_result", "unavailable"]);

/** Seuls `ok`, `no_result` et `unavailable` s'affichent ; les autres statuts imposent le silence. */
export function isShownStatus(status: LastDepartureStatus): boolean {
  return SHOWN_STATUSES.has(status);
}

/** Journée de service à Paris : avant 04:00, la soirée de la veille continue. */
export function serviceDayKey(now: number): string {
  return parisDate.format(new Date(now - SERVICE_DAY_END_HOUR * MILLISECONDS_PER_HOUR));
}

/** « Pas ce soir » vaut jusqu'à 04:00. Confort propre à l'appareil : un stockage indisponible ne bloque rien. */
export function isDismissedTonight(now: number): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_SERVICE_DAY_KEY) === serviceDayKey(now);
  } catch {
    return false;
  }
}

export function dismissTonight(now: number): void {
  try {
    window.localStorage.setItem(DISMISSED_SERVICE_DAY_KEY, serviceDayKey(now));
  } catch {
    // Stockage indisponible (navigation privée) : la carte se masque quand même jusqu'au rechargement.
  }
}

export function formatCountdown(millisecondsLeft: number): string {
  return millisecondsLeft < 60_000 ? "C'est l'heure" : `dans ${formatDuration(millisecondsLeft / 1000)}`;
}

export interface TimelinePiece {
  kind: "walk" | "transit";
  start: number;
  end: number;
  color?: string;
  freshness?: DataFreshness;
}

export interface Timeline {
  rangeStart: number;
  rangeEnd: number;
  now: number;
  departure: number;
  arrival: number;
  pieces: TimelinePiece[];
  hourTicks: number[];
}

/**
 * Règle horaire d'un trajet, en instants (ms), bornée aux heures pleines qui encadrent maintenant et l'arrivée.
 * Une section en transport commence à son heure estimée (ou prévue) ; la marche suit la section précédente.
 * `null` si l'API n'a pas donné les heures du trajet.
 */
export function buildTimeline(route: TripRoute, now: number): Timeline | null {
  if (!route.departureTime || !route.arrivalTime) return null;
  const departure = Date.parse(route.departureTime);
  const arrival = Date.parse(route.arrivalTime);

  let cursor = departure;
  const pieces: TimelinePiece[] = route.segments.map((segment) => {
    const transitStart = segment.expectedDepartureTime ?? segment.scheduledDepartureTime;
    const transit = isTransitSegment(segment);
    const start = transit && transitStart ? Date.parse(transitStart) : cursor;
    const end = start + segment.durationSeconds * 1000;
    cursor = end;
    return transit
      ? { kind: "transit", start, end, color: segment.lineColor, freshness: segment.dataFreshness }
      : { kind: "walk", start, end };
  });

  const rangeStart = Math.floor(Math.min(now, departure) / MILLISECONDS_PER_HOUR) * MILLISECONDS_PER_HOUR;
  const rangeEnd = Math.ceil(Math.max(arrival, cursor) / MILLISECONDS_PER_HOUR) * MILLISECONDS_PER_HOUR;
  const hourTicks: number[] = [];
  for (let tick = rangeStart; tick <= rangeEnd; tick += MILLISECONDS_PER_HOUR) hourTicks.push(tick);

  return { rangeStart, rangeEnd, now, departure, arrival, pieces, hourTicks };
}

/** Position d'un instant sur la règle, en pourcentage de sa largeur. */
export function timelinePercent(timeline: Timeline, instant: number): number {
  const span = timeline.rangeEnd - timeline.rangeStart;
  return span === 0 ? 0 : ((instant - timeline.rangeStart) / span) * 100;
}

/** Codes des lignes empruntées (« N11, N132 »), pour résumer le Plan B en une phrase. */
export function lineCodes(route: TripRoute): string {
  return route.segments
    .filter(isTransitSegment)
    .map((segment) => segment.lineShortName)
    .filter((code): code is string => Boolean(code))
    .join(", ");
}