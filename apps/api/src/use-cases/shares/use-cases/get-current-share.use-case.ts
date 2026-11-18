import { Injectable } from "@nestjs/common";
import { z as zod } from "zod";
import { CurrentShareDtoOut, CurrentShareDtoOutSchema } from "@urbanflow/app-front-back-lib";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { findActiveShare } from "../share-records";

@Injectable()
export class GetCurrentShareUseCase extends AbstractAuthenticatedUseCase<void, CurrentShareDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(zod.void(), CurrentShareDtoOutSchema);
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser): Promise<CurrentShareDtoOut> {
        const share = await findActiveShare(this.prisma, authenticatedUser.userId, new Date());
        if (!share) {
            return { share: null };
        }
        return {
            share: {
                startedAt: share.startedAt.toISOString(),
                destinationLabel: share.destinationLabel ?? "",
                routineId: share.routineId,
            },
        };
    }
}
