import { Injectable, NotFoundException } from "@nestjs/common";
import {
    RoutineDtoOut,
    RoutineDtoOutSchema,
    UpdateRoutineDtoIn,
    UpdateRoutineDtoInSchema,
} from "@urbanflow/app-front-back-lib";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { ROUTINE_SELECT, toRoutineColumns, toRoutineDto } from "../routine.mapper";

/**
 * Modifie une routine et efface son trajet du jour, qui ne lui correspond plus.
 * Une routine d'un autre compte répond 404, comme une routine inexistante (anti-IDOR).
 */
@Injectable()
export class UpdateRoutineUseCase extends AbstractAuthenticatedUseCase<UpdateRoutineDtoIn, RoutineDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(UpdateRoutineDtoInSchema, RoutineDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: UpdateRoutineDtoIn,
    ): Promise<RoutineDtoOut> {
        const routine = await this.prisma.$transaction(async (transaction) => {
            const ownedRoutine = await transaction.routine.findFirst({
                where: { id: dataIn.id, userId: authenticatedUser.userId },
                select: { id: true },
            });
            if (!ownedRoutine) {
                throw new NotFoundException("ROUTINE_NOT_FOUND");
            }

            await transaction.routineDayPlan.deleteMany({ where: { routineId: ownedRoutine.id } });
            return transaction.routine.update({
                where: { id: ownedRoutine.id },
                data: toRoutineColumns(dataIn),
                select: ROUTINE_SELECT,
            });
        });

        return toRoutineDto(routine);
    }
}
