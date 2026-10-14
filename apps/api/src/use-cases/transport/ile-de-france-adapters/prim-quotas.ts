import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QuotaGuard } from "../../../shared/quota/quota-guard";

const DEFAULT_DAILY_LIMIT = 1000;
const REQUESTS_PER_SECOND = 5;

/** Un quota par API PRIM : le calculateur (Navitia) et les prochains passages (SIRI) sont comptés séparément. */
@Injectable()
export class PrimQuotas {
    readonly navitia: QuotaGuard;
    readonly stopMonitoring: QuotaGuard;

    constructor(configService: ConfigService) {
        this.navitia = new QuotaGuard({
            name: "prim-navitia",
            dailyLimit: Number(configService.get("PRIM_NAVITIA_DAILY_LIMIT") ?? DEFAULT_DAILY_LIMIT),
            perSecond: REQUESTS_PER_SECOND,
        });
        this.stopMonitoring = new QuotaGuard({
            name: "prim-stop-monitoring",
            dailyLimit: Number(configService.get("PRIM_STOP_MONITORING_DAILY_LIMIT") ?? DEFAULT_DAILY_LIMIT),
            perSecond: REQUESTS_PER_SECOND,
        });
    }
}
