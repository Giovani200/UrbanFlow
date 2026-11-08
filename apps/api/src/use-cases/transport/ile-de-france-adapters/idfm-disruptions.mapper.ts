import { z as zod } from "zod";
import { navitiaLocalToParisIso } from "../../../shared/time/paris-time";
import type { LineNotice } from "../transit.providers";
import { NAVITIA_LINE_ID_PREFIX, NavitiaJourneysResponseSchema } from "./idfm-journeys.mapper";

const TITLE_CHANNEL_NAME = "titre";
const PLAIN_TEXT_CONTENT_TYPE = "text/plain";
const NAVITIA_DATE_TIME_PATTERN = /^\d{8}T\d{6}$/;

/** Schéma minimal et tolérant : une réponse compte plus de 100 perturbations, un champ imprévu ne doit pas la rejeter. */
export const NavitiaDisruptionSchema = zod.object({
    application_periods: zod.array(zod.object({ begin: zod.string().optional(), end: zod.string().optional() })).optional(),
    messages: zod
        .array(
            zod.object({
                text: zod.string().optional(),
                channel: zod.object({ name: zod.string().optional(), content_type: zod.string().optional() }).optional(),
            }),
        )
        .optional(),
    impacted_objects: zod
        .array(
            zod.object({
                pt_object: zod
                    .object({
                        id: zod.string().optional(),
                        embedded_type: zod.string().optional(),
                        line: zod.object({ code: zod.string().optional() }).optional(),
                    })
                    .optional(),
            }),
        )
        .optional(),
});
export type NavitiaDisruption = zod.output<typeof NavitiaDisruptionSchema>;

export const NavitiaJourneysWithDisruptionsResponseSchema = NavitiaJourneysResponseSchema.extend({
    disruptions: zod.array(NavitiaDisruptionSchema).optional(),
});

/** Le canal `titre` existe sur toutes les perturbations observées ; le HTML des autres canaux n'est jamais repris. */
function plainTextOf(disruption: NavitiaDisruption): string | null {
    const plainMessages = (disruption.messages ?? []).filter(
        (message) => message.channel?.content_type === PLAIN_TEXT_CONTENT_TYPE && message.text?.trim(),
    );
    const message = plainMessages.find((candidate) => candidate.channel?.name === TITLE_CHANNEL_NAME) ?? plainMessages[0];
    return message?.text?.trim() ?? null;
}

function periodsOf(disruption: NavitiaDisruption): LineNotice["periods"] {
    return (disruption.application_periods ?? []).flatMap(({ begin, end }) =>
        begin && end && NAVITIA_DATE_TIME_PATTERN.test(begin) && NAVITIA_DATE_TIME_PATTERN.test(end)
            ? [{ begin: navitiaLocalToParisIso(begin), end: navitiaLocalToParisIso(end) }]
            : [],
    );
}

/** Un message par ligne touchée. Les autres objets (gares, ascenseurs) et les perturbations sans texte brut sont ignorés. */
export function mapLineNotices(disruptions: NavitiaDisruption[]): LineNotice[] {
    return disruptions.flatMap((disruption) => {
        const text = plainTextOf(disruption);
        if (!text) {
            return [];
        }
        const periods = periodsOf(disruption);

        return (disruption.impacted_objects ?? []).flatMap(({ pt_object: impactedObject }) => {
            const lineShortName = impactedObject?.line?.code;
            const isLine = impactedObject?.embedded_type === "line" && impactedObject.id?.startsWith(NAVITIA_LINE_ID_PREFIX);
            return isLine && lineShortName && impactedObject.id
                ? [{ lineId: impactedObject.id.slice(NAVITIA_LINE_ID_PREFIX.length), lineShortName, text, periods }]
                : [];
        });
    });
}
