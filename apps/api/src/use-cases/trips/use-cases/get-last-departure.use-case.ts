import { Inject, Injectable } from "@nestjs/common";
import {
    Coordinates,
    LabeledCoordinates,
    LAST_DEPARTURE_SETTINGS,
    LastDepartureDtoIn,
    LastDepartureDtoInSchema,
    LastDepartureDtoOut,
    LastDepartureDtoOutSchema,
    LastDepartureStatus,
    TransitStatus,
} from "@urbanflow/app-front-back-lib";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { CACHE_STORE, type CacheStore } from "../../../shared/cache/cache-store";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { haversineMeters } from "../../../shared/geo/haversine";
import {
    navitiaLocalToParisIso,
    serviceDayArrivalLimit,
    toNavitiaDateTime,
    toParisLocalMinute,
} from "../../../shared/time/paris-time";
import {
    NIGHT_LINES_PROVIDER,
    TRANSIT_ROUTING_PROVIDER,
    type NightLinesProvider,
    type TransitItinerary,
    type TransitRoutingProvider,
} from "../../transport/transit.providers";
import { hasTransitLeg, toTransitTripRoute } from "../trip-route.mapper";

const DEFAULT_SETTINGS = {
    lastDepartureDistanceMeters: LAST_DEPARTURE_SETTINGS.distanceMeters.default,
    lastDepartureWindowMinutes: LAST_DEPARTURE_SETTINGS.windowMinutes.default,
    wheelchairAccess: false,
};
const MILLISECONDS_PER_MINUTE = 60_000;
/** Grille d'environ 500 m : l'heure du dernier départ varie peu à l'échelle d'un quartier. */
const DEPARTURE_TIME_GRID_STEPS_PER_DEGREE = 200;

interface LastDepartureSearch {
    origin: Coordinates;
    home: Coordinates;
    wheelchairAccess: boolean;
    arrivalLimit: string;
}

type DatedItinerary = TransitItinerary & { departureTime: string; arrivalTime: string };

function datedTransitItineraries(itineraries: TransitItinerary[]): DatedItinerary[] {
    return itineraries.filter(
        (itinerary): itinerary is DatedItinerary =>
            hasTransitLeg(itinerary) && itinerary.departureTime !== undefined && itinerary.arrivalTime !== undefined,
    );
}

function latestDeparture(itineraries: DatedItinerary[]): DatedItinerary | null {
    return itineraries.reduce<DatedItinerary | null>(
        (latest, itinerary) =>
            !latest || Date.parse(itinerary.departureTime) > Date.parse(latest.departureTime) ? itinerary : latest,
        null,
    );
}

function earliestArrival(itineraries: DatedItinerary[]): DatedItinerary | null {
    return itineraries.reduce<DatedItinerary | null>(
        (earliest, itinerary) =>
            !earliest || Date.parse(itinerary.arrivalTime) < Date.parse(earliest.arrivalTime) ? itinerary : earliest,
        null,
    );
}

function roundForDepartureTime(coordinates: Coordinates): string {
    const latitude = Math.round(coordinates.latitude * DEPARTURE_TIME_GRID_STEPS_PER_DEGREE);
    const longitude = Math.round(coordinates.longitude * DEPARTURE_TIME_GRID_STEPS_PER_DEGREE);
    return `${latitude},${longitude}`;
}

/** `departed` ou `outside_window` quand le dernier départ ne doit pas s'afficher, sinon `null`. */
function timingStatus(departureTime: string, now: Date, windowMinutes: number): "departed" | "outside_window" | null {
    const minutesUntilDeparture = (Date.parse(departureTime) - now.getTime()) / MILLISECONDS_PER_MINUTE;
    if (minutesUntilDeparture < 0) {
        return "departed";
    }
    return minutesUntilDeparture > windowMinutes ? "outside_window" : null;
}

/**
 * Dernier départ du soir vers le domicile, et le Plan B si on le rate.
 *
 * Silence par défaut : sans domicile, près de chez soi, ou quand le dernier départ est passé ou plus loin que la
 * fenêtre réglée, aucun trajet n'est renvoyé. Le dernier départ exclut les bus de nuit ; le Plan B les autorise
 * et part une minute après. Une panne du Plan B ne fait pas tomber le dernier départ.
 *
 * Économie de quota : l'heure du dernier départ est gardée jusqu'à la fin de la journée de service. Hors de la
 * fenêtre, elle suffit à répondre sans appel au calculateur ; dans la fenêtre, le trajet est recalculé pour
 * suivre le temps réel (le calculateur le garde lui-même 2 min en cache).
 */
@Injectable()
export class GetLastDepartureUseCase extends AbstractAuthenticatedUseCase<LastDepartureDtoIn, LastDepartureDtoOut> {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(TRANSIT_ROUTING_PROVIDER) private readonly transitRoutingProvider: TransitRoutingProvider,
        @Inject(NIGHT_LINES_PROVIDER) private readonly nightLinesProvider: NightLinesProvider,
        @Inject(CACHE_STORE) private readonly cacheStore: CacheStore,
    ) {
        super(LastDepartureDtoInSchema, LastDepartureDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: LastDepartureDtoIn,
    ): Promise<LastDepartureDtoOut> {
        const userId = authenticatedUser.userId;
        const [home, preferences] = await Promise.all([
            this.prisma.favoriteAddress.findFirst({
                where: { userId, isHome: true },
                select: { label: true, latitude: true, longitude: true },
            }),
            this.prisma.preferences.findUnique({
                where: { userId },
                select: { lastDepartureDistanceMeters: true, lastDepartureWindowMinutes: true, wheelchairAccess: true },
            }),
        ]);

        if (!home) {
            return this.silent("no_home", null);
        }
        const settings = preferences ?? DEFAULT_SETTINGS;
        if (haversineMeters(dataIn.position, home) < settings.lastDepartureDistanceMeters) {
            return this.silent("near_home", home);
        }

        const now = new Date();
        const search: LastDepartureSearch = {
            origin: dataIn.position,
            home,
            wheelchairAccess: settings.wheelchairAccess,
            arrivalLimit: serviceDayArrivalLimit(now),
        };

        let lastDeparture: DatedItinerary | null;
        try {
            const knownDepartureTime = await this.knownDepartureTime(search, now);
            if (knownDepartureTime === null) {
                return this.silent("no_result", home);
            }
            const knownTiming = timingStatus(knownDepartureTime, now, settings.lastDepartureWindowMinutes);
            if (knownTiming) {
                return this.silent(knownTiming, home);
            }
            lastDeparture = await this.findLastDeparture(search);
        } catch {
            return this.silent("unavailable", home);
        }

        if (!lastDeparture) {
            return this.silent("no_result", home);
        }
        const timing = timingStatus(lastDeparture.departureTime, now, settings.lastDepartureWindowMinutes);
        if (timing) {
            return this.silent(timing, home);
        }

        const planB = await this.findPlanB(dataIn.position, home, settings.wheelchairAccess, lastDeparture);
        return {
            status: "ok",
            home,
            lastDeparture: toTransitTripRoute(lastDeparture),
            planB: planB.itinerary ? toTransitTripRoute(planB.itinerary) : null,
            planBStatus: planB.status,
        };
    }

    private knownDepartureTime(search: LastDepartureSearch, now: Date): Promise<string | null> {
        const cacheKey = [
            "last-departure-time",
            roundForDepartureTime(search.origin),
            roundForDepartureTime(search.home),
            search.wheelchairAccess,
            search.arrivalLimit,
        ].join(":");
        const serviceDayEnd = Date.parse(navitiaLocalToParisIso(toNavitiaDateTime(search.arrivalLimit)));
        const ttlMilliseconds = Math.max(MILLISECONDS_PER_MINUTE, serviceDayEnd - now.getTime());

        return this.cacheStore.getOrLoad(cacheKey, ttlMilliseconds, async () => {
            const lastDeparture = await this.findLastDeparture(search);
            return lastDeparture?.departureTime ?? null;
        });
    }

    private async findLastDeparture(search: LastDepartureSearch): Promise<DatedItinerary | null> {
        const nightLineIds = await this.nightLinesProvider.getNightLineIds();
        const itineraries = await this.transitRoutingProvider.getItinerariesArrivingBefore(
            search.origin,
            search.home,
            search.wheelchairAccess,
            search.arrivalLimit,
            nightLineIds,
        );
        return latestDeparture(datedTransitItineraries(itineraries));
    }

    private async findPlanB(
        position: LastDepartureDtoIn["position"],
        home: { latitude: number; longitude: number },
        wheelchairAccess: boolean,
        lastDeparture: DatedItinerary,
    ): Promise<{ status: TransitStatus; itinerary: DatedItinerary | null }> {
        const lastDepartureTime = Date.parse(lastDeparture.departureTime);
        const departureFrom = toParisLocalMinute(new Date(lastDepartureTime + MILLISECONDS_PER_MINUTE));
        try {
            const itineraries = await this.transitRoutingProvider.getItinerariesDepartingFrom(
                position,
                home,
                wheelchairAccess,
                departureFrom,
            );
            const laterItineraries = datedTransitItineraries(itineraries).filter(
                (itinerary) => Date.parse(itinerary.departureTime) > lastDepartureTime,
            );
            const itinerary = earliestArrival(laterItineraries);
            return { status: itinerary ? "ok" : "no_result", itinerary };
        } catch {
            return { status: "unavailable", itinerary: null };
        }
    }

    private silent(status: LastDepartureStatus, home: LabeledCoordinates | null): LastDepartureDtoOut {
        return { status, home, lastDeparture: null, planB: null, planBStatus: null };
    }
}
