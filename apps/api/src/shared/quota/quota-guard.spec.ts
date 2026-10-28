import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuotaExceededError, QuotaGuard } from "./quota-guard";

const OCTOBER_14_NOON_PARIS = Date.parse("2026-10-14T10:00:00Z");

function makeGuard(options: { dailyLimit: number; perSecond?: number; start?: number }) {
    let current = options.start ?? OCTOBER_14_NOON_PARIS;
    const sleep = vi.fn(async (milliseconds: number) => {
        current += milliseconds;
    });
    const guard = new QuotaGuard({
        name: "test",
        dailyLimit: options.dailyLimit,
        perSecond: options.perSecond ?? 100,
        now: () => current,
        sleep,
    });
    return {
        guard,
        sleep,
        advance: (milliseconds: number) => {
            current += milliseconds;
        },
    };
}

describe("QuotaGuard", () => {
    afterEach(() => vi.restoreAllMocks());

    it("lève QuotaExceededError une fois le quota du jour épuisé", async () => {
        const { guard } = makeGuard({ dailyLimit: 3 });

        await guard.acquire();
        await guard.acquire();
        await guard.acquire();

        await expect(guard.acquire()).rejects.toBeInstanceOf(QuotaExceededError);
        expect(guard.usage()).toEqual({ used: 3, limit: 3 });
    });

    it("repart à zéro le lendemain à Paris", async () => {
        const { guard, advance } = makeGuard({ dailyLimit: 1 });

        await guard.acquire();
        advance(14 * 60 * 60 * 1000);

        await expect(guard.acquire()).resolves.toBeUndefined();
        expect(guard.usage().used).toBe(1);
    });

    it("fait attendre le sixième appel d'une même seconde", async () => {
        const { guard, sleep } = makeGuard({ dailyLimit: 100, perSecond: 5 });

        for (let call = 0; call < 6; call += 1) {
            await guard.acquire();
        }

        expect(sleep).toHaveBeenCalledTimes(1);
        expect(sleep).toHaveBeenCalledWith(1000);
    });

    it("alerte une seule fois à 80 % du quota", async () => {
        const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
        const { guard } = makeGuard({ dailyLimit: 10 });

        for (let call = 0; call < 10; call += 1) {
            await guard.acquire();
        }

        expect(warn).toHaveBeenCalledTimes(1);
    });

    it("ne dépasse jamais le quota avec des appels simultanés", async () => {
        const { guard } = makeGuard({ dailyLimit: 3 });

        const results = await Promise.allSettled(Array.from({ length: 5 }, () => guard.acquire()));

        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(3);
        expect(guard.usage().used).toBe(3);
    });
});
