import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Prisma, type Share } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { RoutineDayPlanner } from "../../routines/routine-day-planner.service";
import { hashShareToken } from "../share-token";
import { CreateShareUseCase } from "./create-share.use-case";

const user: AuthenticatedUser = { userId: "user-1", email: "lea@test.fr" };

const itinerarySource = {
    source: {
        kind: "itinerary",
        destinationLabel: "Chez moi",
        itinerary: {
            segments: [],
            totalDurationSeconds: 3600,
            totalDistanceMeters: 40000,
            totalCarbonGrams: 400,
            totalSavedGrams: 5000,
            departureTime: "2026-11-16T23:38:00+01:00",
            arrivalTime: "2026-11-17T00:50:00+01:00",
        },
    },
};

function activeShare(estimatedArrivalAt: Date): Share {
    return {
        id: "share-previous",
        userId: "user-1",
        tokenHash: "previous-hash",
        routineId: null,
        itinerary: {},
        destinationLabel: "Chez moi",
        estimatedArrivalAt,
        lastLatitude: null,
        lastLongitude: null,
        lastPositionAt: null,
        startedAt: new Date(estimatedArrivalAt.getTime() - 3_600_000),
        endedAt: null,
        endReason: null,
    };
}

function makeUseCase({ consent = true, previous = null }: { consent?: boolean; previous?: Share | null } = {}) {
    const update = vi.fn(async (_arg: { where: { id: string }; data: Prisma.ShareUpdateManyMutationInput }) => ({}));
    const create = vi.fn(async (_arg: { data: Record<string, unknown> }) => ({}));
    const prisma = {
        user: { findUnique: vi.fn(async () => ({ shareConsentAt: consent ? new Date() : null })) },
        share: { deleteMany: vi.fn(async () => ({ count: 0 })), findFirst: vi.fn(async () => previous), update, create },
        routine: { findFirst: vi.fn(async () => null) },
        preferences: { findUnique: vi.fn(async () => null) },
        $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    const planner = { planFor: vi.fn() };
    const useCase = new CreateShareUseCase(prisma as unknown as PrismaService, planner as unknown as RoutineDayPlanner);
    return { useCase, update, create };
}

describe("CreateShareUseCase", () => {
    it("refuse sans consentement, sans rien créer", async () => {
        const { useCase, create } = makeUseCase({ consent: false });

        await expect(useCase.execute(user, itinerarySource)).rejects.toBeInstanceOf(ForbiddenException);
        expect(create).not.toHaveBeenCalled();
    });

    it("refuse un itinéraire sans heures, comme un trajet à pied", async () => {
        const { useCase } = makeUseCase();
        const withoutTimes = {
            source: { ...itinerarySource.source, itinerary: { ...itinerarySource.source.itinerary, departureTime: undefined } },
        };

        await expect(useCase.execute(user, withoutTimes)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuse une routine qui n'appartient pas au compte", async () => {
        const { useCase } = makeUseCase();

        await expect(useCase.execute(user, { source: { kind: "routine", routineId: "routine-other" } })).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it("ne stocke que l'empreinte du jeton renvoyé, avec l'arrivée prévue", async () => {
        const { useCase, create } = makeUseCase();

        const { token } = await useCase.execute(user, itinerarySource);
        const { data } = create.mock.calls[0][0];

        expect(data.tokenHash).toBe(hashShareToken(token));
        expect(JSON.stringify(data)).not.toContain(token);
        expect(data.estimatedArrivalAt).toEqual(new Date("2026-11-17T00:50:00+01:00"));
    });

    it("arrête le partage actif précédent et efface ses données", async () => {
        const { useCase, update } = makeUseCase({ previous: activeShare(new Date(Date.now() + 3_600_000)) });

        await useCase.execute(user, itinerarySource);

        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "share-previous" },
                data: expect.objectContaining({ endReason: "STOPPED", itinerary: Prisma.DbNull, lastLatitude: null }),
            }),
        );
    });

    it("enregistre comme expiré, et non arrêté, un partage précédent déjà expiré", async () => {
        const { useCase, update } = makeUseCase({ previous: activeShare(new Date(Date.now() - 2 * 3_600_000)) });

        await useCase.execute(user, itinerarySource);
        const endReasons = update.mock.calls.map(([argument]) => argument.data.endReason);

        expect(endReasons).toEqual(["EXPIRED"]);
    });
});
