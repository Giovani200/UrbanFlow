import type {
    Coordinates,
    DataFreshness,
    GeoJsonLineString,
    PlannedTime,
    TransitStop,
    TransitStopPoint,
    TripMode,
} from "@urbanflow/app-front-back-lib";

export const TRANSIT_ROUTING_PROVIDER = Symbol("TRANSIT_ROUTING_PROVIDER");
export const NEARBY_STOPS_PROVIDER = Symbol("NEARBY_STOPS_PROVIDER");
export const DEPARTURES_PROVIDER = Symbol("DEPARTURES_PROVIDER");

export interface TransitLeg {
    mode: TripMode;
    geometry: GeoJsonLineString;
    distanceMeters: number;
    durationSeconds: number;
    departureStopName?: string;
    arrivalStopName?: string;
    lineShortName?: string;
    lineColor?: string;
    lineTextColor?: string;
    intermediateStops?: TransitStopPoint[];
    dataFreshness?: DataFreshness;
    scheduledDepartureTime?: string;
    expectedDepartureTime?: string;
    departureStopPointRef?: string;
    arrivalStopPointRef?: string;
}

export interface TransitItinerary {
    legs: TransitLeg[];
    durationSeconds: number;
}

export interface TransitRoutingProvider {
    /** Renvoie `[]` s'il n'existe aucun itinéraire ; lève une erreur si la source est indisponible. */
    getItineraries(
        origin: Coordinates,
        destination: Coordinates,
        wheelchairAccess: boolean,
        plannedTime?: PlannedTime,
    ): Promise<TransitItinerary[]>;
}

export interface NearbyStopsProvider {
    getNearbyStops(origin: Coordinates, radiusMeters: number): Promise<TransitStop[]>;
}

export interface Departure {
    lineRef: string;
    destinationName: string;
    scheduledTime: string;
    expectedTime: string;
    delaySeconds: number;
    dataFreshness: DataFreshness;
}

export interface DeparturesProvider {
    getNextDepartures(monitoringRef: string): Promise<Departure[]>;
}
