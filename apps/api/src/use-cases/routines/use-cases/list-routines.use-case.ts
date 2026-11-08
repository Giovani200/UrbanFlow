import { Injectable } from "@nestjs/common";
import { z as zod } from "zod";
import { ListRoutinesDtoOut, ListRoutinesDtoOutSchema } from "@urbanflow/app-front-back-lib";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { ROUTINE_SELECT, toRoutineDto } from "../routine.mapper";

@Injectable()
export class ListRoutinesUseCase extends AbstractAuthenticatedUseCase<void, ListRoutinesDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(zod.void(), ListRoutinesDtoOutSchema);
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser): Promise<ListRoutinesDtoOut> {
        const routines = await this.prisma.routine.findMany({
            where: { userId: authenticatedUser.userId },
            orderBy: { createdAt: "asc" },
            select: ROUTINE_SELECT,
        });
        return { routines: routines.map(toRoutineDto) };
    }
}
