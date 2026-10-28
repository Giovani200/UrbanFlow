import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const designTokensPath = resolve(__dirname, "../../../../../design/claude-design/tokens.css");
const appTokensPath = resolve(__dirname, "tokens.css");

describe("tokens.css", () => {
    it("reste identique à la source du design system (design/claude-design)", () => {
        expect(readFileSync(appTokensPath, "utf-8")).toBe(readFileSync(designTokensPath, "utf-8"));
    });
});
