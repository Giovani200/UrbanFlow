import { describe, expect, it } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { LoginUseCase } from "./login.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";

type StoredUser = { id: string; email: string; name: string | null; passwordHash: string | null };

function makeUseCase(storedUser: StoredUser | null): LoginUseCase {
    const prisma = { user: { findUnique: async () => storedUser } } as unknown as PrismaService;
    return new LoginUseCase(prisma);
}

const email = "thomas@example.com";

describe("LoginUseCase", () => {
    it("identifiants valides → renvoie l'utilisateur sans passwordHash", async () => {
        const passwordHash = await bcrypt.hash("bon-mot-de-passe", 4);
        const useCase = makeUseCase({ id: "u1", email, name: "Thomas", passwordHash });

        const result = await useCase.execute({ email, password: "bon-mot-de-passe" });

        expect(result).toEqual({ id: "u1", email, name: "Thomas" });
        expect("passwordHash" in result).toBe(false);
    });

    it("mot de passe faux → UnauthorizedException", async () => {
        const passwordHash = await bcrypt.hash("bon-mot-de-passe", 4);
        const useCase = makeUseCase({ id: "u1", email, name: "Thomas", passwordHash });

        await expect(useCase.execute({ email, password: "mauvais" })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("email inconnu → UnauthorizedException (message neutre, pas d'énumération)", async () => {
        const useCase = makeUseCase(null);

        await expect(useCase.execute({ email, password: "peu-importe" })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("compte sans mot de passe (Google) → UnauthorizedException", async () => {
        const useCase = makeUseCase({ id: "u1", email, name: "Thomas", passwordHash: null });

        await expect(useCase.execute({ email, password: "peu-importe" })).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
