import { Injectable } from "@nestjs/common";
import { z as zod } from "zod";
import {
    DeleteAccountDtoOut,
    DeleteAccountDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class DeleteAccountUseCase extends AbstractAuthenticatedUseCase<void, DeleteAccountDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(zod.void(), DeleteAccountDtoOutSchema);
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser): Promise<DeleteAccountDtoOut> {
        // Cascade : preferences, favoriteAddresses, carbonEntries supprimés ; trips.userId passe à null.
        await this.prisma.user.delete({ where: { id: authenticatedUser.userId } });
        return { success: true };
    }
}