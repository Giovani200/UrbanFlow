import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
    ChooseAlternativeDtoIn,
    ChooseAlternativeDtoInSchema,
    RoutineActionDtoOut,
    RoutineActionDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { parisServiceDay } from "../../../shared/time/paris-time";
import { parseStoredDayPlan } from "../routine-day-plan.schema";
import { RoutineDayPlanner } from "../routine-day-planner.service";

/**
 * Adopte une des solutions affichées quand une correspondance ne tient plus : elle devient le trajet du jour, sans
 * toucher à la routine. La personne est déjà en route : le Plan B calculé depuis son point de départ ne vaut plus.
 */
@Injectable()
export class ChooseAlternativeUseCase extends AbstractAuthenticatedUseCase<ChooseAlternativeDtoIn, RoutineActionDtoOut> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly routineDayPlanner: RoutineDayPlanner,
    ) {
        super(ChooseAlternativeDtoInSchema, RoutineActionDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: ChooseAlternativeDtoIn,
    ): Promise<RoutineActionDtoOut> {
        const routine = await this.prisma.routine.findFirst({
            where: { id: dataIn.routineId, userId: authenticatedUser.userId },
            select: { id: true },
        });
        if (!routine) {
            throw new NotFoundException("ROUTINE_NOT_FOUND");
        }

        const serviceDay = parisServiceDay(new Date());
        const stored = await this.prisma.routineDayPlan.findUnique({ where: { routineId: routine.id } });
        const plan = stored?.serviceDay === serviceDay ? parseStoredDayPlan(stored) : null;
        const chosen = plan?.alternatives[dataIn.alternativeIndex];
        if (!chosen) {
            throw new ConflictException("ALTERNATIVE_NOT_AVAILABLE");
        }

        await this.routineDayPlanner.adoptItinerary(routine.id, serviceDay, chosen, "alternative", {
            status: "no_result",
            itinerary: null,
        });
        return { routineId: routine.id };
    }
}
