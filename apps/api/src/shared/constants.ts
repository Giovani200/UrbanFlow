// Facteurs d'émission ADEME (gCO2e/km/passager)
// ⚠️ Valeurs reprises du code existant — à recouper avec ADEME Base Carbone v23.6 (cf CLAUDE.md §8) lors de la réécriture carbone.
export const CARBON_FACTORS = {
    bike: 0,
    scooter: 0,
    walk: 0,
    tram: 4.1,
    bus: 113,
    carpool: 75,
    car: 218,
} as const;

export type TransportMode = keyof typeof CARBON_FACTORS;

// Zone géographique — Île-de-France
export const GEO_CONFIG = {
    center: { lat: 48.8566, lng: 2.3522 },
    bbox: {
        north: 49.25,
        south: 48.12,
        east: 3.56,
        west: 1.45,
    },
    defaultZoom: 12,
} as const;

// APIs transport
// ⚠️ URLs encore Grenoble (Métrovélo / TAG) — à remplacer par les sources Île-de-France (Vélib' / IDFM) lors de la réécriture transport.
export const TRANSPORT_API = {
    gbfsBaseUrl: "https://transport.data.gouv.fr/gbfs/grenoble/gbfs.json",
    gtfsBaseUrl: "https://data.mobilites-m.fr/api",
    revalidateSeconds: 60,
} as const;
