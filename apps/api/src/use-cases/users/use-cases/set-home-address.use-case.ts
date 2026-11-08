import { Injectable, NotFoundException } from "@nestjs/common";
import {
    SetHomeAddressDtoIn,
    SetHomeAddressDtoInSchema,
    SetHomeAddressDtoOut,
    SetHomeAddressDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";
import { FAVORITE_ADDRESS_SELECT } from "../users.selects";

/**
 * Désigne une adresse favorite comme domicile. Un compte n'a qu'un domicile : l'ancien est retiré dans la même
 * transaction. Une adresse d'un autre compte répond 404, comme une adresse inexistante (anti-IDOR).
 */
@Injectable()
export class SetHomeAddressUseCase extends AbstractAuthenticatedUseCase<SetHomeAddressDtoIn, SetHomeAddressDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(SetHomeAddressDtoInSchema, SetHomeAddressDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: SetHomeAddressDtoIn,
    ): Promise<SetHomeAddressDtoOut> {
        const userId = authenticatedUser.userId;

        return this.prisma.$transaction(async (transaction) => {
            const address = await transaction.favoriteAddress.findFirst({
                where: { id: dataIn.id, userId },
                select: { id: true },
            });
            if (!address) {
                throw new NotFoundException("ADDRESS_NOT_FOUND");
            }

            await transaction.favoriteAddress.updateMany({
                where: { userId, isHome: true, NOT: { id: address.id } },
                data: { isHome: false },
            });
            return transaction.favoriteAddress.update({
                where: { id: address.id },
                data: { isHome: true },
                select: FAVORITE_ADDRESS_SELECT,
            });
        });
    }
}
