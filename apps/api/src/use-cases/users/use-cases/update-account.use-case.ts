import { Injectable } from "@nestjs/common";
import {
    UpdateAccountDtoIn,
    UpdateAccountDtoInSchema,
    UpdateAccountDtoOut,
    UpdateAccountDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class UpdateAccountUseCase extends AbstractAuthenticatedUseCase<UpdateAccountDtoIn, UpdateAccountDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(UpdateAccountDtoInSchema, UpdateAccountDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: UpdateAccountDtoIn,
    ): Promise<UpdateAccountDtoOut> {
        return this.prisma.user.update({
            where: { id: authenticatedUser.userId },
            data: { name: dataIn.name },
            select: { id: true, email: true, name: true },
        });
    }
}