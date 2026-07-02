import { describe, expect, it, vi } from "vitest";
import type { SharedVehicle, TransitStop } from "@urbanflow/app-front-back-lib";
import { GetNearbyTransportUseCase } from "./get-nearby-transport.use-case";
import type { MetromobiliteStopsAdapter } from "../metromobilite-stops.adapter";
import type { VoiGbfsAdapter } from "../voi-gbfs.adapter";

function makeUseCase(
    getNearbyStops: MetromobiliteStopsAdapter["getNearbyStops"],
    getNearbyVehicles: VoiGbfsAdapter["getNearbyVehicles"] = async () => [],
): GetNearbyTransportUseCase {
    const stopsAdapter = { getNearbyStops } as unknown as MetromobiliteStopsAdapter;
    const voiAdapter = { getNearbyVehicles } as unknown as VoiGbfsAdapter;
    return new GetNearbyTransportUseCase(stopsAdapter, voiAdapter);
}

const stop: TransitStop = {
    id: "SEM:2213",
    name: "Grenoble, Victor Hugo",
    location: { latitude: 45.18977, longitude: 5.7249 },
    distanceMeters: 40,
    lines: [{ code: "A", mode: "tram" }],
};

const vehicle: SharedVehicle = {
    id: "voi-1",
    type: "scooter",
    location: { latitude: 45.1882, longitude: 5.7242 },
    distanceMeters: 25,
};

describe("GetNearbyTransportUseCase", () => {
    it("agrège arrêts et véhicules des deux adapters", async () => {
        const getNearbyStops = vi.fn(async () => [stop]);
        const getNearbyVehicles = vi.fn(async () => [vehicle]);
        const useCase = makeUseCase(getNearbyStops, getNearbyVehicles);

        const result = await useCase.execute({ latitude: 45.188, longitude: 5.724, radiusMeters: 300 });

        expect(result.transitStops).toEqual([stop]);
        expect(result.sharedVehicles).toEqual([vehicle]);
        expect(getNearbyStops).toHaveBeenCalledWith({ latitude: 45.188, longitude: 5.724 }, 300);
        expect(getNearbyVehicles).toHaveBeenCalledWith({ latitude: 45.188, longitude: 5.724 }, 300);
    });

    it("applique le rayon par défaut (400 m) si non fourni", async () => {
        const getNearbyStops = vi.fn(async () => []);
        const getNearbyVehicles = vi.fn(async () => []);
        const useCase = makeUseCase(getNearbyStops, getNearbyVehicles);

        await useCase.execute({ latitude: 45.188, longitude: 5.724 });

        expect(getNearbyStops).toHaveBeenCalledWith({ latitude: 45.188, longitude: 5.724 }, 400);
        expect(getNearbyVehicles).toHaveBeenCalledWith({ latitude: 45.188, longitude: 5.724 }, 400);
    });

    it("coerce les paramètres de requête (strings) en nombres", async () => {
        const getNearbyStops = vi.fn(async () => []);
        const useCase = makeUseCase(getNearbyStops);

        await useCase.execute({ latitude: "45.188", longitude: "5.724", radiusMeters: "600" });

        expect(getNearbyStops).toHaveBeenCalledWith({ latitude: 45.188, longitude: 5.724 }, 600);
    });

    it("rejette des coordonnées hors bornes (validation DtoIn)", async () => {
        const getNearbyStops = vi.fn(async () => []);
        const useCase = makeUseCase(getNearbyStops);

        await expect(useCase.execute({ latitude: 200, longitude: 5.724 })).rejects.toThrow();
        expect(getNearbyStops).not.toHaveBeenCalled();
    });

    it("Voi en échec → sharedVehicles vide, arrêts conservés (allSettled)", async () => {
        const useCase = makeUseCase(
            async () => [stop],
            async () => {
                throw new Error("VOI_REQUEST_FAILED");
            },
        );

        const result = await useCase.execute({ latitude: 45.188, longitude: 5.724 });

        expect(result.transitStops).toEqual([stop]);
        expect(result.sharedVehicles).toEqual([]);
    });

    it("arrêts en échec → transitStops vide, véhicules conservés (allSettled)", async () => {
        const useCase = makeUseCase(
            async () => {
                throw new Error("METROMOBILITE_REQUEST_FAILED");
            },
            async () => [vehicle],
        );

        const result = await useCase.execute({ latitude: 45.188, longitude: 5.724 });

        expect(result.transitStops).toEqual([]);
        expect(result.sharedVehicles).toEqual([vehicle]);
    });
});
