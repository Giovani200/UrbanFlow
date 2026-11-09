import { Inject, Injectable } from "@nestjs/common";
import {
    Coordinates,
    StopDeparturesDtoIn,
    StopDeparturesDtoInSchema,
    StopDeparturesDtoOut,
    StopDeparturesDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { haversineMeters } from "../../../shared/geo/haversine";
import { groupStopDepartures } from "../stop-departures";
import {
    DEPARTURES_PROVIDER,
    NEARBY_STOPS_PROVIDER,
    type DeparturesProvider,
    type NearbyStopsProvider,
    type StopQuay,
} from "../transit.providers";

/** Châtelet compte 26 quais : les lire tous coûterait 26 appels SIRI par minute. */
const MAX_QUAYS = 6;

/**
 * Les quais à lire : les références ferrées d'abord, puis les plus proches. À Gare de Lyon, l'unique référence ferrée,
 * qui couvre tous les trains, est à 175 m, derrière 8 quais de bus : sans cette priorité, la gare n'aurait aucun train.
 */
function quaysToRead(quays: StopQuay[], position: Coordinates): StopQuay[] {
    return [...quays]
        .sort(
            (first, second) =>
                Number(second.isRail) - Number(first.isRail) ||
                haversineMeters(position, first.location) - haversineMeters(position, second.location),
        )
        .slice(0, MAX_QUAYS);
}

/**
 * Les prochains passages d'un arrêt proche, pour l'accueil. Route publique : l'accueil fonctionne sans compte.
 * Une panne est dite (`unavailable`), jamais cachée sous une liste vide, mais un seul quai en panne ne fait pas tout échouer.
 */
@Injectable()
export class GetStopDeparturesUseCase extends AbstractUseCase<StopDeparturesDtoIn, StopDeparturesDtoOut> {
    constructor(
        @Inject(NEARBY_STOPS_PROVIDER) private readonly nearbyStopsProvider: NearbyStopsProvider,
        @Inject(DEPARTURES_PROVIDER) private readonly departuresProvider: DeparturesProvider,
    ) {
        super(StopDeparturesDtoInSchema, StopDeparturesDtoOutSchema);
    }

    protected async executeUseCase(dataIn: StopDeparturesDtoIn): Promise<StopDeparturesDtoOut> {
        const position = { latitude: dataIn.latitude, longitude: dataIn.longitude };

        let quays: StopQuay[];
        let lines: Awaited<ReturnType<NearbyStopsProvider["getStopLines"]>>;
        try {
            [quays, lines] = await Promise.all([
                this.nearbyStopsProvider.getStopQuays(dataIn.stopId),
                this.nearbyStopsProvider.getStopLines(dataIn.stopId),
            ]);
        } catch {
            return { status: "unavailable", rows: [] };
        }

        const results = await Promise.allSettled(
            quaysToRead(quays, position).map((quay) => this.departuresProvider.getNextDepartures(quay.monitoringRef)),
        );
        if (results.length > 0 && results.every((result) => result.status === "rejected")) {
            return { status: "unavailable", rows: [] };
        }

        const departures = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
        const rows = groupStopDepartures(departures, lines, new Date());
        return { status: rows.length > 0 ? "ok" : "no_result", rows };
    }
}
