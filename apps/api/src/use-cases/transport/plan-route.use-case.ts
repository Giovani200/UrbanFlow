import { Injectable } from "@nestjs/common";
import {
    PlanRouteDtoIn,
    PlanRouteDtoInSchema,
    PlanRouteDtoOut,
    PlanRouteDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../shared/core/abstract.use-case";

@Injectable()
export class PlanRouteUseCase extends AbstractUseCase<PlanRouteDtoIn, PlanRouteDtoOut> {
    constructor() {
        super(PlanRouteDtoInSchema, PlanRouteDtoOutSchema);
    }

    protected async executeUseCase(dataIn: PlanRouteDtoIn): Promise<PlanRouteDtoOut> {
        // TODO: réécrire la planification multimodale (ORS + GBFS + GTFS + scoring) sur la base propre.
        void dataIn;
        return { routes: [] };
    }
}
