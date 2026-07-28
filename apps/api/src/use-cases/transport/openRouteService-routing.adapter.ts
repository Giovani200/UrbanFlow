import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Coordinates, GeoJsonLineString } from "@urbanflow/app-front-back-lib";
import { fetchWithTimeout } from "../../shared/http/fetch-with-timeout";

export type OrsProfile = "foot-walking" | "cycling-regular" | "wheelchair" | "driving-car";

export interface OrsRoute {
    geometry: GeoJsonLineString;
    distanceMeters: number;
    durationSeconds: number;
}

const ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions";

interface OrsGeoJsonResponse {
    features: Array<{
        geometry: GeoJsonLineString;
        properties: { summary: { distance: number; duration: number } };
    }>;
}

@Injectable()
export class OrsRoutingAdapter {
    constructor(private readonly configService: ConfigService) {}

    async getRoute(
        profile: OrsProfile,
        origin: Coordinates,
        destination: Coordinates,
    ): Promise<OrsRoute> {
        const apiKey = this.configService.get<string>("ORS_API_KEY");
        if (!apiKey) {
            throw new ServiceUnavailableException("ORS_API_KEY_MISSING");
        }

        const response = await fetchWithTimeout(
            `${ORS_DIRECTIONS_URL}/${profile}/geojson`,
            {
                method: "POST",
                headers: {
                    Authorization: apiKey,
                    "Content-Type": "application/json; charset=utf-8",
                },
                body: JSON.stringify({
                    coordinates: [
                        [origin.longitude, origin.latitude],
                        [destination.longitude, destination.latitude],
                    ],
                }),
            },
            "ORS_REQUEST_FAILED",
        );

        if (!response.ok) {
            throw new ServiceUnavailableException("ORS_REQUEST_FAILED");
        }

        const data = (await response.json()) as OrsGeoJsonResponse;
        const feature = data.features?.[0];
        if (!feature) {
            throw new ServiceUnavailableException("ORS_NO_ROUTE");
        }

        return {
            geometry: feature.geometry,
            distanceMeters: feature.properties.summary.distance,
            durationSeconds: feature.properties.summary.duration,
        };
    }
}