import { describe, expect, it } from "vitest";
import { stopsServingNewDirections } from "./nearby-stops-selection";

function stop(id: string, distanceMeters: number, routeIds: string[]) {
    return { id, distanceMeters, routeIds };
}

const TO_MELUN = "3601-melun";
const TO_CHAMLYS = "3601-chamlys";

describe("stopsServingNewDirections", () => {
    it("garde l'arrêt le plus proche de chaque ligne : le cas de la capture, 2 arrêts au lieu de 5", () => {
        const stops = [
            stop("centre-administratif", 100, [TO_MELUN, TO_CHAMLYS]),
            stop("marche-couvert", 149, ["3604-a", "3604-b", "3607-a", "3607-b"]),
            stop("copernic", 243, [TO_CHAMLYS]),
            stop("foch", 292, ["3604-a"]),
            stop("moisant", 337, [TO_MELUN, TO_CHAMLYS]),
        ];

        expect(stopsServingNewDirections(stops)).toEqual(["centre-administratif", "marche-couvert"]);
    });

    it("garde un arrêt plus loin s'il dessert un sens que le plus proche n'a pas : Copernic ne va que vers Chamlys", () => {
        const stops = [stop("copernic", 50, [TO_CHAMLYS]), stop("moisant", 150, [TO_MELUN, TO_CHAMLYS])];

        expect(stopsServingNewDirections(stops)).toEqual(["copernic", "moisant"]);
    });

    it("trie par distance, quel que soit l'ordre reçu", () => {
        const stops = [stop("loin", 300, [TO_MELUN]), stop("proche", 50, [TO_MELUN])];

        expect(stopsServingNewDirections(stops)).toEqual(["proche"]);
    });

    it("garde un arrêt dont les directions sont inconnues, plutôt que de le cacher à tort", () => {
        const stops = [stop("connu", 50, [TO_MELUN]), stop("inconnu", 100, [])];

        expect(stopsServingNewDirections(stops)).toEqual(["connu", "inconnu"]);
    });

    it("ne renvoie rien sans arrêt", () => {
        expect(stopsServingNewDirections([])).toEqual([]);
    });
});
