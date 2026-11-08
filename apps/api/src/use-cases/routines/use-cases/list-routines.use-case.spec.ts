import { describe, expect, it, vi } from "vitest";
import { ListRoutinesUseCase } from "./list-routines.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };

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

function prismaWithRoutines(routines: (typeof storedRoutine)[]) {
    const findMany = vi.fn(async (_arg: { where: { userId: string } }) => routines);
    const prisma = { routine: { findMany } } as unknown as PrismaService;
    return { prisma, findMany };
}

describe("ListRoutinesUseCase", () => {
    it("liste les routines du compte courant uniquement, avec lieux et lignes", async () => {
        const { prisma, findMany } = prismaWithRoutines([storedRoutine]);

        const result = await new ListRoutinesUseCase(prisma).execute(user, undefined);

        expect(findMany.mock.calls[0][0].where).toEqual({ userId: "user-1" });
        expect(result.routines).toEqual([
            {
                id: "routine-1",
                name: "Travail",
                origin: { label: "Henri Wallon", latitude: 48.5244, longitude: 2.6437 },
                destination: { label: "La Défense", latitude: 48.892, longitude: 2.238 },
                arrivalTime: "09:00",
                usualDepartureTime: "07:41",
                weekdays: [1, 2, 3, 4, 5],
                lineIds: ["C00881", "C01731", "C01742"],
            },
        ]);
    });

    it("renvoie une liste vide pour un compte sans routine", async () => {
        const { prisma } = prismaWithRoutines([]);

        const result = await new ListRoutinesUseCase(prisma).execute(user, undefined);

        expect(result.routines).toEqual([]);
    });
});
