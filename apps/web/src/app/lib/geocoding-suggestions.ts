import { haversineMeters } from "./geo";

export interface MapTilerFeature {
  place_type: string[];
  text: string;
  place_name: string;
  center: [number, number];
  address?: string;
  properties?: { categories?: string[] };
  context?: Array<{ id: string; text: string }>;
}

export interface PlaceSuggestion {
  /** Titre de la suggestion : « Gare de Lyon », « 10 Rue de la Fontaine au Roi ». */
  name: string;
  /** Ligne secondaire : type de lieu et quartier, « Gare · Paris 12e ». */
  detail: string;
  /** Libellé gardé une fois le lieu choisi (champ, trajets, favoris). */
  label: string;
  latitude: number;
  longitude: number;
}

/** Catégories MapTiler relevées le 27/10/2026 sur des recherches réelles ; une catégorie absente n'affiche que le quartier. */
const KIND_BY_CATEGORY: Record<string, string> = {
  "railway station": "Gare",
  subway: "Métro",
  "tram stop": "Tram",
  "bus stop": "Arrêt de bus",
  "bus station": "Gare routière",
  "bicycle rental": "Vélos en libre-service",
  museum: "Musée",
  attraction: "Lieu touristique",
  monument: "Monument",
  stadium: "Stade",
  university: "Université",
  hospital: "Hôpital",
  restaurant: "Restaurant",
};

const SAME_PLACE_RADIUS_METERS = 500;

function contextText(feature: MapTilerFeature, kind: string): string | undefined {
  return feature.context?.find((entry) => entry.id.startsWith(`${kind}.`))?.text;
}

function areaOf(feature: MapTilerFeature): string {
  const district = contextText(feature, "municipal_district")?.replace(/ Arrondissement$/, "");
  return district ?? contextText(feature, "municipality") ?? "";
}

function kindOf(feature: MapTilerFeature): string | undefined {
  if (!feature.place_type.includes("poi")) return "Adresse";
  return feature.properties?.categories?.map((category) => KIND_BY_CATEGORY[category]).find(Boolean);
}

function toSuggestion(feature: MapTilerFeature): PlaceSuggestion {
  const isPlace = feature.place_type.includes("poi");
  const name = !isPlace && feature.address ? `${feature.address} ${feature.text}` : feature.text;
  const area = areaOf(feature);
  const municipality = contextText(feature, "municipality");
  return {
    name,
    detail: [kindOf(feature), area].filter(Boolean).join(" · "),
    label: isPlace || !municipality ? name : `${name}, ${municipality}`,
    latitude: feature.center[1],
    longitude: feature.center[0],
  };
}

/**
 * Transforme les résultats MapTiler en suggestions lisibles.
 * Un même lieu revient souvent une fois par entrée (la gare de Lyon a trois points d'accès) : on ne garde que le premier
 * résultat de même nom et de même type dans un rayon de 500 m.
 */
export function toSuggestions(features: MapTilerFeature[]): PlaceSuggestion[] {
  const kept: PlaceSuggestion[] = [];
  for (const feature of features) {
    const suggestion = toSuggestion(feature);
    const isDuplicate = kept.some(
      (existing) =>
        existing.name === suggestion.name &&
        existing.detail === suggestion.detail &&
        haversineMeters(existing, suggestion) < SAME_PLACE_RADIUS_METERS,
    );
    if (!isDuplicate) kept.push(suggestion);
  }
  return kept;
}
