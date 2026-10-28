import type { TripMode } from "@urbanflow/app-front-back-lib";

// Facteurs d'émission carbone, en gCO₂e par passager·km, fabrication incluse (usage + construction).
// Source unique : ADEME via impactco2.fr. Valeurs du site ou de ses données sources
// (github.com/incubateur-ademe/impactco2, src/data/categories/deplacement.ts), jamais de l'API brute,
// qui ne compte que l'usage. Ne jamais mélanger les méthodologies.
export const CARBON_FACTORS = {
    walk: 0,
    bike: 0,
    scooter: 25, // relevé le 29/06/2026
    tram: 4.28, // relevé le 02/09/2026
    bus: 122, // relevé le 29/06/2026
    metro: 4.44, // relevé le 14/10/2026
    rer: 9.78, // « RER ou Transilien », relevé le 14/10/2026
    train: 9.78, // Transilien, même catégorie ADEME que le RER
    ter: 27.69, // relevé le 14/10/2026
    carpool: 71, // relevé le 29/06/2026
    car: 142, // relevé le 29/06/2026
} as const satisfies Record<TripMode, number>;
