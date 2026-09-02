// Facteurs d'émission carbone, en gCO₂e par passager·km, fabrication incluse.
// Source unique : impactco2.fr (outil officiel ADEME). Relevé le 29/06/2026.
// Ne jamais mélanger les méthodologies ; revérifier sur impactco2.fr avant toute modification.
export const CARBON_FACTORS = {
    walk: 0,
    bike: 0,
    scooter: 25,
    tram: 4.28, // facteur tram direct (base-empreinte ADEME via impactco2.fr), relevé le 02/09/2026
    bus: 122,
    carpool: 71,
    car: 142,
} as const;
