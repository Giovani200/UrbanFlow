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
export const NIGHT_LINES_PROVIDER = Symbol("NIGHT_LINES_PROVIDER");

export interface TransitLeg {
    mode: TripMode;
    geometry: GeoJsonLineString;
    distanceMeters: number;
    durationSeconds: number;
    departureStopName?: string;
    arrivalStopName?: string;
    lineShortName?: string;
    /** Identifiant IDFM de la ligne (`C01731`), seule clé fiable : les noms « R » ou « A » existent aussi en bus. */
    lineId?: string;
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
    /** Heures ISO 8601 à l'heure de Paris. */
    departureTime?: string;
    arrivalTime?: string;
}

export interface TransitRoutingProvider {
    /** Renvoie `[]` s'il n'existe aucun itinéraire ; lève une erreur si la source est indisponible. */
    getItineraries(
        origin: Coordinates,
        destination: Coordinates,
        wheelchairAccess: boolean,
        plannedTime?: PlannedTime,
    ): Promise<TransitItinerary[]>;

    /**
     * Itinéraires qui arrivent au plus tard à `arrivalLimit` (heure locale de Paris, « YYYY-MM-DDTHH:mm »),
     * sans emprunter les lignes exclues. `[]` s'il n'y en a aucun.
     */
    getItinerariesArrivingBefore(
        origin: Coordinates,
        destination: Coordinates,
        wheelchairAccess: boolean,
        arrivalLimit: string,
        excludedLineIds: string[],
    ): Promise<TransitItinerary[]>;

    /** Itinéraires qui partent à partir de `departureFrom` (heure locale de Paris, « YYYY-MM-DDTHH:mm »). */
    getItinerariesDepartingFrom(
        origin: Coordinates,
        destination: Coordinates,
        wheelchairAccess: boolean,
        departureFrom: string,
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

export interface NightLinesProvider {
    /** Identifiants IDFM des lignes de bus de nuit en service. Lève une erreur si le référentiel est indisponible. */
    getNightLineIds(): Promise<string[]>;
}
