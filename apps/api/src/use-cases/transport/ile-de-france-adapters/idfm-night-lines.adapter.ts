import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { z as zod } from "zod";
import { CACHE_STORE, type CacheStore } from "../../../shared/cache/cache-store";
import { fetchWithTimeout } from "../../../shared/http/fetch-with-timeout";
import type { NightLinesProvider } from "../transit.providers";

const LINE_REFERENTIAL_URL =
    "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/referentiel-des-lignes/records";
const PAGE_SIZE = 100;
const NIGHT_LINES_CACHE_KEY = "night-lines";
const NIGHT_LINES_CACHE_TTL_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
const ERROR_CODE = "IDFM_NIGHT_LINES_FAILED";

const LineReferentialResponseSchema = zod.object({
    total_count: zod.number(),
    results: zod.array(zod.object({ id_line: zod.string().regex(/^C\d+$/) })),
});

/** Lignes de bus de nuit (Noctilien) d'après le sous-mode `nightBus` du référentiel public IDFM, sans clé. */
@Injectable()
export class IdfmNightLinesAdapter implements NightLinesProvider {
    private readonly logger = new Logger(IdfmNightLinesAdapter.name);

    constructor(@Inject(CACHE_STORE) private readonly cacheStore: CacheStore) {}

    getNightLineIds(): Promise<string[]> {
        return this.cacheStore.getOrLoad(NIGHT_LINES_CACHE_KEY, NIGHT_LINES_CACHE_TTL_MILLISECONDS, () =>
            this.fetchNightLineIds(),
        );
    }

    private async fetchNightLineIds(): Promise<string[]> {
        const parameters = new URLSearchParams({
            select: "id_line",
            where: 'transportsubmode="nightBus" and status="active"',
            limit: String(PAGE_SIZE),
        });
        const response = await fetchWithTimeout(`${LINE_REFERENTIAL_URL}?${parameters.toString()}`, {}, ERROR_CODE);
        if (!response.ok) {
            this.logger.warn(`référentiel des lignes : statut ${response.status}`);
            throw new ServiceUnavailableException(ERROR_CODE);
        }

        const parsed = LineReferentialResponseSchema.safeParse(await response.json());
        if (!parsed.success) {
            this.logger.warn(`référentiel des lignes : réponse inattendue, ${parsed.error.issues.length} écart(s)`);
            throw new ServiceUnavailableException(ERROR_CODE);
        }
        if (parsed.data.total_count > parsed.data.results.length) {
            this.logger.warn(
                `référentiel des lignes : ${parsed.data.total_count} lignes de nuit, seules ${parsed.data.results.length} lues`,
            );
        }
        return parsed.data.results.map((line) => line.id_line);
    }
}
