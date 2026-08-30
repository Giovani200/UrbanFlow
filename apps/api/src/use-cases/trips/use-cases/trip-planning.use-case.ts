import { Injectable } from "@nestjs/common";
import {
    TripPlanningDtoIn,
    TripPlanningDtoInSchema,
    TripPlanningDtoOut,
    TripPlanningDtoOutSchema,
    TripMode,
    TripRoute,
    TripSegment,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { CARBON_FACTORS } from "../../../shared/constants";
import { OrsProfile, OrsRoutingAdapter } from "../../transport/openRouteService-routing.adapter";
import { OtpItinerary, OtpRoutingAdapter } from "../../transport/openTripPlanner-routing.adapter";

// Pondérations par défaut si l'utilisateur n'a pas de profil.
const DEFAULT_WEIGHTS = { weightCarbon: 50, weightTime: 30};

// Match complet des modes préférés = jusqu'à 20 % du poids temps+carbone (réglage produit).
const PREFERRED_MODE_BONUS_RATIO = 0.2;

// Normalise en [0,1] : plus la valeur est basse, meilleur le score (1 = le meilleur du lot).
function normalize(value: number, min: number, max: number): number {
    return max === min ? 1 : (max - value) / (max - min);
}

@Injectable()
export class TripPlanningUseCase extends AbstractUseCase<TripPlanningDtoIn, TripPlanningDtoOut> {
    constructor(
        private readonly orsRoutingAdapter: OrsRoutingAdapter,
        private readonly otpRoutingAdapter: OtpRoutingAdapter,
    ) {
        super(TripPlanningDtoInSchema, TripPlanningDtoOutSchema);
    }

    protected async executeUseCase(dataIn: TripPlanningDtoIn): Promise<TripPlanningDtoOut> {
        const wheelchairAccess = dataIn.profile?.wheelchairAccess ?? false;
        const walkProfile: OrsProfile = wheelchairAccess ? "wheelchair" : "foot-walking";

        const [walkResult, bikeResult, transitResult] = await Promise.allSettled([
            this.buildActiveRoute("walk", walkProfile, dataIn),
            this.buildActiveRoute("bike", "cycling-regular", dataIn),
            this.buildTransitRoutes(dataIn, wheelchairAccess),
        ]);

        return {
            walk: walkResult.status === "fulfilled" ? walkResult.value : null,
            bike: bikeResult.status === "fulfilled" ? bikeResult.value : null,
            transit: transitResult.status === "fulfilled" ? this.rankRoutes(transitResult.value, dataIn) : [],
        };
    }

    // Mode marche ou vélo
    private async buildActiveRoute(
        mode: TripMode,
        orsProfile: OrsProfile,
        dataIn: TripPlanningDtoIn,
    ): Promise<TripRoute> {
        const route = await this.orsRoutingAdapter.getRoute(orsProfile, dataIn.origin, dataIn.destination);
        const carbonGrams = this.segmentCarbon(mode, route.distanceMeters);
        const savedGrams = this.segmentSaved(carbonGrams, route.distanceMeters);

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
            score: 0, // mode pur, non classé
        };
    }

    // Combinaisons transport en commun.
    private async buildTransitRoutes(
        dataIn: TripPlanningDtoIn,
        wheelchairAccess: boolean,
    ): Promise<TripRoute[]> {
        const itineraries = await this.otpRoutingAdapter.getItineraries(
            dataIn.origin,
            dataIn.destination,
            wheelchairAccess,
            dataIn.plannedTime,
        );

        return itineraries
            .filter((itinerary) => itinerary.legs.some((leg) => leg.mode !== "walk"))
            .map((itinerary) => this.toTransitRoute(itinerary));
    }

    private toTransitRoute(itinerary: OtpItinerary): TripRoute {
        const segments: TripSegment[] = itinerary.legs.map((leg) => {
            const carbonGrams = this.segmentCarbon(leg.mode, leg.distanceMeters);
            return {
                mode: leg.mode,
                geometry: leg.geometry,
                durationSeconds: leg.durationSeconds,
                distanceMeters: leg.distanceMeters,
                carbonGrams,
                savedGrams: this.segmentSaved(carbonGrams, leg.distanceMeters),
                departureStopName: leg.departureStopName,
                arrivalStopName: leg.arrivalStopName,
                lineShortName: leg.lineShortName,
                intermediateStops: leg.intermediateStops,
            };
        });

        return {
            segments,
            totalDurationSeconds: itinerary.durationSeconds,
            totalDistanceMeters: segments.reduce((total, segment) => total + segment.distanceMeters, 0),
            totalCarbonGrams: segments.reduce((total, segment) => total + segment.carbonGrams, 0),
            totalSavedGrams: segments.reduce((total, segment) => total + segment.savedGrams, 0),
            score: 0,
        };
    }

    private segmentCarbon(mode: TripMode, distanceMeters: number): number {
        return (distanceMeters / 1000) * CARBON_FACTORS[mode];
    }

    // CO₂ évité par rapport au même segment parcouru en voiture solo.
    private segmentSaved(carbonGrams: number, distanceMeters: number): number {
        const carReferenceGrams = (distanceMeters / 1000) * CARBON_FACTORS.car;
        return Math.max(0, carReferenceGrams - carbonGrams);
    }

    private rankRoutes(routes: TripRoute[], dataIn: TripPlanningDtoIn): TripRoute[] {
        const weights = dataIn.profile ?? DEFAULT_WEIGHTS;
        const preferredModes = dataIn.profile?.preferredModes;
        const weightSum = weights.weightTime + weights.weightCarbon;

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
                    this.preferenceBonus(route, weightSum, preferredModes)),
            }))
            .sort((a, b) => b.score - a.score);
    }

    // Bonus si l'itinéraire emprunte les modes préférés : coup de pouce au classement, jamais de masquage.
    private preferenceBonus(route: TripRoute, weightSum: number, preferredModes?: TripMode[]): number {
        if (!preferredModes?.length) return 0;
        const modes = route.segments.map((segment) => segment.mode).filter((mode) => mode !== "walk");
        if (modes.length === 0) return 0;
        const matched = modes.filter((mode) => preferredModes.includes(mode)).length;
        return PREFERRED_MODE_BONUS_RATIO * weightSum * (matched / modes.length);
    }
}
