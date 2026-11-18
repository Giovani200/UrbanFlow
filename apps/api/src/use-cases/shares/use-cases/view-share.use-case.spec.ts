import { NotFoundException } from "@nestjs/common";
import type { Share } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { JudgedItinerary, RoutineConnectionsService } from "../../routines/routine-connections.service";
import type { DatedItinerary } from "../../trips/trip-route.mapper";
import { generateShareToken, hashShareToken } from "../share-token";
import { ViewShareUseCase } from "./view-share.use-case";

const MINUTE = 60_000;

const itinerary: DatedItinerary = {
    legs: [
        {
            mode: "train",
            geometry: { type: "LineString", coordinates: [[2.6553, 48.5274], [2.3735, 48.8443]] },
            distanceMeters: 44000,
            durationSeconds: 1800,
            departureStopName: "Melun",
            arrivalStopName: "Gare de Lyon",
            lineShortName: "R",
            lineId: "C01731",
            scheduledDepartureTime: new Date(Date.now() - 10 * MINUTE).toISOString(),
            scheduledArrivalTime: new Date(Date.now() + 20 * MINUTE).toISOString(),
        },
    ],
    durationSeconds: 1800,
    departureTime: new Date(Date.now() - 10 * MINUTE).toISOString(),
    arrivalTime: new Date(Date.now() + 20 * MINUTE).toISOString(),
};

function storedShare(overrides: Partial<Share> = {}): Share & { user: { name: string | null } } {
    return {
        id: "share-1",
        userId: "user-1",
        tokenHash: "hash",
        routineId: null,
        itinerary: itinerary as unknown as Share["itinerary"],
        destinationLabel: "Chez moi",
        estimatedArrivalAt: new Date(itinerary.arrivalTime),
        lastLatitude: 48.5274,
        lastLongitude: 2.6553,
        lastPositionAt: new Date(Date.now() - 5 * MINUTE),
        startedAt: new Date(Date.now() - 30 * MINUTE),
        endedAt: null,
        endReason: null,
        user: { name: "Léa Martin" },
        ...overrides,
    };
}

function makeUseCase(share: ReturnType<typeof storedShare> | null, judgedArrival = itinerary.arrivalTime) {
    const findUnique = vi.fn(async (_arg: { where: { tokenHash: string } }) => share);
    const update = vi.fn(async (_arg: { data: Record<string, unknown> }) => ({}));
    const deleteMany = vi.fn(async () => ({ count: 0 }));
    const prisma = { share: { findUnique, update, deleteMany } };
    const judged: JudgedItinerary = {
        itinerary: { ...itinerary, arrivalTime: judgedArrival },
        arrivalFreshness: "realtime",
        connections: [],
        realtimeStatus: "ok",
        firstMissed: null,
    };
    const routineConnections = { judge: vi.fn(async () => judged) };
    const useCase = new ViewShareUseCase(
        prisma as unknown as PrismaService,
        routineConnections as unknown as RoutineConnectionsService,
    );
    return { useCase, findUnique, update, deleteMany };
}

describe("ViewShareUseCase", () => {
    it("jeton absent ou mal formé : introuvable, sans lire la base", async () => {
        const { useCase, findUnique } = makeUseCase(storedShare());

        await expect(useCase.execute({ token: undefined })).rejects.toBeInstanceOf(NotFoundException);
        await expect(useCase.execute({ token: "trop-court" })).rejects.toBeInstanceOf(NotFoundException);
        expect(findUnique).not.toHaveBeenCalled();
    });

    it("jeton inconnu ou purgé : la même réponse introuvable", async () => {
        const { useCase } = makeUseCase(null);

        await expect(useCase.execute({ token: generateShareToken() })).rejects.toBeInstanceOf(NotFoundException);
    });

    it("cherche par empreinte et purge les partages terminés à chaque lecture", async () => {
        const token = generateShareToken();
        const { useCase, findUnique, deleteMany } = makeUseCase(storedShare());

        await useCase.execute({ token });

        expect(findUnique.mock.calls[0][0].where).toEqual({ tokenHash: hashShareToken(token) });
        expect(deleteMany).toHaveBeenCalledOnce();
    });

    it("partage terminé : seulement l'état final, son heure et le prénom", async () => {
        const endedAt = new Date("2026-11-16T23:47:00Z");
        const { useCase } = makeUseCase(
            storedShare({ endReason: "ARRIVED", endedAt, itinerary: null, destinationLabel: null, estimatedArrivalAt: null }),
        );

        const view = await useCase.execute({ token: generateShareToken() });

        expect(view).toEqual({
            sharerFirstName: "Léa",
            state: "arrived",
            endedAt: "2026-11-17T00:47:00+01:00",
            destinationLabel: null,
            estimatedArrival: null,
            steps: [],
            currentStepIndex: null,
            lastPosition: null,
        });
    });

    it("constate l'expiration à la lecture, l'enregistre et efface les données", async () => {
        const { useCase, update } = makeUseCase(storedShare({ estimatedArrivalAt: new Date(Date.now() - 2 * 60 * MINUTE) }));

        const view = await useCase.execute({ token: generateShareToken() });

        expect(view.state).toBe("expired");
        expect(update.mock.calls[0][0].data).toMatchObject({ endReason: "EXPIRED", lastLatitude: null, destinationLabel: null });
    });

    it("partage actif : avancement recalé, arrivée estimée mise à jour, jamais de coordonnées", async () => {
        const delayedArrival = new Date(Date.now() + 25 * MINUTE).toISOString();
        const { useCase, update } = makeUseCase(storedShare(), delayedArrival);

        const view = await useCase.execute({ token: generateShareToken() });

        expect(view.state).toBe("in_progress");
        expect(view.steps.map((step) => step.kind)).toEqual(["board", "arrive"]);
        expect(view.estimatedArrival).toEqual({ time: delayedArrival, freshness: "realtime" });
        expect(update.mock.calls[0][0].data).toEqual({ estimatedArrivalAt: new Date(delayedArrival) });
        expect(view.lastPosition).toMatchObject({ nearStopName: "Melun", outsideItinerary: false });
        expect(JSON.stringify(view)).not.toContain("48.5274");
    });
});
