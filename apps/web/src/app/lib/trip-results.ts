import type { TransitStatus, TripPlanningDtoOut, TripRoute, TripSegment } from "@urbanflow/app-front-back-lib";
import { delayInMinutes, formatParisClock } from "./format";

/** Les itinéraires en transport (déjà classés par l'API) d'abord, puis le vélo et la marche. */
export function orderedRoutes(result: TripPlanningDtoOut): TripRoute[] {
  return [...result.transit, ...(result.bike ? [result.bike] : []), ...(result.walk ? [result.walk] : [])];
}

/**
 * Message honnête sur le transport en commun : une panne n'est pas une absence de trajet.
 * `null` quand des itinéraires en transport existent.
 */
export function transitMessage(result: TripPlanningDtoOut): string | null {
  const status: TransitStatus = result.transitStatus ?? (result.transit.length > 0 ? "ok" : "no_result");
  if (status === "unavailable") {
    return "Les transports en commun sont indisponibles pour le moment. La marche et le vélo restent proposés.";
  }
  if (status === "no_result") {
    return "Aucun trajet en transport en commun pour ce départ et cette arrivée.";
  }
  return null;
}

const NON_TRANSIT_MODES = new Set(["walk", "bike", "car", "carpool"]);

export function isTransitSegment(segment: TripSegment): boolean {
  return !NON_TRANSIT_MODES.has(segment.mode);
}

export interface SegmentTimes {
  scheduled: string;
  expected: string;
  delayMinutes: number;
}

/** Heures de départ d'une section en transport, à l'heure de Paris. `null` si l'API ne les donne pas. */
export function segmentDepartureTimes(segment: TripSegment): SegmentTimes | null {
  if (!segment.scheduledDepartureTime) return null;
  const expectedIso = segment.expectedDepartureTime ?? segment.scheduledDepartureTime;
  return {
    scheduled: formatParisClock(segment.scheduledDepartureTime),
    expected: formatParisClock(expectedIso),
    delayMinutes: delayInMinutes(segment.scheduledDepartureTime, expectedIso),
  };
}
