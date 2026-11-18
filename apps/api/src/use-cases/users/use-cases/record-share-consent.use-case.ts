import { Injectable } from "@nestjs/common";
import { z as zod } from "zod";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class RecordShareConsentUseCase extends AbstractAuthenticatedUseCase<void, void> {
    constructor(private readonly prisma: PrismaService) {
        super(zod.void(), zod.void());
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser): Promise<void> {
        await this.prisma.user.update({ where: { id: authenticatedUser.userId }, data: { shareConsentAt: new Date() } });
    }
}
