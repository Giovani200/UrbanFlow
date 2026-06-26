// Facteurs d'émission ADEME 2023 (gCO2e/km/passager)
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

// Zone géographique Grenoble Métropole
export const GEO_CONFIG = {
    center: { lat: 45.1885, lng: 5.7245 },
    bbox: {
        north: 45.3,
        south: 45.05,
        east: 5.95,
        west: 5.5,
    },
    defaultZoom: 13,
} as const;

// APIs transport Grenoble
export const TRANSPORT_API = {
    gbfsBaseUrl: "https://transport.data.gouv.fr/gbfs/grenoble/gbfs.json",
    gtfsBaseUrl: "https://data.mobilites-m.fr/api",
    revalidateSeconds: 60,
} as const;