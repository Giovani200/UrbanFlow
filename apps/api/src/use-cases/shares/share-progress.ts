import type { ConnectionVerdict, ShareStep, ShareViewDtoOut } from "@urbanflow/app-front-back-lib";
import { haversineMeters } from "../../shared/geo/haversine";
import { utcToParisIso } from "../../shared/time/paris-time";
import { judgeConnection } from "../routines/connection-verdict";
import type { JudgedItinerary } from "../routines/routine-connections.service";
import type { TransitLeg } from "../transport/transit.providers";

const ON_ITINERARY_MAX_METERS = 500;

export interface SharePosition {
    latitude: number;
    longitude: number;
    at: Date;
}

export type ShareProgress = Pick<ShareViewDtoOut, "steps" | "currentStepIndex" | "estimatedArrival" | "lastPosition">;

interface StopCandidate {
    name: string;
    latitude: number;
    longitude: number;
    stepIndex: number;
    isStepStop: boolean;
}

interface IndexedLeg {
    leg: TransitLeg;
    index: number;
}

function departureTimeOf(leg: TransitLeg): string | null {
    return leg.expectedDepartureTime ?? leg.scheduledDepartureTime ?? null;
}

function arrivalTimeOf(leg: TransitLeg): string | null {
    return leg.expectedArrivalTime ?? leg.scheduledArrivalTime ?? null;
}

function isFresh(leg: TransitLeg): boolean {
    return leg.dataFreshness === "realtime";
}

function candidateAt(
    name: string | undefined,
    [longitude, latitude]: [number, number] | undefined = [Number.NaN, Number.NaN],
    stepIndex: number,
    isStepStop: boolean,
): StopCandidate[] {
    return name && !Number.isNaN(latitude) ? [{ name, latitude, longitude, stepIndex, isStepStop }] : [];
}

function boardStep(leg: TransitLeg): ShareStep {
    return {
        kind: "board",
        stopName: leg.departureStopName ?? "",
        time: departureTimeOf(leg),
        freshness: leg.dataFreshness ?? null,
        level: "planned",
        lineShortName: leg.lineShortName ?? null,
        lineId: leg.lineId ?? null,
        lineColor: leg.lineColor ?? null,
        lineTextColor: leg.lineTextColor ?? null,
    };
}

/** Reprend le verdict de `judge` ; une correspondance déjà passée n'y figure plus, sa marge est alors recalculée. */
function connectionVerdict(from: IndexedLeg, to: IndexedLeg, walkSeconds: number, judged: JudgedItinerary): ConnectionVerdict {
    const judgedConnection = judged.connections.find((connection) => connection.toSegmentIndex === to.index);
    if (judgedConnection) {
        return judgedConnection.verdict;
    }
    const arrival = arrivalTimeOf(from.leg);
    const departure = departureTimeOf(to.leg);
    if (!arrival || !departure) {
        return { kind: "unknown" };
    }
    return judgeConnection({
        arrival: { time: arrival, isFresh: isFresh(from.leg) },
        departure: { time: departure, isFresh: isFresh(to.leg) },
        walkSeconds,
    });
}

function buildSteps(
    judged: JudgedItinerary,
    destinationLabel: string,
): { steps: ShareStep[]; candidates: StopCandidate[] } {
    const { legs } = judged.itinerary;
    const steps: ShareStep[] = [];
    const candidates: StopCandidate[] = [];
    let previous: IndexedLeg | null = null;
    let walkSeconds = 0;

    for (const [index, leg] of legs.entries()) {
        if (leg.mode === "walk") {
            walkSeconds += leg.durationSeconds;
            continue;
        }
        const current = { leg, index };
        if (previous) {
            candidates.push(...candidateAt(previous.leg.arrivalStopName, previous.leg.geometry.coordinates.at(-1), steps.length, false));
            steps.push({
                kind: "connection",
                stopName: leg.departureStopName ?? previous.leg.arrivalStopName ?? "",
                time: arrivalTimeOf(previous.leg),
                freshness: previous.leg.dataFreshness ?? null,
                level: "planned",
                verdict: connectionVerdict(previous, current, walkSeconds, judged),
            });
        }
        const boardIndex = steps.length;
        steps.push(boardStep(leg));
        candidates.push(
            ...candidateAt(leg.departureStopName, leg.geometry.coordinates[0], boardIndex, true),
            ...(leg.intermediateStops ?? []).map((stop) => ({ ...stop, stepIndex: boardIndex, isStepStop: false })),
        );
        previous = current;
        walkSeconds = 0;
    }

    if (previous) {
        candidates.push(...candidateAt(previous.leg.arrivalStopName, previous.leg.geometry.coordinates.at(-1), steps.length - 1, false));
    }
    steps.push({
        kind: "arrive",
        stopName: destinationLabel,
        time: judged.itinerary.arrivalTime,
        freshness: judged.arrivalFreshness,
        level: "planned",
    });
    candidates.push(...candidateAt(destinationLabel, legs.at(-1)?.geometry.coordinates.at(-1), steps.length - 1, true));
    return { steps, candidates };
}

function plannedStepIndex(steps: ShareStep[], now: Date): number | null {
    const index = steps.findLastIndex((step) => step.time !== null && Date.parse(step.time) <= now.getTime());
    return index === -1 ? null : index;
}

function nearestCandidate(position: SharePosition, candidates: StopCandidate[]): StopCandidate | null {
    let nearest: StopCandidate | null = null;
    let nearestMeters = ON_ITINERARY_MAX_METERS;
    for (const candidate of candidates) {
        const meters = haversineMeters(position, candidate);
        if (meters <= nearestMeters) {
            nearest = candidate;
            nearestMeters = meters;
        }
    }
    return nearest;
}

function isNewerThanStep(position: SharePosition, steps: ShareStep[], stepIndex: number | null): boolean {
    const stepTime = stepIndex === null ? null : steps[stepIndex].time;
    return stepTime === null || position.at.getTime() >= Date.parse(stepTime);
}

/**
 * Avancement d'un trajet partagé. Tout est `planned` (itinéraire recalé par le temps réel), sauf l'étape dont l'arrêt
 * est à moins de 500 m de la dernière position GPS, qui devient `confirmed`. Cette position ne remplace l'étape prévue
 * que si elle est plus récente qu'elle.
 */
export function buildShareProgress({
    judged,
    destinationLabel,
    lastPosition,
    now,
}: {
    judged: Pick<JudgedItinerary, "itinerary" | "arrivalFreshness" | "connections">;
    destinationLabel: string;
    lastPosition: SharePosition | null;
    now: Date;
}): ShareProgress {
    const { steps, candidates } = buildSteps(judged as JudgedItinerary, destinationLabel);
    const estimatedArrival = { time: judged.itinerary.arrivalTime, freshness: judged.arrivalFreshness };
    let currentStepIndex = plannedStepIndex(steps, now);

    if (!lastPosition) {
        return { steps, currentStepIndex, estimatedArrival, lastPosition: null };
    }

    const nearest = nearestCandidate(lastPosition, candidates);
    if (nearest) {
        if (nearest.isStepStop) {
            steps[nearest.stepIndex] = { ...steps[nearest.stepIndex], level: "confirmed" };
        }
        if (isNewerThanStep(lastPosition, steps, currentStepIndex)) {
            currentStepIndex = nearest.stepIndex;
        }
    }

    return {
        steps,
        currentStepIndex,
        estimatedArrival,
        lastPosition: {
            at: utcToParisIso(lastPosition.at.toISOString()),
            nearStopName: nearest?.name ?? null,
            outsideItinerary: nearest === null,
        },
    };
}
