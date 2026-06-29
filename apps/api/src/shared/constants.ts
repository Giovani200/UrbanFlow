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

// Zone géographique — Grenoble-Alpes Métropole
export const GEO_CONFIG = {
    center: { latitude: 45.1885, longitude: 5.7245 },
    bbox: {
        north: 45.32,
        south: 45.05,
        east: 5.96,
        west: 5.58,
    },
    defaultZoom: 13,
} as const;

// APIs transport — Grenoble-Alpes Métropole
// GBFS Métrovélo + API Métromobilité (GTFS TAG). Endpoint OTP /routers/default/plan à ajouter lors du slice routing (D1).
export const TRANSPORT_API = {
    gbfsBaseUrl: "https://transport.data.gouv.fr/gbfs/grenoble/gbfs.json",
    gtfsBaseUrl: "https://data.mobilites-m.fr/api",
    revalidateSeconds: 60,
} as const;
