import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { SetHomeAddressUseCase } from "./set-home-address.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };

const homeAddress = {
    id: "addr-2",
    label: "Maison",
    address: "1 rue des Lys, Dammarie-lès-Lys",
    latitude: 48.514,
    longitude: 2.639,
    isHome: true,
};

function prismaWith(ownedAddress: { id: string } | null) {
    const findFirst = vi.fn(async (_arg: { where: { id: string; userId: string } }) => ownedAddress);
    const updateMany = vi.fn(async (_arg: { where: object; data: object }) => ({ count: 1 }));
    const update = vi.fn(async (_arg: { where: { id: string }; data: object }) => homeAddress);
    const transaction = { favoriteAddress: { findFirst, updateMany, update } };
    const prisma = {
        $transaction: vi.fn(async (work: (client: typeof transaction) => Promise<unknown>) => work(transaction)),
    } as unknown as PrismaService;
    return { prisma, findFirst, updateMany, update };
}

describe("SetHomeAddressUseCase", () => {
    it("pose le domicile sur l'adresse du compte", async () => {
        const { prisma, update } = prismaWith({ id: "addr-2" });

        const result = await new SetHomeAddressUseCase(prisma).execute(user, { id: "addr-2" });

        expect(result).toEqual(homeAddress);
        expect(update.mock.calls[0][0]).toMatchObject({ where: { id: "addr-2" }, data: { isHome: true } });
    });

    it("retire l'ancien domicile du même compte", async () => {
        const { prisma, updateMany } = prismaWith({ id: "addr-2" });

        await new SetHomeAddressUseCase(prisma).execute(user, { id: "addr-2" });

        expect(updateMany.mock.calls[0][0]).toEqual({
            where: { userId: "user-1", isHome: true, NOT: { id: "addr-2" } },
            data: { isHome: false },
        });
    });

    it("cherche l'adresse en la limitant au compte connecté (anti-IDOR)", async () => {
        const { prisma, findFirst } = prismaWith({ id: "addr-2" });

        await new SetHomeAddressUseCase(prisma).execute(user, { id: "addr-2" });

        expect(findFirst.mock.calls[0][0].where).toEqual({ id: "addr-2", userId: "user-1" });
    });

    it("adresse d'un autre compte ou inexistante : 404 et aucune écriture", async () => {
        const { prisma, updateMany, update } = prismaWith(null);

        await expect(new SetHomeAddressUseCase(prisma).execute(user, { id: "addr-autre-compte" })).rejects.toThrow(
            NotFoundException,
        );
        expect(updateMany).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });

    it("id vide : rejet Zod avant toute requête", async () => {
        const { prisma, findFirst } = prismaWith({ id: "addr-2" });

        await expect(new SetHomeAddressUseCase(prisma).execute(user, { id: "" })).rejects.toThrow();
        expect(findFirst).not.toHaveBeenCalled();
    });
});
