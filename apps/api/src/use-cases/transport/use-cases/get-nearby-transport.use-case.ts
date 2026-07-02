import { Injectable } from "@nestjs/common";
import {
    NearbyTransportDtoIn,
    NearbyTransportDtoInSchema,
    NearbyTransportDtoOut,
    NearbyTransportDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { MetromobiliteStopsAdapter } from "../metromobilite-stops.adapter";
import { VoiGbfsAdapter } from "../voi-gbfs.adapter";

@Injectable()
export class GetNearbyTransportUseCase extends AbstractUseCase<NearbyTransportDtoIn, NearbyTransportDtoOut> {
    constructor(
        private readonly metromobiliteStopsAdapter: MetromobiliteStopsAdapter,
        private readonly voiGbfsAdapter: VoiGbfsAdapter,
    ) {
        super(NearbyTransportDtoInSchema, NearbyTransportDtoOutSchema);
    }

    protected async executeUseCase(dataIn: NearbyTransportDtoIn): Promise<NearbyTransportDtoOut> {
        const origin = { latitude: dataIn.latitude, longitude: dataIn.longitude };

        // Sources indépendantes : une panne d'un fournisseur n'annule pas l'autre.
        const [stopsResult, vehiclesResult] = await Promise.allSettled([
            this.metromobiliteStopsAdapter.getNearbyStops(origin, dataIn.radiusMeters),
            this.voiGbfsAdapter.getNearbyVehicles(origin, dataIn.radiusMeters),
        ]);

        return {
            transitStops: stopsResult.status === "fulfilled" ? stopsResult.value : [],
            sharedVehicles: vehiclesResult.status === "fulfilled" ? vehiclesResult.value : [],
        };
    }
}
