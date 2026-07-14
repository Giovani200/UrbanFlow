import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { CarbonController } from "./carbon.controller";
import { CalculateCarbonUseCase } from "./use-cases/calculate-carbon.use-case";
import { GetCarbonSummaryUseCase } from "./use-cases/get-carbon-summary.use-case";

@Module({
    imports: [PassportModule],
    controllers: [CarbonController],
    providers: [CalculateCarbonUseCase, GetCarbonSummaryUseCase],
})
export class CarbonModule {}