import { Injectable } from "@nestjs/common";
import {
    CreateFavoriteAddressDtoIn,
    CreateFavoriteAddressDtoInSchema,
    CreateFavoriteAddressDtoOut,
    CreateFavoriteAddressDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class CreateFavoriteAddressUseCase extends AbstractAuthenticatedUseCase<
    CreateFavoriteAddressDtoIn,
    CreateFavoriteAddressDtoOut
> {
    constructor(private readonly prisma: PrismaService) {
        super(CreateFavoriteAddressDtoInSchema, CreateFavoriteAddressDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: CreateFavoriteAddressDtoIn,
    ): Promise<CreateFavoriteAddressDtoOut> {
        return this.prisma.favoriteAddress.create({
            data: { userId: authenticatedUser.userId, ...dataIn },
            select: { id: true, label: true, address: true, latitude: true, longitude: true },
        });
    }
}
