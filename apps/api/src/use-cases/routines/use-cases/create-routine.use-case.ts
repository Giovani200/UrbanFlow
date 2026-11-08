import { ConflictException, Injectable } from "@nestjs/common";
import {
    CreateRoutineDtoIn,
    CreateRoutineDtoInSchema,
    ROUTINE_RULES,
    RoutineDtoOut,
    RoutineDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { ROUTINE_SELECT, toRoutineColumns, toRoutineDto } from "../routine.mapper";

/** Crée une routine. Le plafond par compte protège le quota PRIM : chaque routine coûte des appels chaque jour. */
@Injectable()
export class CreateRoutineUseCase extends AbstractAuthenticatedUseCase<CreateRoutineDtoIn, RoutineDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(CreateRoutineDtoInSchema, RoutineDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: CreateRoutineDtoIn,
    ): Promise<RoutineDtoOut> {
        const userId = authenticatedUser.userId;

        const routine = await this.prisma.$transaction(async (transaction) => {
            const existingRoutines = await transaction.routine.count({ where: { userId } });
            if (existingRoutines >= ROUTINE_RULES.maxPerAccount) {
                throw new ConflictException("ROUTINE_LIMIT_REACHED");
            }
            return transaction.routine.create({
                data: { userId, ...toRoutineColumns(dataIn) },
                select: ROUTINE_SELECT,
            });
        });

        return toRoutineDto(routine);
    }
}
