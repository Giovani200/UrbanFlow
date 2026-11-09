import { TransitStopModeSchema, type TransitLine, type TransitStop } from "@urbanflow/app-front-back-lib";
import { z as zod } from "zod";
import type { StopQuay } from "../transit.providers";
import { NAVITIA_LINE_ID_PREFIX } from "./idfm-journeys.mapper";
import { toHexColor, toTripMode } from "./idfm-modes";
import { toSiriMonitoringRef } from "./stop-point-ref";

const RAIL_MONITORING_REF_PREFIX = "STIF:StopArea:SP:";

export const NavitiaPlacesNearbyResponseSchema = zod.object({
    places_nearby: zod
        .array(
            zod.object({
                distance: zod.coerce.number(),
                stop_area: zod.object({
                    id: zod.string(),
                    name: zod.string(),
                    coord: zod.object({ lat: zod.coerce.number(), lon: zod.coerce.number() }),
                }),
            }),
        )
        .optional(),
});
export type NavitiaPlaceNearby = NonNullable<zod.output<typeof NavitiaPlacesNearbyResponseSchema>["places_nearby"]>[number];

export const NavitiaLinesResponseSchema = zod.object({
    lines: zod.array(
        zod.object({
            id: zod.string().optional(),
            code: zod.string(),
            color: zod.string().optional(),
            text_color: zod.string().optional(),
            commercial_mode: zod.object({ name: zod.string() }),
        }),
    ),
});
export type NavitiaLine = zod.output<typeof NavitiaLinesResponseSchema>["lines"][number];

function toTransitLine(line: NavitiaLine): TransitLine | null {
    const mode = TransitStopModeSchema.safeParse(toTripMode(line.commercial_mode.name));
    if (!mode.success) {
        return null;
    }
    return {
        lineId: line.id?.startsWith(NAVITIA_LINE_ID_PREFIX) ? line.id.slice(NAVITIA_LINE_ID_PREFIX.length) : undefined,
        code: line.code,
        mode: mode.data,
        color: toHexColor(line.color),
        textColor: toHexColor(line.text_color),
    };
}

export function mapStopLines(lines: NavitiaLine[]): TransitLine[] {
    return lines.map(toTransitLine).filter((line): line is TransitLine => line !== null);
}

export const NavitiaRoutesResponseSchema = zod.object({
    routes: zod.array(zod.object({ id: zod.string() })).optional(),
});

export const NavitiaStopPointsResponseSchema = zod.object({
    stop_points: zod.array(
        zod.object({
            id: zod.string(),
            coord: zod.object({ lat: zod.coerce.number(), lon: zod.coerce.number() }),
        }),
    ),
});
export type NavitiaStopPointsResponse = zod.output<typeof NavitiaStopPointsResponseSchema>;

/** Les quais lisibles par SIRI. Un identifiant de point d'arrêt d'un autre format est écarté. */
export function mapStopQuays(response: NavitiaStopPointsResponse): StopQuay[] {
    return response.stop_points.flatMap((stopPoint) => {
        const monitoringRef = toSiriMonitoringRef(stopPoint.id);
        return monitoringRef
            ? [
                  {
                      monitoringRef,
                      isRail: monitoringRef.startsWith(RAIL_MONITORING_REF_PREFIX),
                      location: { latitude: stopPoint.coord.lat, longitude: stopPoint.coord.lon },
                  },
              ]
            : [];
    });
}

/** Traduit un arrêt proche et ses lignes. `null` si aucune de ses lignes n'est prise en charge. */
export function mapNearbyStop(place: NavitiaPlaceNearby, lines: NavitiaLine[]): TransitStop | null {
    const transitLines = mapStopLines(lines);
    if (transitLines.length === 0) {
        return null;
    }
    return {
        id: place.stop_area.id,
        name: place.stop_area.name,
        location: { latitude: place.stop_area.coord.lat, longitude: place.stop_area.coord.lon },
        distanceMeters: place.distance,
        lines: transitLines,
    };
}
