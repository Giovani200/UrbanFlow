import { Injectable } from "@nestjs/common";
import { z as zod } from "zod";
import {
    ListFavoriteAddressesDtoOut,
    ListFavoriteAddressesDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class ListFavoriteAddressesUseCase extends AbstractAuthenticatedUseCase<void, ListFavoriteAddressesDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(zod.void(), ListFavoriteAddressesDtoOutSchema);
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser): Promise<ListFavoriteAddressesDtoOut> {
        return this.prisma.favoriteAddress.findMany({
            where: { userId: authenticatedUser.userId },
            orderBy: { createdAt: "asc" },
            select: { id: true, label: true, address: true, latitude: true, longitude: true },
        });
    }
}
