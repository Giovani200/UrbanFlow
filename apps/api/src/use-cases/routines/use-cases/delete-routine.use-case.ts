import { Injectable, NotFoundException } from "@nestjs/common";
import {
    DeleteRoutineDtoIn,
    DeleteRoutineDtoInSchema,
    RoutineActionDtoOut,
    RoutineActionDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";

/** Supprime une routine ; son trajet du jour part avec elle (cascade). Une routine d'un autre compte répond 404. */
@Injectable()
export class DeleteRoutineUseCase extends AbstractAuthenticatedUseCase<DeleteRoutineDtoIn, RoutineActionDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(DeleteRoutineDtoInSchema, RoutineActionDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: DeleteRoutineDtoIn,
    ): Promise<RoutineActionDtoOut> {
        const { count } = await this.prisma.routine.deleteMany({
            where: { id: dataIn.id, userId: authenticatedUser.userId },
        });
        if (count === 0) {
            throw new NotFoundException("ROUTINE_NOT_FOUND");
        }
        return { routineId: dataIn.id };
    }
}
