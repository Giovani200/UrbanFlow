import type { TripMode } from "@urbanflow/app-front-back-lib";

const IDFM_MODE_TO_TRIP_MODE: Record<string, TripMode> = {
    "Métro": "metro",
    "RER": "rer",
    "Train Transilien": "train",
    "TER / Intercités": "ter",
    "TER": "ter",
    "Intercités": "ter",
    "Tramway": "tram",
    "Bus": "bus",
};

/** Mode IDFM (physique ou commercial) vers notre mode. `null` pour un mode non pris en charge (Orlyval, funiculaire, etc.). */
export function toTripMode(idfmModeName: string): TripMode | null {
    return IDFM_MODE_TO_TRIP_MODE[idfmModeName] ?? null;
}

export function toHexColor(navitiaColor: string | undefined): string | undefined {
    return navitiaColor ? `#${navitiaColor}` : undefined;
}
