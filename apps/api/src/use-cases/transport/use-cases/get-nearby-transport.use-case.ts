import { Injectable } from "@nestjs/common";
import {
    NearbyTransportDtoIn,
    NearbyTransportDtoInSchema,
    NearbyTransportDtoOut,
    NearbyTransportDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { MetromobiliteStopsAdapter } from "../metromobilite-stops.adapter";

@Injectable()
export class GetNearbyTransportUseCase extends AbstractUseCase<NearbyTransportDtoIn, NearbyTransportDtoOut> {
    constructor(private readonly metromobiliteStopsAdapter: MetromobiliteStopsAdapter) {
        super(NearbyTransportDtoInSchema, NearbyTransportDtoOutSchema);
    }

    protected async executeUseCase(dataIn: NearbyTransportDtoIn): Promise<NearbyTransportDtoOut> {
        const transitStops = await this.metromobiliteStopsAdapter.getNearbyStops(
            { latitude: dataIn.latitude, longitude: dataIn.longitude },
            dataIn.radiusMeters,
        );
        return { transitStops };
    }
}
