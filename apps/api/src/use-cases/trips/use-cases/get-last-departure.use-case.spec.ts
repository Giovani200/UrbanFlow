import { ServiceUnavailableException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { InMemoryCacheStore } from "../../../shared/cache/in-memory-cache-store";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type {
    NightLinesProvider,
    TransitItinerary,
    TransitLeg,
    TransitRoutingProvider,
} from "../../transport/transit.providers";
import { GetLastDepartureUseCase } from "./get-last-departure.use-case";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };
const bastille = { latitude: 48.853, longitude: 2.369 };
const home = { label: "Maison", latitude: 48.514, longitude: 2.639 };
const NOW = new Date("2026-11-03T21:30:00Z");

const walkLeg: TransitLeg = {
    mode: "walk",
    geometry: { type: "LineString", coordinates: [] },
    distanceMeters: 300,
    durationSeconds: 240,
};
const trainLeg: TransitLeg = { ...walkLeg, mode: "train", distanceMeters: 40_000, lineShortName: "R", lineId: "C01731" };

function itinerary(departureTime: string, arrivalTime: string, legs: TransitLeg[] = [walkLeg, trainLeg]): TransitItinerary {
    return { legs, durationSeconds: 3600, departureTime, arrivalTime };
}

const lastAt2307 = itinerary("2026-11-03T23:07:48+01:00", "2026-11-04T01:31:11+01:00");
const earlierAt2258 = itinerary("2026-11-03T22:58:45+01:00", "2026-11-04T01:31:11+01:00");
const nightBusAt0201 = itinerary("2026-11-04T02:01:57+01:00", "2026-11-04T04:28:50+01:00");
const morningAt0344 = itinerary("2026-11-04T03:44:48+01:00", "2026-11-04T05:28:53+01:00");

interface Setup {
    homeAddress?: typeof home | null;
    preferences?: { lastDepartureDistanceMeters: number; lastDepartureWindowMinutes: number; wheelchairAccess: boolean } | null;
    arrivingBefore?: TransitRoutingProvider["getItinerariesArrivingBefore"];
    departingFrom?: TransitRoutingProvider["getItinerariesDepartingFrom"];
    nightLineIds?: NightLinesProvider["getNightLineIds"];
}

function makeUseCase(setup: Setup = {}) {
    const findFirst = vi.fn(async () => (setup.homeAddress === undefined ? home : setup.homeAddress));
    const findUnique = vi.fn(async () => setup.preferences ?? null);
    const prisma = { favoriteAddress: { findFirst }, preferences: { findUnique } } as unknown as PrismaService;

    const getItinerariesArrivingBefore = vi.fn(setup.arrivingBefore ?? (async () => [lastAt2307, earlierAt2258]));
    const getItinerariesDepartingFrom = vi.fn(setup.departingFrom ?? (async () => [morningAt0344, nightBusAt0201]));
    const transitRoutingProvider: TransitRoutingProvider = {
        getItineraries: async () => [],
        getItinerariesArrivingBefore,
        getItinerariesDepartingFrom,
    };
    const getNightLineIds = vi.fn(setup.nightLineIds ?? (async () => ["C01415", "C01633"]));

    const useCase = new GetLastDepartureUseCase(
        prisma,
        transitRoutingProvider,
        { getNightLineIds },
        new InMemoryCacheStore(),
    );
    return { useCase, findFirst, getItinerariesArrivingBefore, getItinerariesDepartingFrom, getNightLineIds };
}

describe("GetLastDepartureUseCase", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renvoie le dernier départ, le plus tardif, et le Plan B qui arrive le plus tôt", async () => {
        const { useCase } = makeUseCase();

        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("ok");
        expect(result.home).toEqual(home);
        expect(result.lastDeparture?.departureTime).toBe("2026-11-03T23:07:48+01:00");
        expect(result.lastDeparture?.arrivalTime).toBe("2026-11-04T01:31:11+01:00");
        expect(result.planB?.departureTime).toBe("2026-11-04T02:01:57+01:00");
        expect(result.planBStatus).toBe("ok");
    });

    it("cherche le domicile du seul compte connecté", async () => {
        const { useCase, findFirst } = makeUseCase();

        await useCase.execute(user, { position: bastille });

        expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1", isHome: true } }));
    });

    it("exclut les bus de nuit et vise 04:00 en fin de journée de service", async () => {
        const { useCase, getItinerariesArrivingBefore } = makeUseCase();

        await useCase.execute(user, { position: bastille });

        expect(getItinerariesArrivingBefore).toHaveBeenCalledWith(
            bastille,
            home,
            false,
            "2026-11-04T04:00",
            ["C01415", "C01633"],
        );
    });

    it("cherche le Plan B une minute après le dernier départ", async () => {
        const { useCase, getItinerariesDepartingFrom } = makeUseCase();

        await useCase.execute(user, { position: bastille });

        expect(getItinerariesDepartingFrom).toHaveBeenCalledWith(bastille, home, false, "2026-11-03T23:08");
    });

    it("transmet l'accès fauteuil du profil", async () => {
        const { useCase, getItinerariesArrivingBefore } = makeUseCase({
            preferences: { lastDepartureDistanceMeters: 1000, lastDepartureWindowMinutes: 120, wheelchairAccess: true },
        });

        await useCase.execute(user, { position: bastille });

        expect(getItinerariesArrivingBefore.mock.calls[0][2]).toBe(true);
    });

    it("sans domicile : no_home, sans appel au calculateur", async () => {
        const { useCase, getItinerariesArrivingBefore } = makeUseCase({ homeAddress: null });

        const result = await useCase.execute(user, { position: bastille });

        expect(result).toEqual({ status: "no_home", home: null, lastDeparture: null, planB: null, planBStatus: null });
        expect(getItinerariesArrivingBefore).not.toHaveBeenCalled();
    });

    it("à moins de la distance réglée : near_home, sans appel au calculateur", async () => {
        const { useCase, getItinerariesArrivingBefore, getNightLineIds } = makeUseCase();

        const result = await useCase.execute(user, { position: { latitude: 48.516, longitude: 2.639 } });

        expect(result.status).toBe("near_home");
        expect(getItinerariesArrivingBefore).not.toHaveBeenCalled();
        expect(getNightLineIds).not.toHaveBeenCalled();
    });

    it("respecte une distance réglée plus grande", async () => {
        const { useCase } = makeUseCase({
            preferences: { lastDepartureDistanceMeters: 20_000, lastDepartureWindowMinutes: 120, wheelchairAccess: false },
        });

        const result = await useCase.execute(user, { position: { latitude: 48.6, longitude: 2.639 } });

        expect(result.status).toBe("near_home");
    });

    it("dernier départ au-delà de la fenêtre : outside_window, sans trajet", async () => {
        vi.setSystemTime(new Date("2026-11-03T18:00:00Z"));
        const { useCase, getItinerariesDepartingFrom } = makeUseCase();

        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("outside_window");
        expect(result.lastDeparture).toBeNull();
        expect(getItinerariesDepartingFrom).not.toHaveBeenCalled();
    });

    it("respecte une fenêtre réglée plus longue", async () => {
        vi.setSystemTime(new Date("2026-11-03T18:00:00Z"));
        const { useCase } = makeUseCase({
            preferences: { lastDepartureDistanceMeters: 1000, lastDepartureWindowMinutes: 360, wheelchairAccess: false },
        });

        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("ok");
    });

    it("dernier départ passé : departed", async () => {
        vi.setSystemTime(new Date("2026-11-03T22:10:00Z"));
        const { useCase } = makeUseCase();

        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("departed");
    });

    it("aucun trajet ce soir : no_result", async () => {
        const { useCase } = makeUseCase({ arrivingBefore: async () => [] });

        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("no_result");
        expect(result.home?.label).toBe("Maison");
    });

    it("un trajet uniquement à pied ne compte pas comme dernier départ", async () => {
        const { useCase } = makeUseCase({
            arrivingBefore: async () => [itinerary("2026-11-03T23:30:00+01:00", "2026-11-04T03:00:00+01:00", [walkLeg])],
        });

        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("no_result");
    });

    it("calculateur en panne : unavailable", async () => {
        const { useCase } = makeUseCase({
            arrivingBefore: async () => {
                throw new ServiceUnavailableException("IDFM_JOURNEYS_FAILED");
            },
        });

        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("unavailable");
    });

    it("référentiel des bus de nuit en panne : unavailable, sans risquer un bus de nuit pris pour le dernier départ", async () => {
        const { useCase, getItinerariesArrivingBefore } = makeUseCase({
            nightLineIds: async () => {
                throw new ServiceUnavailableException("IDFM_NIGHT_LINES_FAILED");
            },
        });

        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("unavailable");
        expect(getItinerariesArrivingBefore).not.toHaveBeenCalled();
    });

    it("Plan B en panne : le dernier départ reste, planBStatus unavailable", async () => {
        const { useCase } = makeUseCase({
            departingFrom: async () => {
                throw new ServiceUnavailableException("IDFM_JOURNEYS_FAILED");
            },
        });

        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("ok");
        expect(result.planB).toBeNull();
        expect(result.planBStatus).toBe("unavailable");
    });

    it("aucun trajet après le dernier départ : planBStatus no_result", async () => {
        const { useCase } = makeUseCase({ departingFrom: async () => [lastAt2307] });

        const result = await useCase.execute(user, { position: bastille });

        expect(result.planB).toBeNull();
        expect(result.planBStatus).toBe("no_result");
    });

    it("hors fenêtre, un nouvel appel répond sans interroger le calculateur", async () => {
        vi.setSystemTime(new Date("2026-11-03T18:00:00Z"));
        const { useCase, getItinerariesArrivingBefore } = makeUseCase();

        await useCase.execute(user, { position: bastille });
        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("outside_window");
        expect(getItinerariesArrivingBefore).toHaveBeenCalledTimes(1);
    });

    it("l'heure gardée depuis l'après-midi suffit, puis le trajet est recalculé dans la fenêtre", async () => {
        vi.setSystemTime(new Date("2026-11-03T18:00:00Z"));
        const { useCase, getItinerariesArrivingBefore } = makeUseCase();
        await useCase.execute(user, { position: bastille });

        vi.setSystemTime(NOW);
        const result = await useCase.execute(user, { position: bastille });

        expect(result.status).toBe("ok");
        expect(getItinerariesArrivingBefore).toHaveBeenCalledTimes(2);
    });

    it("dans la fenêtre, chaque appel recalcule le trajet pour suivre le temps réel", async () => {
        const delayed = itinerary("2026-11-03T23:12:00+01:00", "2026-11-04T01:36:00+01:00");
        const responses = [[lastAt2307], [lastAt2307], [delayed]];
        const { useCase } = makeUseCase({ arrivingBefore: async () => responses.shift() ?? [] });

        await useCase.execute(user, { position: bastille });
        const result = await useCase.execute(user, { position: bastille });

        expect(result.lastDeparture?.departureTime).toBe("2026-11-03T23:12:00+01:00");
    });

    it("une panne n'est pas gardée : l'appel suivant réessaie", async () => {
        let calls = 0;
        const { useCase } = makeUseCase({
            arrivingBefore: async () => {
                calls += 1;
                if (calls === 1) throw new ServiceUnavailableException("IDFM_JOURNEYS_FAILED");
                return [lastAt2307];
            },
        });

        const first = await useCase.execute(user, { position: bastille });
        const second = await useCase.execute(user, { position: bastille });

        expect(first.status).toBe("unavailable");
        expect(second.status).toBe("ok");
    });

    it("position invalide : rejet Zod avant toute requête", async () => {
        const { useCase, findFirst } = makeUseCase();

        await expect(useCase.execute(user, { position: { latitude: 120, longitude: 2.369 } })).rejects.toThrow();
        expect(findFirst).not.toHaveBeenCalled();
    });
});
