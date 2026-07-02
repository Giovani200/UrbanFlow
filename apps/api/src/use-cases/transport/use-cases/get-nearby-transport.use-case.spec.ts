import { describe, expect, it, vi } from "vitest";
import type { TransitStop } from "@urbanflow/app-front-back-lib";
import { GetNearbyTransportUseCase } from "./get-nearby-transport.use-case";
import type { MetromobiliteStopsAdapter } from "../metromobilite-stops.adapter";

function makeUseCase(getNearbyStops: MetromobiliteStopsAdapter["getNearbyStops"]): GetNearbyTransportUseCase {
    const adapter = { getNearbyStops } as unknown as MetromobiliteStopsAdapter;
    return new GetNearbyTransportUseCase(adapter);
}

const stop: TransitStop = {
    id: "SEM:2213",
    name: "Grenoble, Victor Hugo",
    location: { latitude: 45.18977, longitude: 5.7249 },
    distanceMeters: 40,
    lines: [{ code: "A", mode: "tram" }],
};

describe("GetNearbyTransportUseCase", () => {
    it("délègue à l'adapter et enveloppe le résultat dans transitStops", async () => {
        const getNearbyStops = vi.fn(async () => [stop]);
        const useCase = makeUseCase(getNearbyStops);

        const result = await useCase.execute({ latitude: 45.188, longitude: 5.724, radiusMeters: 300 });

        expect(result.transitStops).toEqual([stop]);
        expect(getNearbyStops).toHaveBeenCalledWith({ latitude: 45.188, longitude: 5.724 }, 300);
    });

    it("applique le rayon par défaut (400 m) si non fourni", async () => {
        const getNearbyStops = vi.fn(async () => []);
        const useCase = makeUseCase(getNearbyStops);

        await useCase.execute({ latitude: 45.188, longitude: 5.724 });

        expect(getNearbyStops).toHaveBeenCalledWith({ latitude: 45.188, longitude: 5.724 }, 400);
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
});
