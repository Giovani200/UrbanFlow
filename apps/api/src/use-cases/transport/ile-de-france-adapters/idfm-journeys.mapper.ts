import type { GeoJsonLineString, TransitStopPoint } from "@urbanflow/app-front-back-lib";
import { z as zod } from "zod";
import { navitiaLocalToParisIso } from "../../../shared/time/paris-time";
import type { TransitItinerary, TransitLeg } from "../transit.providers";
import { toHexColor, toTripMode } from "./idfm-modes";
import { toSiriMonitoringRef } from "./stop-point-ref";

const NavitiaCoordinatesSchema = zod.object({ lat: zod.coerce.number(), lon: zod.coerce.number() });

const NavitiaStopPointSchema = zod.object({
    id: zod.string(),
    name: zod.string(),
    coord: NavitiaCoordinatesSchema.optional(),
});

const NavitiaPlaceSchema = zod.object({
    name: zod.string().optional(),
    stop_point: NavitiaStopPointSchema.optional(),
});

const NavitiaSectionSchema = zod.object({
    type: zod.string(),
    mode: zod.string().optional(),
    duration: zod.number(),
    departure_date_time: zod.string().optional(),
    base_departure_date_time: zod.string().optional(),
    data_freshness: zod.string().optional(),
    from: NavitiaPlaceSchema.optional(),
    to: NavitiaPlaceSchema.optional(),
    geojson: zod
        .object({
            coordinates: zod.array(zod.tuple([zod.number(), zod.number()])),
            properties: zod.array(zod.object({ length: zod.number().optional() })).optional(),
        })
        .optional(),
    display_informations: zod
        .object({
            code: zod.string(),
            color: zod.string().optional(),
            text_color: zod.string().optional(),
            physical_mode: zod.string(),
        })
        .optional(),
    stop_date_times: zod.array(zod.object({ stop_point: NavitiaStopPointSchema })).optional(),
});
type NavitiaSection = zod.output<typeof NavitiaSectionSchema>;

const NavitiaJourneySchema = zod.object({
    duration: zod.number(),
    sections: zod.array(NavitiaSectionSchema),
});
export type NavitiaJourney = zod.output<typeof NavitiaJourneySchema>;

export const NavitiaJourneysResponseSchema = zod.object({
    journeys: zod.array(NavitiaJourneySchema).optional(),
});
export type NavitiaJourneysResponse = zod.output<typeof NavitiaJourneysResponseSchema>;

const WALKING_SECTION_TYPES = new Set(["street_network", "transfer", "crow_fly"]);

function geometryOf(section: NavitiaSection): GeoJsonLineString {
    return { type: "LineString", coordinates: section.geojson?.coordinates ?? [] };
}

function distanceOf(section: NavitiaSection): number {
    return section.geojson?.properties?.[0]?.length ?? 0;
}

function intermediateStopsOf(section: NavitiaSection): TransitStopPoint[] {
    return (section.stop_date_times ?? []).slice(1, -1).flatMap(({ stop_point: stopPoint }) =>
        stopPoint.coord
            ? [{ name: stopPoint.name, latitude: stopPoint.coord.lat, longitude: stopPoint.coord.lon }]
            : [],
    );
}

function monitoringRefOf(stopPointId: string | undefined): string | undefined {
    return stopPointId ? (toSiriMonitoringRef(stopPointId) ?? undefined) : undefined;
}

function toLocalIso(navitiaDateTime: string | undefined): string | undefined {
    return navitiaDateTime ? navitiaLocalToParisIso(navitiaDateTime) : undefined;
}

function toWalkLeg(section: NavitiaSection): TransitLeg {
    return {
        mode: "walk",
        geometry: geometryOf(section),
        distanceMeters: distanceOf(section),
        durationSeconds: section.duration,
    };
}

function toTransitLeg(section: NavitiaSection): TransitLeg | null {
    const display = section.display_informations;
    const mode = display ? toTripMode(display.physical_mode) : null;
    if (!display || !mode) {
        return null;
    }
    return {
        mode,
        geometry: geometryOf(section),
        distanceMeters: distanceOf(section),
        durationSeconds: section.duration,
        departureStopName: section.from?.stop_point?.name,
        arrivalStopName: section.to?.stop_point?.name,
        lineShortName: display.code,
        lineColor: toHexColor(display.color),
        lineTextColor: toHexColor(display.text_color),
        intermediateStops: intermediateStopsOf(section),
        dataFreshness: section.data_freshness === "realtime" ? "realtime" : "scheduled",
        scheduledDepartureTime: toLocalIso(section.base_departure_date_time ?? section.departure_date_time),
        expectedDepartureTime: toLocalIso(section.departure_date_time),
        departureStopPointRef: monitoringRefOf(section.from?.stop_point?.id),
        arrivalStopPointRef: monitoringRefOf(section.to?.stop_point?.id),
    };
}

/** Traduit un itinéraire Navitia. `null` si une section emprunte un mode non pris en charge. */
export function mapJourney(journey: NavitiaJourney): TransitItinerary | null {
    const legs: TransitLeg[] = [];

    for (const section of journey.sections) {
        if (section.type === "waiting") {
            continue;
        }
        if (WALKING_SECTION_TYPES.has(section.type) && section.mode === "walking") {
            legs.push(toWalkLeg(section));
            continue;
        }
        const transitLeg = section.type === "public_transport" ? toTransitLeg(section) : null;
        if (!transitLeg) {
            return null;
        }
        legs.push(transitLeg);
    }

    return { legs, durationSeconds: journey.duration };
}
