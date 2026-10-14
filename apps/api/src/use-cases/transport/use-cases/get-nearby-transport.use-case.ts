import { Inject, Injectable } from "@nestjs/common";
import {
    NearbyTransportDtoIn,
    NearbyTransportDtoInSchema,
    NearbyTransportDtoOut,
    NearbyTransportDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { NEARBY_STOPS_PROVIDER, type NearbyStopsProvider } from "../transit.providers";

@Injectable()
export class GetNearbyTransportUseCase extends AbstractUseCase<NearbyTransportDtoIn, NearbyTransportDtoOut> {
    constructor(@Inject(NEARBY_STOPS_PROVIDER) private readonly nearbyStopsProvider: NearbyStopsProvider) {
        super(NearbyTransportDtoInSchema, NearbyTransportDtoOutSchema);
    }

    protected async executeUseCase(dataIn: NearbyTransportDtoIn): Promise<NearbyTransportDtoOut> {
        const origin = { latitude: dataIn.latitude, longitude: dataIn.longitude };
        const [stopsResult] = await Promise.allSettled([
            this.nearbyStopsProvider.getNearbyStops(origin, dataIn.radiusMeters),
        ]);

        return {
            transitStops: stopsResult.status === "fulfilled" ? stopsResult.value : [],
            sharedVehicles: [],
        };
    }
}
