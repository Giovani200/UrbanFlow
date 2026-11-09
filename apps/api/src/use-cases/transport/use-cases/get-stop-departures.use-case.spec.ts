import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { Departure, DeparturesProvider, NearbyStopsProvider, StopQuay } from "../transit.providers";
import { GetStopDeparturesUseCase } from "./get-stop-departures.use-case";

const STOP_ID = "stop_area:IDFM:61901";
const here = { latitude: 48.5244, longitude: 2.6437 };
const request = { stopId: STOP_ID, ...here };

const future = "2099-11-09T14:19:00+01:00";
const busPassage: Departure = {
    lineRef: "C00881",
    destinationName: "Melun",
    scheduledTime: future,
    expectedTime: future,
    delaySeconds: 0,
    dataFreshness: "realtime",
};

function quayAt(index: number): StopQuay {
    return {
        monitoringRef: `ref-${index}`,
        isRail: false,
        location: { latitude: here.latitude + index * 0.001, longitude: here.longitude },
    };
}

interface Setup {
    quays?: NearbyStopsProvider["getStopQuays"];
    lines?: NearbyStopsProvider["getStopLines"];
    passages?: DeparturesProvider["getNextDepartures"];
}

function makeUseCase(setup: Setup = {}) {
    const getStopQuays = vi.fn(setup.quays ?? (async () => [quayAt(0), quayAt(1)]));
    const getStopLines = vi.fn(setup.lines ?? (async () => [{ lineId: "C00881", code: "3601", mode: "bus" as const }]));
    const getNextDepartures = vi.fn<DeparturesProvider["getNextDepartures"]>(
        setup.passages ?? (async (reference) => (reference === "ref-0" ? [busPassage] : [])),
    );
    const useCase = new GetStopDeparturesUseCase(
        { getNearbyStops: async () => [], getStopQuays, getStopLines },
        { getNextDepartures },
    );
    return { useCase, getStopQuays, getNextDepartures };
}

describe("GetStopDeparturesUseCase", () => {
    it("donne les passages de l'arrêt", async () => {
        const { useCase } = makeUseCase();

        const result = await useCase.execute(request);

        expect(result.status).toBe("ok");
        expect(result.rows[0]).toMatchObject({ lineCode: "3601", destination: "Melun" });
    });

    it("dans une grande gare, ne lit que les 6 quais les plus proches", async () => {
        const quays = Array.from({ length: 26 }, (_, index) => quayAt(25 - index));
        const { useCase, getNextDepartures } = makeUseCase({ quays: async () => quays });

        await useCase.execute(request);
        const references = getNextDepartures.mock.calls.map(([reference]) => reference).sort();

        expect(references).toEqual(["ref-0", "ref-1", "ref-2", "ref-3", "ref-4", "ref-5"]);
    });

    it("dans une gare, lit toujours la référence ferrée, même plus loin que 6 quais de bus", async () => {
        const rail: StopQuay = {
            monitoringRef: "STIF:StopArea:SP:470195:",
            isRail: true,
            location: { latitude: here.latitude + 0.05, longitude: here.longitude },
        };
        const busQuays = Array.from({ length: 8 }, (_, index) => quayAt(index));
        const { useCase, getNextDepartures } = makeUseCase({ quays: async () => [...busQuays, rail] });

        await useCase.execute(request);
        const references = getNextDepartures.mock.calls.map(([reference]) => reference);

        expect(references).toHaveLength(6);
        expect(references).toContain("STIF:StopArea:SP:470195:");
    });

    it("un quai en panne n'empêche pas d'afficher les autres", async () => {
        const { useCase } = makeUseCase({
            passages: async (reference) => {
                if (reference === "ref-1") throw new Error("panne");
                return [busPassage];
            },
        });

        const result = await useCase.execute(request);

        expect(result.status).toBe("ok");
        expect(result.rows).toHaveLength(1);
    });

    it("tous les quais en panne : source indisponible, pas une absence de passage", async () => {
        const { useCase } = makeUseCase({
            passages: async () => {
                throw new Error("panne");
            },
        });

        expect(await useCase.execute(request)).toEqual({ status: "unavailable", rows: [] });
    });

    it("quais introuvables à cause d'une panne : source indisponible", async () => {
        const { useCase } = makeUseCase({
            quays: async () => {
                throw new Error("panne");
            },
        });

        expect(await useCase.execute(request)).toEqual({ status: "unavailable", rows: [] });
    });

    it("lignes introuvables à cause d'une panne : source indisponible", async () => {
        const { useCase } = makeUseCase({
            lines: async () => {
                throw new Error("panne");
            },
        });

        expect(await useCase.execute(request)).toEqual({ status: "unavailable", rows: [] });
    });

    it("aucun passage annoncé : le dit", async () => {
        const { useCase } = makeUseCase({ passages: async () => [] });

        expect(await useCase.execute(request)).toEqual({ status: "no_result", rows: [] });
    });

    it("aucun quai lisible : aucun passage, sans appel SIRI", async () => {
        const { useCase, getNextDepartures } = makeUseCase({ quays: async () => [] });

        expect((await useCase.execute(request)).status).toBe("no_result");
        expect(getNextDepartures).not.toHaveBeenCalled();
    });

    it.each(["../../etc/passwd", "stop_point:IDFM:31051", "stop_area:IDFM:61901/lines?x=1"])(
        "refuse l'identifiant forgé %s avant tout appel",
        async (stopId) => {
            const { useCase, getStopQuays } = makeUseCase();

            await expect(useCase.execute({ ...request, stopId })).rejects.toThrow(BadRequestException);
            expect(getStopQuays).not.toHaveBeenCalled();
        },
    );
});
