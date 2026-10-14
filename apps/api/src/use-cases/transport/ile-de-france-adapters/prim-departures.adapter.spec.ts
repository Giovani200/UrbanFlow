import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryCacheStore } from "../../../shared/cache/in-memory-cache-store";
import { PrimDeparturesAdapter } from "./prim-departures.adapter";
import { PrimHttpClient } from "./prim-http-client";
import { PrimQuotas } from "./prim-quotas";

const busFixture: unknown = JSON.parse(readFileSync(join(__dirname, "__fixtures__", "stop-monitoring-bus.json"), "utf-8"));
const HENRI_WALLON = "STIF:StopPoint:Q:31051:";
const BUS_RECORDED_AT = Date.parse("2026-10-14T09:27:31.000Z");

function makeAdapter(): PrimDeparturesAdapter {
    const configService = { get: (key: string) => (key === "PRIM_API_KEY" ? "cle-de-test" : undefined) } as unknown as ConfigService;
    return new PrimDeparturesAdapter(new PrimHttpClient(configService), new PrimQuotas(configService), new InMemoryCacheStore());
}

function stubFetch(): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => busFixture }) as Response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

describe("PrimDeparturesAdapter", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.spyOn(Logger.prototype, "debug").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("interroge SIRI avec la référence d'arrêt encodée", async () => {
        vi.setSystemTime(BUS_RECORDED_AT + 30_000);
        const fetchMock = stubFetch();

        const departures = await makeAdapter().getNextDepartures(HENRI_WALLON);

        const [url] = fetchMock.mock.calls[0] as [string];
        expect(new URL(url).searchParams.get("MonitoringRef")).toBe(HENRI_WALLON);
        expect(departures.length).toBeGreaterThan(0);
    });

    it("lit le cache pendant 60 s et recalcule la fraîcheur à chaque lecture", async () => {
        vi.setSystemTime(BUS_RECORDED_AT + 70_000);
        const fetchMock = stubFetch();
        const adapter = makeAdapter();

        const firstRead = await adapter.getNextDepartures(HENRI_WALLON);
        vi.setSystemTime(BUS_RECORDED_AT + 129_000);
        const secondRead = await adapter.getNextDepartures(HENRI_WALLON);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const firstBus = firstRead.find((departure) => departure.scheduledTime === "2026-10-14T11:31:00+02:00");
        const secondBus = secondRead.find((departure) => departure.scheduledTime === "2026-10-14T11:31:00+02:00");
        expect(firstBus?.dataFreshness).toBe("realtime");
        expect(secondBus?.dataFreshness).toBe("scheduled");
    });
});
