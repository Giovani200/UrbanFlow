import { BadRequestException, ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ROUTINE_RULES } from "@urbanflow/app-front-back-lib";
import { CreateRoutineUseCase } from "./create-routine.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };

const routineFields = {
    name: "Travail",
    origin: { label: "Henri Wallon", latitude: 48.5244, longitude: 2.6437 },
    destination: { label: "La Défense", latitude: 48.892, longitude: 2.238 },
    arrivalTime: "09:00",
    usualDepartureTime: "07:41",
    weekdays: [1, 2, 3, 4, 5],
    lineIds: ["C00881", "C01731", "C01742"],
};

const storedRoutine = {
    id: "routine-1",
    name: "Travail",
    originLabel: "Henri Wallon",
    originLat: 48.5244,
    originLng: 2.6437,
    destLabel: "La Défense",
    destLat: 48.892,
    destLng: 2.238,
    arrivalTime: "09:00",
    usualDepartureTime: "07:41",
    weekdays: [1, 2, 3, 4, 5],
    lineIds: ["C00881", "C01731", "C01742"],
};

function prismaWithRoutineCount(existingRoutines: number) {
    const count = vi.fn(async (_arg: { where: { userId: string } }) => existingRoutines);
    const create = vi.fn(async (_arg: { data: Record<string, unknown> }) => storedRoutine);
    const transaction = { routine: { count, create } };
    const prisma = {
        $transaction: vi.fn(async (work: (client: typeof transaction) => Promise<unknown>) => work(transaction)),
    } as unknown as PrismaService;
    return { prisma, count, create };
}

describe("CreateRoutineUseCase", () => {
    it("enregistre la routine pour le compte courant et la renvoie avec ses coordonnées", async () => {
        const { prisma, create } = prismaWithRoutineCount(0);

        const result = await new CreateRoutineUseCase(prisma).execute(user, routineFields);

        expect(result).toEqual({ id: "routine-1", ...routineFields });
        expect(create.mock.calls[0][0].data).toMatchObject({
            userId: "user-1",
            originLabel: "Henri Wallon",
            originLat: 48.5244,
            originLng: 2.6437,
            destLabel: "La Défense",
            destLat: 48.892,
            destLng: 2.238,
        });
    });

    it("compte uniquement les routines du compte courant", async () => {
        const { prisma, count } = prismaWithRoutineCount(0);

        await new CreateRoutineUseCase(prisma).execute(user, routineFields);

        expect(count.mock.calls[0][0].where).toEqual({ userId: "user-1" });
    });

    it("accepte la 5e routine", async () => {
        const { prisma, create } = prismaWithRoutineCount(ROUTINE_RULES.maxPerAccount - 1);

        await new CreateRoutineUseCase(prisma).execute(user, routineFields);

        expect(create).toHaveBeenCalledOnce();
    });

    it("refuse la 6e routine sans rien écrire", async () => {
        const { prisma, create } = prismaWithRoutineCount(ROUTINE_RULES.maxPerAccount);

        await expect(new CreateRoutineUseCase(prisma).execute(user, routineFields)).rejects.toThrow(ConflictException);
        expect(create).not.toHaveBeenCalled();
    });

    it("refuse une entrée invalide sans toucher à la base", async () => {
        const { prisma, count } = prismaWithRoutineCount(0);

        await expect(
            new CreateRoutineUseCase(prisma).execute(user, { ...routineFields, arrivalTime: "9h" }),
        ).rejects.toThrow(BadRequestException);
        expect(count).not.toHaveBeenCalled();
    });

    it("ignore un userId glissé dans le corps de la requête", async () => {
        const { prisma, create } = prismaWithRoutineCount(0);

        await new CreateRoutineUseCase(prisma).execute(user, { ...routineFields, userId: "user-2" });

        expect(create.mock.calls[0][0].data.userId).toBe("user-1");
    });
});
