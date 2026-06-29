import { Body, Controller, Post } from "@nestjs/common";
import { CalculateCarbonDtoOut } from "@urbanflow/app-front-back-lib";
import { CalculateCarbonUseCase } from "./use-cases/calculate-carbon.use-case";

@Controller("carbon")
export class CarbonController {
    constructor(private readonly calculateCarbonUseCase: CalculateCarbonUseCase) {}

    @Post("calculate")
    async calculate(@Body() body: unknown): Promise<CalculateCarbonDtoOut> {
        return this.calculateCarbonUseCase.execute(body);
    }
}
