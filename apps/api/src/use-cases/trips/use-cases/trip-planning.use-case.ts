import { Injectable } from "@nestjs/common";
import {
    TripPlanningDtoIn,
    TripPlanningDtoInSchema,
    TripPlanningDtoOut,
    TripPlanningDtoOutSchema,
    TripMode,
    TripRoute,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { CARBON_FACTORS } from "../../../shared/constants";
import { OrsProfile, OrsRoutingAdapter } from "../../transport/openRouteService-routing.adapter";

// Pondérations par défaut si l'utilisateur n'a pas de profil.
const DEFAULT_WEIGHTS = { weightCarbon: 50, weightTime: 30, weightCost: 20 };

// Normalise en [0,1] : plus la valeur est basse, meilleur le score (1 = le meilleur du lot).
function normalize(value: number, min: number, max: number): number {
    return max === min ? 1 : (max - value) / (max - min);
}

@Injectable()
export class TripPlanningUseCase extends AbstractUseCase<TripPlanningDtoIn, TripPlanningDtoOut> {
    constructor(private readonly orsRoutingAdapter: OrsRoutingAdapter) {
        super(TripPlanningDtoInSchema, TripPlanningDtoOutSchema);
    }

    protected async executeUseCase(dataIn: TripPlanningDtoIn): Promise<TripPlanningDtoOut> {
        const walkProfile: OrsProfile = dataIn.profile?.wheelchairAccess ? "wheelchair" : "foot-walking";

        const plans: Array<{ mode: TripMode; orsProfile: OrsProfile }> = [
            { mode: "walk", orsProfile: walkProfile },
            { mode: "bike", orsProfile: "cycling-regular" },
        ];

        const routes = await Promise.all(
            plans.map((plan) => this.buildRoute(plan.mode, plan.orsProfile, dataIn)),
        );

        return { routes: this.rankRoutes(routes, dataIn) };
    }

    private async buildRoute(
        mode: TripMode,
        orsProfile: OrsProfile,
        dataIn: TripPlanningDtoIn,
    ): Promise<TripRoute> {
        const orsRoute = await this.orsRoutingAdapter.getRoute(orsProfile, dataIn.origin, dataIn.destination);
        const carbonGrams = (orsRoute.distanceMeters / 1000) * CARBON_FACTORS[mode];

        return {
            segments: [
                {
                    mode,
                    geometry: orsRoute.geometry,
                    durationSeconds: orsRoute.durationSeconds,
                    distanceMeters: orsRoute.distanceMeters,
                    carbonGrams,
                },
            ],
            totalDurationSeconds: orsRoute.durationSeconds,
            totalDistanceMeters: orsRoute.distanceMeters,
            totalCarbonGrams: carbonGrams,
            score: 0, // rempli par rankRoutes, une fois tous les itinéraires connus
        };
    }

    private rankRoutes(routes: TripRoute[], dataIn: TripPlanningDtoIn): TripRoute[] {
        const weights = dataIn.profile ?? DEFAULT_WEIGHTS;

        const durations = routes.map((route) => route.totalDurationSeconds);
        const carbons = routes.map((route) => route.totalCarbonGrams);
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        const minCarbon = Math.min(...carbons);
        const maxCarbon = Math.max(...carbons);

        return routes
            .map((route) => ({
                ...route,
                score: Math.round(
                    weights.weightTime * normalize(route.totalDurationSeconds, minDuration, maxDuration) +
                    weights.weightCarbon * normalize(route.totalCarbonGrams, minCarbon, maxCarbon) +
                    weights.weightCost * 1, // coût non calculé pour les modes actifs (gratuits) → neutre
                ),
            }))
            .sort((a, b) => b.score - a.score);
    }
}