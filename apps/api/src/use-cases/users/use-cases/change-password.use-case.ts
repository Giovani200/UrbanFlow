import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import {
    ChangePasswordDtoIn,
    ChangePasswordDtoInSchema,
    ChangePasswordDtoOut,
    ChangePasswordDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class ChangePasswordUseCase extends AbstractAuthenticatedUseCase<ChangePasswordDtoIn, ChangePasswordDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(ChangePasswordDtoInSchema, ChangePasswordDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: ChangePasswordDtoIn,
    ): Promise<ChangePasswordDtoOut> {
        const user = await this.prisma.user.findUnique({
            where: { id: authenticatedUser.userId },
            select: { passwordHash: true },
        });

        if (!user?.passwordHash) {
            throw new BadRequestException("NO_PASSWORD_SET");
        }

        const currentMatches = await bcrypt.compare(dataIn.currentPassword, user.passwordHash);
        if (!currentMatches) {
            throw new UnauthorizedException("INVALID_CREDENTIALS");
        }

        const passwordHash = await bcrypt.hash(dataIn.newPassword, 12);
        await this.prisma.user.update({
            where: { id: authenticatedUser.userId },
            data: { passwordHash, sessionsInvalidatedAt: new Date() },
        });

        return { success: true };
    }
}