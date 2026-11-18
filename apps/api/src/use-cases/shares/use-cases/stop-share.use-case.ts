import { Injectable, NotFoundException } from "@nestjs/common";
import { z as zod } from "zod";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { endedShareData, findActiveShare } from "../share-records";

@Injectable()
export class StopShareUseCase extends AbstractAuthenticatedUseCase<void, void> {
    constructor(private readonly prisma: PrismaService) {
        super(zod.void(), zod.void());
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser): Promise<void> {
        const now = new Date();
        const share = await findActiveShare(this.prisma, authenticatedUser.userId, now);
        if (!share) {
            throw new NotFoundException("NO_ACTIVE_SHARE");
        }
        await this.prisma.share.update({ where: { id: share.id }, data: endedShareData("STOPPED", now) });
    }
}
