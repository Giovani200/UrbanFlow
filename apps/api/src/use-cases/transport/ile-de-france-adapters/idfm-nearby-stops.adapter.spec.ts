import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryCacheStore } from "../../../shared/cache/in-memory-cache-store";
import { IdfmNearbyStopsAdapter } from "./idfm-nearby-stops.adapter";
import { PrimHttpClient } from "./prim-http-client";
import { PrimQuotas } from "./prim-quotas";

function readFixture(name: string): unknown {
    return JSON.parse(readFileSync(join(__dirname, "__fixtures__", name), "utf-8"));
}

const placesNearby = readFixture("places-nearby.json");
const henriWallonLines = readFixture("stop-area-lines.json");
const HENRI_WALLON = "stop_area:IDFM:61901";
const LUCIEN_BOUTET = "stop_area:IDFM:61891";
const henriWallon = { latitude: 48.5244, longitude: 2.6437 };

function makeAdapter(): IdfmNearbyStopsAdapter {
    const configService = { get: (key: string) => (key === "PRIM_API_KEY" ? "cle-de-test" : undefined) } as unknown as ConfigService;
    return new IdfmNearbyStopsAdapter(new PrimHttpClient(configService), new PrimQuotas(configService), new InMemoryCacheStore());
}

function respond(status: number, body: unknown): Response {
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

/** PRIM simulé : arrêts proches, lignes d'Henri Wallon, panne sur Lucien Boutet, aucune ligne ailleurs. */
function stubPrim(): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async (url: string) => {
        const path = decodeURIComponent(url);
        if (path.includes("places_nearby")) return respond(200, placesNearby);
        if (path.includes(`${HENRI_WALLON}/lines`)) return respond(200, henriWallonLines);
        if (path.includes(`${LUCIEN_BOUTET}/lines`)) return respond(500, {});
        return respond(200, { lines: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function callsTo(fetchMock: ReturnType<typeof vi.fn>, fragment: string): number {
    return fetchMock.mock.calls.filter(([url]) => decodeURIComponent(String(url)).includes(fragment)).length;
}

describe("IdfmNearbyStopsAdapter", () => {
    beforeEach(() => {
        vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
        vi.spyOn(Logger.prototype, "debug").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("renvoie Henri Wallon avec ses lignes de bus, sans la commune dans le nom", async () => {
        stubPrim();

        const stops = await makeAdapter().getNearbyStops(henriWallon, 400);
        const stop = stops.find((candidate) => candidate.id === HENRI_WALLON);

        expect(stop?.name).toBe("Henri Wallon");
        expect(stop?.distanceMeters).toBe(3);
        expect(stop?.lines).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: "3601", mode: "bus", color: "#FF5A00" }),
                expect.objectContaining({ code: "3604", mode: "bus" }),
            ]),
        );
    });

    it("omet un arrêt dont les lignes n'ont pas pu être lues, et garde les autres", async () => {
        stubPrim();

        const stops = await makeAdapter().getNearbyStops(henriWallon, 400);

        expect(stops.map((stop) => stop.id)).toContain(HENRI_WALLON);
        expect(stops.map((stop) => stop.id)).not.toContain(LUCIEN_BOUTET);
    });

    it("ne rappelle pas PRIM pour une même zone dans la journée", async () => {
        const fetchMock = stubPrim();
        const adapter = makeAdapter();

        await adapter.getNearbyStops(henriWallon, 400);
        await adapter.getNearbyStops(henriWallon, 400);

        expect(callsTo(fetchMock, "places_nearby")).toBe(1);
    });

    it("garde en cache les lignes d'un arrêt déjà vu depuis une autre zone", async () => {
        const fetchMock = stubPrim();
        const adapter = makeAdapter();

        await adapter.getNearbyStops(henriWallon, 400);
        await adapter.getNearbyStops({ latitude: 48.527, longitude: 2.646 }, 400);

        expect(callsTo(fetchMock, "places_nearby")).toBe(2);
        expect(callsTo(fetchMock, `${HENRI_WALLON}/lines`)).toBe(1);
    });
});
