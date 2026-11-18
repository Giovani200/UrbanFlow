import { Injectable, NotFoundException } from "@nestjs/common";
import { z as zod } from "zod";
import { SharePositionDtoIn, SharePositionDtoInSchema } from "@urbanflow/app-front-back-lib";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { findActiveShare } from "../share-records";

/** Seule la dernière position est gardée : chaque envoi écrase le précédent, aucune trace n'est conservée. */
@Injectable()
export class RecordSharePositionUseCase extends AbstractAuthenticatedUseCase<SharePositionDtoIn, void> {
    constructor(private readonly prisma: PrismaService) {
        super(SharePositionDtoInSchema, zod.void());
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser, dataIn: SharePositionDtoIn): Promise<void> {
        const now = new Date();
        const share = await findActiveShare(this.prisma, authenticatedUser.userId, now);
        if (!share) {
            throw new NotFoundException("NO_ACTIVE_SHARE");
        }
        await this.prisma.share.update({
            where: { id: share.id },
            data: { lastLatitude: dataIn.latitude, lastLongitude: dataIn.longitude, lastPositionAt: now },
        });
    }
}
