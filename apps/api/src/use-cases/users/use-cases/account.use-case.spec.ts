import { describe, expect, it, vi } from "vitest";
import * as bcrypt from "bcryptjs";
import { ChangePasswordUseCase } from "./change-password.use-case";
import { DeleteAccountUseCase } from "./delete-account.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };

describe("ChangePasswordUseCase", () => {
    it("mot de passe actuel correct → hash le nouveau et met à jour", async () => {
        const passwordHash = await bcrypt.hash("ancien-mdp", 12);
        const update = vi.fn(async (_arg: { data: { passwordHash: string } }) => ({ id: "user-1" }));
        const prisma = {
            user: { findUnique: async () => ({ passwordHash }), update },
        } as unknown as PrismaService;

        const result = await new ChangePasswordUseCase(prisma).execute(user, {
            currentPassword: "ancien-mdp",
            newPassword: "nouveau-mdp-fort",
        });

        expect(result).toEqual({ success: true });
        const stored = update.mock.calls[0][0].data.passwordHash;
        expect(stored).not.toBe(passwordHash);
        expect(await bcrypt.compare("nouveau-mdp-fort", stored)).toBe(true);
    });

    it("mot de passe actuel faux → refus, aucune écriture", async () => {
        const passwordHash = await bcrypt.hash("ancien-mdp", 12);
        const update = vi.fn();
        const prisma = {
            user: { findUnique: async () => ({ passwordHash }), update },
        } as unknown as PrismaService;

        await expect(
            new ChangePasswordUseCase(prisma).execute(user, {
                currentPassword: "mauvais",
                newPassword: "nouveau-mdp-fort",
            }),
        ).rejects.toThrow();
        expect(update).not.toHaveBeenCalled();
    });

    it("compte Google (sans mot de passe) → refus", async () => {
        const update = vi.fn();
        const prisma = {
            user: { findUnique: async () => ({ passwordHash: null }), update },
        } as unknown as PrismaService;

        await expect(
            new ChangePasswordUseCase(prisma).execute(user, {
                currentPassword: "peu-importe",
                newPassword: "nouveau-mdp-fort",
            }),
        ).rejects.toThrow();
        expect(update).not.toHaveBeenCalled();
    });
});

describe("DeleteAccountUseCase", () => {
    it("supprime le compte du user connecté", async () => {
        const deleteUser = vi.fn(async (_arg: { where: { id: string } }) => ({ id: "user-1" }));
        const prisma = { user: { delete: deleteUser } } as unknown as PrismaService;

        const result = await new DeleteAccountUseCase(prisma).execute(user, undefined);

        expect(result).toEqual({ success: true });
        expect(deleteUser.mock.calls[0][0].where).toEqual({ id: "user-1" });
    });
});