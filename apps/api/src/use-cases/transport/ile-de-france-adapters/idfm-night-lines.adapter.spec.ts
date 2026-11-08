import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryCacheStore } from "../../../shared/cache/in-memory-cache-store";
import { IdfmNightLinesAdapter } from "./idfm-night-lines.adapter";

function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

const twoNightLines = { total_count: 2, results: [{ id_line: "C01415" }, { id_line: "C01633" }] };

describe("IdfmNightLinesAdapter", () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("renvoie les identifiants des lignes de nuit", async () => {
        stubFetch(200, twoNightLines);

        await expect(new IdfmNightLinesAdapter(new InMemoryCacheStore()).getNightLineIds()).resolves.toEqual([
            "C01415",
            "C01633",
        ]);
    });

    it("filtre sur le sous-mode nightBus des lignes actives", async () => {
        const fetchMock = stubFetch(200, twoNightLines);

        await new IdfmNightLinesAdapter(new InMemoryCacheStore()).getNightLineIds();
        const [url] = fetchMock.mock.calls[0] as [string];
        const parameters = new URL(url).searchParams;

        expect(parameters.get("where")).toBe('transportsubmode="nightBus" and status="active"');
        expect(parameters.get("select")).toBe("id_line");
    });

    it("n'interroge le référentiel qu'une fois grâce au cache", async () => {
        const fetchMock = stubFetch(200, twoNightLines);
        const adapter = new IdfmNightLinesAdapter(new InMemoryCacheStore());

        await adapter.getNightLineIds();
        await adapter.getNightLineIds();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("réponse invalide : source indisponible", async () => {
        stubFetch(200, { results: [{ id_line: 42 }] });

        await expect(new IdfmNightLinesAdapter(new InMemoryCacheStore()).getNightLineIds()).rejects.toThrow(
            ServiceUnavailableException,
        );
    });

    it("statut d'erreur : source indisponible", async () => {
        stubFetch(500, {});

        await expect(new IdfmNightLinesAdapter(new InMemoryCacheStore()).getNightLineIds()).rejects.toThrow(
            ServiceUnavailableException,
        );
    });

    it("signale une liste tronquée par la pagination", async () => {
        stubFetch(200, { total_count: 150, results: twoNightLines.results });

        await new IdfmNightLinesAdapter(new InMemoryCacheStore()).getNightLineIds();

        expect(warn).toHaveBeenCalledWith(expect.stringContaining("150 lignes de nuit"));
    });
});
