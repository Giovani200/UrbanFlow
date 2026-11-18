import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { RoutinesModule } from "../routines/routines.module";
import { SharesController } from "./shares.controller";
import { ConfirmShareArrivalUseCase } from "./use-cases/confirm-share-arrival.use-case";
import { CreateShareUseCase } from "./use-cases/create-share.use-case";
import { GetCurrentShareUseCase } from "./use-cases/get-current-share.use-case";
import { RecordSharePositionUseCase } from "./use-cases/record-share-position.use-case";
import { StopShareUseCase } from "./use-cases/stop-share.use-case";
import { ViewShareUseCase } from "./use-cases/view-share.use-case";

@Module({
    imports: [RoutinesModule, PassportModule],
    controllers: [SharesController],
    providers: [
        CreateShareUseCase,
        GetCurrentShareUseCase,
        RecordSharePositionUseCase,
        ConfirmShareArrivalUseCase,
        StopShareUseCase,
        ViewShareUseCase,
    ],
})
export class SharesModule {}
