import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Logger, ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryCacheStore } from "../../../shared/cache/in-memory-cache-store";
import { IdfmJourneysAdapter } from "./idfm-journeys.adapter";
import { PrimHttpClient } from "./prim-http-client";
import { PrimQuotas } from "./prim-quotas";

function readFixture(name: string): unknown {
    return JSON.parse(readFileSync(join(__dirname, "__fixtures__", name), "utf-8"));
}

const journeysFixture = readFixture("journeys.json");
const disruptionsFixture = readFixture("journey-disruptions.json") as object;
const routeDeparturesFixture = readFixture("route-departures.json");
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

    it("cherche les trajets qui arrivent avant l'heure limite, sur 24 h, sans les lignes exclues", async () => {
        const fetchMock = stubFetch(200, journeysFixture);

        await makeAdapter().getItinerariesArrivingBefore(origin, destination, true, "2026-11-04T04:00", [
            "C01415",
            "C01633",
        ]);
        const parameters = requestedParameters(fetchMock);

        expect(parameters.get("datetime")).toBe("20261104T040000");
        expect(parameters.get("datetime_represents")).toBe("arrival");
        expect(parameters.get("max_duration")).toBe("86400");
        expect(parameters.getAll("forbidden_uris[]")).toEqual(["line:IDFM:C01415", "line:IDFM:C01633"]);
        expect(parameters.get("wheelchair")).toBe("true");
        expect(parameters.get("data_freshness")).toBe("realtime");
    });

    it("cherche les trajets qui partent à partir d'une heure donnée, bus de nuit compris", async () => {
        const fetchMock = stubFetch(200, journeysFixture);

        await makeAdapter().getItinerariesDepartingFrom(origin, destination, false, "2026-11-03T23:09");
        const parameters = requestedParameters(fetchMock);

        expect(parameters.get("datetime")).toBe("20261103T230900");
        expect(parameters.get("datetime_represents")).toBe("departure");
        expect(parameters.has("forbidden_uris[]")).toBe(false);
    });

    it("trajet tardif sans solution (404) : liste vide", async () => {
        stubFetch(404, { error: { id: "no_solution" } });

        await expect(
            makeAdapter().getItinerariesArrivingBefore(origin, destination, false, "2026-11-04T04:00", []),
        ).resolves.toEqual([]);
    });

    it("renvoie une liste vide quand Navitia ne trouve aucune solution (404)", async () => {
        stubFetch(404, { error: { id: "no_solution" } });

        await expect(makeAdapter().getItineraries(origin, destination, false)).resolves.toEqual([]);
    });

    it("lève une indisponibilité sur une erreur serveur", async () => {
        stubFetch(500, {});

        await expect(makeAdapter().getItineraries(origin, destination, false)).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    describe("trajets limités à certaines lignes", () => {
        const arrivalLimit = "2026-11-09T09:00";

        it("demande chaque ligne, dans l'ordre, en mode arrivée", async () => {
            const fetchMock = stubFetch(200, journeysFixture);

            await makeAdapter().getItinerariesOnLines(origin, destination, true, arrivalLimit, ["C00881", "C01731"]);
            const parameters = requestedParameters(fetchMock);

            expect(parameters.getAll("allowed_id[]")).toEqual(["line:IDFM:C00881", "line:IDFM:C01731"]);
            expect(parameters.get("datetime")).toBe("20261109T090000");
            expect(parameters.get("datetime_represents")).toBe("arrival");
            expect(parameters.get("wheelchair")).toBe("true");
        });

        it("renvoie une liste vide quand une ligne manque (404)", async () => {
            stubFetch(404, { error: { id: "no_solution" } });

            const itineraries = await makeAdapter().getItinerariesOnLines(origin, destination, false, arrivalLimit, ["C00881"]);

            expect(itineraries).toEqual([]);
        });

        it("lève une indisponibilité sur une erreur serveur", async () => {
            stubFetch(503, {});

            await expect(
                makeAdapter().getItinerariesOnLines(origin, destination, false, arrivalLimit, ["C00881"]),
            ).rejects.toThrow(ServiceUnavailableException);
        });

        it("ne partage pas le cache entre deux listes de lignes différentes", async () => {
            const fetchMock = stubFetch(200, journeysFixture);
            const adapter = makeAdapter();

            await adapter.getItinerariesOnLines(origin, destination, false, arrivalLimit, ["C00881"]);
            await adapter.getItinerariesOnLines(origin, destination, false, arrivalLimit, ["C01731"]);

            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it("garde en cache une même liste de lignes", async () => {
            const fetchMock = stubFetch(200, journeysFixture);
            const adapter = makeAdapter();

            await adapter.getItinerariesOnLines(origin, destination, false, arrivalLimit, ["C00881", "C01731"]);
            await adapter.getItinerariesOnLines(origin, destination, false, arrivalLimit, ["C00881", "C01731"]);

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it("ne partage pas le cache avec une recherche sans limite de lignes", async () => {
            const fetchMock = stubFetch(200, journeysFixture);
            const adapter = makeAdapter();

            await adapter.getItinerariesOnLines(origin, destination, false, arrivalLimit, ["C00881"]);
            await adapter.getItinerariesArrivingBefore(origin, destination, false, arrivalLimit, []);

            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
    });

    describe("trajets avec les messages IDFM", () => {
        const arrivalLimit = "2026-11-09T09:00";

        it("renvoie les trajets et les messages, sans limite de lignes", async () => {
            const fetchMock = stubFetch(200, { ...(journeysFixture as object), ...disruptionsFixture });

            const result = await makeAdapter().getItinerariesWithNotices(origin, destination, false, arrivalLimit);
            const parameters = requestedParameters(fetchMock);

            expect(result.itineraries).toHaveLength(2);
            expect(result.notices.map((notice) => notice.text)).toContain("Melun - Travaux rue Saint Liesne");
            expect(parameters.getAll("allowed_id[]")).toEqual([]);
            expect(parameters.get("datetime_represents")).toBe("arrival");
            expect(parameters.has("disable_disruption")).toBe(false);
        });

        it("renvoie deux listes vides sans solution (404)", async () => {
            stubFetch(404, { error: { id: "no_solution" } });

            const result = await makeAdapter().getItinerariesWithNotices(origin, destination, false, arrivalLimit);

            expect(result).toEqual({ itineraries: [], notices: [] });
        });

        it("lève une indisponibilité sur une erreur serveur", async () => {
            stubFetch(503, {});

            await expect(
                makeAdapter().getItinerariesWithNotices(origin, destination, false, arrivalLimit),
            ).rejects.toThrow(ServiceUnavailableException);
        });
    });

    describe("départs prévus par arrêt et par direction", () => {
        const stopPointId = "stop_point:IDFM:monomodalStopPlace:470195";
        const routeId = "route:IDFM:SNCF:815e8dfa-b488-47ad-a039-47e78322bf92";

        it("demande les 4 prochains départs prévus de cette direction", async () => {
            const fetchMock = stubFetch(200, routeDeparturesFixture);

            await makeAdapter().getScheduledDepartures(stopPointId, routeId, "2026-11-09T08:00");
            const [url] = fetchMock.mock.calls[0] as [string];
            const requested = new URL(url);

            expect(requested.pathname).toContain(`/stop_points/${encodeURIComponent(stopPointId)}/routes/${encodeURIComponent(routeId)}/departures`);
            expect(requested.searchParams.get("from_datetime")).toBe("20261109T080000");
            expect(requested.searchParams.get("count")).toBe("4");
            expect(requested.searchParams.get("data_freshness")).toBe("base_schedule");
            expect(requested.searchParams.get("depth")).toBe("0");
        });

        it("renvoie les heures à l'heure de Paris", async () => {
            stubFetch(200, routeDeparturesFixture);

            const departures = await makeAdapter().getScheduledDepartures(stopPointId, routeId, "2026-11-09T08:00");

            expect(departures).toEqual([
                "2026-11-09T08:00:41+01:00",
                "2026-11-09T08:05:21+01:00",
                "2026-11-09T08:07:41+01:00",
                "2026-11-09T08:12:21+01:00",
            ]);
        });

        it("renvoie une liste vide sans départ (404)", async () => {
            stubFetch(404, { error: { id: "no_solution" } });

            const departures = await makeAdapter().getScheduledDepartures(stopPointId, routeId, "2026-11-09T08:00");

            expect(departures).toEqual([]);
        });

        it("lève une indisponibilité sur une erreur serveur", async () => {
            stubFetch(503, {});

            await expect(makeAdapter().getScheduledDepartures(stopPointId, routeId, "2026-11-09T08:00")).rejects.toThrow(
                ServiceUnavailableException,
            );
        });
    });

    it("ne rappelle pas PRIM pour la même demande dans la minute", async () => {
        const fetchMock = stubFetch(200, journeysFixture);
        const adapter = makeAdapter();

        await adapter.getItineraries(origin, destination, false, { dateTime: "2026-10-15T08:30", mode: "departure" });
        await adapter.getItineraries(origin, destination, false, { dateTime: "2026-10-15T08:30", mode: "departure" });

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
