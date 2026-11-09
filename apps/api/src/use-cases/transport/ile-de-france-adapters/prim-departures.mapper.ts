import { z as zod } from "zod";
import { utcToParisIso } from "../../../shared/time/paris-time";
import type { Departure } from "../transit.providers";

const STALE_AFTER_MILLISECONDS = 2 * 60_000;
const SiriTextSchema = zod.array(zod.object({ value: zod.string() }));

const SiriVisitSchema = zod.object({
    RecordedAtTime: zod.string().optional(),
    MonitoredVehicleJourney: zod.object({
        LineRef: zod.object({ value: zod.string() }),
        DestinationName: SiriTextSchema.optional(),
        MonitoredCall: zod.object({
            AimedDepartureTime: zod.string().optional(),
            ExpectedDepartureTime: zod.string().optional(),
            AimedArrivalTime: zod.string().optional(),
            ExpectedArrivalTime: zod.string().optional(),
            DestinationDisplay: SiriTextSchema.optional(),
            ArrivalPlatformName: zod.object({ value: zod.string() }).optional(),
            DeparturePlatformName: zod.object({ value: zod.string() }).optional(),
        }),
    }),
});
type SiriVisit = zod.output<typeof SiriVisitSchema>;

export const SiriStopMonitoringResponseSchema = zod.object({
    Siri: zod.object({
        ServiceDelivery: zod.object({
            StopMonitoringDelivery: zod.array(zod.object({ MonitoredStopVisit: zod.array(SiriVisitSchema).optional() })),
        }),
    }),
});
export type SiriStopMonitoringResponse = zod.output<typeof SiriStopMonitoringResponseSchema>;

function lineIdOf(lineRef: string): string {
    return lineRef.split(":").filter(Boolean).pop() ?? lineRef;
}

/**
 * Le champ « Expected » est rempli même quand il recopie l'horaire prévu : seule la date de mise à jour
 * (`RecordedAtTime`) dit si l'estimation est fraîche. Au-delà de 2 min, on revient à l'horaire prévu.
 */
function toDeparture(visit: SiriVisit, now: Date): Departure | null {
    const journey = visit.MonitoredVehicleJourney;
    const call = journey.MonitoredCall;
    const scheduled = call.AimedDepartureTime ?? call.AimedArrivalTime ?? null;
    const estimated = call.ExpectedDepartureTime ?? call.ExpectedArrivalTime ?? scheduled;
    if (!estimated) {
        return null;
    }

    const recordedAt = visit.RecordedAtTime ? Date.parse(visit.RecordedAtTime) : Number.NaN;
    const isFresh = Number.isFinite(recordedAt) && now.getTime() - recordedAt <= STALE_AFTER_MILLISECONDS;
    const expected = isFresh || !scheduled ? estimated : scheduled;
    const scheduledArrival = call.AimedArrivalTime;
    const expectedArrival = isFresh ? (call.ExpectedArrivalTime ?? scheduledArrival) : scheduledArrival;

    return {
        lineRef: lineIdOf(journey.LineRef.value),
        destinationName: journey.DestinationName?.[0]?.value ?? call.DestinationDisplay?.[0]?.value ?? "",
        scheduledTime: scheduled ? utcToParisIso(scheduled) : null,
        expectedTime: utcToParisIso(expected),
        delaySeconds: scheduled ? Math.round((Date.parse(expected) - Date.parse(scheduled)) / 1000) : 0,
        dataFreshness: isFresh ? "realtime" : "scheduled",
        scheduledArrivalTime: scheduledArrival ? utcToParisIso(scheduledArrival) : undefined,
        expectedArrivalTime: expectedArrival ? utcToParisIso(expectedArrival) : undefined,
        platform: call.DeparturePlatformName?.value ?? call.ArrivalPlatformName?.value,
    };
}

/** Traduit une réponse SIRI à l'instant `now`, pour que la fraîcheur reste juste même depuis le cache. */
export function mapStopMonitoring(response: SiriStopMonitoringResponse, now: Date): Departure[] {
    return response.Siri.ServiceDelivery.StopMonitoringDelivery.flatMap((delivery) => delivery.MonitoredStopVisit ?? [])
        .map((visit) => toDeparture(visit, now))
        .filter((departure): departure is Departure => departure !== null)
        .sort((first, second) => Date.parse(first.expectedTime) - Date.parse(second.expectedTime));
}
