import { describe, expect, it } from "vitest";
import { toSuggestions, type MapTilerFeature } from "./geocoding-suggestions";

const PARIS_12 = [
  { id: "postal_code.1", text: "75012" },
  { id: "municipal_district.1", text: "Paris 12e Arrondissement" },
  { id: "municipality.1", text: "Paris" },
];

function station(center: [number, number], street: string): MapTilerFeature {
  return {
    place_type: ["poi"],
    text: "Gare de Lyon",
    place_name: `Gare de Lyon, ${street}, 75012 Paris, France`,
    center,
    properties: { categories: ["railway station", "train station", "station"] },
    context: PARIS_12,
  };
}

describe("toSuggestions", () => {
  it("nomme un lieu par son nom, avec son type et son quartier en détail", () => {
    const [suggestion] = toSuggestions([station([2.3737, 48.8446], "6 Place Louis Armand")]);
    expect(suggestion).toEqual({ name: "Gare de Lyon", detail: "Gare · Paris 12e", label: "Gare de Lyon", latitude: 48.8446, longitude: 2.3737 });
  });

  it("ne garde qu'une fois le même lieu proposé par plusieurs entrées proches", () => {
    const suggestions = toSuggestions([
      station([2.3737, 48.8446], "6 Place Louis Armand"),
      station([2.3745, 48.8449], "3 Place Louis Armand"),
      station([2.3772, 48.8432], "86 Allée de Bercy"),
    ]);
    expect(suggestions).toHaveLength(1);
  });

  it("garde deux lieux de même nom s'ils sont loin l'un de l'autre", () => {
    const suggestions = toSuggestions([station([2.3737, 48.8446], "Paris"), station([2.95, 48.54], "Melun")]);
    expect(suggestions).toHaveLength(2);
  });

  it("garde le même nom quand le type diffère (la gare et la station de vélos)", () => {
    const bikes: MapTilerFeature = { ...station([2.3745, 48.8449], "Rue de Chalon"), properties: { categories: ["bicycle rental"] } };
    const suggestions = toSuggestions([station([2.3737, 48.8446], "Place Louis Armand"), bikes]);
    expect(suggestions.map((suggestion) => suggestion.detail)).toEqual(["Gare · Paris 12e", "Vélos en libre-service · Paris 12e"]);
  });

  it("nomme une adresse par son numéro et sa rue ; le libellé gardé ajoute la commune pour la distinguer", () => {
    const [suggestion] = toSuggestions([
      {
        place_type: ["address"],
        text: "Rue de la Fontaine au Roi",
        address: "10",
        place_name: "10 Rue de la Fontaine au Roi, 77350 Boissise-la-Bertrand, France",
        center: [2.58, 48.52],
        context: [{ id: "municipality.2", text: "Boissise-la-Bertrand" }],
      },
    ]);
    expect(suggestion.name).toBe("10 Rue de la Fontaine au Roi");
    expect(suggestion.label).toBe("10 Rue de la Fontaine au Roi, Boissise-la-Bertrand");
    expect(suggestion.detail).toBe("Adresse · Boissise-la-Bertrand");
  });

  it("n'affiche que le quartier quand le type de lieu n'est pas connu", () => {
    const [suggestion] = toSuggestions([{ ...station([2.37, 48.84], "Paris"), properties: { categories: ["post office"] } }]);
    expect(suggestion.detail).toBe("Paris 12e");
  });
});
