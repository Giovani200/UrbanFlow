export const CARBON_FACTORS = {
    walk: 0,
    bike: 0,
    scooter: 25,
    tram: 4.44,
    bus: 122,
    carpool: 71,
    car: 142,
} as const;

export type TransportMode = keyof typeof CARBON_FACTORS;

// Zone géographique, Grenoble-Alpes Métropole
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

// APIs transport, Grenoble-Alpes Métropole
// GBFS Métrovélo + API Métromobilité (GTFS TAG). Endpoint OTP /routers/default/plan à ajouter lors du slice routing (D1).
export const TRANSPORT_API = {
    gbfsBaseUrl: "https://transport.data.gouv.fr/gbfs/grenoble/gbfs.json",
    gtfsBaseUrl: "https://data.mobilites-m.fr/api",
    revalidateSeconds: 60,
} as const;
