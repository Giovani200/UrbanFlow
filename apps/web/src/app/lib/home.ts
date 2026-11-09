import type { RoutineTodayDtoOut, StopDepartureTime } from "@urbanflow/app-front-back-lib";
import { formatParisClock } from "./format";

const WALKING_METERS_PER_MINUTE = 75;
const MILLISECONDS_PER_DAY = 86_400_000;
const FRESHNESS_WORDS: Record<StopDepartureTime["freshness"], string> = {
  realtime: "temps réel",
  scheduled: "horaire prévu",
};

const parisDate = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
const parisWeekday = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long" });

function parisCalendarDay(instant: number): number {
  const [year, month, day] = parisDate.format(new Date(instant)).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function dayLabel(instant: number, now: number): string {
  const daysAway = (parisCalendarDay(instant) - parisCalendarDay(now)) / MILLISECONDS_PER_DAY;
  if (daysAway === 0) return "aujourd'hui";
  if (daysAway === 1) return "demain";
  return parisWeekday.format(new Date(instant));
}

/** « Prochaine routine demain à 07:41, Travail. » */
export function nextRoutineSentence(next: NonNullable<RoutineTodayDtoOut["nextRoutine"]>, now: number): string {
  const label = dayLabel(Date.parse(next.departureTime), now);
  return `Prochaine routine ${label} à ${formatParisClock(next.departureTime)}, ${next.name}.`;
}

/** Temps de marche estimé depuis la distance, à 4,5 km/h : une approximation, sans calcul d'itinéraire. */
export function walkingMinutes(distanceMeters: number): number {
  return Math.max(1, Math.ceil(distanceMeters / WALKING_METERS_PER_MINUTE));
}

/** La fraîcheur des heures d'une ligne, lue par un mot : une seule fois si elle est commune, sinon heure par heure. */
export function departureTimesNote(times: StopDepartureTime[]): string {
  const isUniform = times.every((time) => time.freshness === times[0]?.freshness);
  if (isUniform) return times[0] ? FRESHNESS_WORDS[times[0].freshness] : "";
  return times.map((time) => `${formatParisClock(time.time)} ${FRESHNESS_WORDS[time.freshness]}`).join(" · ");
}
