import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Logger, ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryCacheStore } from "../../../shared/cache/in-memory-cache-store";
import { IdfmJourneysAdapter } from "./idfm-journeys.adapter";
import { PrimHttpClient } from "./prim-http-client";
import { PrimQuotas } from "./prim-quotas";

const journeysFixture: unknown = JSON.parse(readFileSync(join(__dirname, "__fixtures__", "journeys.json"), "utf-8"));
const origin = { latitude: 48.5244, longitude: 2.6437 };
const destination = { latitude: 48.892, longitude: 2.238 };

function makeAdapter(): IdfmJourneysAdapter {
    const configService = { get: (key: string) => (key === "PRIM_API_KEY" ? "cle-de-test" : undefined) } as unknown as ConfigService;
    return new IdfmJourneysAdapter(new PrimHttpClient(configService), new PrimQuotas(configService), new InMemoryCacheStore());
}

function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function requestedParameters(fetchMock: ReturnType<typeof vi.fn>): URLSearchParams {
    const [url] = fetchMock.mock.calls[0] as [string];
    return new URL(url).searchParams;
}

describe("IdfmJourneysAdapter", () => {
    beforeEach(() => {
        vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
        vi.spyOn(Logger.prototype, "debug").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("traduit les itinéraires de la réponse", async () => {
        stubFetch(200, journeysFixture);

        const itineraries = await makeAdapter().getItineraries(origin, destination, false);

        expect(itineraries).toHaveLength(2);
        expect(itineraries[0].legs.map((leg) => leg.mode)).toContain("train");
    });

    it("demande le temps réel, sans perturbations, avec l'option fauteuil", async () => {
        const fetchMock = stubFetch(200, journeysFixture);

        await makeAdapter().getItineraries(origin, destination, true);
        const parameters = requestedParameters(fetchMock);

        expect(parameters.get("from")).toBe("2.6437;48.5244");
        expect(parameters.get("to")).toBe("2.238;48.892");
        expect(parameters.get("data_freshness")).toBe("realtime");
        expect(parameters.get("disable_disruption")).toBe("true");
        expect(parameters.get("wheelchair")).toBe("true");
        expect(parameters.get("count")).toBe("5");
    });

    it("transmet une heure d'arrivée souhaitée", async () => {
        const fetchMock = stubFetch(200, journeysFixture);

        await makeAdapter().getItineraries(origin, destination, false, { dateTime: "2026-10-15T08:30", mode: "arrival" });
        const parameters = requestedParameters(fetchMock);

        expect(parameters.get("datetime")).toBe("20261015T083000");
        expect(parameters.get("datetime_represents")).toBe("arrival");
    });

    it("renvoie une liste vide quand Navitia ne trouve aucune solution (404)", async () => {
        stubFetch(404, { error: { id: "no_solution" } });

        await expect(makeAdapter().getItineraries(origin, destination, false)).resolves.toEqual([]);
    });

    it("lève une indisponibilité sur une erreur serveur", async () => {
        stubFetch(500, {});

        await expect(makeAdapter().getItineraries(origin, destination, false)).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it("ne rappelle pas PRIM pour la même demande dans la minute", async () => {
        const fetchMock = stubFetch(200, journeysFixture);
        const adapter = makeAdapter();

        await adapter.getItineraries(origin, destination, false, { dateTime: "2026-10-15T08:30", mode: "departure" });
        await adapter.getItineraries(origin, destination, false, { dateTime: "2026-10-15T08:30", mode: "departure" });

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
