import { Logger, ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z as zod } from "zod";
import { QuotaGuard } from "../../../shared/quota/quota-guard";
import { PrimHttpClient } from "./prim-http-client";

const SECRET_KEY = "cle-secrete-de-test";
const ResponseSchema = zod.object({ value: zod.number() });

function makeClient(apiKey: string | null = SECRET_KEY): PrimHttpClient {
    const configService = { get: () => apiKey ?? undefined } as unknown as ConfigService;
    return new PrimHttpClient(configService);
}

function makeQuota(dailyLimit = 100): QuotaGuard {
    return new QuotaGuard({ name: "test", dailyLimit, perSecond: 100 });
}

function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

describe("PrimHttpClient", () => {
    let loggedMessages: string[];

    beforeEach(() => {
        loggedMessages = [];
        for (const level of ["error", "warn", "log", "debug"] as const) {
            vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
                loggedMessages.push(String(message));
            });
        }
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("renvoie les données validées et envoie la clé en en-tête", async () => {
        const fetchMock = stubFetch(200, { value: 42 });

        const result = await makeClient().getJson("v2/navitia/journeys?count=1", ResponseSchema, makeQuota(), "TEST_FAILED");

        expect(result).toEqual({ value: 42 });
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys?count=1");
        expect((init.headers as Record<string, string>).apikey).toBe(SECRET_KEY);
    });

    it("signale une clé refusée en erreur de configuration", async () => {
        stubFetch(401, {});
        const error = vi.mocked(Logger.prototype.error);

        await expect(makeClient().getJson("stop-monitoring", ResponseSchema, makeQuota(), "TEST_FAILED")).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
        expect(error).toHaveBeenCalled();
    });

    it.each([500, 429])("lève une indisponibilité sur le statut %i", async (status) => {
        stubFetch(status, {});

        await expect(makeClient().getJson("stop-monitoring", ResponseSchema, makeQuota(), "TEST_FAILED")).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
    });

    it("accepte un statut explicitement autorisé", async () => {
        stubFetch(404, { value: 0 });

        const result = await makeClient().getJson("v2/navitia/journeys", ResponseSchema, makeQuota(), "TEST_FAILED", [404]);

        expect(result).toEqual({ value: 0 });
    });

    it("refuse une réponse qui ne respecte pas le schéma", async () => {
        stubFetch(200, { value: "pas un nombre" });

        await expect(makeClient().getJson("stop-monitoring", ResponseSchema, makeQuota(), "TEST_FAILED")).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
    });

    it("n'appelle pas PRIM quand le quota est épuisé", async () => {
        const fetchMock = stubFetch(200, { value: 1 });

        await expect(makeClient().getJson("stop-monitoring", ResponseSchema, makeQuota(0), "TEST_FAILED")).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refuse de fonctionner sans clé", async () => {
        stubFetch(200, { value: 1 });

        await expect(makeClient(null).getJson("stop-monitoring", ResponseSchema, makeQuota(), "TEST_FAILED")).rejects.toThrow(
            "PRIM_API_KEY_MISSING",
        );
    });

    it("ne journalise jamais la clé", async () => {
        stubFetch(401, {});
        await makeClient().getJson("stop-monitoring?MonitoringRef=x", ResponseSchema, makeQuota(), "TEST_FAILED").catch(() => undefined);
        stubFetch(200, { value: "invalide" });
        await makeClient().getJson("stop-monitoring?MonitoringRef=x", ResponseSchema, makeQuota(), "TEST_FAILED").catch(() => undefined);

        expect(loggedMessages.length).toBeGreaterThan(0);
        expect(loggedMessages.some((message) => message.includes(SECRET_KEY))).toBe(false);
    });
});
