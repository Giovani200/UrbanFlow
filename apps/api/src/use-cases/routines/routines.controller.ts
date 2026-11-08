import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type {
    ListRoutinesDtoOut,
    RoutineActionDtoOut,
    RoutineDtoOut,
    RoutineTodayDtoOut,
} from "@urbanflow/app-front-back-lib";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../shared/auth/jwt.strategy";
import { ChooseAlternativeUseCase } from "./use-cases/choose-alternative.use-case";
import { CreateRoutineUseCase } from "./use-cases/create-routine.use-case";
import { DeleteRoutineUseCase } from "./use-cases/delete-routine.use-case";
import { GetRoutineTodayUseCase } from "./use-cases/get-routine-today.use-case";
import { ListRoutinesUseCase } from "./use-cases/list-routines.use-case";
import { MarkNotTakenUseCase } from "./use-cases/mark-not-taken.use-case";
import { UpdateRoutineUseCase } from "./use-cases/update-routine.use-case";

@Controller("routines")
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class RoutinesController {
    constructor(
        private readonly listRoutinesUseCase: ListRoutinesUseCase,
        private readonly createRoutineUseCase: CreateRoutineUseCase,
        private readonly updateRoutineUseCase: UpdateRoutineUseCase,
        private readonly deleteRoutineUseCase: DeleteRoutineUseCase,
        private readonly getRoutineTodayUseCase: GetRoutineTodayUseCase,
        private readonly markNotTakenUseCase: MarkNotTakenUseCase,
        private readonly chooseAlternativeUseCase: ChooseAlternativeUseCase,
    ) {}

    @Get()
    async list(@CurrentUser() user: AuthenticatedUser): Promise<ListRoutinesDtoOut> {
        return this.listRoutinesUseCase.execute(user, undefined);
    }

    @Get("today")
    async today(@CurrentUser() user: AuthenticatedUser): Promise<RoutineTodayDtoOut> {
        return this.getRoutineTodayUseCase.execute(user, undefined);
    }

    @Post()
    async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown): Promise<RoutineDtoOut> {
        return this.createRoutineUseCase.execute(user, body);
    }

    @Put(":id")
    async update(
        @CurrentUser() user: AuthenticatedUser,
        @Param("id") id: string,
        @Body() body: unknown,
    ): Promise<RoutineDtoOut> {
        return this.updateRoutineUseCase.execute(user, { ...(body as object), id });
    }

    @Delete(":id")
    async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<RoutineActionDtoOut> {
        return this.deleteRoutineUseCase.execute(user, { id });
    }

    @Post(":id/today/not-taken")
    async markNotTaken(
        @CurrentUser() user: AuthenticatedUser,
        @Param("id") id: string,
        @Body() body: unknown,
    ): Promise<RoutineActionDtoOut> {
        return this.markNotTakenUseCase.execute(user, { ...(body as object), routineId: id });
    }

    @Post(":id/today/choose")
    async chooseAlternative(
        @CurrentUser() user: AuthenticatedUser,
        @Param("id") id: string,
        @Body() body: unknown,
    ): Promise<RoutineActionDtoOut> {
        return this.chooseAlternativeUseCase.execute(user, { ...(body as object), routineId: id });
    }
}
