import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Coordinates, TransitLine, TransitStop, TransitStopMode } from "@urbanflow/app-front-back-lib";
import { haversineMeters } from "../../shared/geo/haversine";
import { fetchWithTimeout } from "../../shared/http/fetch-with-timeout";

const LINES_NEAR_URL = "https://data.mobilites-m.fr/api/linesNear/json";
const ROUTES_INDEX_URL = "https://data.mobilites-m.fr/api/routers/default/index/routes";

const TRAM_LINE_CODES = new Set(["A", "B", "C", "D", "E"]);

interface LinesNearStop {
    id: string;
    name: string;
    lon: number;
    lat: number;
    lines?: string[];
}

interface RouteIndexEntry {
    id: string;
    color?: string;
    textColor?: string;
}

interface LineStyle {
    color?: string;
    textColor?: string;
}

@Injectable()
export class MetromobiliteStopsAdapter {
    // Couleurs officielles des lignes (route_color GTFS). Index statique → chargé une fois, mis en cache.
    private routeStyles?: Promise<Map<string, LineStyle>>;

    async getNearbyStops(origin: Coordinates, radiusMeters: number): Promise<TransitStop[]> {
        const [rawStops, styles] = await Promise.all([
            this.fetchStops(origin, radiusMeters),
            this.loadRouteStyles(),
        ]);

        return rawStops
            .map((rawStop) => this.toTransitStop(rawStop, origin, styles))
            .filter((stop): stop is TransitStop => stop.lines.length > 0);
    }

    private async fetchStops(origin: Coordinates, radiusMeters: number): Promise<LinesNearStop[]> {
        const parameters = new URLSearchParams({
            x: String(origin.longitude),
            y: String(origin.latitude),
            dist: String(radiusMeters),
            details: "true",
        });

        const response = await fetchWithTimeout(
            `${LINES_NEAR_URL}?${parameters.toString()}`,
            { headers: { Accept: "application/json" } },
            "METROMOBILITE_REQUEST_FAILED",
        );
        if (!response.ok) {
            throw new ServiceUnavailableException("METROMOBILITE_REQUEST_FAILED");
        }

        return (await response.json()) as LinesNearStop[];
    }

    private loadRouteStyles(): Promise<Map<string, LineStyle>> {
        if (!this.routeStyles) {
            this.routeStyles = this.fetchRouteStyles().catch(() => {
                this.routeStyles = undefined; // échec non mis en cache : nouvel essai au prochain appel
                return new Map<string, LineStyle>();
            });
        }
        return this.routeStyles;
    }

    private async fetchRouteStyles(): Promise<Map<string, LineStyle>> {
        const response = await fetchWithTimeout(
            ROUTES_INDEX_URL,
            { headers: { Accept: "application/json" } },
            "METROMOBILITE_REQUEST_FAILED",
        );
        if (!response.ok) {
            throw new ServiceUnavailableException("METROMOBILITE_REQUEST_FAILED");
        }

        const routes = (await response.json()) as RouteIndexEntry[];
        const styles = new Map<string, LineStyle>();
        for (const route of routes) {
            styles.set(route.id, {
                color: route.color ? `#${route.color}` : undefined,
                textColor: route.textColor ? `#${route.textColor}` : undefined,
            });
        }
        return styles;
    }

    private toTransitStop(
        rawStop: LinesNearStop,
        origin: Coordinates,
        styles: Map<string, LineStyle>,
    ): TransitStop {
        const lines: TransitLine[] = (rawStop.lines ?? [])
            .filter((rawLine) => rawLine.startsWith("SEM:"))
            .map((rawLine) => {
                const code = rawLine.slice("SEM:".length);
                const mode: TransitStopMode = TRAM_LINE_CODES.has(code) ? "tram" : "bus";
                const style = styles.get(rawLine);
                return { code, mode, color: style?.color, textColor: style?.textColor };
            });

        const location: Coordinates = { latitude: rawStop.lat, longitude: rawStop.lon };

        return {
            id: rawStop.id,
            name: rawStop.name,
            location,
            distanceMeters: Math.round(haversineMeters(origin, location)),
            lines,
        };
    }
}