import { Body, Controller, Post } from "@nestjs/common";
import { PlanRouteDtoOut } from "@urbanflow/app-front-back-lib";
import { PlanRouteUseCase } from "./plan-route.use-case";

@Controller("transport")
export class TransportController {
    constructor(private readonly planRouteUseCase: PlanRouteUseCase) {}

    @Post("routing")
    async planRoute(@Body() body: unknown): Promise<PlanRouteDtoOut> {
        return this.planRouteUseCase.execute(body);
    }
}
