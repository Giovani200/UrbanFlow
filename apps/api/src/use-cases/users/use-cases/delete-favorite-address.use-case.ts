import { Injectable, NotFoundException } from "@nestjs/common";
import {
    DeleteFavoriteAddressDtoIn,
    DeleteFavoriteAddressDtoInSchema,
    DeleteFavoriteAddressDtoOut,
    DeleteFavoriteAddressDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class DeleteFavoriteAddressUseCase extends AbstractAuthenticatedUseCase<
    DeleteFavoriteAddressDtoIn,
    DeleteFavoriteAddressDtoOut
> {
    constructor(private readonly prisma: PrismaService) {
        super(DeleteFavoriteAddressDtoInSchema, DeleteFavoriteAddressDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: DeleteFavoriteAddressDtoIn,
    ): Promise<DeleteFavoriteAddressDtoOut> {
        const result = await this.prisma.favoriteAddress.deleteMany({
            where: { id: dataIn.id, userId: authenticatedUser.userId },
        });

        if (result.count === 0) {
            throw new NotFoundException("ADDRESS_NOT_FOUND");
        }

        return { success: true };
    }
}
