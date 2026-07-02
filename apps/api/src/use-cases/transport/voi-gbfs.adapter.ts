import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Coordinates, SharedVehicle, SharedVehicleType } from "@urbanflow/app-front-back-lib";
import { haversineMeters } from "../../shared/geo/haversine";

const VOI_GBFS_DISCOVERY_URL = "https://api.voiapp.io/gbfs/fr/6bb6b5dc-1cda-4da7-9216-d3023a0bc54a/v2/358/gbfs.json";
const FREE_BIKE_STATUS_FEED = "free_bike_status";

interface GbfsFeed {
    name: string;
    url: string;
}

interface VoiVehicle {
    bike_id: string;
    lat: number;
    lon: number;
    is_reserved: boolean;
    is_disabled: boolean;
    vehicle_type_id?: string;
}

@Injectable()
export class VoiGbfsAdapter {
    async getNearbyVehicles(origin: Coordinates, radiusMeters: number): Promise<SharedVehicle[]> {
        const feedUrl = await this.resolveFreeBikeStatusUrl();
        const response = await fetch(feedUrl, { headers: { Accept: "application/json" } });
        if (!response.ok) {
            throw new ServiceUnavailableException("VOI_REQUEST_FAILED");
        }

        const payload = (await response.json()) as { data?: { bikes?: VoiVehicle[] } };
        const vehicles = payload.data?.bikes ?? [];

        return vehicles
            .filter((vehicle) => !vehicle.is_disabled && !vehicle.is_reserved)
            .map((vehicle) => this.toSharedVehicle(vehicle, origin))
            .filter((vehicle) => vehicle.distanceMeters <= radiusMeters)
            .sort((left, right) => left.distanceMeters - right.distanceMeters);
    }

    private toSharedVehicle(vehicle: VoiVehicle, origin: Coordinates): SharedVehicle {
        const location: Coordinates = { latitude: vehicle.lat, longitude: vehicle.lon };
        const type: SharedVehicleType = vehicle.vehicle_type_id?.includes("bike") ? "bike" : "scooter";
        return {
            id: vehicle.bike_id,
            type,
            location,
            distanceMeters: Math.round(haversineMeters(origin, location)),
        };
    }

    private async resolveFreeBikeStatusUrl(): Promise<string> {
        const response = await fetch(VOI_GBFS_DISCOVERY_URL, { headers: { Accept: "application/json" } });
        if (!response.ok) {
            throw new ServiceUnavailableException("VOI_REQUEST_FAILED");
        }

        const discovery = (await response.json()) as { data: Record<string, unknown> };
        const feed = extractFeeds(discovery.data).find((candidate) => candidate.name === FREE_BIKE_STATUS_FEED);
        if (!feed) {
            throw new ServiceUnavailableException("VOI_FEED_MISSING");
        }
        return feed.url;
    }
}

function extractFeeds(data: Record<string, unknown>): GbfsFeed[] {
    if (Array.isArray(data.feeds)) {
        return data.feeds as GbfsFeed[];
    }
    const firstLanguage = Object.values(data)[0] as { feeds?: GbfsFeed[] } | undefined;
    return firstLanguage?.feeds ?? [];
}
