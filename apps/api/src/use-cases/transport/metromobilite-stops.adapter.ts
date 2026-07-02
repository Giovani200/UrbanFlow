import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Coordinates, TransitLine, TransitStop, TransitStopMode } from "@urbanflow/app-front-back-lib";

const LINES_NEAR_URL = "https://data.mobilites-m.fr/api/linesNear/json";

const TRAM_LINE_CODES = new Set(["A", "B", "C", "D", "E"]);

interface LinesNearStop {
    id: string;
    name: string;
    lon: number;
    lat: number;
    lines?: string[];
}

@Injectable()
export class MetromobiliteStopsAdapter {
    async getNearbyStops(origin: Coordinates, radiusMeters: number): Promise<TransitStop[]> {
        // details=true : sans ce paramètre l'API ne renvoie que des codes de lignes, pas les arrêts.
        const parameters = new URLSearchParams({
            x: String(origin.longitude),
            y: String(origin.latitude),
            dist: String(radiusMeters),
            details: "true",
        });

        const response = await fetch(`${LINES_NEAR_URL}?${parameters.toString()}`, {
            headers: { Accept: "application/json" },
        });
        if (!response.ok) {
            throw new ServiceUnavailableException("METROMOBILITE_REQUEST_FAILED");
        }

        const rawStops = (await response.json()) as LinesNearStop[];

        return rawStops
            .map((rawStop) => this.toTransitStop(rawStop, origin))
            .filter((stop): stop is TransitStop => stop.lines.length > 0);
    }

    private toTransitStop(rawStop: LinesNearStop, origin: Coordinates): TransitStop {
        const lines: TransitLine[] = (rawStop.lines ?? [])
            .filter((rawLine) => rawLine.startsWith("SEM:"))
            .map((rawLine) => {
                const code = rawLine.slice("SEM:".length);
                const mode: TransitStopMode = TRAM_LINE_CODES.has(code) ? "tram" : "bus";
                return { code, mode };
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

function haversineMeters(from: Coordinates, to: Coordinates): number {
    const earthRadiusMeters = 6_371_000;
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
    const deltaLatitude = toRadians(to.latitude - from.latitude);
    const deltaLongitude = toRadians(to.longitude - from.longitude);
    const fromLatitude = toRadians(from.latitude);
    const toLatitude = toRadians(to.latitude);
    const a =
        Math.sin(deltaLatitude / 2) ** 2 +
        Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;
    return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}
