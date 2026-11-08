import { Inject, Injectable } from "@nestjs/common";
import type { ConnectionVerdict, RoutineConnection, TransitStatus } from "@urbanflow/app-front-back-lib";
import { CACHE_STORE, type CacheStore } from "../../shared/cache/cache-store";
import { toParisLocalMinute, utcToParisIso } from "../../shared/time/paris-time";
import {
    DEPARTURES_PROVIDER,
    TRANSIT_ROUTING_PROVIDER,
    type Departure,
    type DeparturesProvider,
    type TransitLeg,
    type TransitRoutingProvider,
} from "../transport/transit.providers";
import type { DatedItinerary } from "../trips/trip-route.mapper";
import {
    findArrivalPassage,
    findDeparturePassage,
    frequentHeadwayMinutes,
    judgeConnection,
} from "./connection-verdict";

const MILLISECONDS_PER_MINUTE = 60_000;
/** Une correspondance dont le départ prévu remonte à plus de 30 min n'est plus lue en temps réel. */
const STILL_PENDING_AFTER_DEPARTURE_MILLISECONDS = 30 * MILLISECONDS_PER_MINUTE;
const EXPECTED_SOON_MILLISECONDS = 30 * MILLISECONDS_PER_MINUTE;
const HEADWAY_CACHE_TTL_MILLISECONDS = 24 * 60 * MILLISECONDS_PER_MINUTE;

export interface JudgedItinerary {
    /** Le trajet avec les heures estimées. L'heure de départ reste celle du plan : un retard peut se rattraper. */
    itinerary: DatedItinerary;
    connections: RoutineConnection[];
    realtimeStatus: TransitStatus;
    firstMissed: RoutineConnection | null;
}

interface PendingConnection {
    fromIndex: number;
    toIndex: number;
    from: TransitLeg;
    to: TransitLeg;
    walkSeconds: number;
    headwayMinutes: number | null;
}

/** Les passages lus à chaque arrêt. Un arrêt absent signifie que SIRI n'a pas répondu pour lui. */
type PassagesByStop = Map<string, Departure[]>;

function isTransit(leg: TransitLeg): boolean {
    return leg.mode !== "walk";
}

/**
 * Part d'horaires prévus sur toutes les sections : la fraîcheur stockée dans le plan peut dater de plusieurs dizaines
 * de minutes, seule une lecture SIRI du moment autorise à dire « temps réel ».
 */
function withScheduledTimes(leg: TransitLeg): TransitLeg {
    if (!isTransit(leg)) {
        return leg;
    }
    return {
        ...leg,
        dataFreshness: "scheduled",
        expectedDepartureTime: leg.scheduledDepartureTime,
        expectedArrivalTime: leg.scheduledArrivalTime,
    };
}

function connectionsOf(legs: TransitLeg[]): Omit<PendingConnection, "headwayMinutes">[] {
    const connections: Omit<PendingConnection, "headwayMinutes">[] = [];
    let previousIndex: number | null = null;
    let walkSeconds = 0;

    legs.forEach((leg, index) => {
        if (!isTransit(leg)) {
            walkSeconds += leg.durationSeconds;
            return;
        }
        if (previousIndex !== null) {
            connections.push({ fromIndex: previousIndex, toIndex: index, from: legs[previousIndex], to: leg, walkSeconds });
        }
        previousIndex = index;
        walkSeconds = 0;
    });
    return connections;
}

function isStillPending(connection: Omit<PendingConnection, "headwayMinutes">, now: Date): boolean {
    const scheduledDeparture = connection.to.scheduledDepartureTime;
    return (
        scheduledDeparture !== undefined &&
        connection.from.scheduledArrivalTime !== undefined &&
        Date.parse(scheduledDeparture) + STILL_PENDING_AFTER_DEPARTURE_MILLISECONDS >= now.getTime()
    );
}

function isExpectedSoon(scheduledIso: string, now: Date): boolean {
    const untilPassage = Date.parse(scheduledIso) - now.getTime();
    return untilPassage >= 0 && untilPassage <= EXPECTED_SOON_MILLISECONDS;
}

/**
 * Un véhicule absent n'est un signal que si sa ligne publie d'autres passages à cet arrêt. Sinon on ne peut simplement
 * pas le suivre : SIRI ne donne aucune heure prévue pour le métro, donc aucun passage n'y est exploitable.
 */
function linePublishesPassages(passages: Departure[] | undefined, lineId: string | undefined): boolean {
    return passages?.some((passage) => passage.lineRef === lineId) ?? false;
}

/**
 * Verdict de chaque correspondance à venir, à partir des passages SIRI du moment.
 * La panne d'une source dégrade la réponse sans la faire échouer : on revient aux horaires prévus, et le statut le dit.
 */
@Injectable()
export class RoutineConnectionsService {
    constructor(
        @Inject(DEPARTURES_PROVIDER) private readonly departuresProvider: DeparturesProvider,
        @Inject(TRANSIT_ROUTING_PROVIDER) private readonly transitRoutingProvider: TransitRoutingProvider,
        @Inject(CACHE_STORE) private readonly cacheStore: CacheStore,
    ) {}

    async judge(plan: DatedItinerary, now: Date): Promise<JudgedItinerary> {
        const legs = plan.legs.map(withScheduledTimes);
        const pending = await Promise.all(
            connectionsOf(legs)
                .filter((connection) => isStillPending(connection, now))
                .map(async (connection) => ({ ...connection, headwayMinutes: await this.headwayOf(connection.to) })),
        );

        const stops = pending
            .filter((connection) => connection.headwayMinutes === null)
            .flatMap(({ from, to }) => [from.arrivalStopPointRef, to.departureStopPointRef]);
        const passages = new Map<string, Departure[]>();
        const stopsAnswered = await this.readPassages(stops, passages);

        const connections = pending
            .map((connection) => this.judgeOne(connection, legs, passages, now))
            .filter(
                (connection) =>
                    Math.max(Date.parse(connection.arrivalTime), Date.parse(connection.departureTime)) >= now.getTime(),
            );

        const lastLegAnswered = connections.length > 0 || (await this.readPassages(this.lastStopOf(legs), passages));
        const realtimeStatus: TransitStatus = stopsAnswered && lastLegAnswered ? "ok" : "unavailable";

        return {
            itinerary: { ...plan, legs, arrivalTime: this.estimatedArrival(plan.arrivalTime, legs, passages) },
            connections,
            realtimeStatus,
            firstMissed: connections.find((connection) => connection.verdict.kind === "missed") ?? null,
        };
    }

    /** Fréquence de la ligne à cette heure. Sa lecture coûte un appel au calculateur, partagé par heure et par direction. */
    private async headwayOf(leg: TransitLeg): Promise<number | null> {
        if (!leg.departureStopPointId || !leg.routeId || !leg.scheduledDepartureTime) {
            return null;
        }
        const { departureStopPointId: stopPointId, routeId } = leg;
        const hourStart = `${toParisLocalMinute(new Date(leg.scheduledDepartureTime)).slice(0, 13)}:00`;
        const cacheKey = ["routine-headway", stopPointId, routeId, hourStart].join(":");
        try {
            const departures = await this.cacheStore.getOrLoad(cacheKey, HEADWAY_CACHE_TTL_MILLISECONDS, () =>
                this.transitRoutingProvider.getScheduledDepartures(stopPointId, routeId, hourStart),
            );
            return frequentHeadwayMinutes(departures);
        } catch {
            return null;
        }
    }

    /** Lit chaque arrêt une seule fois et remplit `passages`. Renvoie `false` si l'un d'eux n'a pas répondu. */
    private async readPassages(stops: (string | undefined)[], passages: PassagesByStop): Promise<boolean> {
        const distinctStops = [...new Set(stops)].filter((stop): stop is string => stop !== undefined);
        const results = await Promise.allSettled(
            distinctStops.map(async (stop) => {
                passages.set(stop, await this.departuresProvider.getNextDepartures(stop));
            }),
        );
        return results.every((result) => result.status === "fulfilled");
    }

    private lastStopOf(legs: TransitLeg[]): (string | undefined)[] {
        return [legs.filter(isTransit).at(-1)?.arrivalStopPointRef];
    }

    private judgeOne(
        connection: PendingConnection,
        legs: TransitLeg[],
        passages: PassagesByStop,
        now: Date,
    ): RoutineConnection {
        const { fromIndex, toIndex, from, to, walkSeconds, headwayMinutes } = connection;
        const summary = {
            fromSegmentIndex: fromIndex,
            toSegmentIndex: toIndex,
            stopName: to.departureStopName ?? from.arrivalStopName ?? "",
        };
        const scheduledArrival = from.scheduledArrivalTime ?? "";
        const scheduledDeparture = to.scheduledDepartureTime ?? "";

        if (headwayMinutes !== null) {
            const verdict: ConnectionVerdict = { kind: "frequent", headwayMinutes };
            return { ...summary, arrivalTime: scheduledArrival, departureTime: scheduledDeparture, verdict };
        }

        const arrivalStop = from.arrivalStopPointRef ? passages.get(from.arrivalStopPointRef) : undefined;
        const departureStop = to.departureStopPointRef ? passages.get(to.departureStopPointRef) : undefined;
        const arrivalPassage = arrivalStop && findArrivalPassage(arrivalStop, from.lineId ?? "", scheduledArrival);
        const departurePassage = departureStop && findDeparturePassage(departureStop, to.lineId ?? "", scheduledDeparture);

        const arrival = this.applyArrival(legs, fromIndex, arrivalPassage ?? null, scheduledArrival);
        const departure = this.applyDeparture(legs, toIndex, departurePassage ?? null, scheduledDeparture);

        const isArrivalMissing =
            !arrivalPassage && isExpectedSoon(scheduledArrival, now) && linePublishesPassages(arrivalStop, from.lineId);
        const isDepartureMissing =
            !departurePassage && isExpectedSoon(scheduledDeparture, now) && linePublishesPassages(departureStop, to.lineId);
        const verdict: ConnectionVerdict =
            isArrivalMissing || isDepartureMissing
                ? { kind: "unknown" }
                : judgeConnection({ arrival, departure, walkSeconds });

        return { ...summary, arrivalTime: arrival.time, departureTime: departure.time, verdict };
    }

    private applyArrival(legs: TransitLeg[], index: number, passage: Departure | null, scheduled: string) {
        const isFresh = passage?.dataFreshness === "realtime";
        const time = isFresh ? (passage.expectedArrivalTime ?? passage.expectedTime) : scheduled;
        if (isFresh) {
            legs[index] = { ...legs[index], dataFreshness: "realtime", expectedArrivalTime: time };
        }
        return { time, isFresh };
    }

    private applyDeparture(legs: TransitLeg[], index: number, passage: Departure | null, scheduled: string) {
        const isFresh = passage?.dataFreshness === "realtime";
        const time = isFresh ? passage.expectedTime : scheduled;
        if (isFresh) {
            legs[index] = { ...legs[index], dataFreshness: "realtime", expectedDepartureTime: time };
        }
        if (passage?.platform) {
            legs[index] = { ...legs[index], platform: passage.platform };
        }
        return { time, isFresh };
    }

    /** L'arrivée finale décalée du retard mesuré au dernier arrêt, s'il a été lu et que la donnée est fraîche. */
    private estimatedArrival(plannedArrival: string, legs: TransitLeg[], passages: PassagesByStop): string {
        const lastLeg = legs.filter(isTransit).at(-1);
        if (!lastLeg?.arrivalStopPointRef || !lastLeg.lineId || !lastLeg.scheduledArrivalTime) {
            return plannedArrival;
        }
        const passage = findArrivalPassage(
            passages.get(lastLeg.arrivalStopPointRef) ?? [],
            lastLeg.lineId,
            lastLeg.scheduledArrivalTime,
        );
        if (passage?.dataFreshness !== "realtime" || !passage.expectedArrivalTime) {
            return plannedArrival;
        }
        const delay = Date.parse(passage.expectedArrivalTime) - Date.parse(lastLeg.scheduledArrivalTime);
        return utcToParisIso(new Date(Date.parse(plannedArrival) + delay).toISOString());
    }
}
