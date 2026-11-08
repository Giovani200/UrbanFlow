import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TransportModule } from "../transport/transport.module";
import { RoutineConnectionsService } from "./routine-connections.service";
import { RoutineDayPlanner } from "./routine-day-planner.service";
import { RoutinesController } from "./routines.controller";
import { ChooseAlternativeUseCase } from "./use-cases/choose-alternative.use-case";
import { CreateRoutineUseCase } from "./use-cases/create-routine.use-case";
import { DeleteRoutineUseCase } from "./use-cases/delete-routine.use-case";
import { GetRoutineTodayUseCase } from "./use-cases/get-routine-today.use-case";
import { ListRoutinesUseCase } from "./use-cases/list-routines.use-case";
import { MarkNotTakenUseCase } from "./use-cases/mark-not-taken.use-case";
import { UpdateRoutineUseCase } from "./use-cases/update-routine.use-case";

@Module({
    imports: [TransportModule, PassportModule],
    controllers: [RoutinesController],
    providers: [
        RoutineDayPlanner,
        RoutineConnectionsService,
        ListRoutinesUseCase,
        CreateRoutineUseCase,
        UpdateRoutineUseCase,
        DeleteRoutineUseCase,
        GetRoutineTodayUseCase,
        MarkNotTakenUseCase,
        ChooseAlternativeUseCase,
    ],
})
export class RoutinesModule {}
