import { TransitStopModeSchema, type TransitLine, type TransitStop } from "@urbanflow/app-front-back-lib";
import { z as zod } from "zod";
import { toHexColor, toTripMode } from "./idfm-modes";

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
        code: line.code,
        mode: mode.data,
        color: toHexColor(line.color),
        textColor: toHexColor(line.text_color),
    };
}

/** Traduit un arrêt proche et ses lignes. `null` si aucune de ses lignes n'est prise en charge. */
export function mapNearbyStop(place: NavitiaPlaceNearby, lines: NavitiaLine[]): TransitStop | null {
    const transitLines = lines.map(toTransitLine).filter((line): line is TransitLine => line !== null);
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
