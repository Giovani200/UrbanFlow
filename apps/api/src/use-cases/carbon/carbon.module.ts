import { Module } from "@nestjs/common";
import { CarbonController } from "./carbon.controller";
import { CalculateCarbonUseCase } from "./use-cases/calculate-carbon.use-case";

@Module({
    controllers: [CarbonController],
    providers: [CalculateCarbonUseCase],
})
export class CarbonModule {}
