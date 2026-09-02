import { afterEach, describe, expect, it, vi } from "vitest";
import { MetromobiliteStopsAdapter } from "./metromobilite-stops.adapter";

const origin = { latitude: 45.188, longitude: 5.724 };

const routesIndex = [
    { id: "SEM:A", shortName: "A", color: "3376B8", textColor: "FFFFFF" },
    { id: "SEM:C5", shortName: "C5", color: "F5D24D", textColor: "000000" },
];

const nearStops = [
    { id: "S1", name: "Arrêt Test", lon: 5.7242, lat: 45.1882, lines: ["SEM:A", "SEM:C5", "SE2:99"] },
];

function mockFetch(options: { routesOk?: boolean } = {}): ReturnType<typeof vi.fn> {
    const routesOk = options.routesOk ?? true;
    return vi.fn(async (input: string) => {
        if (String(input).includes("index/routes")) {
            return { ok: routesOk, json: async () => routesIndex } as Response;
        }
        return { ok: true, json: async () => nearStops } as Response;
    });
}

describe("MetromobiliteStopsAdapter", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("enrichit chaque ligne SEM avec sa couleur officielle et écarte les autres réseaux", async () => {
        vi.stubGlobal("fetch", mockFetch());

        const [stop] = await new MetromobiliteStopsAdapter().getNearbyStops(origin, 400);

        expect(stop.lines).toEqual([
            { code: "A", mode: "tram", color: "#3376B8", textColor: "#FFFFFF" },
            { code: "C5", mode: "bus", color: "#F5D24D", textColor: "#000000" },
        ]);
    });

    it("ne charge l'index des routes qu'une seule fois (cache)", async () => {
        const fetchMock = mockFetch();
        vi.stubGlobal("fetch", fetchMock);

        const adapter = new MetromobiliteStopsAdapter();
        await adapter.getNearbyStops(origin, 400);
        await adapter.getNearbyStops(origin, 400);

        const indexCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes("index/routes"));
        expect(indexCalls).toHaveLength(1);
    });

    it("dégrade sans couleur si l'index des routes échoue, sans faire échouer les arrêts", async () => {
        vi.stubGlobal("fetch", mockFetch({ routesOk: false }));

        const [stop] = await new MetromobiliteStopsAdapter().getNearbyStops(origin, 400);

        expect(stop.lines.map((line) => line.code)).toEqual(["A", "C5"]);
        expect(stop.lines.every((line) => line.color === undefined)).toBe(true);
    });
});