import { Inject, Injectable } from "@nestjs/common";
import {
    TripPlanningDtoIn,
    TripPlanningDtoInSchema,
    TripPlanningDtoOut,
    TripPlanningDtoOutSchema,
    TripMode,
    TripRoute,
    TransitStatus,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { isInIleDeFrance } from "../../../shared/geo/ile-de-france";
import { OrsProfile, OrsRoutingAdapter } from "../../transport/openRouteService-routing.adapter";
import { TRANSIT_ROUTING_PROVIDER, type TransitRoutingProvider } from "../../transport/transit.providers";
import { hasTransitLeg, savedVersusCarGrams, segmentCarbonGrams, toTransitTripRoute } from "../trip-route.mapper";

@Injectable()
export class TripPlanningUseCase extends AbstractUseCase<TripPlanningDtoIn, TripPlanningDtoOut> {
    constructor(
        private readonly orsRoutingAdapter: OrsRoutingAdapter,
        @Inject(TRANSIT_ROUTING_PROVIDER) private readonly transitRoutingProvider: TransitRoutingProvider,
    ) {
        super(TripPlanningDtoInSchema, TripPlanningDtoOutSchema);
    }

    protected async executeUseCase(dataIn: TripPlanningDtoIn): Promise<TripPlanningDtoOut> {
        const wheelchairAccess = dataIn.profile?.wheelchairAccess ?? false;
        const walkProfile: OrsProfile = wheelchairAccess ? "wheelchair" : "foot-walking";

        const transitCovered = isInIleDeFrance(dataIn.origin) && isInIleDeFrance(dataIn.destination);

        const [walkResult, bikeResult, transitResult] = await Promise.allSettled([
            this.buildActiveRoute("walk", walkProfile, dataIn),
            this.buildActiveRoute("bike", "cycling-regular", dataIn),
            transitCovered ? this.buildTransitRoutes(dataIn, wheelchairAccess) : Promise.resolve([]),
        ]);

        const transit = transitResult.status === "fulfilled" ? transitResult.value : [];
        return {
            walk: walkResult.status === "fulfilled" ? walkResult.value : null,
            bike: bikeResult.status === "fulfilled" ? bikeResult.value : null,
            transit,
            transitStatus: this.transitStatusOf(transitResult.status, transit.length),
        };
    }

    private async buildActiveRoute(
        mode: TripMode,
        orsProfile: OrsProfile,
        dataIn: TripPlanningDtoIn,
    ): Promise<TripRoute> {
        const route = await this.orsRoutingAdapter.getRoute(orsProfile, dataIn.origin, dataIn.destination);
        const carbonGrams = segmentCarbonGrams(mode, route.distanceMeters);
        const savedGrams = savedVersusCarGrams(carbonGrams, route.distanceMeters);

        return {
            segments: [
                {
                    mode,
                    geometry: route.geometry,
                    durationSeconds: route.durationSeconds,
                    distanceMeters: route.distanceMeters,
                    carbonGrams,
                    savedGrams,
                },
            ],
            totalDurationSeconds: route.durationSeconds,
            totalDistanceMeters: route.distanceMeters,
            totalCarbonGrams: carbonGrams,
            totalSavedGrams: savedGrams,
        };
    }

    /** Itinéraires en transport en commun, dans l'ordre du fournisseur, jamais re-triés. */
    private async buildTransitRoutes(
        dataIn: TripPlanningDtoIn,
        wheelchairAccess: boolean,
    ): Promise<TripRoute[]> {
        const itineraries = await this.transitRoutingProvider.getItineraries(
            dataIn.origin,
            dataIn.destination,
            wheelchairAccess,
            dataIn.plannedTime,
        );

        return itineraries
            .filter(hasTransitLeg)
            .map(toTransitTripRoute);
    }

    private transitStatusOf(settlement: PromiseSettledResult<unknown>["status"], routeCount: number): TransitStatus {
        if (settlement === "rejected") {
            return "unavailable";
        }
        return routeCount > 0 ? "ok" : "no_result";
    }
}