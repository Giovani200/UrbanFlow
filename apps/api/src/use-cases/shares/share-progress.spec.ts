import { describe, expect, it } from "vitest";
import type { RoutineConnection } from "@urbanflow/app-front-back-lib";
import type { TransitLeg } from "../transport/transit.providers";
import type { DatedItinerary } from "../trips/trip-route.mapper";
import { buildShareProgress } from "./share-progress";

const CENTRE_ADMINISTRATIF: [number, number] = [2.633159, 48.51562];
const PRE_CHAMPS: [number, number] = [2.645, 48.522];
const GARE_THIERS: [number, number] = [2.6545, 48.5268];
const MELUN: [number, number] = [2.6553, 48.5274];
const GARE_DE_LYON: [number, number] = [2.3735, 48.8443];
const HOME: [number, number] = [2.377, 48.846];

function walk(from: [number, number], to: [number, number], durationSeconds: number): TransitLeg {
    return { mode: "walk", geometry: { type: "LineString", coordinates: [from, to] }, distanceMeters: 100, durationSeconds };
}

const bus: TransitLeg = {
    mode: "bus",
    geometry: { type: "LineString", coordinates: [CENTRE_ADMINISTRATIF, PRE_CHAMPS, GARE_THIERS] },
    distanceMeters: 4000,
    durationSeconds: 840,
    departureStopName: "Centre Administratif",
    arrivalStopName: "Gare Thiers",
    lineShortName: "3601",
    lineId: "C00881",
    lineColor: "FF5A00",
    lineTextColor: "FFFFFF",
    intermediateStops: [{ name: "Pré Champs", latitude: PRE_CHAMPS[1], longitude: PRE_CHAMPS[0] }],
    dataFreshness: "scheduled",
    scheduledDepartureTime: "2026-11-16T07:46:00+01:00",
    scheduledArrivalTime: "2026-11-16T08:00:00+01:00",
};

const train: TransitLeg = {
    mode: "train",
    geometry: { type: "LineString", coordinates: [MELUN, GARE_DE_LYON] },
    distanceMeters: 44000,
    durationSeconds: 1800,
    departureStopName: "Melun",
    arrivalStopName: "Gare de Lyon",
    lineShortName: "R",
    lineId: "C01731",
    dataFreshness: "realtime",
    scheduledDepartureTime: "2026-11-16T08:14:00+01:00",
    expectedDepartureTime: "2026-11-16T08:16:00+01:00",
    scheduledArrivalTime: "2026-11-16T08:44:00+01:00",
    expectedArrivalTime: "2026-11-16T08:46:00+01:00",
};

const itinerary: DatedItinerary = {
    legs: [walk(CENTRE_ADMINISTRATIF, CENTRE_ADMINISTRATIF, 0), bus, walk(GARE_THIERS, MELUN, 240), train, walk(GARE_DE_LYON, HOME, 300)],
    durationSeconds: 3780,
    departureTime: "2026-11-16T07:46:00+01:00",
    arrivalTime: "2026-11-16T08:51:00+01:00",
};

const melunConnection: RoutineConnection = {
    fromSegmentIndex: 1,
    toSegmentIndex: 3,
    stopName: "Melun",
    arrivalTime: "2026-11-16T08:00:00+01:00",
    departureTime: "2026-11-16T08:16:00+01:00",
    verdict: { kind: "holds", marginMinutes: 12, basis: "realtime" },
};

function progressAt(
    nowIso: string,
    options: { connections?: RoutineConnection[]; lastPosition?: { coordinates: [number, number]; atIso: string } } = {},
) {
    return buildShareProgress({
        judged: { itinerary, arrivalFreshness: "realtime", connections: options.connections ?? [melunConnection] },
        destinationLabel: "Chez moi",
        lastPosition: options.lastPosition
            ? {
                  latitude: options.lastPosition.coordinates[1],
                  longitude: options.lastPosition.coordinates[0],
                  at: new Date(options.lastPosition.atIso),
              }
            : null,
        now: new Date(nowIso),
    });
}

describe("buildShareProgress", () => {
    it("décrit le trajet par étapes : montée, correspondance, montée, arrivée, toutes au niveau prévu", () => {
        const { steps } = progressAt("2026-11-16T07:30:00+01:00");

        expect(steps.map((step) => [step.kind, step.stopName, step.level])).toEqual([
            ["board", "Centre Administratif", "planned"],
            ["connection", "Melun", "planned"],
            ["board", "Melun", "planned"],
            ["arrive", "Chez moi", "planned"],
        ]);
        expect(steps[2]).toMatchObject({ lineShortName: "R", lineId: "C01731", time: "2026-11-16T08:16:00+01:00", freshness: "realtime" });
    });

    it("reprend le verdict de la correspondance encore à venir", () => {
        const { steps } = progressAt("2026-11-16T07:30:00+01:00");

        expect(steps[1]).toMatchObject({ kind: "connection", verdict: melunConnection.verdict });
    });

    it("calcule une marge prévue, marche comprise, pour une correspondance déjà passée", () => {
        const { steps } = progressAt("2026-11-16T08:30:00+01:00", { connections: [] });

        expect(steps[1]).toMatchObject({ kind: "connection", verdict: { kind: "holds", marginMinutes: 12, basis: "realtime" } });
    });

    it.each([
        { now: "2026-11-16T07:30:00+01:00", expected: null },
        { now: "2026-11-16T07:50:00+01:00", expected: 0 },
        { now: "2026-11-16T08:20:00+01:00", expected: 2 },
        { now: "2026-11-16T09:00:00+01:00", expected: 3 },
    ])("à $now, l'étape en cours prévue est $expected", ({ now, expected }) => {
        expect(progressAt(now).currentStepIndex).toBe(expected);
    });

    it("donne l'arrivée estimée avec sa fraîcheur", () => {
        expect(progressAt("2026-11-16T08:20:00+01:00").estimatedArrival).toEqual({
            time: "2026-11-16T08:51:00+01:00",
            freshness: "realtime",
        });
    });

    it("sans GPS, aucune étape n'est confirmée et aucune position n'est donnée", () => {
        const progress = progressAt("2026-11-16T08:20:00+01:00");

        expect(progress.steps.every((step) => step.level === "planned")).toBe(true);
        expect(progress.lastPosition).toBeNull();
    });

    it("une position récente près de l'arrêt d'une étape la confirme et devient l'étape en cours", () => {
        const progress = progressAt("2026-11-16T08:12:00+01:00", {
            lastPosition: { coordinates: MELUN, atIso: "2026-11-16T08:10:00+01:00" },
        });

        expect(progress.currentStepIndex).toBe(2);
        expect(progress.steps[2].level).toBe("confirmed");
        expect(progress.lastPosition).toEqual({ at: "2026-11-16T08:10:00+01:00", nearStopName: "Melun", outsideItinerary: false });
    });

    it("une position plus ancienne que l'étape prévue confirme son arrêt sans reculer l'étape en cours", () => {
        const progress = progressAt("2026-11-16T08:20:00+01:00", {
            lastPosition: { coordinates: CENTRE_ADMINISTRATIF, atIso: "2026-11-16T07:44:00+01:00" },
        });

        expect(progress.currentStepIndex).toBe(2);
        expect(progress.steps[0].level).toBe("confirmed");
    });

    it("près d'un arrêt intermédiaire : nommé, rattaché à la montée de sa ligne, sans rien confirmer", () => {
        const progress = progressAt("2026-11-16T07:50:00+01:00", {
            lastPosition: { coordinates: PRE_CHAMPS, atIso: "2026-11-16T07:52:00+01:00" },
        });

        expect(progress.lastPosition?.nearStopName).toBe("Pré Champs");
        expect(progress.currentStepIndex).toBe(0);
        expect(progress.steps.every((step) => step.level === "planned")).toBe(true);
    });

    it("à plus de 500 m de tout arrêt : hors de l'itinéraire, l'étape prévue reste", () => {
        const progress = progressAt("2026-11-16T08:20:00+01:00", {
            lastPosition: { coordinates: [2.5, 48.7], atIso: "2026-11-16T08:19:00+01:00" },
        });

        expect(progress.lastPosition).toMatchObject({ nearStopName: null, outsideItinerary: true });
        expect(progress.currentStepIndex).toBe(2);
        expect(progress.steps.every((step) => step.level === "planned")).toBe(true);
    });

    it("une section sans heure de départ, comme au terminus, donne une étape sans heure, ignorée pour l'étape en cours", () => {
        const withoutDeparture: DatedItinerary = {
            ...itinerary,
            legs: itinerary.legs.map((leg) => (leg === bus ? { ...bus, scheduledDepartureTime: undefined } : leg)),
        };

        const progress = buildShareProgress({
            judged: { itinerary: withoutDeparture, arrivalFreshness: "scheduled", connections: [melunConnection] },
            destinationLabel: "Chez moi",
            lastPosition: null,
            now: new Date("2026-11-16T07:50:00+01:00"),
        });

        expect(progress.steps[0].time).toBeNull();
        expect(progress.currentStepIndex).toBeNull();
    });
});