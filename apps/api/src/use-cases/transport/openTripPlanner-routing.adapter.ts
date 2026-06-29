import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Coordinates, GeoJsonLineString, TripMode } from "@urbanflow/app-front-back-lib";

// otp = OpenTripPlanner (calculateur d'itinéraires Métromobilité, réseau TAG)
const OTP_PLAN_URL = "https://data.mobilites-m.fr/api/routers/default/plan";

// Périmètre TAG : marche + tram + bus uniquement.
const OTP_REQUESTED_MODES = "WALK,TRAM,BUS";
const OTP_MAX_ITINERARIES = 5;

const OTP_MODE_TO_TRIP_MODE: Record<string, TripMode> = {
    WALK: "walk",
    TRAM: "tram",
    BUS: "bus",
};

export interface OtpLeg {
    mode: TripMode;
    geometry: GeoJsonLineString;
    distanceMeters: number;
    durationSeconds: number;
    departureStopName?: string;
    arrivalStopName?: string;
    lineShortName?: string;
}

export interface OtpItinerary {
    legs: OtpLeg[];
    durationSeconds: number;
}

interface OtpRawLeg {
    mode: string;
    transitLeg?: boolean;
    routeShortName?: string;
    distance: number;
    duration: number;
    from?: { name?: string };
    to?: { name?: string };
    legGeometry?: { points?: string };
}

interface OtpRawItinerary {
    duration: number;
    legs: OtpRawLeg[];
}

interface OtpPlanResponse {
    error?: { msg?: string };
    plan?: { itineraries?: OtpRawItinerary[] };
}

@Injectable()
export class OtpRoutingAdapter {
    async getItineraries(
        origin: Coordinates,
        destination: Coordinates,
        wheelchairAccess: boolean,
    ): Promise<OtpItinerary[]> {
        const parameters = new URLSearchParams({
            fromPlace: `${origin.latitude},${origin.longitude}`,
            toPlace: `${destination.latitude},${destination.longitude}`,
            mode: OTP_REQUESTED_MODES,
            numItineraries: String(OTP_MAX_ITINERARIES),
            wheelchair: String(wheelchairAccess),
        });

        const response = await fetch(`${OTP_PLAN_URL}?${parameters.toString()}`, {
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            throw new ServiceUnavailableException("OTP_REQUEST_FAILED");
        }

        const data = (await response.json()) as OtpPlanResponse;
        const itineraries = data.plan?.itineraries;

        // Aucun trajet / point hors graphe → OTP renvoie un `error` et une liste vide.
        // Absence de transit = cas normal, pas une exception.
        if (data.error || !itineraries || itineraries.length === 0) {
            return [];
        }

        return itineraries
            .map((itinerary) => this.mapItinerary(itinerary))
            .filter((itinerary): itinerary is OtpItinerary => itinerary !== null);
    }

    private mapItinerary(itinerary: OtpRawItinerary): OtpItinerary | null {
        const legs: OtpLeg[] = [];

        for (const leg of itinerary.legs) {
            const mode = OTP_MODE_TO_TRIP_MODE[leg.mode];
            if (!mode) {
                // Mode hors périmètre, on écarte l'itinéraire.
                return null;
            }

            legs.push({
                mode,
                geometry: {
                    type: "LineString",
                    coordinates: decodePolyline(leg.legGeometry?.points ?? ""),
                },
                distanceMeters: leg.distance,
                durationSeconds: leg.duration,
                departureStopName: leg.transitLeg ? leg.from?.name : undefined,
                arrivalStopName: leg.transitLeg ? leg.to?.name : undefined,
                lineShortName: leg.transitLeg ? leg.routeShortName : undefined,
            });
        }

        return { legs, durationSeconds: itinerary.duration };
    }
}

// Décode une polyline encodée Google (précision 5, ordre lat,lon) en coordonnées GeoJSON [longitude, latitude].
function decodePolyline(encoded: string): Array<[number, number]> {
    const coordinates: Array<[number, number]> = [];
    let index = 0;
    let latitude = 0;
    let longitude = 0;

    const readNextValue = (): number => {
        let result = 0;
        let shift = 0;
        let byte: number;
        do {
            byte = encoded.charCodeAt(index) - 63;
            index += 1;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        return result & 1 ? ~(result >> 1) : result >> 1;
    };

    while (index < encoded.length) {
        latitude += readNextValue();
        longitude += readNextValue();
        coordinates.push([longitude / 1e5, latitude / 1e5]);
    }

    return coordinates;
}
