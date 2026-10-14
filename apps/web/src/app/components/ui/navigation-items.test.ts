import { describe, expect, it } from "vitest";
import { isActiveRoute } from "./navigation-items";

describe("isActiveRoute", () => {
    it("n'active l'accueil que sur la racine", () => {
        expect(isActiveRoute("/", "/")).toBe(true);
        expect(isActiveRoute("/trips", "/")).toBe(false);
    });

    it("garde un onglet actif sur ses sous-pages", () => {
        expect(isActiveRoute("/trips", "/trips")).toBe(true);
        expect(isActiveRoute("/trips/42", "/trips")).toBe(true);
    });

    it("ne confond pas deux routes qui commencent pareil", () => {
        expect(isActiveRoute("/profile-settings", "/profile")).toBe(false);
    });
});
