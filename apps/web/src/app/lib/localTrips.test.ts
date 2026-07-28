import { beforeEach, describe, expect, it } from "vitest";
import type { RecordTripDtoIn } from "@urbanflow/app-front-back-lib";
import { addLocalTrip, getLocalTrips, toTripRecord } from "./localTrips";

const STORAGE_KEY = "urbanflow_local_trips";

const input: RecordTripDtoIn = {
    origin: { latitude: 45.1885, longitude: 5.7245, label: "Domicile" },
    destination: { latitude: 45.1912, longitude: 5.7301, label: "Victor Hugo" },
    route: {
        segments: [
            {
                mode: "walk",
                geometry: { type: "LineString", coordinates: [[5.7245, 45.1885]] },
                durationSeconds: 300,
                distanceMeters: 400,
                carbonGrams: 0,
                savedGrams: 56.8,
            },
            {
                mode: "tram",
                geometry: { type: "LineString", coordinates: [[5.7301, 45.1912]] },
                durationSeconds: 480,
                distanceMeters: 3600,
                carbonGrams: 16,
                savedGrams: 495.2,
            },
        ],
        totalDurationSeconds: 780,
        totalDistanceMeters: 4000,
        totalCarbonGrams: 16,
        totalSavedGrams: 552,
        score: 0.82,
    },
};

beforeEach(() => {
    localStorage.clear();
});

describe("toTripRecord", () => {
    it("conserve les coordonnées d'origine et de destination", () => {
        const record = toTripRecord(input);

        expect(record.origin).toEqual({ latitude: 45.1885, longitude: 5.7245 });
        expect(record.destination).toEqual({ latitude: 45.1912, longitude: 5.7301 });
    });

    it("conserve les libellés et les modes de chaque segment", () => {
        const record = toTripRecord(input);

        expect(record.originLabel).toBe("Domicile");
        expect(record.destinationLabel).toBe("Victor Hugo");
        expect(record.segments.map((segment) => segment.mode)).toEqual(["walk", "tram"]);
    });
});

describe("getLocalTrips", () => {
    it("relit les coordonnées après un aller-retour dans le stockage", () => {
        addLocalTrip(toTripRecord(input));

        const [trip] = getLocalTrips();
        expect(trip.origin).toEqual({ latitude: 45.1885, longitude: 5.7245 });
        expect(trip.destination).toEqual({ latitude: 45.1912, longitude: 5.7301 });
    });

    it("accepte un trajet stocké avant l'ajout des coordonnées", () => {
        const legacyTrip = {
            id: "trip-legacy",
            takenAt: "2026-07-01T08:00:00.000Z",
            originLabel: "Berriat",
            destinationLabel: "Michallon",
            segments: [{ mode: "bus", distanceMeters: 2000, carbonGrams: 244, savedGrams: 40 }],
            totalCarbonGrams: 244,
            totalSavedGrams: 40,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([legacyTrip]));

        const [trip] = getLocalTrips();
        expect(trip.id).toBe("trip-legacy");
        expect(trip.origin).toBeUndefined();
        expect(trip.destination).toBeUndefined();
    });

    it("rejette un contenu de stockage invalide", () => {
        localStorage.setItem(STORAGE_KEY, "pas du json");

        expect(getLocalTrips()).toEqual([]);
    });
});