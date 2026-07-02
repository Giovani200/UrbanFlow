import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiGbfsAdapter } from "./voi-gbfs.adapter";

const origin = { latitude: 45.188, longitude: 5.724 };

const discovery = {
    data: { fr: { feeds: [{ name: "free_bike_status", url: "https://voi.test/free_bike_status" }] } },
};

function mockFetch(bikes: unknown[]): ReturnType<typeof vi.fn> {
    return vi.fn(async (input: string) => {
        const body = String(input).includes("gbfs.json") ? discovery : { data: { bikes } };
        return { ok: true, json: async () => body } as Response;
    });
}

describe("VoiGbfsAdapter", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("filtre les véhicules hors rayon", async () => {
        vi.stubGlobal(
            "fetch",
            mockFetch([
                { bike_id: "near", lat: 45.1882, lon: 5.7242, is_reserved: false, is_disabled: false },
                { bike_id: "far", lat: 45.3, lon: 5.9, is_reserved: false, is_disabled: false },
            ]),
        );

        const result = await new VoiGbfsAdapter().getNearbyVehicles(origin, 400);

        expect(result.map((vehicle) => vehicle.id)).toEqual(["near"]);
    });

    it("exclut les véhicules désactivés ou réservés", async () => {
        vi.stubGlobal(
            "fetch",
            mockFetch([
                { bike_id: "ok", lat: 45.1882, lon: 5.7242, is_reserved: false, is_disabled: false },
                { bike_id: "disabled", lat: 45.1882, lon: 5.7242, is_reserved: false, is_disabled: true },
                { bike_id: "reserved", lat: 45.1882, lon: 5.7242, is_reserved: true, is_disabled: false },
            ]),
        );

        const result = await new VoiGbfsAdapter().getNearbyVehicles(origin, 400);

        expect(result.map((vehicle) => vehicle.id)).toEqual(["ok"]);
    });

    it("déduit le type bike ou scooter du vehicle_type_id", async () => {
        vi.stubGlobal(
            "fetch",
            mockFetch([
                { bike_id: "b", lat: 45.1882, lon: 5.7242, is_reserved: false, is_disabled: false, vehicle_type_id: "voi_bike" },
                { bike_id: "s", lat: 45.1883, lon: 5.7241, is_reserved: false, is_disabled: false, vehicle_type_id: "voi_scooter" },
            ]),
        );

        const result = await new VoiGbfsAdapter().getNearbyVehicles(origin, 400);
        const typeById = Object.fromEntries(result.map((vehicle) => [vehicle.id, vehicle.type]));

        expect(typeById).toEqual({ b: "bike", s: "scooter" });
    });
});
