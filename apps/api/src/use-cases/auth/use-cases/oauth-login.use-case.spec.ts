import { describe, expect, it, vi } from "vitest";
import { OAuthLoginUseCase } from "./oauth-login.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";

type StoredUser = { id: string; email: string; name: string | null };

function makeUseCase(options: {
    byGoogle?: StoredUser | null;
    byEmail?: { id: string } | null;
    updated?: StoredUser;
    created?: StoredUser;
}): { useCase: OAuthLoginUseCase; update: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> } {
    const findUnique = async (args: { where: { googleId?: string; email?: string } }) =>
        args.where.googleId !== undefined ? (options.byGoogle ?? null) : (options.byEmail ?? null);
    const update = vi.fn(async () => options.updated);
    const create = vi.fn(async () => options.created);

    const prisma = { user: { findUnique, update, create } } as unknown as PrismaService;
    return { useCase: new OAuthLoginUseCase(prisma), update, create };
}

const profile = { googleId: "g1", email: "thomas@example.com", name: "Thomas", image: null };

describe("OAuthLoginUseCase", () => {
    it("googleId connu → renvoie le compte lié, sans update ni create", async () => {
        const linked: StoredUser = { id: "u1", email: profile.email, name: "Thomas" };
        const { useCase, update, create } = makeUseCase({ byGoogle: linked });

        const result = await useCase.execute(profile);

        expect(result).toEqual(linked);
        expect(update).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });

    it("email déjà inscrit (mot de passe) → lie le compte Google", async () => {
        const updated: StoredUser = { id: "u2", email: profile.email, name: "Thomas" };
        const { useCase, update, create } = makeUseCase({ byGoogle: null, byEmail: { id: "u2" }, updated });

        const result = await useCase.execute({ ...profile, image: "http://img" });

        expect(result).toEqual(updated);
        expect(update).toHaveBeenCalledTimes(1);
        expect(create).not.toHaveBeenCalled();
    });

    it("inconnu → crée un nouveau compte Google", async () => {
        const created: StoredUser = { id: "u3", email: profile.email, name: "Thomas" };
        const { useCase, update, create } = makeUseCase({ byGoogle: null, byEmail: null, created });

        const result = await useCase.execute(profile);

        expect(result).toEqual(created);
        expect(create).toHaveBeenCalledTimes(1);
        expect(update).not.toHaveBeenCalled();
    });
});
