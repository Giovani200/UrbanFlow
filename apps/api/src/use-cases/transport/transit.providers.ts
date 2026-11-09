import type {
    Coordinates,
    DataFreshness,
    GeoJsonLineString,
    PlannedTime,
    TransitLine,
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
    scheduledArrivalTime?: string;
    expectedArrivalTime?: string;
    /** La voie du train au départ, connue seulement par une lecture SIRI. */
    platform?: string;
    departureStopPointRef?: string;
    arrivalStopPointRef?: string;
    /** Identifiants Navitia, pour lire les prochains départs de cette direction. Internes à l'API. */
    departureStopPointId?: string;
    routeId?: string;
}

/** Message IDFM sur une ligne. Il informe : rien ne prouve qu'il explique un trajet absent. */
export interface LineNotice {
    lineId: string;
    lineShortName: string;
    text: string;
    /** Heures ISO 8601 à l'heure de Paris. */
    periods: { begin: string; end: string }[];
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

    /**
     * Itinéraires qui arrivent au plus tard à `arrivalLimit`, limités aux lignes données. `[]` s'il n'y en a aucun.
     * Un résultat peut ne pas utiliser toutes ces lignes : c'est à l'appelant de le vérifier.
     */
    getItinerariesOnLines(
        origin: Coordinates,
        destination: Coordinates,
        wheelchairAccess: boolean,
        arrivalLimit: string,
        allowedLineIds: string[],
    ): Promise<TransitItinerary[]>;

    /** Itinéraires qui arrivent au plus tard à `arrivalLimit`, avec les messages IDFM de toutes les lignes. */
    getItinerariesWithNotices(
        origin: Coordinates,
        destination: Coordinates,
        wheelchairAccess: boolean,
        arrivalLimit: string,
    ): Promise<{ itineraries: TransitItinerary[]; notices: LineNotice[] }>;

    /** Heures ISO des prochains départs prévus à un arrêt, dans une direction, à partir de `fromLocalMinute`. */
    getScheduledDepartures(stopPointId: string, routeId: string, fromLocalMinute: string): Promise<string[]>;
}

/** Un quai d'un arrêt : SIRI lit des quais, alors qu'un arrêt proche est une zone. */
export interface StopQuay {
    monitoringRef: string;
    /** Une référence ferrée couvre tous les trains d'une gare, là où un quai de bus ne couvre qu'une ligne ou deux. */
    isRail: boolean;
    location: Coordinates;
}

/** Un arrêt proche, avec les directions qu'il dessert (ligne et sens). Vide si elles sont inconnues. Interne à l'API. */
export interface NearbyStop extends TransitStop {
    routeIds: string[];
}

export interface NearbyStopsProvider {
    getNearbyStops(origin: Coordinates, radiusMeters: number): Promise<NearbyStop[]>;

    getStopQuays(stopAreaId: string): Promise<StopQuay[]>;

    getStopLines(stopAreaId: string): Promise<TransitLine[]>;
}

export interface Departure {
    lineRef: string;
    destinationName: string;
    /** `null` pour le métro : SIRI n'y donne que des heures estimées, donc on ne peut pas y suivre un véhicule précis. */
    scheduledTime: string | null;
    expectedTime: string;
    delaySeconds: number;
    dataFreshness: DataFreshness;
    scheduledArrivalTime?: string;
    expectedArrivalTime?: string;
    /** La voie du train ; les bus n'en ont pas. */
    platform?: string;
}

export interface DeparturesProvider {
    getNextDepartures(monitoringRef: string): Promise<Departure[]>;
}

export interface NightLinesProvider {
    /** Identifiants IDFM des lignes de bus de nuit en service. Lève une erreur si le référentiel est indisponible. */
    getNightLineIds(): Promise<string[]>;
}
