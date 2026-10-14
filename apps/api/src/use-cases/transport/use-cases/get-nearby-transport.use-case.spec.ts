import { describe, expect, it, vi } from "vitest";
import type { TransitStop } from "@urbanflow/app-front-back-lib";
import { GetNearbyTransportUseCase } from "./get-nearby-transport.use-case";
import type { NearbyStopsProvider } from "../transit.providers";

function makeUseCase(getNearbyStops: NearbyStopsProvider["getNearbyStops"]): GetNearbyTransportUseCase {
    return new GetNearbyTransportUseCase({ getNearbyStops });
}

const stop: TransitStop = {
    id: "stop_area:IDFM:61901",
    name: "Henri Wallon",
    location: { latitude: 48.524418, longitude: 2.643742 },
    distanceMeters: 3,
    lines: [{ code: "3601", mode: "bus", color: "#FF5A00", textColor: "#000000" }],
};
const henriWallon = { latitude: 48.5244, longitude: 2.6437 };

describe("GetNearbyTransportUseCase", () => {
    it("renvoie les arrêts proches, sans véhicule en libre-service", async () => {
        const getNearbyStops = vi.fn(async () => [stop]);

        const result = await makeUseCase(getNearbyStops).execute({ ...henriWallon, radiusMeters: 300 });

        expect(result.transitStops).toEqual([stop]);
        expect(result.sharedVehicles).toEqual([]);
        expect(getNearbyStops).toHaveBeenCalledWith(henriWallon, 300);
    });

    it("applique le rayon par défaut (400 m) si non fourni", async () => {
        const getNearbyStops = vi.fn(async () => []);

        await makeUseCase(getNearbyStops).execute(henriWallon);

        expect(getNearbyStops).toHaveBeenCalledWith(henriWallon, 400);
    });

    it("convertit les paramètres de requête (chaînes) en nombres", async () => {
        const getNearbyStops = vi.fn(async () => []);

        await makeUseCase(getNearbyStops).execute({ latitude: "48.5244", longitude: "2.6437", radiusMeters: "600" });

        expect(getNearbyStops).toHaveBeenCalledWith(henriWallon, 600);
    });

    it("rejette des coordonnées hors bornes (validation du DtoIn)", async () => {
        const getNearbyStops = vi.fn(async () => []);

        await expect(makeUseCase(getNearbyStops).execute({ latitude: 200, longitude: 2.6437 })).rejects.toThrow();
        expect(getNearbyStops).not.toHaveBeenCalled();
    });

    it("renvoie une liste vide si la source est en panne", async () => {
        const useCase = makeUseCase(async () => {
            throw new Error("IDFM_NEARBY_FAILED");
        });

        const result = await useCase.execute(henriWallon);

        expect(result.transitStops).toEqual([]);
        expect(result.sharedVehicles).toEqual([]);
    });
});
