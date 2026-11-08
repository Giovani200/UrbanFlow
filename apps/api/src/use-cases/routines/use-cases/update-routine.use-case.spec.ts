import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { UpdateRoutineUseCase } from "./update-routine.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };

const updatedFields = {
    name: "Bureau",
    origin: { label: "Henri Wallon", latitude: 48.5244, longitude: 2.6437 },
    destination: { label: "La Défense", latitude: 48.892, longitude: 2.238 },
    arrivalTime: "09:30",
    usualDepartureTime: "08:11",
    weekdays: [1, 2],
    lineIds: ["C00881", "C01731", "C01742"],
};

const storedRoutine = {
    id: "routine-1",
    name: "Bureau",
    originLabel: "Henri Wallon",
    originLat: 48.5244,
    originLng: 2.6437,
    destLabel: "La Défense",
    destLat: 48.892,
    destLng: 2.238,
    arrivalTime: "09:30",
    usualDepartureTime: "08:11",
    weekdays: [1, 2],
    lineIds: ["C00881", "C01731", "C01742"],
};

function prismaWith(ownedRoutine: { id: string } | null) {
    const findFirst = vi.fn(async (_arg: { where: { id: string; userId: string } }) => ownedRoutine);
    const update = vi.fn(async (_arg: { where: { id: string }; data: Record<string, unknown> }) => storedRoutine);
    const deleteMany = vi.fn(async (_arg: { where: { routineId: string } }) => ({ count: 1 }));
    const transaction = { routine: { findFirst, update }, routineDayPlan: { deleteMany } };
    const prisma = {
        $transaction: vi.fn(async (work: (client: typeof transaction) => Promise<unknown>) => work(transaction)),
    } as unknown as PrismaService;
    return { prisma, findFirst, update, deleteMany };
}

describe("UpdateRoutineUseCase", () => {
    it("met à jour la routine du compte et la renvoie", async () => {
        const { prisma, update } = prismaWith({ id: "routine-1" });

        const result = await new UpdateRoutineUseCase(prisma).execute(user, { id: "routine-1", ...updatedFields });

        expect(result).toEqual({ id: "routine-1", ...updatedFields });
        expect(update.mock.calls[0][0].where).toEqual({ id: "routine-1" });
        expect(update.mock.calls[0][0].data).toMatchObject({ name: "Bureau", arrivalTime: "09:30", destLat: 48.892 });
    });

    it("supprime le trajet du jour, qui ne correspond plus à la routine modifiée", async () => {
        const { prisma, deleteMany } = prismaWith({ id: "routine-1" });

        await new UpdateRoutineUseCase(prisma).execute(user, { id: "routine-1", ...updatedFields });

        expect(deleteMany.mock.calls[0][0].where).toEqual({ routineId: "routine-1" });
    });

    it("cherche la routine dans le compte courant uniquement", async () => {
        const { prisma, findFirst } = prismaWith({ id: "routine-1" });

        await new UpdateRoutineUseCase(prisma).execute(user, { id: "routine-1", ...updatedFields });

        expect(findFirst.mock.calls[0][0].where).toEqual({ id: "routine-1", userId: "user-1" });
    });

    it("répond 404 pour la routine d'un autre compte ou inexistante, sans rien changer", async () => {
        const { prisma, update, deleteMany } = prismaWith(null);

        await expect(
            new UpdateRoutineUseCase(prisma).execute(user, { id: "routine-2", ...updatedFields }),
        ).rejects.toThrow(NotFoundException);
        expect(update).not.toHaveBeenCalled();
        expect(deleteMany).not.toHaveBeenCalled();
    });
});
