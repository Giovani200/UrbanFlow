import { describe, expect, it } from "vitest";
import { generateShareToken, hashShareToken } from "./share-token";

describe("generateShareToken", () => {
    it("donne 256 bits en base64url, soit 43 caractères sans remplissage", () => {
        expect(generateShareToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it("ne donne jamais deux fois le même jeton", () => {
        const tokens = new Set(Array.from({ length: 1000 }, generateShareToken));

        expect(tokens.size).toBe(1000);
    });
});

describe("hashShareToken", () => {
    it("donne une empreinte SHA-256 stable, en hexadécimal", () => {
        const token = generateShareToken();

        expect(hashShareToken(token)).toMatch(/^[0-9a-f]{64}$/);
        expect(hashShareToken(token)).toBe(hashShareToken(token));
    });

    it("change complètement pour un seul caractère modifié", () => {
        const token = "a".repeat(43);
        const altered = `b${"a".repeat(42)}`;

        expect(hashShareToken(altered)).not.toBe(hashShareToken(token));
    });

    it("ne contient pas le jeton", () => {
        const token = generateShareToken();

        expect(hashShareToken(token)).not.toContain(token);
    });
});