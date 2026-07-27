import { z as zod } from "zod";
import {
    type CarbonEvent,
    type RecordTripDtoIn,
    type TripRecord,
    TripRecordSchema,
} from "@urbanflow/app-front-back-lib";

// Trajets d'un utilisateur anonyme : stockés sur l'appareil (localStorage), plafonnés.
const STORAGE_KEY = "urbanflow_local_trips";
const MAX_LOCAL_TRIPS = 10;

export function toTripRecord(input: RecordTripDtoIn): TripRecord {
    return {
        id: crypto.randomUUID(),
        takenAt: new Date().toISOString(),
        originLabel: input.origin.label,
        destinationLabel: input.destination.label,
        origin: { latitude: input.origin.latitude, longitude: input.origin.longitude },
        destination: { latitude: input.destination.latitude, longitude: input.destination.longitude },
        segments: input.route.segments.map((segment) => ({
            mode: segment.mode,
            distanceMeters: segment.distanceMeters,
            carbonGrams: segment.carbonGrams,
            savedGrams: segment.savedGrams,
        })),
        totalCarbonGrams: input.route.totalCarbonGrams,
        totalSavedGrams: input.route.totalSavedGrams,
    };
}

export function getLocalTrips(): TripRecord[] {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // Ne jamais faire confiance au localStorage : on revalide contre le schéma.
    const parsed = zod.array(TripRecordSchema).safeParse(safeJsonParse(raw));
    return parsed.success ? parsed.data : [];
}

export function addLocalTrip(record: TripRecord): void {
    if (typeof window === "undefined") return;
    // Les plus récents en tête, on ne garde que les MAX_LOCAL_TRIPS derniers.
    const trips = [record, ...getLocalTrips()].slice(0, MAX_LOCAL_TRIPS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

// Aplatit les trajets locaux en événements carbone, pour l'agrégateur partagé.
export function localTripsToEvents(trips: TripRecord[]): CarbonEvent[] {
    return trips.flatMap((trip) =>
        trip.segments.map((segment) => ({
            tripId: trip.id,
            takenAt: trip.takenAt,
            mode: segment.mode,
            distanceMeters: segment.distanceMeters,
            carbonGrams: segment.carbonGrams,
            savedGrams: segment.savedGrams,
        })),
    );
}

function safeJsonParse(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}