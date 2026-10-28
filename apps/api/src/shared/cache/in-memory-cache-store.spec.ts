import { describe, expect, it, vi } from "vitest";
import { InMemoryCacheStore } from "./in-memory-cache-store";

function makeClock(start = 0): { now: () => number; advance: (milliseconds: number) => void } {
    let current = start;
    return {
        now: () => current,
        advance: (milliseconds) => {
            current += milliseconds;
        },
    };
}

describe("InMemoryCacheStore", () => {
    it("renvoie la valeur en cache tant qu'elle n'a pas expiré", async () => {
        const clock = makeClock();
        const cache = new InMemoryCacheStore(clock.now);
        const load = vi.fn(async () => "valeur");

        await cache.getOrLoad("clé", 60_000, load);
        clock.advance(59_999);
        const result = await cache.getOrLoad("clé", 60_000, load);

        expect(result).toBe("valeur");
        expect(load).toHaveBeenCalledTimes(1);
    });

    it("recharge après expiration", async () => {
        const clock = makeClock();
        const cache = new InMemoryCacheStore(clock.now);
        const load = vi.fn(async () => "valeur");

        await cache.getOrLoad("clé", 60_000, load);
        clock.advance(60_000);
        await cache.getOrLoad("clé", 60_000, load);

        expect(load).toHaveBeenCalledTimes(2);
    });

    it("fait un seul chargement pour 100 demandes simultanées sur la même clé", async () => {
        const cache = new InMemoryCacheStore();
        let resolveLoad: (value: string) => void = () => undefined;
        const load = vi.fn(
            () =>
                new Promise<string>((resolve) => {
                    resolveLoad = resolve;
                }),
        );

        const requests = Array.from({ length: 100 }, () => cache.getOrLoad("arrêt:47909", 60_000, load));
        resolveLoad("passages");
        const results = await Promise.all(requests);

        expect(load).toHaveBeenCalledTimes(1);
        expect(results.every((result) => result === "passages")).toBe(true);
    });

    it("ne met jamais un échec en cache", async () => {
        const cache = new InMemoryCacheStore();
        const failingLoad = vi.fn(async () => {
            throw new Error("PRIM indisponible");
        });
        const load = vi.fn(async () => "valeur");

        await expect(cache.getOrLoad("clé", 60_000, failingLoad)).rejects.toThrow("PRIM indisponible");
        const result = await cache.getOrLoad("clé", 60_000, load);

        expect(result).toBe("valeur");
        expect(load).toHaveBeenCalledTimes(1);
    });

    it("supprime l'entrée la plus ancienne au-delà de la taille maximale", async () => {
        const cache = new InMemoryCacheStore(Date.now, 2);
        const load = vi.fn(async () => "valeur");

        await cache.getOrLoad("première", 60_000, load);
        await cache.getOrLoad("deuxième", 60_000, load);
        await cache.getOrLoad("troisième", 60_000, load);
        await cache.getOrLoad("deuxième", 60_000, load);
        await cache.getOrLoad("première", 60_000, load);

        expect(load).toHaveBeenCalledTimes(4);
    });
});
