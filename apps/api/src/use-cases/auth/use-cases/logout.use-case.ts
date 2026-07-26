import { Injectable } from "@nestjs/common";
import { z as zod } from "zod";
import { LogoutDtoOut, LogoutDtoOutSchema } from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class LogoutUseCase extends AbstractAuthenticatedUseCase<void, LogoutDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(zod.void(), LogoutDtoOutSchema);
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser): Promise<LogoutDtoOut> {
        await this.prisma.user.update({
            where: { id: authenticatedUser.userId },
            data: { sessionsInvalidatedAt: new Date() },
        });

        return { success: true };
    }
}