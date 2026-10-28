import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { z as zod } from "zod";
import { fetchWithTimeout } from "../../../shared/http/fetch-with-timeout";
import type { QuotaGuard } from "../../../shared/quota/quota-guard";

export const PRIM_BASE_URL = "https://prim.iledefrance-mobilites.fr/marketplace";

function endpointName(path: string): string {
    return path.split("?")[0];
}

@Injectable()
export class PrimHttpClient {
    private readonly logger = new Logger(PrimHttpClient.name);

    constructor(private readonly configService: ConfigService) {}

    /**
     * GET sur PRIM : réserve un appel sur le quota, envoie la clé en en-tête, valide la réponse avec le schéma.
     * Toute panne devient une ServiceUnavailableException(errorCode). Ni la clé ni les paramètres ne sont journalisés.
     */
    async getJson<T>(
        path: string,
        schema: zod.ZodType<T>,
        quota: QuotaGuard,
        errorCode: string,
        acceptedStatuses: number[] = [],
    ): Promise<T> {
        const apiKey = this.configService.get<string>("PRIM_API_KEY");
        if (!apiKey) {
            this.logger.error("PRIM_API_KEY manquante");
            throw new ServiceUnavailableException("PRIM_API_KEY_MISSING");
        }

        try {
            await quota.acquire();
        } catch (cause) {
            throw new ServiceUnavailableException(errorCode, { cause });
        }

        const response = await fetchWithTimeout(
            `${PRIM_BASE_URL}/${path}`,
            { headers: { apikey: apiKey, Accept: "application/json", "Accept-Encoding": "gzip, deflate" } },
            errorCode,
        );

        if (response.status === 401 || response.status === 403) {
            this.logger.error(`PRIM refuse la clé (${response.status}) sur ${endpointName(path)}`);
            throw new ServiceUnavailableException(errorCode);
        }
        if (!response.ok && !acceptedStatuses.includes(response.status)) {
            this.logger.warn(`PRIM répond ${response.status} sur ${endpointName(path)}`);
            throw new ServiceUnavailableException(errorCode);
        }

        const parsed = schema.safeParse(await response.json());
        if (!parsed.success) {
            this.logger.warn(`réponse PRIM inattendue sur ${endpointName(path)} : ${parsed.error.issues.length} écart(s)`);
            throw new ServiceUnavailableException(errorCode);
        }
        return parsed.data;
    }
}
