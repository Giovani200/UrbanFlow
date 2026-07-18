import { describe, expect, it, vi } from "vitest";
import { CreateFavoriteAddressUseCase } from "./create-favorite-address.use-case";
import { ListFavoriteAddressesUseCase } from "./list-favorite-addresses.use-case";
import { DeleteFavoriteAddressUseCase } from "./delete-favorite-address.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };

describe("CreateFavoriteAddressUseCase", () => {
    it("crée l'adresse avec le userId du contexte", async () => {
        const create = vi.fn(async (_arg: { data: { userId: string } }) => ({
            id: "addr-1",
            label: "Pharmacie de maman",
            address: "12 rue X, Grenoble",
            latitude: 45.18,
            longitude: 5.72,
        }));
        const prisma = { favoriteAddress: { create } } as unknown as PrismaService;

        const result = await new CreateFavoriteAddressUseCase(prisma).execute(user, {
            label: "Pharmacie de maman",
            address: "12 rue X, Grenoble",
            latitude: 45.18,
            longitude: 5.72,
        });

        expect(result.id).toBe("addr-1");
        expect(create.mock.calls[0][0].data.userId).toBe("user-1");
    });

    it("payload invalide (latitude hors bornes) → rejet Zod", async () => {
        const prisma = { favoriteAddress: { create: vi.fn() } } as unknown as PrismaService;

        await expect(
            new CreateFavoriteAddressUseCase(prisma).execute(user, {
                label: "X",
                address: "Y",
                latitude: 200,
                longitude: 5.72,
            }),
        ).rejects.toThrow();
    });
});

describe("ListFavoriteAddressesUseCase", () => {
    it("ne liste que les adresses du user connecté", async () => {
        const findMany = vi.fn(async (_arg: { where: { userId: string } }) => []);
        const prisma = { favoriteAddress: { findMany } } as unknown as PrismaService;

        await new ListFavoriteAddressesUseCase(prisma).execute(user, undefined);

        expect(findMany.mock.calls[0][0].where).toEqual({ userId: "user-1" });
    });
});

describe("DeleteFavoriteAddressUseCase", () => {
    it("supprime en scopant par userId (anti-IDOR)", async () => {
        const deleteMany = vi.fn(async (_arg: { where: { id: string; userId: string } }) => ({ count: 1 }));
        const prisma = { favoriteAddress: { deleteMany } } as unknown as PrismaService;

        const result = await new DeleteFavoriteAddressUseCase(prisma).execute(user, { id: "addr-1" });

        expect(result).toEqual({ success: true });
        expect(deleteMany.mock.calls[0][0].where).toEqual({ id: "addr-1", userId: "user-1" });
    });

    it("id appartenant à un autre compte (count 0) → NotFound", async () => {
        const deleteMany = vi.fn(async (_arg: { where: { id: string; userId: string } }) => ({ count: 0 }));
        const prisma = { favoriteAddress: { deleteMany } } as unknown as PrismaService;

        await expect(
            new DeleteFavoriteAddressUseCase(prisma).execute(user, { id: "addr-autre-compte" }),
        ).rejects.toThrow();
    });
});

describe("AbstractAuthenticatedUseCase", () => {
    it("sans userId (guard oublié) → Unauthorized avant toute requête DB", async () => {
        const findMany = vi.fn();
        const prisma = { favoriteAddress: { findMany } } as unknown as PrismaService;

        await expect(
            new ListFavoriteAddressesUseCase(prisma).execute(
                undefined as unknown as AuthenticatedUser,
                undefined,
            ),
        ).rejects.toThrow();
        expect(findMany).not.toHaveBeenCalled();
    });
});