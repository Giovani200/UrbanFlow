import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DeleteRoutineUseCase } from "./delete-routine.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };

function prismaWithDeletedCount(count: number) {
    const deleteMany = vi.fn(async (_arg: { where: { id: string; userId: string } }) => ({ count }));
    const prisma = { routine: { deleteMany } } as unknown as PrismaService;
    return { prisma, deleteMany };
}

describe("DeleteRoutineUseCase", () => {
    it("supprime la routine dans le compte courant uniquement", async () => {
        const { prisma, deleteMany } = prismaWithDeletedCount(1);

        const result = await new DeleteRoutineUseCase(prisma).execute(user, { id: "routine-1" });

        expect(result).toEqual({ routineId: "routine-1" });
        expect(deleteMany.mock.calls[0][0].where).toEqual({ id: "routine-1", userId: "user-1" });
    });

    it("répond 404 pour la routine d'un autre compte ou inexistante", async () => {
        const { prisma } = prismaWithDeletedCount(0);

        await expect(new DeleteRoutineUseCase(prisma).execute(user, { id: "routine-2" })).rejects.toThrow(
            NotFoundException,
        );
    });
});
