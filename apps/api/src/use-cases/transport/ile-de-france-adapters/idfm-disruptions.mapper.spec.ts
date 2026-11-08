import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z as zod } from "zod";
import { mapLineNotices, NavitiaDisruptionSchema, type NavitiaDisruption } from "./idfm-disruptions.mapper";

const fixture = zod
    .object({ disruptions: zod.array(NavitiaDisruptionSchema) })
    .parse(JSON.parse(readFileSync(join(__dirname, "__fixtures__", "journey-disruptions.json"), "utf-8")));

const lineObject = { pt_object: { id: "line:IDFM:C00881", embedded_type: "line", line: { id: "line:IDFM:C00881", code: "3601" } } };

function disruptionWithMessages(messages: NavitiaDisruption["messages"]): NavitiaDisruption {
    return {
        application_periods: [{ begin: "20261109T040000", end: "20261110T040000" }],
        messages,
        impacted_objects: [lineObject],
    };
}

const plainChannel = (name: string) => ({ name, content_type: "text/plain" });
const htmlChannel = (name: string) => ({ name, content_type: "text/html" });

describe("mapLineNotices", () => {
    it("traduit une vraie perturbation : ligne, titre en texte brut et périodes à l'heure de Paris", () => {
        const notices = mapLineNotices(fixture.disruptions);

        expect(notices).toContainEqual({
            lineId: "C00881",
            lineShortName: "3601",
            text: "Melun - Travaux rue Saint Liesne",
            periods: [{ begin: "2026-10-29T10:52:00+01:00", end: "2026-11-30T23:55:00+01:00" }],
        });
    });

    it("ne renvoie jamais de HTML", () => {
        const notices = mapLineNotices(fixture.disruptions);

        expect(notices.length).toBeGreaterThan(0);
        for (const notice of notices) {
            expect(notice.text).not.toMatch(/<|&#/);
        }
    });

    it("donne un message par ligne touchée", () => {
        const notices = mapLineNotices(fixture.disruptions).filter(
            (notice) => notice.text === "Ligne 3604 et 3601 : changement d'horaires",
        );

        expect(notices.map((notice) => notice.lineShortName).sort()).toEqual(["3601", "3604"]);
    });

    it("prend le canal titre plutôt qu'un autre texte brut", () => {
        const [notice] = mapLineNotices([
            disruptionWithMessages([
                { text: "Trafic perturbé", channel: plainChannel("cbiv") },
                { text: "Ligne R : travaux", channel: plainChannel("titre") },
            ]),
        ]);

        expect(notice.text).toBe("Ligne R : travaux");
    });

    it("se rabat sur un autre texte brut sans canal titre", () => {
        const [notice] = mapLineNotices([
            disruptionWithMessages([
                { text: "<p>Travaux</p>", channel: htmlChannel("moteur") },
                { text: "Travaux", channel: plainChannel("notification") },
            ]),
        ]);

        expect(notice.text).toBe("Travaux");
    });

    it("ignore une perturbation sans texte brut", () => {
        const notices = mapLineNotices([disruptionWithMessages([{ text: "<p>Travaux</p>", channel: htmlChannel("moteur") }])]);

        expect(notices).toEqual([]);
    });

    it("ignore les objets qui ne sont pas des lignes, comme les ascenseurs d'une gare", () => {
        const notices = mapLineNotices([
            {
                application_periods: [{ begin: "20261109T040000", end: "20261110T040000" }],
                messages: [{ text: "Ascenseur en panne", channel: plainChannel("titre") }],
                impacted_objects: [{ pt_object: { id: "stop_area:IDFM:61926", embedded_type: "stop_area" } }],
            },
        ]);

        expect(notices).toEqual([]);
    });

    it("ignore une période au format inattendu sans faire échouer les autres", () => {
        const [notice] = mapLineNotices([
            {
                application_periods: [
                    { begin: "demain", end: "20261110T040000" },
                    { begin: "20261109T040000", end: "20261110T040000" },
                ],
                messages: [{ text: "Travaux", channel: plainChannel("titre") }],
                impacted_objects: [lineObject],
            },
        ]);

        expect(notice.periods).toEqual([{ begin: "2026-11-09T04:00:00+01:00", end: "2026-11-10T04:00:00+01:00" }]);
    });

    it("renvoie une liste vide sans perturbation", () => {
        expect(mapLineNotices([])).toEqual([]);
    });
});
